#!/usr/bin/env bash
# Build locally, ship to the VPS, (re)start. Idempotent.
#   DOMAIN=carbrand.in SCHEME=http ./deploy/deploy.sh      # before TLS
#   DOMAIN=carbrand.in SCHEME=https ./deploy/deploy.sh     # after certbot
# First run also creates the DB + user, generates secrets into /etc/queensinn/api.env,
# and installs the Nginx site. Later runs never touch those.
set -euo pipefail
HOST="${HOST:-root@62.72.59.84}"
DOMAIN="${DOMAIN:-carbrand.in}"
SCHEME="${SCHEME:-https}"
# Any domain other than the real one is a test site and keeps itself out of search engines (robots.txt + X-Robots-Tag).
# Go-live: DOMAIN=queensinn.co.in ./deploy/deploy.sh (or force with NOINDEX=false).
if [ "$DOMAIN" = "queensinn.co.in" ]; then NOINDEX="${NOINDEX:-false}"; else NOINDEX="${NOINDEX:-true}"; fi
REPLACE_KEYS="${REPLACE_KEYS:-}"      # e.g. REPLACE_KEYS=hero-dusk re-processes just that seed photo
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
R=/var/www/queensinn

echo "==> build API";  dotnet publish "$ROOT/queensin.api" -c Release -o "$OUT/api" --nologo -v q
echo "==> build web";  (cd "$ROOT/queensin.web" && npm ci --silent && npx ng build >/dev/null)
cp -r "$ROOT/queensin.web/dist/queensin-web" "$OUT/web"
cat > "$OUT/web/browser/config.js" <<CFG
window.__APP_CONFIG__ = { apiBaseUrl: '$SCHEME://$DOMAIN/api', siteUrl: '$SCHEME://$DOMAIN' };
CFG
mkdir -p "$OUT/mig" "$OUT/seed"; cp "$ROOT"/database/migrations/0*.sql "$OUT/mig/"; cp "$ROOT/deploy/seed/media-manifest.json" "$ROOT/database/seed/link-media.sql" "$OUT/seed/"
render() { sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__SCHEME__#$SCHEME#g" -e "s#__NOINDEX__#$NOINDEX#g" "$1"; }
render "$ROOT/deploy/queensin-ssr.service"  > "$OUT/queensin-ssr.service"
render "$ROOT/deploy/nginx-queensinn.conf"  > "$OUT/nginx-queensinn.conf"
cp "$ROOT/deploy/queensin-api.service" "$OUT/"

echo "==> upload"
tar -C "$OUT" -czf - . | ssh "$HOST" "rm -rf /tmp/qi-release && mkdir /tmp/qi-release && tar -xzf - -C /tmp/qi-release"

echo "==> install"
ssh "$HOST" DOMAIN="$DOMAIN" SCHEME="$SCHEME" R="$R" REPLACE_KEYS="$REPLACE_KEYS" bash -s <<'REMOTE'
set -euo pipefail
S=/tmp/qi-release
mkdir -p $R/uploads /var/log/queensinn /etc/queensinn
chown -R www-data:www-data $R/uploads /var/log/queensinn

if [ ! -f /etc/queensinn/api.env ]; then
  echo "   first run: creating database + secrets"
  DBPW=$(openssl rand -hex 16); JWT=$(openssl rand -base64 48 | tr -d '\n'); ADM=$(openssl rand -base64 12 | tr -d '/+=\n')A1!
  mysql -e "CREATE DATABASE IF NOT EXISTS queensinn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            CREATE USER IF NOT EXISTS 'queensinn'@'localhost' IDENTIFIED BY '$DBPW';
            ALTER USER 'queensinn'@'localhost' IDENTIFIED BY '$DBPW';
            GRANT ALL ON queensinn.* TO 'queensinn'@'localhost';"
  umask 077
  cat > /etc/queensinn/api.env <<ENV
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5190
ConnectionStrings__Default=Server=localhost;Database=queensinn;Uid=queensinn;Pwd=$DBPW;CharSet=utf8mb4;
Jwt__Key=$JWT
Admin__DefaultPassword=$ADM
Cors__Origins__0=$SCHEME://$DOMAIN
Cors__Origins__1=$SCHEME://www.$DOMAIN
Media__UploadPath=$R/uploads
Serilog__WriteTo__1__Args__path=/var/log/queensinn/queensin-.log
ENV
  chmod 640 /etc/queensinn/api.env; chgrp www-data /etc/queensinn/api.env
else
  # keep CORS in step with SCHEME on later runs
  sed -i "s#^Cors__Origins__0=.*#Cors__Origins__0=$SCHEME://$DOMAIN#; s#^Cors__Origins__1=.*#Cors__Origins__1=$SCHEME://www.$DOMAIN#" /etc/queensinn/api.env
fi

# Forward-only: a migration that is already recorded in __schema_migrations is skipped, so a deploy can
# never re-apply seed data over what staff have since edited in the admin.
migrate() {
  for f in $(ls $S/mig/0*.sql | sort); do
    name=$(basename "$f")
    done_already=$(mysql -N queensinn -e "SELECT COUNT(*) FROM __schema_migrations WHERE script_name='$name'" 2>/dev/null || echo 0)
    if [ "${done_already:-0}" = "0" ]; then echo "   applying $name"; mysql queensinn < "$f"; fi
  done
}
echo "   migrations"; migrate

systemctl stop queensin-api queensin-ssr 2>/dev/null || true
rm -rf $R/api $R/web; mkdir -p $R/api $R/web
cp -r $S/api/. $R/api/; cp -r $S/web/. $R/web/
chown -R www-data:www-data $R/api $R/web
cp $S/queensin-api.service $S/queensin-ssr.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now queensin-api queensin-ssr

# Bring the seed photos into the media library (skips any already imported). Only when a photo was newly
# imported are they linked to hero slides / rooms / galleries / photo positions (database/seed/link-media.sql,
# which only fills gaps). systemd-run applies the env file the same way the service does.
echo "   importing photos"
IMPORT_LOG=$(systemd-run --quiet --wait --pipe -p User=www-data -p EnvironmentFile=/etc/queensinn/api.env \
  -p WorkingDirectory=$R/api /usr/bin/dotnet $R/api/queensin.api.dll import-media $S/seed/media-manifest.json ${REPLACE_KEYS:+--replace=$REPLACE_KEYS} 2>&1)
echo "$IMPORT_LOG" | grep -E "^(imported|replaced|FAILED)" || echo "   (no new photos)"
if echo "$IMPORT_LOG" | grep -q "^imported"; then
  echo "   linking new photos"; mysql queensinn < $S/seed/link-media.sql
fi
systemctl restart queensin-api

if [ ! -f /etc/nginx/sites-available/queensinn ]; then
  cp $S/nginx-queensinn.conf /etc/nginx/sites-available/queensinn
  ln -sf /etc/nginx/sites-available/queensinn /etc/nginx/sites-enabled/queensinn
fi
nginx -t && systemctl reload nginx

sleep 4
echo "   api: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5190/api/health)   ssr: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4030/)"
rm -rf $S
REMOTE
echo "==> done"

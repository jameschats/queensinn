#!/usr/bin/env bash
# Turns on the emails that tell staff about new website enquiries (room, KVR Mahal and contact forms).
# Run it ON THE SERVER, from your own terminal, so the mailbox password never travels through a chat or a log:
#     ssh -t jeeva@62.72.59.84 ./set-smtp.sh
# It asks for the mail server, the mailbox login and the mailbox password (typed hidden), adds them to
# /etc/queensinn/api.env, restarts the website's API and offers to send a test email.
# Only the queensinn app is touched. The old settings file is kept as a root-only backup next to the original.
#
# Test without changing anything:  QI_DRY_RUN=1 QI_ENV_FILE=/path/to/copy.env SUDO= ./set-smtp.sh
set -euo pipefail

ENV_FILE="${QI_ENV_FILE:-/etc/queensinn/api.env}"
SUDO="${SUDO-sudo}"
DRY="${QI_DRY_RUN:-}"

ask() { local prompt=$1 default=$2 reply; read -rp "$prompt [$default]: " reply; printf '%s' "${reply:-$default}"; }

echo "Enquiry emails: server settings for the queensinn website"
echo "(Press Enter to accept the suggestion in [brackets].)"
echo
# GoDaddy's certificate is issued for its own server name, not for mail.queensinn.co.in, so use the real name
# (it is shown in the mail server's greeting: connect to mail.queensinn.co.in:587 and read the first line).
HOST=$(ask "Mail server" "sg2plzcpnl509225.prod.sin2.secureserver.net")
PORT=$(ask "Port (465 = SSL, 587 = STARTTLS)" "465")
LOGIN=$(ask "Mailbox login (the full email address)" "reservations@queensinn.co.in")
read -rsp "Password for $LOGIN (typing is hidden): " PASS; echo
[ -n "$PASS" ] || { echo "No password entered. Nothing was changed."; exit 1; }
FROM=$(ask "Send emails from" "$LOGIN")

case "$PORT" in 465|587) ;; *) echo "Port must be 465 or 587. Nothing was changed."; exit 1;; esac
[[ "$LOGIN" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || { echo "That does not look like an email address. Nothing was changed."; exit 1; }
[[ "$HOST" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "The server name has odd characters. Nothing was changed."; exit 1; }

# systemd reads this file; inside double quotes only backslash and double quote need escaping.
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT; chmod 600 "$TMP"
$SUDO cat "$ENV_FILE" | grep -v '^Smtp__' > "$TMP" || true
{
  printf 'Smtp__Host=%s\n' "$HOST"
  printf 'Smtp__Port=%s\n' "$PORT"
  printf 'Smtp__User=%s\n' "$LOGIN"
  printf 'Smtp__Password="%s"\n' "$(esc "$PASS")"
  printf 'Smtp__From=%s\n' "$FROM"
} >> "$TMP"

# Never install a file that lost the settings the website needs to start.
for key in ConnectionStrings__Default Jwt__Key; do
  grep -q "^$key=" "$TMP" || { echo "Safety stop: $key is missing from the new settings file. Nothing was changed."; exit 1; }
done

if [ -n "$DRY" ]; then
  echo; echo "DRY RUN: nothing installed. The file would contain these lines (password hidden):"
  sed -E 's/^(Smtp__Password)=.*/\1="********"/' "$TMP" | grep -E '^(Smtp__|ConnectionStrings__Default|Jwt__Key)' | sed -E 's/^((ConnectionStrings__Default|Jwt__Key))=.*/\1=<kept>/'
  exit 0
fi

STAMP=$(date +%F-%H%M)
$SUDO cp -p "$ENV_FILE" "$ENV_FILE.bak-$STAMP"; $SUDO chmod 600 "$ENV_FILE.bak-$STAMP"
$SUDO install -m 640 -o root -g www-data "$TMP" "$ENV_FILE"
echo "Saved. (Backup of the old settings: $ENV_FILE.bak-$STAMP, readable by root only.)"

echo "Restarting the website's API..."
$SUDO qi-svc queensinn restart

echo
read -rp "Send a test email now? Type an address to send it to, or press Enter to skip: " TO
if [ -n "$TO" ]; then
  APIDIR=/var/www/queensinn/api
  $SUDO systemd-run --quiet --wait --pipe -p User=www-data -p EnvironmentFile="$ENV_FILE" -p WorkingDirectory="$APIDIR" \
    /usr/bin/dotnet "$APIDIR/queensin.api.dll" test-email "$TO" || echo "(The test did not succeed; read the message above, fix the setting and run this script again.)"
fi
echo "Done."

#!/usr/bin/env bash
# Checks whether the mail server accepts a mailbox name and password. It saves nothing and sends no email.
# Run it ON THE SERVER from your own terminal (the password is typed hidden and is never written anywhere):
#     ssh -t jeeva@62.72.59.84 ./test-mail-login.sh
set -uo pipefail

HOST="${1:-sg2plzcpnl509225.prod.sin2.secureserver.net}"
read -rp "Mailbox login [website@queensinn.co.in]: " USER_NAME; USER_NAME=${USER_NAME:-website@queensinn.co.in}
read -rsp "Password for $USER_NAME (typing is hidden): " PASS; echo
echo "You typed $(printf '%s' "$PASS" | wc -c | tr -d ' ') characters."
[ -n "$PASS" ] || { echo "No password entered."; exit 1; }

esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

try() {   # try <port> <scheme>
  local port=$1 scheme=$2 out
  # The credentials go to curl on stdin, so they never appear in a process list or in the output below.
  out=$(printf 'url = "%s://%s:%s"\nuser = "%s:%s"\n' "$scheme" "$HOST" "$port" "$(esc "$USER_NAME")" "$(esc "$PASS")" \
        | curl -sS -v -m 25 -K - -X NOOP 2>&1) || true
  if   grep -qE '^< 235' <<<"$out"; then echo "  port $port: LOGIN ACCEPTED"; return 0
  elif grep -qE '^< 535' <<<"$out"; then echo "  port $port: login REJECTED (535 incorrect authentication data)"; return 1
  else echo "  port $port: no clear answer. Server said:"; grep -E '^< [0-9]{3}|curl: \(' <<<"$out" | grep -viE 'AUTH|PLAIN|LOGIN' | head -4 | sed 's/^/     /'; return 2
  fi
}

echo "Trying $HOST ..."
try 465 smtps; r1=$?
try 587 smtp;  r2=$?   # smtp:// with STARTTLS is requested below only if the server offers it; a plain answer is still informative
echo
if [ $r1 -eq 0 ] || [ $r2 -eq 0 ]; then
  echo "RESULT: the server accepts this login. The password is right, so the problem is in how the website stored it. Tell Claude."
else
  echo "RESULT: the server does NOT accept this mailbox name and password."
  echo "Check in GoDaddy: Email Accounts, find $USER_NAME, use Check Email (webmail) with the same password."
  echo "If webmail also refuses it, set a new password (letters and digits only) and run this test again."
fi

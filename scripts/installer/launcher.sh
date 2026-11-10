#!/bin/bash
# What ~/Applications/Meeting Noter.app runs (install.sh makes the bundle exec
# this file from the installed app). Makes sure both LaunchAgents run, offers a
# newer release, waits for the server and opens it in the default browser.
ROOT="$HOME/Library/Application Support/Meeting Noter"
APP_DIR="$ROOT/app"
URL="http://localhost:3000"
INSTALL_URL="https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh"
uid=$(id -u)

dialog() { # message [button…] -> prints the clicked button; the last one is the default
  [ $# -gt 1 ] || set -- "$1" OK
  osascript - "$@" <<'EOF' 2>/dev/null
on run argv
  set b to items 2 thru -1 of argv
  return button returned of (display dialog (item 1 of argv) with title "Meeting Noter" buttons b default button (count of b))
end run
EOF
}

ensure_agent() {
  local label=$1 plist="$HOME/Library/LaunchAgents/$1.plist"
  [ -f "$plist" ] || return 0
  launchctl print "gui/$uid/$label" >/dev/null 2>&1 || launchctl bootstrap "gui/$uid" "$plist" 2>/dev/null
  # Without -k this only starts a job that is not running.
  launchctl kickstart "gui/$uid/$label" 2>/dev/null
}

newer=$("$APP_DIR/node/bin/node" "$APP_DIR/launcher/check-update.mjs" 2>/dev/null)
if [ -n "$newer" ]; then
  answer=$(dialog "Er is een nieuwe versie van Meeting Noter ($newer). Nu bijwerken? Dit duurt ongeveer een minuut; uw opnames blijven bewaard." Later Bijwerken)
  if [ "$answer" = "Bijwerken" ]; then
    osascript -e 'display notification "Bijwerken… de app opent zodra het klaar is." with title "Meeting Noter"' 2>/dev/null
    if ! curl -fsSL "$INSTALL_URL" | MEETING_NOTER_NO_OPEN=1 bash >"$ROOT/logs/update.log" 2>&1; then
      dialog "Bijwerken is mislukt; de huidige versie blijft werken. Details: $ROOT/logs/update.log" >/dev/null
    fi
  fi
fi

ensure_agent nl.jensbouma.meeting-noter.server
ensure_agent nl.jensbouma.meeting-noter.audio-helper

for _ in $(seq 1 60); do
  curl -fs -o /dev/null "http://127.0.0.1:3000" 2>/dev/null && exec open "$URL"
  sleep 1
done
dialog "Meeting Noter startte niet. Probeer de installatieopdracht opnieuw, of stuur dit logbestand mee als u hulp vraagt: $ROOT/logs/server.log" >/dev/null
exit 1

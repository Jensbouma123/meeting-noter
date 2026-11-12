#!/bin/bash
# What ~/Applications/Meeting Noter.app runs (install.sh makes the bundle exec
# this file from the installed app). Starts the web server on demand (it stops
# itself when the browser tab is gone), then opens it in the default browser.
# --no-open: no dialogs and no browser; print errors and exit 1 (used by install.sh).
# Test-only overrides (install.sh passes them on): MEETING_NOTER_ROOT,
# MEETING_NOTER_PORT, MEETING_NOTER_NO_LAUNCHD=1 (touch no LaunchAgent). A
# different port is a different browser origin, with none of the user's data.
ROOT=${MEETING_NOTER_ROOT:-"$HOME/Library/Application Support/Meeting Noter"}
APP_DIR="$ROOT/app"
PORT=${MEETING_NOTER_PORT:-3000}
URL="http://localhost:$PORT"
STATUS_URL="http://127.0.0.1:$PORT/api/app/status"
NO_OPEN=
[ "${1:-}" = "--no-open" ] && NO_OPEN=1
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

[ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] || ensure_agent nl.jensbouma.meeting-noter.audio-helper

# nl when the macOS locale starts with nl, else en.
case $(defaults read -g AppleLocale 2>/dev/null) in nl*) LANG_UI=nl ;; *) LANG_UI=en ;; esac

# Prints "ours" (our app answers), "free" (nothing listens) or "busy" (something else answers).
probe() {
  local body rc
  body=$(curl -fs --max-time 3 "$STATUS_URL" 2>/dev/null); rc=$?
  if [ $rc -eq 0 ] && printf '%s' "$body" | grep -q '"app":"meeting-noter"'; then echo ours
  elif [ $rc -eq 7 ]; then echo free
  else echo busy; fi
}

port_busy() {
  if [ -n "$NO_OPEN" ]; then
    echo "Port $PORT is in use by another program." >&2
    exit 1
  fi
  local title body retry close
  if [ "$LANG_UI" = nl ]; then
    title="Meeting Noter kan niet starten"
    body="Een ander programma gebruikt poort $PORT, die Meeting Noter nodig heeft. Sluit dat programma (bijvoorbeeld een oudere Meeting Noter die nog via 'Start Meeting Noter' draait) en probeer het opnieuw. Je opnames blijven bewaard."
    close=Sluiten; retry="Opnieuw proberen"
  else
    title="Meeting Noter can't start"
    body="Another program is using port $PORT, which Meeting Noter needs. Close that program (for example an older Meeting Noter still running via 'Start Meeting Noter') and try again. Your recordings are kept."
    close=Close; retry="Try again"
  fi
  local answer
  answer=$(osascript - "$title" "$body" "$close" "$retry" <<'EOS' 2>/dev/null
on run argv
  return button returned of (display dialog (item 2 of argv) with title (item 1 of argv) buttons {item 3 of argv, item 4 of argv} default button 2)
end run
EOS
)
  [ "$answer" = "$retry" ]
}

start_failed() {
  if [ -n "$NO_OPEN" ]; then echo "Meeting Noter did not start; see $ROOT/logs/server.log" >&2; exit 1; fi
  if [ "$LANG_UI" = nl ]; then dialog "Meeting Noter startte niet. Logbestand: $ROOT/logs/server.log" >/dev/null
  else dialog "Meeting Noter did not start. Log file: $ROOT/logs/server.log" >/dev/null; fi
  exit 1
}

while :; do
  case $(probe) in
    ours) break ;;
    free)
      mkdir -p "$ROOT/logs"
      (cd "$APP_DIR/server" && PORT=$PORT HOSTNAME=127.0.0.1 NODE_ENV=production MEETING_NOTER_IDLE_SHUTDOWN=1 MEETING_NOTER_ROOT="$ROOT" \
        nohup "$APP_DIR/node/bin/node" server.js >>"$ROOT/logs/server.log" 2>&1 </dev/null & echo $! > "$ROOT/server.pid")
      pid=$(cat "$ROOT/server.pid")
      ready=
      for _ in $(seq 1 60); do
        kill -0 "$pid" 2>/dev/null || break
        [ "$(probe)" = ours ] && { ready=1; break; }
        sleep 1
      done
      [ -n "$ready" ] || start_failed
      break ;;
    *) port_busy || exit 1 ;;
  esac
done

[ -n "$NO_OPEN" ] && exit 0
exec open "$URL"

#!/bin/bash
# Removes what install.sh installed: the background services, the app files
# and Meeting Noter.app in /Applications or ~/Applications. The meetings
# (meetings.db and the meetings/ folder of Markdown copies, both in the data
# folder below) are kept unless --delete-meetings is given; settings and the
# browser's own copy live in the site data of http://localhost:3000 and are
# kept too. Run it with:
#   bash ~/Library/Application\ Support/Meeting\ Noter/uninstall.sh [--delete-meetings]
# or
#   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/uninstall.sh | bash [-s -- --delete-meetings]
set -uo pipefail

ROOT="$HOME/Library/Application Support/Meeting Noter"
AGENTS="$HOME/Library/LaunchAgents"
DELETE_MEETINGS=
for arg in "$@"; do
  case $arg in --delete-meetings) DELETE_MEETINGS=1 ;; esac
done

# The server runs on demand (not as a LaunchAgent); stop it before its files go.
pid=$(cat "$ROOT/server.pid" 2>/dev/null)
case $pid in ''|*[!0-9]*) ;; *)
  case $(ps -p "$pid" -o command= 2>/dev/null) in *"$ROOT/app"*)
    kill "$pid" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
    kill -9 "$pid" 2>/dev/null ;;
  esac ;;
esac

for label in nl.jensbouma.meeting-noter.server nl.jensbouma.meeting-noter.audio-helper; do
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] || launchctl bootout "gui/$(id -u)/$label" 2>/dev/null
  rm -f "$AGENTS/$label.plist"
done
# /Applications is shared, so only remove a bundle install.sh made.
for app in "/Applications/Meeting Noter.app" "$HOME/Applications/Meeting Noter.app"; do
  case $app in /Applications/*) [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ] || continue ;; esac
  grep -qs nl.jensbouma.meeting-noter.launcher "$app/Contents/Info.plist" && rm -rf "$app"
done
kept=
if [ -n "$DELETE_MEETINGS" ]; then
  rm -rf "$ROOT"
else
  # Everything but the meetings; the folder itself goes when nothing is left.
  for f in "$ROOT"/* "$ROOT"/.[!.]*; do
    [ -e "$f" ] || continue
    case ${f##*/} in
      meetings|meetings.db|meetings.db-wal|meetings.db-shm) kept=1 ;;
      *) rm -rf "$f" ;;
    esac
  done
  rmdir "$ROOT" 2>/dev/null
fi

echo "✅ Meeting Noter is verwijderd."
if [ -n "$kept" ]; then
  echo "   Uw vergaderingen zijn bewaard in $ROOT (meetings.db en de map meetings)."
  echo "   Ook die wissen: voer dit script opnieuw uit met --delete-meetings."
fi
echo "   Uw opnames staan ook nog in de browser. Wilt u die wissen, verwijder dan de"
echo "   websitegegevens van localhost in de instellingen van uw browser."
echo "   macOS kan Meeting Noter nog tonen onder Systeeminstellingen > Privacy en"
echo "   beveiliging > Microfoon; dat kunt u daar uitzetten."

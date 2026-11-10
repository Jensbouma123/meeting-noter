#!/bin/bash
# Removes what install.sh installed: the background services, the app files
# and Meeting Noter.app in /Applications or ~/Applications. Recordings and
# settings live in the browser (site data of http://localhost:3000) and are
# kept. Run it with:
#   bash ~/Library/Application\ Support/Meeting\ Noter/uninstall.sh
# or
#   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/uninstall.sh | bash
set -uo pipefail

ROOT="$HOME/Library/Application Support/Meeting Noter"
AGENTS="$HOME/Library/LaunchAgents"

for label in nl.jensbouma.meeting-noter.server nl.jensbouma.meeting-noter.audio-helper; do
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] || launchctl bootout "gui/$(id -u)/$label" 2>/dev/null
  rm -f "$AGENTS/$label.plist"
done
# /Applications is shared, so only remove a bundle install.sh made.
for app in "/Applications/Meeting Noter.app" "$HOME/Applications/Meeting Noter.app"; do
  case $app in /Applications/*) [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ] || continue ;; esac
  grep -qs nl.jensbouma.meeting-noter.launcher "$app/Contents/Info.plist" && rm -rf "$app"
done
rm -rf "$ROOT"

echo "✅ Meeting Noter is verwijderd."
echo "   Uw opnames staan nog in de browser. Wilt u die ook wissen, verwijder dan de"
echo "   websitegegevens van localhost in de instellingen van uw browser."
echo "   macOS kan Meeting Noter nog tonen onder Systeeminstellingen > Privacy en"
echo "   beveiliging > Microfoon; dat kunt u daar uitzetten."

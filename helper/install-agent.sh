#!/bin/sh
# Builds the audio helper and installs it as a per-user LaunchAgent so it
# starts at login. `install-agent.sh uninstall` removes it again.
# The binary is copied to ~/Library/Application Support/Meeting Noter/ so the
# agent keeps working if this checkout moves.
set -eu
label=nl.jensbouma.meeting-noter.audio-helper
plist="$HOME/Library/LaunchAgents/$label.plist"
dest="$HOME/Library/Application Support/Meeting Noter"
uid=$(id -u)

if [ "$(uname)" != "Darwin" ]; then echo "macOS only" >&2; exit 1; fi

if [ "${1:-install}" = "uninstall" ]; then
  launchctl bootout "gui/$uid/$label" 2>/dev/null || true
  rm -f "$plist"
  rm -rf "$dest"
  echo "removed LaunchAgent $label"
  exit 0
fi

here=$(cd "$(dirname "$0")" && pwd)
sh "$here/build.sh"
mkdir -p "$dest" "$HOME/Library/LaunchAgents"
cp "$here/build/meeting-noter-audio-helper" "$dest/"
codesign --force --sign - --identifier "$label" "$dest/meeting-noter-audio-helper"
cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>$label</string>
	<key>ProgramArguments</key><array><string>$dest/meeting-noter-audio-helper</string></array>
	<key>RunAtLoad</key><true/>
	<key>KeepAlive</key><true/>
	<key>ProcessType</key><string>Interactive</string>
	<key>StandardErrorPath</key><string>$dest/helper.log</string>
	<key>StandardOutPath</key><string>$dest/helper.log</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$uid/$label" 2>/dev/null || true
launchctl bootstrap "gui/$uid" "$plist"
echo "installed LaunchAgent $label (log: $dest/helper.log)"

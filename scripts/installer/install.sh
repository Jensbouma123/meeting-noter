#!/bin/bash
# Installs or updates Meeting Noter for the current macOS user. Run it with:
#   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh | bash
# Re-running it updates to the newest release. Needs no admin rights, Node.js or
# Xcode: the release tarball carries its own Node.js runtime, the prebuilt web
# app and the audio helper. Files downloaded with curl get no quarantine flag,
# so Gatekeeper does not block the ad-hoc signed helper.
#
# Installs:
#   ~/Library/Application Support/Meeting Noter/   app, helper, logs, uninstall.sh
#   ~/Library/LaunchAgents/nl.jensbouma.meeting-noter.{server,audio-helper}.plist
#   /Applications (or ~/Applications)/Meeting Noter.app  opens http://localhost:3000
#
# Test-only overrides: MEETING_NOTER_DOWNLOAD_BASE (any curl URL, file:// too),
# MEETING_NOTER_NO_LAUNCHD=1 (write the agents and the app, but load, register
# and wait for nothing, so it runs in a scratch HOME next to a real install),
# MEETING_NOTER_NO_OPEN=1 (do not open the browser), MEETING_NOTER_FORCE=1
# (reinstall the same version).

# Everything runs from main, called on the last line, so a download that breaks
# off halfway through `curl | bash` runs nothing.
set -euo pipefail

REPO=Jensbouma123/meeting-noter
BASE=${MEETING_NOTER_DOWNLOAD_BASE:-https://github.com/$REPO/releases/latest/download}
ROOT="$HOME/Library/Application Support/Meeting Noter"
AGENTS="$HOME/Library/LaunchAgents"
# /Applications when this user may write there (admins can, without sudo), so
# the app shows up under Applications in Finder; else ~/Applications. Test runs
# (MEETING_NOTER_NO_LAUNCHD) stay inside $HOME.
if [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ] && [ -w /Applications ]; then APPS=/Applications; else APPS="$HOME/Applications"; fi
APP="$APPS/Meeting Noter.app"
PORT=3000
URL="http://localhost:$PORT"
SERVER_LABEL=nl.jensbouma.meeting-noter.server
HELPER_LABEL=nl.jensbouma.meeting-noter.audio-helper

tmp=
say() { printf '%s\n' "$*"; }
fail() {
  printf '\n❌ %s\n' "$1" >&2
  printf '   Er ging iets mis / Something went wrong. Uw opnames in de browser blijven bewaard.\n\n' >&2
  exit 1
}

# version_at_least 14.4 14.4.1 -> true
version_at_least() {
  local need=$1 have=$2
  [ "$(printf '%s\n%s\n' "$need" "$have" | sort -t. -k1,1n -k2,2n -k3,3n | head -n1)" = "$need" ]
}

write_agent() { # label program-args-xml extra-xml log
  cat > "$AGENTS/$1.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>$1</string>
	<key>ProgramArguments</key><array>$2</array>
$3
	<key>RunAtLoad</key><true/>
	<key>KeepAlive</key><true/>
	<key>ProcessType</key><string>Interactive</string>
	<key>StandardOutPath</key><string>$4</string>
	<key>StandardErrorPath</key><string>$4</string>
</dict>
</plist>
EOF
  plutil -lint -s "$AGENTS/$1.plist" || fail "Ongeldig LaunchAgent-bestand: $AGENTS/$1.plist"
}

agent_stop() { [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] || launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true; }
agent_start() {
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] && return 0
  launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/$1.plist" || fail "Kon achtergronddienst $1 niet starten."
}

# Escapes &, < and > for a plist <string>.
xml() { local s=${1//&/&amp;}; s=${s//</&lt;}; printf '%s' "${s//>/&gt;}"; }

main() {
  [ "$(uname)" = Darwin ] || fail "Meeting Noter installeren werkt alleen op macOS. / macOS only."
  local macos arch asset expected actual helper_ok=1
  macos=$(sw_vers -productVersion)
  version_at_least 13.5 "$macos" || fail "macOS $macos is te oud; minimaal macOS 13.5 nodig."
  version_at_least 14.4 "$macos" || helper_ok=
  # hw.optional.arm64 is also 1 in a Rosetta shell, where uname -m says x86_64.
  if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]; then arch=arm64; else arch=x64; fi
  asset="meeting-noter-macos-$arch.tar.gz"

  say "=============================="
  say "  Meeting Noter installeren"
  say "=============================="

  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "$BASE/$asset.sha256" -o "$tmp/sum" \
    || fail "Kon de nieuwste versie niet ophalen. Controleer uw internetverbinding (of de release wordt nog gebouwd: probeer het over 15 minuten opnieuw)."
  expected=$(awk '{print $1; exit}' "$tmp/sum")
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "Onverwachte controlesom-download."

  mkdir -p "$ROOT/logs" "$ROOT/bin" "$AGENTS"
  if [ -z "${MEETING_NOTER_FORCE:-}" ] && [ -x "$ROOT/app/node/bin/node" ] \
    && [ "$(cat "$ROOT/installed.sha256" 2>/dev/null)" = "$expected" ]; then
    say "✓ U heeft al de nieuwste versie ($(cat "$ROOT/app/VERSION"))."
  else
    say "Downloaden: $asset"
    curl -fL --progress-bar "$BASE/$asset" -o "$tmp/$asset" || fail "Download mislukt."
    actual=$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')
    [ "$actual" = "$expected" ] || fail "Controlesom klopt niet; de download is beschadigd. Probeer het opnieuw."
    rm -rf "$ROOT/app.new" "$ROOT/app.old"
    mkdir "$ROOT/app.new"
    tar -xzf "$tmp/$asset" -C "$ROOT/app.new" --strip-components 1 || fail "Uitpakken mislukt."
    "$ROOT/app.new/node/bin/node" -e 0 2>/dev/null || fail "De meegeleverde Node.js start niet op deze Mac."
    agent_stop "$SERVER_LABEL"
    if [ -d "$ROOT/app" ]; then mv "$ROOT/app" "$ROOT/app.old"; fi
    mv "$ROOT/app.new" "$ROOT/app"
    rm -rf "$ROOT/app.old"
    printf '%s\n' "$expected" > "$ROOT/installed.sha256"
    say "✓ Versie $(cat "$ROOT/app/VERSION") uitgepakt"
  fi

  # The helper keeps its old copy when it is byte-identical: macOS ties the
  # microphone permission of an ad-hoc signed binary to its exact contents.
  agent_stop "$SERVER_LABEL"
  if [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ] && curl -fs -o /dev/null "http://127.0.0.1:$PORT" 2>/dev/null; then
    fail "Poort $PORT is al in gebruik door een ander programma (draait 'Start Meeting Noter.command' nog?). Sluit dat en probeer opnieuw."
  fi
  : > "$ROOT/logs/server.log"
  : > "$ROOT/logs/helper.log"

  local helper="$ROOT/bin/meeting-noter-audio-helper"
  if ! cmp -s "$ROOT/app/helper/meeting-noter-audio-helper" "$helper"; then
    agent_stop "$HELPER_LABEL"
    cp "$ROOT/app/helper/meeting-noter-audio-helper" "$helper.new"
    mv "$helper.new" "$helper"
  fi
  cp "$ROOT/app/uninstall.sh" "$ROOT/uninstall.sh"

  local node server
  node=$(xml "$ROOT/app/node/bin/node")
  server=$(xml "$ROOT/app/server")
  write_agent "$SERVER_LABEL" \
    "<string>$node</string><string>$server/server.js</string>" \
    "	<key>WorkingDirectory</key><string>$server</string>
	<key>EnvironmentVariables</key><dict>
		<key>PORT</key><string>$PORT</string>
		<key>HOSTNAME</key><string>127.0.0.1</string>
		<key>NODE_ENV</key><string>production</string>
	</dict>" \
    "$(xml "$ROOT/logs/server.log")"
  agent_start "$SERVER_LABEL"
  if [ -n "$helper_ok" ]; then
    write_agent "$HELPER_LABEL" "<string>$(xml "$helper")</string>" "" "$(xml "$ROOT/logs/helper.log")"
    agent_start "$HELPER_LABEL"
  else
    agent_stop "$HELPER_LABEL"
    rm -f "$AGENTS/$HELPER_LABEL.plist"
    say "ℹ️  De audio-helper (systeemaudio) heeft macOS 14.4 of nieuwer nodig; deze Mac heeft $macos."
    say "   De app werkt zonder helper met de microfoon en het delen van een browsertabblad."
  fi

  # The .app only runs the launcher inside the installed app, so updates change
  # its behaviour without touching the bundle.
  local new="$tmp/Meeting Noter.app"
  mkdir -p "$new/Contents/MacOS" "$new/Contents/Resources" "$APPS"
  cp "$ROOT/app/launcher/AppIcon.icns" "$new/Contents/Resources/AppIcon.icns"
  cat > "$new/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key><string>Meeting Noter</string>
	<key>CFBundleDisplayName</key><string>Meeting Noter</string>
	<key>CFBundleIdentifier</key><string>nl.jensbouma.meeting-noter.launcher</string>
	<key>CFBundleExecutable</key><string>meeting-noter</string>
	<key>CFBundleIconFile</key><string>AppIcon</string>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>CFBundleShortVersionString</key><string>$(cat "$ROOT/app/VERSION")</string>
	<key>LSUIElement</key><true/>
</dict>
</plist>
EOF
  cat > "$new/Contents/MacOS/meeting-noter" <<'EOF'
#!/bin/bash
exec /bin/bash "$HOME/Library/Application Support/Meeting Noter/app/launcher/launcher.sh" "$@"
EOF
  chmod +x "$new/Contents/MacOS/meeting-noter"
  rm -rf "$APP"
  mv "$new" "$APP"
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] \
    || /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" 2>/dev/null || true
  say "✓ App aangemaakt: $APP"

  if [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ]; then
    say "Wachten tot Meeting Noter klaar is…"
    local i
    for i in $(seq 1 60); do
      curl -fs -o /dev/null "http://127.0.0.1:$PORT" 2>/dev/null && break
      sleep 1
    done
    curl -fs -o /dev/null "http://127.0.0.1:$PORT" 2>/dev/null \
      || fail "Meeting Noter startte niet. Logbestand: $ROOT/logs/server.log"
  fi

  say
  say "✅ Meeting Noter $(cat "$ROOT/app/VERSION") is geïnstalleerd en draait op $URL"
  say "   Open het voortaan via 'Meeting Noter' in Apps of Spotlight."
  say "   Bijwerken: voer dezelfde opdracht opnieuw uit. Verwijderen:"
  say "   bash ~/Library/Application\\ Support/Meeting\\ Noter/uninstall.sh"
  if [ -z "${MEETING_NOTER_NO_OPEN:-}" ] && [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ]; then open "$URL"; fi
}

main "$@"

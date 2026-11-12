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
#   ~/Library/LaunchAgents/nl.jensbouma.meeting-noter.audio-helper.plist
#   /Applications (or ~/Applications)/Meeting Noter.app  starts the server on demand
#     and opens http://localhost:3000
# The web server is no longer a LaunchAgent: the app starts it when opened and it
# stops itself when the browser tab is gone. An older install's server agent is
# removed here.
#
# The fast WebGPU speech model (encoder-model.q4f16.onnx, 516 MB) is built once on
# this Mac, after the app runs: a pinned standalone `uv` (astral-sh, sha256
# checked) runs the bundled convert-parakeet-v3.py, which downloads the fp32 model
# from Hugging Face and converts it (5-15 min, ~4 GB temporary, then deleted).
# The result lives in ~/Library/Application Support/Meeting Noter/models/ (kept
# across updates; never rebuilt when present) and the app serves it same-origin
# at /models/. Needs >= 6 GB free disk and >= 8 GB RAM; otherwise, or when the
# build fails, the app stays on the CPU model (no live transcription) and
# `install.sh --gpu-model` (same command, plus `bash -s -- --gpu-model`) retries.
#
# Test-only overrides: MEETING_NOTER_UV (use this uv binary, skip its download),
# MEETING_NOTER_UV_BASE (uv download URL), MEETING_NOTER_SKIP_GPU_MODEL=1,
# MEETING_NOTER_MIN_DISK_KB, MEETING_NOTER_DOWNLOAD_BASE (any curl URL, file:// too),
# MEETING_NOTER_NO_LAUNCHD=1 (write the agents and the app, but load, register
# and wait for nothing, so it runs in a scratch HOME next to a real install),
# MEETING_NOTER_NO_OPEN=1 (do not open the browser), MEETING_NOTER_FORCE=1
# (reinstall the same version), MEETING_NOTER_ROOT (install dir),
# MEETING_NOTER_RUN_SERVER=1 (start the server even with NO_LAUNCHD; the update
# e2e test, update-e2e.mjs).
#
# An update keeps the previous app in app.old until the new one has started;
# when it does not start, or anything fails in between, app.old is put back and
# started again (rollback), and the error says so.

# Everything runs from main, called on the last line, so a download that breaks
# off halfway through `curl | bash` runs nothing.
set -euo pipefail

REPO=Jensbouma123/meeting-noter
BASE=${MEETING_NOTER_DOWNLOAD_BASE:-https://github.com/$REPO/releases/latest/download}
UV_VERSION=0.11.20
UV_BASE=${MEETING_NOTER_UV_BASE:-https://github.com/astral-sh/uv/releases/download/$UV_VERSION}
# Pinned: the combination verified to convert the encoder (ORT >= 1.22 dropped
# the matmul_4bits_quantizer module the script uses).
CONVERT_DEPS=(--with numpy==1.26.4 --with onnx==1.17.0 --with onnxconverter-common==1.14.0 --with onnxruntime==1.20.1)
ROOT=${MEETING_NOTER_ROOT:-"$HOME/Library/Application Support/Meeting Noter"}
MODEL_DIR_NAME=parakeet-tdt-0.6b-v3-webgpu
AGENTS="$HOME/Library/LaunchAgents"
# /Applications when this user may write there (admins can, without sudo), so
# the app shows up under Applications in Finder; else ~/Applications. Test runs
# (MEETING_NOTER_NO_LAUNCHD) stay inside $HOME.
if [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ] && [ -w /Applications ]; then APPS=/Applications; else APPS="$HOME/Applications"; fi
APP="$APPS/Meeting Noter.app"
PORT=${MEETING_NOTER_PORT:-3000}
URL="http://localhost:$PORT"
SERVER_LABEL=nl.jensbouma.meeting-noter.server
HELPER_LABEL=nl.jensbouma.meeting-noter.audio-helper

tmp=
# Set while app.old holds the previous version and the new app has not started yet.
swapped=
say() { printf '%s\n' "$*"; }
fail() {
  printf '\n❌ %s\n' "$1" >&2
  if rollback; then
    # server-update.ts matches "Vorige versie" to tell the app it was rolled back.
    printf '   ↩️  Vorige versie %s teruggezet / Previous version restored.\n' "$(cat "$ROOT/app/VERSION" 2>/dev/null)" >&2
  fi
  printf '   Er ging iets mis / Something went wrong. Uw opnames in de browser blijven bewaard.\n\n' >&2
  exit 1
}

# Puts the previous app back after a failed update and starts it again. Returns
# 1 when there was nothing to roll back. Runs from fail and the EXIT trap.
rollback() {
  [ -n "$swapped" ] && [ -d "$ROOT/app.old" ] || return 1
  swapped=
  server_stop
  rm -rf "$ROOT/app.failed"
  if [ -d "$ROOT/app" ]; then mv "$ROOT/app" "$ROOT/app.failed"; fi
  mv "$ROOT/app.old" "$ROOT/app"
  rm -rf "$ROOT/app.failed"
  server_start >/dev/null 2>&1 || say "⚠️  De vorige versie startte ook niet; open Meeting Noter opnieuw."
  return 0
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

# True when pid is a node running from our install (app or app.old), never a foreign process.
ours() {
  case $(ps -p "$1" -o command= 2>/dev/null) in *"$ROOT/app"*) return 0 ;; esac
  case $(lsof -p "$1" -a -d cwd,txt -Fn 2>/dev/null) in *"n$ROOT/app"*) return 0 ;; esac
  return 1
}
# Stops the on-demand server: the pid in server.pid plus whatever listens on our
# port, each only when it runs our app (the pid file can be missing or stale).
server_stop() {
  local pid n=0 pids=""
  pid=$(cat "$ROOT/server.pid" 2>/dev/null) || pid=""
  case $pid in ''|*[!0-9]*) ;; *) pids=$pid ;; esac
  pids="$pids $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  local live=""
  for pid in $pids; do ours "$pid" && live="$live $pid"; done
  for pid in $live; do kill "$pid" 2>/dev/null || true; done
  for pid in $live; do
    n=0
    while kill -0 "$pid" 2>/dev/null && [ "$n" -lt 10 ]; do sleep 1; n=$((n + 1)); done
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  done
  rm -f "$ROOT/server.pid"
}
server_start() {
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] && [ -z "${MEETING_NOTER_RUN_SERVER:-}" ] && return 0
  bash "$ROOT/app/launcher/launcher.sh" --no-open
}
# Stops the server whether it still runs as the old LaunchAgent or on demand.
server_halt() { agent_stop "$SERVER_LABEL"; server_stop; }

agent_stop() { [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] || launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true; }
agent_start() {
  [ -n "${MEETING_NOTER_NO_LAUNCHD:-}" ] && return 0
  local label=$1 domain="gui/$(id -u)" n=0 try
  launchctl bootout "$domain/$label" 2>/dev/null || true
  # bootout is asynchronous: until the label is gone, bootstrap fails with "Input/output error" (5).
  while launchctl print "$domain/$label" >/dev/null 2>&1 && [ "$n" -lt 10 ]; do sleep 1; n=$((n + 1)); done
  for try in 1 2 3; do
    launchctl bootstrap "$domain" "$AGENTS/$label.plist" 2>/dev/null && return 0
    [ "$try" -lt 3 ] && sleep 1
  done
  if launchctl print "$domain/$label" >/dev/null 2>&1; then
    launchctl kickstart -k "$domain/$label" 2>/dev/null && return 0
  fi
  fail "Kon achtergronddienst $label niet starten."
}

# Builds models/<dir>/encoder-model.q4f16.onnx on this Mac. Returns 1 (with a
# friendly message) on any problem; the app then keeps the CPU model.
build_model() {
  local dir="$ROOT/models/$MODEL_DIR_NAME" out work uv arch_uv uv_sha free_kb mem
  out="$dir/encoder-model.q4f16.onnx"
  [ -f "$out" ] && { say "✓ Snel GPU-spraakmodel is al aanwezig"; return 0; }
  say
  say "Snel GPU-spraakmodel voorbereiden (eenmalig, ca. 5-15 min, ca. 4 GB tijdelijk)"
  free_kb=$(df -k "$ROOT" | awk 'NR==2 {print $4}')
  if [ "${free_kb:-0}" -lt "${MEETING_NOTER_MIN_DISK_KB:-6000000}" ]; then
    say "⚠️  Te weinig vrije schijfruimte (minimaal 6 GB nodig). De app gebruikt het CPU-model."; return 1
  fi
  mem=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
  if [ "$mem" -lt 8000000000 ]; then
    say "⚠️  Te weinig werkgeheugen (minimaal 8 GB nodig). De app gebruikt het CPU-model."; return 1
  fi
  work="$ROOT/model-build"
  rm -rf "$work"; mkdir -p "$work" "$dir"
  uv=${MEETING_NOTER_UV:-$ROOT/bin/uv}
  if [ -z "${MEETING_NOTER_UV:-}" ] && ! "$uv" --version 2>/dev/null | grep -q "^uv $UV_VERSION "; then
    if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]; then
      arch_uv=aarch64; uv_sha=0a2b6a757d5693671a7ce0002554ae869604e1e69acb10313ac14d08374be01a
    else
      arch_uv=x86_64; uv_sha=bef01a86faab997f6022b45cfa29bfc5b090f2f72cd4a91d2ecefe641efdabe7
    fi
    curl -fsSL "$UV_BASE/uv-$arch_uv-apple-darwin.tar.gz" -o "$work/uv.tgz" \
      || { say "⚠️  Kon de modelbouwer (uv) niet downloaden."; rm -rf "$work"; return 1; }
    [ "$(shasum -a 256 "$work/uv.tgz" | awk '{print $1}')" = "$uv_sha" ] \
      || { say "⚠️  Controlesom van uv klopt niet."; rm -rf "$work"; return 1; }
    tar -xzf "$work/uv.tgz" -C "$work" --strip-components 1 "uv-$arch_uv-apple-darwin/uv" \
      || { say "⚠️  Uitpakken van uv mislukt."; rm -rf "$work"; return 1; }
    mv "$work/uv" "$ROOT/bin/uv"
  fi
  if ! UV_CACHE_DIR="$work/uv-cache" UV_PYTHON_INSTALL_DIR="$work/python" \
    "$uv" run --python 3.12 "${CONVERT_DEPS[@]}" python -I "$ROOT/app/convert-parakeet-v3.py" \
      --workdir "$work/src" --outdir "$work/out" > "$ROOT/logs/model-build.log" 2>&1 \
    || [ ! -f "$work/out/encoder-model.q4f16.onnx" ]; then
    say "⚠️  Het GPU-spraakmodel kon niet worden gebouwd (zie $ROOT/logs/model-build.log)."
    say "   De app gebruikt het CPU-model. Opnieuw proberen: voer de installatieregel opnieuw uit met '| bash -s -- --gpu-model'."
    rm -rf "$work"; return 1
  fi
  # The output hash varies with library versions, so no hash check: the script
  # validates the result against the fp32 model itself and fails otherwise.
  mv "$work/out/encoder-model.q4f16.onnx" "$out"
  rm -rf "$work"
  say "✓ GPU-spraakmodel gebouwd"
}

# Escapes &, < and > for a plist <string>.
xml() { local s=${1//&/&amp;}; s=${s//</&lt;}; printf '%s' "${s//>/&gt;}"; }

main() {
  # --gpu-model: retry the model build; the install itself is idempotent.
  [ "$(uname)" = Darwin ] || fail "Meeting Noter installeren werkt alleen op macOS. / macOS only."
  local macos arch asset expected actual helper_ok=1
  macos=$(sw_vers -productVersion)
  version_at_least 13.5 "$macos" || fail "macOS $macos is te oud; minimaal macOS 13.5 nodig."
  version_at_least 14.4 "$macos" || helper_ok=
  # hw.optional.arm64 is also 1 in a Rosetta shell, where uname -m says x86_64.
  [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ] \
    || fail "Intel Macs worden nog niet ondersteund. / Intel Macs are not supported yet."
  arch=arm64
  asset="meeting-noter-macos-$arch.tar.gz"

  say "=============================="
  say "  Meeting Noter installeren"
  say "=============================="

  tmp=$(mktemp -d)
  # An unexpected error (set -e) after the swap rolls back too.
  trap 'rollback || true; rm -rf "$tmp"' EXIT
  curl -fsSL "$BASE/$asset.sha256" -o "$tmp/sum" \
    || fail "Kon de nieuwste versie niet ophalen. Controleer uw internetverbinding (of de release wordt nog gebouwd: probeer het over 15 minuten opnieuw)."
  expected=$(awk '{print $1; exit}' "$tmp/sum")
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "Onverwachte controlesom-download."

  mkdir -p "$ROOT/logs" "$ROOT/bin" "$AGENTS"
  # An update cut off between the two moves below left only app.old.
  if [ ! -d "$ROOT/app" ] && [ -d "$ROOT/app.old" ]; then mv "$ROOT/app.old" "$ROOT/app"; fi
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
    server_halt
    if [ -d "$ROOT/app" ]; then mv "$ROOT/app" "$ROOT/app.old"; swapped=1; fi
    mv "$ROOT/app.new" "$ROOT/app"
    say "✓ Versie $(cat "$ROOT/app/VERSION") uitgepakt"
  fi

  # The server serves public/ from a list read at start-up, so link the models
  # dir in before it starts (and restart it after the model is built).
  mkdir -p "$ROOT/models/$MODEL_DIR_NAME" "$ROOT/app/server/public"
  rm -rf "$ROOT/app/server/public/models"
  ln -s "$ROOT/models" "$ROOT/app/server/public/models"

  # The helper keeps its old copy when it is byte-identical: macOS ties the
  # microphone permission of an ad-hoc signed binary to its exact contents.
  server_halt
  rm -f "$AGENTS/$SERVER_LABEL.plist"
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

  say "Wachten tot Meeting Noter klaar is…"
  server_start || fail "Meeting Noter $(cat "$ROOT/app/VERSION") startte niet. Logbestand: $ROOT/logs/server.log"
  # The new version runs: commit the update.
  swapped=
  rm -rf "$ROOT/app.old"
  printf '%s\n' "$expected" > "$ROOT/installed.sha256"
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

  if [ -z "${MEETING_NOTER_SKIP_GPU_MODEL:-}" ]; then
    local had_model=
    [ -f "$ROOT/models/$MODEL_DIR_NAME/encoder-model.q4f16.onnx" ] && had_model=1
    if build_model && [ -z "$had_model" ]; then
      server_halt
      server_start || fail "Meeting Noter startte niet. Logbestand: $ROOT/logs/server.log"
    fi
  fi

  say
  say "✅ Meeting Noter $(cat "$ROOT/app/VERSION") is geïnstalleerd en draait op $URL"
  say "   Open het voortaan via 'Meeting Noter' in Apps of Spotlight."
  say "   Bijwerken: voer dezelfde opdracht opnieuw uit. Verwijderen:"
  say "   bash ~/Library/Application\\ Support/Meeting\\ Noter/uninstall.sh"
  if [ -z "${MEETING_NOTER_NO_OPEN:-}" ] && [ -z "${MEETING_NOTER_NO_LAUNCHD:-}" ]; then open "$URL"; fi
}

# MEETING_NOTER_SOURCE_ONLY=1 sources the functions without running the install (tests).
[ -n "${MEETING_NOTER_SOURCE_ONLY:-}" ] || main "$@"

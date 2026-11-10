#!/bin/bash
# Double-click launcher for Meeting Noter (macOS). No Terminal knowledge needed.
# Installs a private Node.js into ./.runtime if the Mac has none, builds the
# app on first run, starts it and opens it in Chrome. Close this window or
# press Ctrl-C to stop.
cd "$(dirname "$0")" || exit 1
ROOT=$(pwd)
export PORT="${PORT:-3000}"
URL="http://localhost:$PORT"

fail() {
  echo
  echo "❌ $1"
  echo "   Er ging iets mis / Something went wrong. Maak een screenshot van dit venster als u hulp vraagt."
  echo
  read -r -p "Druk op Enter om te sluiten / Press Enter to close… " _
  exit 1
}

echo "=============================="
echo "  Meeting Noter"
echo "=============================="

if [ "$(uname)" != "Darwin" ]; then fail "Dit script werkt alleen op macOS. / macOS only."; fi

# Already running? Just open it.
if curl -fs -o /dev/null "$URL" 2>/dev/null; then
  echo "Meeting Noter draait al, ik open de pagina."
  open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
  exit 0
fi

# ---- 1. Node.js (>= 20.9) -------------------------------------------------
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local v major minor
  v=$(node -p 'process.versions.node' 2>/dev/null) || return 1
  major=${v%%.*}; minor=${v#*.}; minor=${minor%%.*}
  [ "$major" -gt 20 ] || { [ "$major" -eq 20 ] && [ "$minor" -ge 9 ]; }
}

RUNTIME="$ROOT/.runtime"
# A previously downloaded private Node takes priority over the system one.
if [ -x "$RUNTIME/node/bin/node" ]; then export PATH="$RUNTIME/node/bin:$PATH"; fi

if ! node_ok; then
  echo "Node.js ontbreekt of is te oud. Ik download een eigen kopie (eenmalig, ~40 MB)…"
  case "$(uname -m)" in
    arm64) ARCH=arm64 ;;
    x86_64) ARCH=x64 ;;
    *) fail "Onbekende processor: $(uname -m)" ;;
  esac
  BASE="https://nodejs.org/dist/latest-v22.x"
  TMP=$(mktemp -d) || fail "Kon geen tijdelijke map maken."
  curl -fsSL "$BASE/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt" \
    || fail "Kon nodejs.org niet bereiken. Controleer uw internetverbinding."
  LINE=$(grep "node-v.*-darwin-$ARCH.tar.gz\$" "$TMP/SHASUMS256.txt" | head -n1)
  [ -n "$LINE" ] || fail "Geen geschikte Node.js-versie gevonden."
  FILE=${LINE##* }
  SUM=${LINE%% *}
  echo "Downloaden: $FILE"
  curl -fSL --progress-bar "$BASE/$FILE" -o "$TMP/$FILE" || fail "Download van Node.js mislukt."
  [ "$(shasum -a 256 "$TMP/$FILE" | cut -d' ' -f1)" = "$SUM" ] || fail "Controlesom van Node.js klopt niet; download is beschadigd."
  mkdir -p "$RUNTIME" && rm -rf "$RUNTIME/node" "$RUNTIME/node-tmp" && mkdir "$RUNTIME/node-tmp" \
    && tar -xzf "$TMP/$FILE" -C "$RUNTIME/node-tmp" --strip-components=1 \
    && mv "$RUNTIME/node-tmp" "$RUNTIME/node" || fail "Uitpakken van Node.js mislukt."
  rm -rf "$TMP"
  export PATH="$RUNTIME/node/bin:$PATH"
  node_ok || fail "Node.js is geïnstalleerd maar start niet."
fi
echo "✓ Node.js $(node -v)"

# ---- 2. Updates (best effort; silent when offline) ------------------------
if [ -z "$MEETING_NOTER_UPDATED" ]; then
  NEWER=$(node scripts/update.mjs check 2>/dev/null)
  if [ -n "$NEWER" ]; then
    echo
    read -r -p "Nieuwe versie $NEWER beschikbaar. Nu updaten? (j/n) " ans
    case "$ans" in
      j|J|y|Y)
        node scripts/update.mjs apply || fail "Updaten mislukt. U kunt de oude versie gewoon blijven gebruiken: start dit bestand opnieuw en kies n."
        # Run the (possibly new) launcher from the top; skip the check this time.
        export MEETING_NOTER_UPDATED=1
        exec bash "$0"
        ;;
    esac
  fi
fi

# ---- 3. Dependencies ------------------------------------------------------
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Onderdelen installeren (eenmalig, kan enkele minuten duren)…"
  npm ci --no-audit --no-fund || fail "Installeren van onderdelen mislukt (npm ci)."
fi
echo "✓ Onderdelen aanwezig"

# ---- 4. Build -------------------------------------------------------------
needs_build() {
  [ -f .next/BUILD_ID ] || return 0
  [ -n "$(find src public package.json next.config.ts -newer .next/BUILD_ID -type f 2>/dev/null | head -n1)" ]
}
if needs_build; then
  echo "App bouwen (eenmalig, ongeveer een minuut)…"
  npm run build || fail "Bouwen van de app mislukt (npm run build)."
fi
echo "✓ App gebouwd"

# ---- 5. Audio helper (optional) ------------------------------------------
if ! xcode-select -p >/dev/null 2>&1 || ! xcrun --find swiftc >/dev/null 2>&1; then
  echo
  echo "ℹ️  De audio-helper (systeemaudio opnemen) heeft Apple's Command Line Tools nodig."
  echo "   Zonder helper werkt de app nog steeds met microfoon en het delen van een browsertabblad."
  read -r -p "   Nu installeren? (j/N) " ans
  case "$ans" in
    j|J|y|Y)
      xcode-select --install 2>/dev/null
      echo "   Volg het venster van macOS. Start dit bestand daarna opnieuw voor de helper."
      ;;
  esac
  echo "   Ik ga verder zonder helper."
  # dev.mjs skips the helper when it cannot be built; make that explicit.
  export MEETING_NOTER_NO_HELPER=1
fi

# ---- 6. Start -------------------------------------------------------------
node scripts/dev.mjs --prod &
SERVER=$!
echo $SERVER > "$ROOT/.runtime-server.pid"
cleanup() {
  kill "$SERVER" 2>/dev/null
  wait "$SERVER" 2>/dev/null
  rm -f "$ROOT/.runtime-server.pid"
}
trap 'cleanup; exit 0' INT TERM HUP
trap cleanup EXIT

echo "Wachten tot de app klaar is…"
for _ in $(seq 1 120); do
  curl -fs -o /dev/null "$URL" 2>/dev/null && break
  kill -0 "$SERVER" 2>/dev/null || fail "De server is onverwacht gestopt."
  sleep 1
done
curl -fs -o /dev/null "$URL" 2>/dev/null || fail "De server startte niet binnen 2 minuten."

echo
echo "✅ Meeting Noter draait op $URL"
echo "   Laat dit venster open tijdens het gebruik. Sluit het (of Ctrl-C) om te stoppen."
echo "   De eerste keer vraagt de app toestemming om spraakmodellen te downloaden."
open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
wait "$SERVER"

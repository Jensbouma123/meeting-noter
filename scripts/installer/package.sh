#!/bin/bash
# Builds build/installer/meeting-noter-macos-<arch>.tar.gz and its .sha256 for
# scripts/installer/install.sh: the Next.js standalone server, a pinned Node.js runtime,
# the ad-hoc signed audio helper, the .app launcher and the meetings MCP server. Run on a Mac of the
# target arch (the server's native modules, such as sharp, are installed per
# arch by `npm ci`); needs Node.js, npm dependencies and the Xcode command line
# tools. Used by .github/workflows/release.yml.
#   SKIP_BUILD=1   reuse an existing `STANDALONE=1 next build`
#   NODE_VERSION   overrides scripts/installer/node-version
set -euo pipefail
cd "$(dirname "$0")/../.."

case "$(uname -m)" in arm64) arch=arm64 ;; x86_64) arch=x64 ;; *) echo "unknown arch" >&2; exit 1 ;; esac
node_version=${NODE_VERSION:-$(cat scripts/installer/node-version)}
version=$(node -p 'require("./package.json").version')
out=build/installer
stage="$out/stage/meeting-noter"
cache="$out/cache"
asset="meeting-noter-macos-$arch.tar.gz"

# The WebGPU encoders are not in the tarball: install.sh builds the q4f16 one on
# the user's Mac and links it into the server's public/models, so the app fetches
# it same-origin.
if [ -z "${SKIP_BUILD:-}" ]; then
  STANDALONE=1 \
    NEXT_PUBLIC_Q4F16_ENCODER_URL=/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx \
    NEXT_PUBLIC_FP16_ENCODER_URL=/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.fp16.onnx \
    npx next build
fi
[ -f .next/standalone/server.js ] || { echo "no .next/standalone/server.js; build with STANDALONE=1" >&2; exit 1; }

rm -rf "$out/stage" "$out/$asset" "$out/$asset.sha256"
mkdir -p "$stage/node/bin" "$stage/helper" "$stage/launcher" "$cache"

# 1. Web app: standalone server plus the static files it does not copy itself.
cp -R .next/standalone "$stage/server"
cp -R public "$stage/server/public"
rm -rf "$stage/server/public/models"   # dev-only conversion output; install.sh links the real one
cp -R .next/static "$stage/server/.next/static"

# 2. Node.js runtime, checked against nodejs.org's SHASUMS256.txt.
node_tgz="node-v$node_version-darwin-$arch.tar.gz"
if [ ! -f "$cache/$node_tgz" ]; then
  curl -fsSL "https://nodejs.org/dist/v$node_version/SHASUMS256.txt" -o "$cache/SHASUMS256-$node_version.txt"
  curl -fSL "https://nodejs.org/dist/v$node_version/$node_tgz" -o "$cache/$node_tgz.part"
  want=$(awk -v f="$node_tgz" '$2 == f {print $1}' "$cache/SHASUMS256-$node_version.txt")
  have=$(shasum -a 256 "$cache/$node_tgz.part" | awk '{print $1}')
  [ -n "$want" ] && [ "$want" = "$have" ] || { echo "Node.js checksum mismatch" >&2; exit 1; }
  mv "$cache/$node_tgz.part" "$cache/$node_tgz"
fi
tar -xzf "$cache/$node_tgz" -C "$stage/node" --strip-components 1 \
  "node-v$node_version-darwin-$arch/bin/node" "node-v$node_version-darwin-$arch/LICENSE"

# 3. Audio helper (ad-hoc signed by build.sh).
sh helper/build.sh
cp helper/build/meeting-noter-audio-helper "$stage/helper/"
codesign --verify "$stage/helper/meeting-noter-audio-helper"

# 4. Launcher, update check and icon for the .app install.sh creates.
cp scripts/installer/launcher.sh scripts/installer/check-update.mjs src/lib/update/version.mjs "$stage/launcher/"
iconset="$out/stage/AppIcon.iconset"
mkdir -p "$iconset"
swift scripts/installer/make-icon.swift "$out/stage/icon.png"
for s in 16 32 128 256 512; do
  sips -z $s $s "$out/stage/icon.png" --out "$iconset/icon_${s}x${s}.png" >/dev/null
  sips -z $((s * 2)) $((s * 2)) "$out/stage/icon.png" --out "$iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$stage/launcher/AppIcon.icns"

# 5. Meetings MCP server for AI agents (docs/MCP.md): one file, run by the bundled node.
mkdir -p "$stage/mcp"
MCP_OUT="$stage/mcp/meetings-mcp.mjs" npx rolldown -c scripts/mcp/rolldown.config.mjs
"$stage/node/bin/node" -e 'import(require("url").pathToFileURL(require("path").resolve(process.argv[1])).href)' "$stage/mcp/meetings-mcp.mjs" </dev/null >/dev/null 2>&1 \
  || { echo "staged MCP server does not load" >&2; exit 1; }

cp scripts/installer/convert-parakeet-v3.py "$stage/convert-parakeet-v3.py"
cp scripts/installer/uninstall.sh "$stage/uninstall.sh"
echo "$version" > "$stage/VERSION"
echo "$arch" > "$stage/ARCH"

# Smoke test: the bundled server must start on its own from the staged copy.
port=$((40000 + RANDOM % 9000))
(cd "$stage/server" && PORT=$port HOSTNAME=127.0.0.1 exec ../node/bin/node server.js) >"$out/stage/smoke.log" 2>&1 &
pid=$!
ok=
for _ in $(seq 1 30); do
  if curl -fs -o /dev/null "http://127.0.0.1:$port/"; then ok=1; break; fi
  sleep 1
done
kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null || true
[ -n "$ok" ] || { cat "$out/stage/smoke.log" >&2; echo "staged server did not start" >&2; exit 1; }

COPYFILE_DISABLE=1 tar -czf "$out/$asset" -C "$out/stage" meeting-noter
(cd "$out" && shasum -a 256 "$asset" > "$asset.sha256")
echo "built $out/$asset ($(du -h "$out/$asset" | cut -f1)), version $version, node $node_version"

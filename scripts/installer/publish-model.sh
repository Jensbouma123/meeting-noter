#!/bin/bash
# Builds the WebGPU speech model (encoder-model.q4f16.onnx) on this machine and
# publishes it as a GitHub release asset, so install.sh downloads it instead of
# converting it on every user's Mac. Run by hand by a maintainer; no CI.
#
#   scripts/installer/publish-model.sh N [--build-only] [--outdir DIR]
#
# Builds with the bundled convert-parakeet-v3.py and the same pinned uv run as
# install.sh's local fallback (CONVERT_DEPS, Python 3.12), writes
# encoder-model.q4f16.onnx.sha256 next to it and uploads both to the
# prerelease model-parakeet-v3-webgpu-N (created when missing; a prerelease
# never becomes "latest", so releases/latest keeps pointing at the app).
# --build-only stops before the upload. Afterwards set MODEL_VERSION=N and
# MODEL_SHA256 in install.sh to the printed values: the output bytes vary with
# library versions, so the pin follows the uploaded file, never the other way
# round. Every install then replaces an older model on its next run.
#
# Needs uv on PATH (or UV=/path/to/uv), gh logged in for the upload, ~6 GB free
# disk and ~8 GB RAM. The source model is parakeet-tdt-0.6b-v3 by NVIDIA
# (CC-BY-4.0); the release notes carry that attribution.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
# install.sh is the single source of the tag, URL, repo and converter pins.
MEETING_NOTER_SOURCE_ONLY=1 source "$here/install.sh"

version=${1:-}
[[ "$version" =~ ^[1-9][0-9]*$ ]] || { printf 'Usage: %s N [--build-only] [--outdir DIR]\n' "$0" >&2; exit 2; }
shift
tag=$MODEL_TAG_PREFIX-$version
build_only=
outdir=
while [ $# -gt 0 ]; do
  case $1 in
    --build-only) build_only=1 ;;
    --outdir) outdir=$2; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done
outdir=${outdir:-${TMPDIR:-/tmp}/meeting-noter-model}
uv=${UV:-uv}
asset=encoder-model.q4f16.onnx
work="$outdir/work"

mkdir -p "$outdir"
rm -rf "$work"
# The converter refuses to overwrite outputs without --force; a fresh outdir
# per build keeps a half-built file from being reused.
UV_PYTHON_PREFERENCE=only-managed UV_CACHE_DIR="$work/uv-cache" UV_PYTHON_INSTALL_DIR="$work/python" \
  "$uv" run --python 3.12 "${CONVERT_DEPS[@]}" python -I "$here/convert-parakeet-v3.py" \
    --workdir "$work/src" --outdir "$work/out"
mv "$work/out/$asset" "$outdir/$asset"
rm -rf "$work"
(cd "$outdir" && shasum -a 256 "$asset" > "$asset.sha256")
sha=$(awk '{print $1}' "$outdir/$asset.sha256")
printf 'Built %s (%s bytes)\nsha256 %s\n' "$outdir/$asset" "$(stat -f %z "$outdir/$asset")" "$sha"

if [ -n "$build_only" ]; then
  printf 'Not uploaded (--build-only).\n'
  exit 0
fi

if ! gh release view "$tag" -R "$REPO" >/dev/null 2>&1; then
  gh release create "$tag" -R "$REPO" --prerelease --latest=false \
    --title "WebGPU speech model (parakeet-tdt-0.6b-v3)" \
    --notes "Prebuilt WebGPU encoder downloaded by install.sh. Converted from parakeet-tdt-0.6b-v3 by NVIDIA (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), licensed CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/); 4-bit weight quantization applied."
fi
gh release upload "$tag" -R "$REPO" --clobber "$outdir/$asset" "$outdir/$asset.sha256"
printf 'Uploaded to https://github.com/%s/releases/download/%s/%s\n' "$REPO" "$tag" "$asset"
printf 'Now set MODEL_VERSION=%s and MODEL_SHA256=%s in install.sh.\n' "$version" "$sha"

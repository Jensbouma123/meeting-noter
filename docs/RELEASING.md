# Releasing

Users are told about new versions through GitHub Releases on
`Jensbouma123/meeting-noter` (`Start Meeting Noter.command` and the in-app banner
both read `releases/latest`). The version in `package.json` must match the tag.

1. Make sure `main` is green: `npm test && npm run build`.
2. Bump the version (no git tag yet): `npm version X.Y.Z --no-git-tag-version`
3. Commit and push: `git commit -am "Release vX.Y.Z" && git push origin main`
4. Tag and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. Create the release (this is what users see):
   `gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes`

Notes: only the *latest non-draft, non-prerelease* release counts. Tags must look
like `vMAJOR.MINOR.PATCH`. The launcher updates by `git pull` (clean checkout) or
by replacing files from the release zipball, keeping `.runtime/`, `node_modules/`
and `.next/`.

## Hosted speech model variants (GitHub Pages)

The fast WebGPU encoders (`encoder-model.q4f16.onnx`, 516 MB; `encoder-model.fp16.onnx`,
1.24 GB) are self-built with `scripts/convert-parakeet-v3.py` and are **not** in the
upstream Hugging Face repo or this repo. In a production build without a URL for
them, the app does not offer them: the default is the upstream CPU variant
(`encoder-model.int8.onnx`, ~670 MB total download; transcribes after Stop).

To enable the fast variant on the hosted site: upload the file somewhere that serves
CORS and `Range` (e.g. a Hugging Face model repo, `.../resolve/main/encoder-model.q4f16.onnx`)
and set it in the `npm run build:pages` step of `.github/workflows/pages.yml`:

```yaml
      - run: npm run build:pages
        env:
          NEXT_PUBLIC_Q4F16_ENCODER_URL: https://huggingface.co/<user>/<repo>/resolve/main/encoder-model.q4f16.onnx
```

`NEXT_PUBLIC_FP16_ENCODER_URL` does the same for fp16. If a configured file later
404s, the app falls back automatically to the next available variant. Dev
(`next dev`) keeps serving `public/models/…` without any variable.

## Mac installer speech model (built on the user's Mac)

No model file is hosted. The installed app is built (by `scripts/installer/package.sh`)
with the encoder URLs pointing at same-origin `/models/parakeet-tdt-0.6b-v3-webgpu/...`.
After the app is running, `install.sh` fetches a pinned `uv`, runs the bundled
`convert-parakeet-v3.py` (pinned numpy/onnx/onnxconverter-common/onnxruntime, in
`CONVERT_DEPS`) and keeps only `encoder-model.q4f16.onnx` in
`~/Library/Application Support/Meeting Noter/models/`, symlinked into the server's
`public/models`. Bump `UV_VERSION` and its two hashes together; ORT >= 1.22 breaks
the script (`matmul_4bits_quantizer` removed) and numpy 2 breaks onnxconverter-common 1.14.

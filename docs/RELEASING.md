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

## Mac installer speech model (built on the user's Mac)

No model file is hosted. The installed app is built (by `scripts/installer/package.sh`)
with the encoder URLs pointing at same-origin `/models/parakeet-tdt-0.6b-v3-webgpu/...`.
After the app is running, `install.sh` fetches a pinned `uv`, runs the bundled
`convert-parakeet-v3.py` (pinned numpy/onnx/onnxconverter-common/onnxruntime, in
`CONVERT_DEPS`) and keeps only `encoder-model.q4f16.onnx` in
`~/Library/Application Support/Meeting Noter/models/`, symlinked into the server's
`public/models`. Bump `UV_VERSION` and its two hashes together; ORT >= 1.22 breaks
the script (`matmul_4bits_quantizer` removed) and numpy 2 breaks onnxconverter-common 1.14.

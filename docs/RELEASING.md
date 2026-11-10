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

import type { InstallKind } from './types';

const WRITE_EXIT_AFTER_APPLY =
  '"$MN_NODE" scripts/update.mjs apply; echo $? > "$MN_EXIT.tmp" && mv "$MN_EXIT.tmp" "$MN_EXIT"';

export const UPDATE_SCRIPTS: Partial<Record<InstallKind, string>> = {
  installer: [
    'code=1',
    'tmp=$(mktemp -d) || { echo 1 > "$MN_EXIT"; exit 1; }',
    'echo "Installatieprogramma ophalen…"',
    'if curl -fsSL "$MN_INSTALL_URL" -o "$tmp/install.sh"; then',
    '  MEETING_NOTER_NO_OPEN=1 /bin/bash "$tmp/install.sh"; code=$?',
    'else',
    '  echo "❌ Kon het installatieprogramma niet downloaden. Controleer uw internetverbinding."',
    'fi',
    'rm -rf "$tmp"',
    'echo "$code" > "$MN_EXIT.tmp" && mv "$MN_EXIT.tmp" "$MN_EXIT"',
  ].join('\n'),
  git: WRITE_EXIT_AFTER_APPLY,
  source: WRITE_EXIT_AFTER_APPLY,
};

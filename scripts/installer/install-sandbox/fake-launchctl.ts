import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sandbox, writeExecutable } from './sandbox';

export function fakeLaunchctl({ fails = 0, stuck = false } = {}) {
  const calls = path.join(sandbox.home, 'launchctl-calls');
  const loaded = path.join(sandbox.home, 'launchctl-loaded');
  const count = path.join(sandbox.home, 'launchctl-bootstraps');
  writeExecutable(path.join(sandbox.shims, 'launchctl'), [
    '#!/bin/sh',
    `echo "$*" >> "${calls}"`,
    'case "$1" in',
    `  bootout) ${stuck ? ':' : `rm -f "${loaded}"`} ;;`,
    `  print) ${stuck ? 'exit 0' : `[ -f "${loaded}" ]`} ;;`,
    `  bootstrap) n=$(cat "${count}" 2>/dev/null || echo 0); echo $((n + 1)) > "${count}"`,
    `    if [ "$n" -lt ${fails} ]; then echo "Bootstrap failed: 5: Input/output error" >&2; exit 5; fi`,
    `    touch "${loaded}" ;;`,
    '  kickstart) exit 0 ;;',
    'esac',
    '',
  ].join('\n'));
  return () => readFileSync(calls, 'utf8').trim().split('\n');
}

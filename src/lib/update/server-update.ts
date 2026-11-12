/**
 * Server side of "Bijwerken" in the app: what kind of install this server runs
 * from, whether a newer release can be applied, and a detached updater whose
 * progress survives the server being restarted underneath it.
 *
 * The updater writes three files into the state dir: `update.json` (who, from,
 * to, pid), `update.log` (its output) and `update.exit` (its exit code, written
 * last). Status is derived from those files on every request, so the server
 * that install.sh starts after the update reports the same job to the tab
 * that started it.
 *
 * - installer (curl install.sh): download the newest install.sh and run it; it
 *   stops this server, swaps the app and starts the new one (launcher.sh).
 * - git / source (Start Meeting Noter.command): `scripts/update.mjs apply`;
 *   the user restarts the app, which rebuilds it.
 */
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findNewerRelease, installerAssetsReady, RELEASES_API } from './version.mjs';

export const INSTALL_URL = 'https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh';

export type InstallKind = 'installer' | 'git' | 'source' | 'dev' | 'unknown';

export type InstallInfo = {
  kind: InstallKind;
  current: string;
  /** installer: ~/Library/Application Support/Meeting Noter; else null. */
  root: string | null;
  arch: string | null;
  /** Repo root for git/source installs (where scripts/update.mjs lives). */
  appDir: string;
  /** Where update.json/.log/.exit live; null when this install cannot update. */
  stateDir: string | null;
};

const readTrim = (file: string) => {
  try {
    return readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
};

export function detectInstall({
  cwd = process.cwd(),
  env = process.env,
  version = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
}: { cwd?: string; env?: NodeJS.ProcessEnv; version?: string } = {}): InstallInfo {
  // launcher.sh exports MEETING_NOTER_ROOT; the cwd fallback covers a server
  // started some other way from the installed app/server dir.
  const fromCwd = path.basename(cwd) === 'server' ? path.resolve(cwd, '..', '..') : null;
  for (const root of [env.MEETING_NOTER_ROOT, fromCwd]) {
    if (!root) continue;
    const current = readTrim(path.join(root, 'app', 'VERSION'));
    const arch = readTrim(path.join(root, 'app', 'ARCH'));
    if (current && arch) {
      return { kind: 'installer', current, root, arch, appDir: path.join(root, 'app'), stateDir: path.join(root, 'logs') };
    }
  }
  const base = { current: version, root: null, arch: null, appDir: cwd };
  if (env.NODE_ENV !== 'production') return { ...base, kind: 'dev', stateDir: null };
  if (existsSync(path.join(cwd, 'scripts', 'update.mjs'))) {
    const kind = existsSync(path.join(cwd, '.git')) ? 'git' : 'source';
    return { ...base, kind, stateDir: path.join(cwd, '.runtime') };
  }
  return { ...base, kind: 'unknown', stateDir: null };
}

export type UpdateCheck = {
  current: string;
  latest: string | null;
  available: boolean;
  name: string | null;
  notes: string | null;
  publishedAt: string | null;
  pageUrl: string | null;
  installKind: InstallKind;
  canApply: boolean;
  applyBlockedReason: ApplyBlockedReason | null;
  restartAutomatic: boolean;
};

/** Codes, not text: the UI translates them (nl/en). */
export type ApplyBlockedReason = 'already-running' | 'dev-mode' | 'unsupported-install';

type Release = NonNullable<Awaited<ReturnType<typeof findNewerRelease>>>;

/** Release notes can be long; the UI shows a summary and links to the page. */
const MAX_NOTES = 20_000;

export function buildCheck(info: InstallInfo, rel: Release | null, running: boolean): UpdateCheck {
  const available = !!rel && (info.kind !== 'installer' || installerAssetsReady(rel.assetNames, info.arch));
  let blocked: ApplyBlockedReason | null = null;
  if (available) {
    if (running) blocked = 'already-running';
    else if (info.kind === 'dev') blocked = 'dev-mode';
    else if (info.kind === 'unknown') blocked = 'unsupported-install';
  }
  return {
    current: info.current,
    latest: available ? rel.version : null,
    available,
    name: available ? rel.name : null,
    notes: available && rel.notes ? rel.notes.slice(0, MAX_NOTES) : null,
    publishedAt: available ? rel.publishedAt : null,
    pageUrl: available ? rel.pageUrl : null,
    installKind: info.kind,
    canApply: available && blocked === null,
    applyBlockedReason: blocked,
    restartAutomatic: info.kind === 'installer',
  };
}

export async function fetchRelease(current: string, fetchFn?: typeof fetch): Promise<Release | null> {
  return findNewerRelease(current, { fetchFn, url: process.env.MEETING_NOTER_RELEASES_URL || RELEASES_API });
}

// ---- Progress ----------------------------------------------------------------

export type UpdateMeta = {
  kind: InstallKind;
  pid: number;
  fromVersion: string;
  toVersion: string;
  startedAt: string;
};

export type UpdatePhase = 'starting' | 'downloading' | 'installing' | 'restarting' | 'model';

export type UpdateCode =
  | 'preparing'
  | 'downloading'
  | 'installing'
  | 'restarting'
  | 'building-model'
  | 'updated'
  | 'updated-restart-required'
  | 'already-latest'
  | 'failed'
  /** failed, but install.sh put the previous version back and restarted it. */
  | 'rolled-back'
  | 'interrupted';

export type UpdateStatus = {
  state: 'idle' | 'running' | 'done' | 'failed';
  phase: UpdatePhase | null;
  percent: number | null;
  /** What to tell the user; the UI translates it. Empty while idle. */
  code: UpdateCode | '';
  /** failed: the installer's own (Dutch) error line, for a details disclosure. */
  detail: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  restartRequired: boolean;
  logTail: string;
};

export const IDLE_STATUS: UpdateStatus = {
  state: 'idle',
  phase: null,
  percent: null,
  code: '',
  detail: null,
  fromVersion: null,
  toVersion: null,
  startedAt: null,
  finishedAt: null,
  restartRequired: false,
  logTail: '',
};

/** Visible lines: curl's progress bar redraws one line with \r. */
function logLines(log: string): string[] {
  return log
    .split(/\n/)
    .map((l) => (l.split('\r').filter((s) => s.trim()).pop() ?? '').trimEnd())
    .filter((l) => l.trim());
}

/** Last `NN.N%` curl printed after `marker`, or null. */
function lastPercent(log: string, marker: string | null): number | null {
  const from = marker === null ? 0 : log.lastIndexOf(marker);
  if (from < 0) return null;
  const all = [...log.slice(from).matchAll(/(\d{1,3}(?:[.,]\d+)?)%/g)];
  if (!all.length) return null;
  return Math.min(100, Number(all[all.length - 1][1].replace(',', '.')));
}

/** Status of an update job from its files. Pure; `alive` is whether the updater process still runs. */
export function deriveStatus(
  meta: UpdateMeta | null,
  log: string,
  exit: { code: number; at: string } | null,
  alive: boolean,
): UpdateStatus {
  if (!meta) return IDLE_STATUS;
  const lines = logLines(log);
  const base = {
    ...IDLE_STATUS,
    fromVersion: meta.fromVersion,
    toVersion: meta.toVersion,
    startedAt: meta.startedAt,
    logTail: lines.slice(-20).join('\n'),
  };
  const installer = meta.kind === 'installer';

  if (exit) {
    const finished = { ...base, finishedAt: exit.at };
    if (exit.code === 0) {
      if (installer) {
        const same = log.includes('al de nieuwste versie');
        return { ...finished, state: 'done', code: same ? 'already-latest' : 'updated' };
      }
      if (log.includes('Al up-to-date')) return { ...finished, state: 'done', code: 'already-latest' };
      return { ...finished, state: 'done', restartRequired: true, code: 'updated-restart-required' };
    }
    const reason = [...lines].reverse().find((l) => l.trimStart().startsWith('❌'));
    const code = installer && log.includes('Vorige versie') ? 'rolled-back' : 'failed';
    return { ...finished, state: 'failed', code, detail: reason ? reason.replace('❌', '').trim() : null };
  }
  if (!alive) return { ...base, state: 'failed', code: 'interrupted' };

  const running = { ...base, state: 'running' as const };
  if (!installer) return { ...running, phase: 'downloading', percent: lastPercent(log, null), code: 'downloading' };
  if (log.includes('GPU-spraakmodel voorbereiden')) return { ...running, phase: 'model', code: 'building-model' };
  if (log.includes('uitgepakt') || log.includes('al de nieuwste versie')) {
    return { ...running, phase: 'restarting', code: 'restarting' };
  }
  if (log.includes('Downloaden:')) {
    const percent = lastPercent(log, 'Downloaden:');
    if (percent !== null && percent >= 100) return { ...running, phase: 'installing', code: 'installing' };
    return { ...running, phase: 'downloading', percent, code: 'downloading' };
  }
  return { ...running, phase: 'starting', code: 'preparing' };
}

const files = (stateDir: string) => ({
  meta: path.join(stateDir, 'update.json'),
  log: path.join(stateDir, 'update.log'),
  exit: path.join(stateDir, 'update.exit'),
});

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readMeta(file: string): UpdateMeta | null {
  try {
    const m = JSON.parse(readFileSync(file, 'utf8'));
    return m && typeof m.pid === 'number' ? (m as UpdateMeta) : null;
  } catch {
    return null;
  }
}

export function readUpdateStatus(stateDir: string | null): UpdateStatus {
  if (!stateDir) return IDLE_STATUS;
  const f = files(stateDir);
  const meta = readMeta(f.meta);
  if (!meta) return IDLE_STATUS;
  let exit: { code: number; at: string } | null = null;
  const code = readTrim(f.exit);
  if (code !== null && /^\d+$/.test(code)) exit = { code: Number(code), at: statSync(f.exit).mtime.toISOString() };
  return deriveStatus(meta, readTrim(f.log) ?? '', exit, exit === null && pidAlive(meta.pid));
}

export function updateRunning(stateDir: string | null): boolean {
  return readUpdateStatus(stateDir).state === 'running';
}

/** The updater script per kind; reads its paths from MN_* env vars. */
const SCRIPTS: Partial<Record<InstallKind, string>> = {
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
  git: '"$MN_NODE" scripts/update.mjs apply; echo $? > "$MN_EXIT.tmp" && mv "$MN_EXIT.tmp" "$MN_EXIT"',
  source: '"$MN_NODE" scripts/update.mjs apply; echo $? > "$MN_EXIT.tmp" && mv "$MN_EXIT.tmp" "$MN_EXIT"',
};

/**
 * Starts the updater detached (own process group, output to update.log), so it
 * outlives this server when install.sh stops it. Throws when it cannot start.
 */
export function startUpdate(info: InstallInfo, toVersion: string): UpdateStatus {
  const script = SCRIPTS[info.kind];
  if (!script || !info.stateDir) throw new Error(`cannot update a ${info.kind} install`);
  const f = files(info.stateDir);
  mkdirSync(info.stateDir, { recursive: true });
  for (const file of [f.meta, f.exit, `${f.exit}.tmp`]) rmSync(file, { force: true });
  const fd = openSync(f.log, 'w');
  const passThrough = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('MEETING_NOTER_')));
  const env: NodeJS.ProcessEnv =
    info.kind === 'installer'
      ? {
          // install.sh needs only system tools; keep Next's own variables out.
          NODE_ENV: process.env.NODE_ENV,
          HOME: process.env.HOME ?? '',
          USER: process.env.USER ?? '',
          LANG: process.env.LANG ?? 'nl_NL.UTF-8',
          TMPDIR: process.env.TMPDIR ?? '/tmp',
          PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
          ...passThrough,
        }
      : { ...process.env };
  let pid: number | undefined;
  try {
    const child = spawn('/bin/bash', ['-c', script], {
      cwd: info.appDir,
      detached: true,
      stdio: ['ignore', fd, fd],
      env: {
        ...env,
        MN_EXIT: f.exit,
        MN_NODE: process.execPath,
        MN_INSTALL_URL: process.env.MEETING_NOTER_INSTALL_URL || INSTALL_URL,
      },
    });
    child.unref();
    pid = child.pid;
  } finally {
    closeSync(fd);
  }
  if (!pid) throw new Error('updater did not start');
  const meta: UpdateMeta = { kind: info.kind, pid, fromVersion: info.current, toVersion, startedAt: new Date().toISOString() };
  writeFileSync(f.meta, JSON.stringify(meta));
  return readUpdateStatus(info.stateDir);
}

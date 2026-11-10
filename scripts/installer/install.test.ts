// Runs install.sh and uninstall.sh against a fake release (file:// download
// base) in a scratch HOME. sw_vers and sysctl are replaced through PATH so the
// macOS version and arch checks can be driven; launchd is never touched.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const INSTALL = path.join(here, 'install.sh');
const UNINSTALL = path.join(here, 'uninstall.sh');

let dir: string;
let home: string;
let base: string;
let shims: string;
const root = () => path.join(home, 'Library/Application Support/Meeting Noter');

function exe(file: string, body: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body);
  chmodSync(file, 0o755);
}

/** Writes meeting-noter-macos-<arch>.tar.gz and its .sha256 into `base`. */
function release(version: string, { arch = 'arm64', helper = 'helper-v1' } = {}) {
  const stage = path.join(dir, `stage-${arch}`, 'meeting-noter');
  rmSync(path.dirname(stage), { recursive: true, force: true });
  exe(path.join(stage, 'node/bin/node'), '#!/bin/sh\nexit 0\n');
  exe(path.join(stage, 'helper/meeting-noter-audio-helper'), `#!/bin/sh\n# ${helper}\n`);
  mkdirSync(path.join(stage, 'server'), { recursive: true });
  writeFileSync(path.join(stage, 'server/server.js'), '');
  mkdirSync(path.join(stage, 'launcher'), { recursive: true });
  writeFileSync(path.join(stage, 'launcher/AppIcon.icns'), 'icns');
  writeFileSync(path.join(stage, 'uninstall.sh'), readFileSync(UNINSTALL));
  writeFileSync(path.join(stage, 'VERSION'), `${version}\n`);
  writeFileSync(path.join(stage, 'ARCH'), `${arch}\n`);
  const asset = `meeting-noter-macos-${arch}.tar.gz`;
  execFileSync('tar', ['-czf', path.join(base, asset), '-C', path.dirname(stage), 'meeting-noter'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  execFileSync('/bin/sh', ['-c', `shasum -a 256 ${asset} > ${asset}.sha256`], { cwd: base });
}

function run(script: string, env: Record<string, string> = {}) {
  const r = spawnSync('/bin/bash', [script], {
    env: {
      NODE_ENV: 'test',
      PATH: `${shims}:/usr/bin:/bin:/usr/sbin:/sbin`,
      HOME: home,
      MEETING_NOTER_DOWNLOAD_BASE: `file://${base}`,
      MEETING_NOTER_NO_LAUNCHD: '1',
      MEETING_NOTER_NO_OPEN: '1',
      MEETING_NOTER_SKIP_GPU_MODEL: '1',
      ...env,
    },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

function fakeMac({ version = '15.1', arm64 = '1' } = {}) {
  exe(path.join(shims, 'sw_vers'), `#!/bin/sh\necho ${version}\n`);
  exe(path.join(shims, 'sysctl'), `#!/bin/sh\ncase "$*" in *hw.memsize*) echo 17179869184 ;; *) echo ${arm64} ;; esac\n`);
}

describe.skipIf(process.platform !== 'darwin')('install.sh', () => {
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'mn-install-'));
    home = path.join(dir, 'home');
    base = path.join(dir, 'release');
    shims = path.join(dir, 'shims');
    mkdirSync(home);
    mkdirSync(base);
    fakeMac();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // A stand-in for `uv run ... convert-parakeet-v3.py --outdir DIR`.
  function fakeUv(body: string) {
    const file = path.join(dir, 'fake-uv');
    exe(file, `#!/bin/bash\nall="$*"\nwhile [ $# -gt 0 ]; do [ "$1" = --outdir ] && out=$2; shift; done\n${body}\n`);
    return file;
  }
  const modelFile = () => path.join(root(), 'models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx');

  it('builds the speech model on this Mac, keeps it across updates and links it into public/models', () => {
    release('0.2.1');
    const uv = fakeUv('mkdir -p "$out"; echo "$all" >> "$HOME/uv-calls"; printf fake-encoder > "$out/encoder-model.q4f16.onnx"');
    const env = { MEETING_NOTER_UV: uv, MEETING_NOTER_SKIP_GPU_MODEL: '' };
    const first = run(INSTALL, env);
    expect(first.code, first.out).toBe(0);
    expect(readFileSync(modelFile(), 'utf8')).toBe('fake-encoder');
    expect(readFileSync(path.join(home, 'uv-calls'), 'utf8')).toMatch(/--python 3\.12 --with numpy==.* --with onnx==.* --with onnxruntime==.*convert-parakeet-v3\.py/);
    expect(existsSync(path.join(root(), 'model-build'))).toBe(false);
    // Served same-origin: the server's public/models resolves to the same dir.
    expect(readFileSync(path.join(root(), 'app/server/public/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx'), 'utf8')).toBe('fake-encoder');
    // Update: new app, model kept, converter not run again.
    release('0.2.2');
    const second = run(INSTALL, env);
    expect(second.code, second.out).toBe(0);
    expect(second.out).toContain('al aanwezig');
    expect(readFileSync(path.join(home, 'uv-calls'), 'utf8').trim().split('\n')).toHaveLength(1);
    expect(readFileSync(path.join(root(), 'app/server/public/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx'), 'utf8')).toBe('fake-encoder');
  });

  it('keeps the CPU model and still installs when the conversion fails or the disk is too full', () => {
    release('0.2.1');
    const failing = run(INSTALL, { MEETING_NOTER_UV: fakeUv('echo boom >&2; exit 1'), MEETING_NOTER_SKIP_GPU_MODEL: '' });
    expect(failing.code, failing.out).toBe(0);
    expect(failing.out).toContain('CPU-model');
    expect(existsSync(modelFile())).toBe(false);
    expect(existsSync(path.join(root(), 'model-build'))).toBe(false);
    const full = run(INSTALL, {
      MEETING_NOTER_UV: fakeUv('exit 0'),
      MEETING_NOTER_SKIP_GPU_MODEL: '',
      MEETING_NOTER_MIN_DISK_KB: '99999999999',
      MEETING_NOTER_FORCE: '1',
    });
    expect(full.code, full.out).toBe(0);
    expect(full.out).toContain('schijfruimte');
  });

  it('installs the app, both LaunchAgents and the .app', () => {
    release('0.2.0');
    const r = run(INSTALL);
    expect(r.out).toContain('Meeting Noter 0.2.0 is geïnstalleerd');
    expect(r.code).toBe(0);
    expect(readFileSync(path.join(root(), 'app/VERSION'), 'utf8').trim()).toBe('0.2.0');
    expect(readFileSync(path.join(root(), 'bin/meeting-noter-audio-helper'), 'utf8')).toContain('helper-v1');
    expect(existsSync(path.join(root(), 'uninstall.sh'))).toBe(true);
    for (const label of ['server', 'audio-helper']) {
      const plist = path.join(home, `Library/LaunchAgents/nl.jensbouma.meeting-noter.${label}.plist`);
      expect(spawnSync('plutil', ['-lint', '-s', plist]).status).toBe(0);
    }
    const server = readFileSync(path.join(home, 'Library/LaunchAgents/nl.jensbouma.meeting-noter.server.plist'), 'utf8');
    expect(server).toContain(`<string>${root()}/app/server/server.js</string>`);
    expect(server).toContain('<key>PORT</key><string>3000</string>');
    const app = path.join(home, 'Applications/Meeting Noter.app/Contents');
    expect(readFileSync(path.join(app, 'Info.plist'), 'utf8')).toContain('<string>0.2.0</string>');
    expect(statSync(path.join(app, 'MacOS/meeting-noter')).mode & 0o111).not.toBe(0);
  });

  it('downloads nothing when the newest version is already installed', () => {
    release('0.2.0');
    expect(run(INSTALL).code).toBe(0);
    rmSync(path.join(base, 'meeting-noter-macos-arm64.tar.gz'));
    const r = run(INSTALL);
    expect(r.out).toContain('al de nieuwste versie (0.2.0)');
    expect(r.code).toBe(0);
  });

  it('updates to a newer release and keeps an unchanged helper file', () => {
    release('0.2.0');
    expect(run(INSTALL).code).toBe(0);
    const helper = path.join(root(), 'bin/meeting-noter-audio-helper');
    const before = statSync(helper).ino;
    release('0.3.0');
    expect(run(INSTALL).code).toBe(0);
    expect(readFileSync(path.join(root(), 'app/VERSION'), 'utf8').trim()).toBe('0.3.0');
    expect(statSync(helper).ino).toBe(before);
    release('0.4.0', { helper: 'helper-v2' });
    expect(run(INSTALL).code).toBe(0);
    expect(readFileSync(helper, 'utf8')).toContain('helper-v2');
  });

  it('refuses a download whose checksum does not match and keeps the old install', () => {
    release('0.2.0');
    expect(run(INSTALL).code).toBe(0);
    release('0.3.0');
    writeFileSync(path.join(base, 'meeting-noter-macos-arm64.tar.gz.sha256'), `${'0'.repeat(64)}  x\n`);
    const r = run(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Controlesom klopt niet');
    expect(readFileSync(path.join(root(), 'app/VERSION'), 'utf8').trim()).toBe('0.2.0');
  });

  it('picks the x64 tarball on Intel Macs', () => {
    fakeMac({ arm64: '0' });
    release('0.2.0', { arch: 'x64' });
    const r = run(INSTALL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('meeting-noter-macos-x64.tar.gz');
  });

  it('skips the audio helper before macOS 14.4 and stops before 13.5', () => {
    release('0.2.0');
    fakeMac({ version: '14.3.1' });
    const r = run(INSTALL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('macOS 14.4 of nieuwer');
    expect(existsSync(path.join(home, 'Library/LaunchAgents/nl.jensbouma.meeting-noter.audio-helper.plist'))).toBe(false);

    fakeMac({ version: '13.4' });
    const old = run(INSTALL, { MEETING_NOTER_FORCE: '1' });
    expect(old.code).not.toBe(0);
    expect(old.out).toContain('te oud');
  });

  it('fails clearly when the release has no tarball yet', () => {
    const r = run(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Kon de nieuwste versie niet ophalen');
  });

  it('uninstall.sh removes everything install.sh created', () => {
    release('0.2.0');
    expect(run(INSTALL).code).toBe(0);
    const r = run(path.join(root(), 'uninstall.sh'));
    expect(r.code).toBe(0);
    expect(existsSync(root())).toBe(false);
    expect(existsSync(path.join(home, 'Applications/Meeting Noter.app'))).toBe(false);
    expect(existsSync(path.join(home, 'Library/LaunchAgents/nl.jensbouma.meeting-noter.server.plist'))).toBe(false);
  });
});

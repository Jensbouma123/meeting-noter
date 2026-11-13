import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { connectAssistant, disconnectAssistant, listAssistants } from './index';
import { fakeDeps, tempDesktop } from './test-deps';

const dirs: string[] = [];
const setup = (withApp = true) => {
  const t = tempDesktop(withApp);
  dirs.push(t.dir);
  return t;
};
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe('Claude Desktop config', () => {
  it('asks for confirmation first and writes nothing', async () => {
    const t = setup();
    fs.writeFileSync(t.file, '{"x":1}');
    const res = await connectAssistant('claude-desktop', fakeDeps(t.env));
    expect(res).toMatchObject({ needsConfirm: true, configPath: t.file });
    expect(fs.readFileSync(t.file, 'utf8')).toBe('{"x":1}');
  });

  it('merges the entry, keeps other servers and writes a timestamped backup', async () => {
    const t = setup();
    const original = JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x' } } });
    fs.writeFileSync(t.file, original);
    const res = await connectAssistant('claude-desktop', fakeDeps(t.env), true);
    expect(res).toEqual({ ok: true, status: 'connected' });
    const cfg = JSON.parse(fs.readFileSync(t.file, 'utf8'));
    expect(cfg.theme).toBe('dark');
    expect(cfg.mcpServers.other).toEqual({ command: 'x' });
    expect(cfg.mcpServers['meeting-noter']).toEqual({ command: 'node', args: ['/app/mcp.mjs'] });
    const backup = `${t.file}.backup-2026-01-02T03-04-05-678Z`;
    expect(fs.readFileSync(backup, 'utf8')).toBe(original);
    const listed = (await listAssistants(fakeDeps(t.env))).find((a) => a.id === 'claude-desktop');
    expect(listed?.status).toBe('connected');
  });

  it('refuses to overwrite an unreadable config', async () => {
    const t = setup();
    fs.writeFileSync(t.file, '{broken');
    expect(await connectAssistant('claude-desktop', fakeDeps(t.env), true)).toEqual({ ok: false, error: 'config-unreadable' });
    expect(fs.readFileSync(t.file, 'utf8')).toBe('{broken');
  });

  it('disconnect removes only our entry', async () => {
    const t = setup();
    fs.writeFileSync(t.file, JSON.stringify({ mcpServers: { other: {}, 'meeting-noter': { command: 'node' } } }));
    expect(await disconnectAssistant('claude-desktop', fakeDeps(t.env))).toEqual({ ok: true, status: 'not-connected' });
    expect(Object.keys(JSON.parse(fs.readFileSync(t.file, 'utf8')).mcpServers)).toEqual(['other']);
  });

  it('reports not-found when Claude Desktop is not installed', async () => {
    const t = setup(false);
    const listed = (await listAssistants(fakeDeps(t.env))).find((a) => a.id === 'claude-desktop');
    expect(listed).toMatchObject({ status: 'not-found', canAutoConnect: false });
  });
});

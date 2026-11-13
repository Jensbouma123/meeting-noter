import { sleep } from './reporter.mjs';

export function createAppClient(app) {
  async function getJson(url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  const appStatus = () => getJson(`${app}/api/app/status`);

  async function clickUpdateAndWaitForEnd() {
    const res = await fetch(`${app}/api/app/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' },
      body: '{}',
    });
    const started = await res.json();
    if (res.status !== 202) return { started, final: null, phases: [] };
    const phases = new Set();
    const until = Date.now() + 120_000;
    while (Date.now() < until) {
      await sleep(500);
      const s = await getJson(`${app}/api/app/update/status`);
      if (!s) { phases.add('(server down)'); continue; }
      if (s.phase) phases.add(s.phase);
      if (s.state === 'done' || s.state === 'failed') return { started, final: s, phases: [...phases] };
    }
    return { started, final: null, phases: [...phases] };
  }

  return { appStatus, clickUpdateAndWaitForEnd };
}

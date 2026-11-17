import { LEGACY_PORT } from '@/lib/lifecycle/constants';
import { EXPORT_PATH, IMPORT_TIMEOUT_MS, REQUEST_TYPE } from './constants';
import { isLocalHostname } from './origins';
import { parseExportMessage } from './parse-export';
import type { LegacyEntry } from './types';

export function requestExport(
  win: Window,
  timeoutMs = IMPORT_TIMEOUT_MS,
  port = LEGACY_PORT,
): Promise<LegacyEntry[] | null> {
  const hostname = win.location.hostname;
  if (!isLocalHostname(hostname)) return Promise.resolve(null);
  const origin = `http://${hostname}:${port}`;
  const doc = win.document;
  const frame = doc.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  return new Promise((resolve) => {
    const finish = (entries: LegacyEntry[] | null) => {
      win.clearTimeout(timer);
      win.removeEventListener('message', onMessage);
      frame.remove();
      resolve(entries);
    };
    const onMessage = (event: MessageEvent) => {
      if (!frame.contentWindow || event.source !== frame.contentWindow) return;
      finish(parseExportMessage({ origin: event.origin, data: event.data }, [origin]));
    };
    const timer = win.setTimeout(() => finish(null), timeoutMs);
    win.addEventListener('message', onMessage);
    frame.addEventListener('load', () => frame.contentWindow?.postMessage({ type: REQUEST_TYPE }, origin));
    frame.src = `${origin}${EXPORT_PATH}`;
    doc.body.appendChild(frame);
  });
}

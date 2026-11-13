import { useEffect, useRef } from 'react';
import { nextHref } from '../chain';
import { DEFAULT_ENCODER } from '../defaultEncoder';
import { errorMessage } from '../errorMessage';
import type { BenchResultSinkParams } from '../types';

export function useBenchResultSink({
  autostart,
  phase,
  benchResult,
  variant,
  next,
  appendLog,
}: BenchResultSinkParams) {
  const posted = useRef(false);
  useEffect(() => {
    if (!autostart || posted.current) return;
    if (phase !== 'done' && phase !== 'error') return;
    posted.current = true;
    const body = JSON.stringify({
      ...benchResult,
      variant,
      userAgent: navigator.userAgent,
      postedAt: new Date().toISOString(),
      href: window.location.href,
    });
    (async () => {
      try {
        const res = await fetch('/api/dev/bench-result', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        appendLog(res.ok ? `posted result: ${text}` : `result POST ${res.status}: ${text.slice(0, 200)}`);
      } catch (err) {
        appendLog(`result POST failed: ${errorMessage(err)}`);
      }
      const href = next ? nextHref(next, window.location.href, DEFAULT_ENCODER) : null;
      if (href) {
        appendLog(`chaining to ${href}`);
        window.location.replace(href);
      }
    })();
  }, [autostart, phase, benchResult, variant, next, appendLog]);
}

'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@jensbouma123/acciva-ui';
import { isSafariEngine } from '@/lib/asr/browser/backend-detect';
import { HOSTED } from '@/lib/site';
import { probeHelper } from '@/lib/meeting/helper-source';

/**
 * Whether the Safari notice applies: hosted site, Safari, and the local helper
 * not reachable. A short-timeout connect to the helper decides the last part —
 * if WebKit blocks ws://127.0.0.1 from this https page (mixed content) the
 * probe fails like a missing helper, so the notice stays, which is correct.
 */
export async function shouldShowSafariNotice(
  hosted: boolean,
  safari: boolean,
  probe: () => Promise<boolean> = probeHelper,
): Promise<boolean> {
  if (!hosted || !safari) return false;
  return !(await probe());
}

/**
 * Hosted site only. An https page cannot reliably reach the local audio helper
 * (ws://127.0.0.1) from Safari, and Safari's own share carries no audio, so
 * Safari would record nothing useful here.
 */
export function HostedBrowserNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void shouldShowSafariNotice(HOSTED, isSafariEngine()).then((v) => {
      if (!cancelled && v) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!show) return null;
  return (
    <Alert layout="banner" variant="warning" role="alert" dismissible onDismiss={() => setShow(false)}>
      Safari kan hier niet betrouwbaar opnemen. Open deze pagina in Chrome of Edge, of gebruik de lokale installatie
      (met audio-helper) voor Safari. / Safari can't record reliably on the hosted site: use Chrome or Edge, or the
      local install for Safari system audio.
    </Alert>
  );
}

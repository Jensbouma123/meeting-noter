'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@jensbouma123/acciva-ui';
import { isSafariEngine } from '@/lib/asr/browser/backend-detect';
import { HOSTED } from '@/lib/site';

/**
 * Hosted site only. An https page cannot reliably reach the local audio helper
 * (ws://127.0.0.1) from Safari, and Safari's own share carries no audio, so
 * Safari would record nothing useful here.
 */
export function HostedBrowserNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot UA check after hydration
    if (HOSTED && isSafariEngine()) setShow(true);
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

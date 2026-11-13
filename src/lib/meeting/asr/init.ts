import { initRegistry } from '@/lib/asr/browser';
import { setOverlapTranscriber } from '../overlap-retranscribe';
import { asrState } from './state';
import { clearLoadMarker, markLoadInProgress, readLoadMarker } from './load-marker';
import { resolveAsrBackend } from './backend';
import { recognizeOverlapClip } from './overlap-clip';

function watchPageLifecycle(): void {
  if (typeof window.addEventListener !== 'function') return;
  window.addEventListener('pagehide', () => {
    if (asrState.ownsLoadMarker) clearLoadMarker();
  });
  window.addEventListener('pageshow', (ev) => {
    if ((ev as PageTransitionEvent).persisted && asrState.loading) markLoadInProgress();
  });
}

setOverlapTranscriber(recognizeOverlapClip);
asrState.previousLoadCrashed = readLoadMarker();
if (typeof window !== 'undefined') {
  initRegistry();
  void resolveAsrBackend();
  watchPageLifecycle();
}

import { stopTracks } from './capture-readout';
import type { SourceAcquirer } from './source-acquirer';
import type { SourceNodes } from './types/capture';

export function teardownSource(entry: SourceNodes, acquirer: SourceAcquirer): void {
  if (entry.kind === 'helper') {
    acquirer.forgetHelper(entry.helper);
    entry.helper.close();
    return;
  }
  acquirer.forgetStream(entry.stream);
  try {
    entry.node.port.onmessage = null;
    entry.node.port.close();
    entry.node.disconnect();
    entry.ctxSource.disconnect();
  } catch {}
  stopTracks(entry.stream);
}

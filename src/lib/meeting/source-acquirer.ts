import type { HelperSource } from './helper-source';
import { stopTracks } from './capture-readout';
import { requestMicStream } from './mic-stream';
import { requestSystemStream } from './system-stream';
import type { CaptureMode } from './types/basics';

export class SourceAcquirer {
  run = 0;
  mode: CaptureMode | null = null;
  micDeviceId: string | undefined;
  micCancelsEcho = false;
  displaySurface: string | null = null;
  callAudioUnsupported = false;
  private acquired = new Set<MediaStream>();
  private acquiredHelpers = new Set<HelperSource>();

  begin(mode: CaptureMode, micDeviceId: string | undefined): number {
    const run = ++this.run;
    this.mode = mode;
    this.micDeviceId = micDeviceId;
    this.micCancelsEcho = false;
    this.displaySurface = null;
    this.callAudioUnsupported = false;
    return run;
  }

  isStale(run: number): boolean {
    return run !== this.run;
  }

  async keep(run: number, request: Promise<MediaStream>): Promise<MediaStream> {
    const stream = await request;
    if (this.isStale(run)) {
      stopTracks(stream);
      throw new Error('capture stopped');
    }
    this.acquired.add(stream);
    return stream;
  }

  async keepHelper(run: number, request: Promise<HelperSource>): Promise<HelperSource> {
    const helper = await request;
    if (this.isStale(run)) {
      helper.close();
      throw new Error('capture stopped');
    }
    this.acquiredHelpers.add(helper);
    return helper;
  }

  micStream(micDeviceId: string | undefined, callAttached: boolean): Promise<MediaStream> {
    return requestMicStream(this.mode, micDeviceId, callAttached);
  }

  systemStream(): Promise<MediaStream> {
    return requestSystemStream((surface) => {
      this.displaySurface = surface;
    });
  }

  forgetStream(stream: MediaStream): void {
    this.acquired.delete(stream);
  }

  forgetHelper(helper: HelperSource): void {
    this.acquiredHelpers.delete(helper);
  }

  releaseAll(): void {
    this.run++;
  }

  stopEverything(): void {
    for (const stream of this.acquired) stopTracks(stream);
    this.acquired.clear();
    for (const helper of this.acquiredHelpers) helper.close();
    this.acquiredHelpers.clear();
  }
}

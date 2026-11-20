export interface FakeWorkerScope {
  onmessage: ((ev: { data: unknown }) => void) | null;
  postMessage: (data: unknown) => void;
}

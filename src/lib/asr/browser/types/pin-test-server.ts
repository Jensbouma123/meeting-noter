export interface PinTestServer {
  sha: string | null;
  offline: boolean;
  body: Uint8Array<ArrayBuffer>;
  bodyFetches: number;
}

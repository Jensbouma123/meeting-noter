export type FetchMock = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface DownloadStub {
  fetch: FetchMock;
  calls: () => number;
  ranges: () => Array<string | null>;
}


export interface RepoStub {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  ranges: () => Array<string | null>;
}

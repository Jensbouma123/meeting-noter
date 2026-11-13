export interface MetaStore {
  getMeta(key: string): string | null;
  setMeta(key: string, value: string): void;
}

export interface WhatsNewPayload {
  show: boolean;
  version: string;
  notes: string | null;
  pageUrl: string | null;
}

export type FakeWorkerListener = (ev: { data?: unknown; message?: string; preventDefault?: () => void }) => void;

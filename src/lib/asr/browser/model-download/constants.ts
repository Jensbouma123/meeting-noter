export const MAX_HASH_VERIFY_BYTES = 200 * 1024 * 1024;
export const DOWNLOAD_STALL_MS = 60_000;
export const PROGRESS_BROADCAST_INTERVAL_MS = 250;
export const REPO_TREE_TIMEOUT_MS = 15_000;
export const CACHED_META_DEADLINE_MS = 3_000;

export const CACHE_DB_NAME = 'mn-model-cache-db';
export const CACHE_DB_VERSION = 1;
export const CHUNK_STORE = 'chunks';
export const FILE_STORE = 'files';
export const PARTIAL_STORE = 'partials';
export const CACHE_DB_STORES = [CHUNK_STORE, FILE_STORE, PARTIAL_STORE] as const;
export const LEGACY_DB_NAMES = ['parakeet-cache-db', 'parakeet-partials-db'] as const;
export const LEGACY_SWEEP_DONE_KEY = '__mn-legacy-sweep-done__';
export const DELETE_DEADLINE_MS = 3000;
export const CACHE_CHUNK_BYTES = 16 * 1024 * 1024;

export const BROADCAST_CHANNEL_NAME = 'mn-model-download';
export const DOWNLOAD_CANCEL_REASON = 'mn-user-cancel';
export const LOCK_HEARTBEAT_MS = 1000;
export const LOCK_WAIT_MS = 350;
export const PARTIAL_PERSIST_INTERVAL_MS = 3000;
export const FOLLOWER_POLL_MS = 2000;

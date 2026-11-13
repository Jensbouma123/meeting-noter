import type { FILE_STORE, PARTIAL_STORE } from '../model-download/constants';

export type MetaStore = typeof FILE_STORE | typeof PARTIAL_STORE;

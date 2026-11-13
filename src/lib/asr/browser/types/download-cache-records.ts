export type ChunkBytes = Uint8Array<ArrayBuffer>;

export interface CachedFileRecord {
  size: number;
  chunkCount: number;
  updatedAt: number;
}

export interface PartialFileRecord {
  loadedBytes: number;
  totalBytes: number;
  etag: string | null;
  sealedChunks: number;
  updatedAt: number;
}

export interface ChunkRange {
  index: number;
  start: number;
  end: number;
}

export interface CachedFile {
  record: CachedFileRecord;
  parts: ChunkBytes[];
}

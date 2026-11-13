function storageApi(): StorageManager | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = storageApi();
    if (!storage?.persist) return false;
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

export async function getPersistentStorageStatus(): Promise<boolean | null> {
  try {
    const storage = storageApi();
    if (!storage?.persisted) return null;
    return await storage.persisted();
  } catch {
    return null;
  }
}

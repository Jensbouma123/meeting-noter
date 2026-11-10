/**
 * Ask the browser not to evict this origin's storage. Resolves to the
 * resulting status; false when unsupported or refused. Never throws.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persist) return false;
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

/** Current persisted status, or null when the browser cannot tell. */
export async function getPersistentStorageStatus(): Promise<boolean | null> {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persisted) return null;
    return await storage.persisted();
  } catch {
    return null;
  }
}

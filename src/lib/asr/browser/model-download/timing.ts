export function describeDownloadStall(filename: string, ms: number): string {
  return (
    `Download of ${filename} stalled: no data arrived for ${Math.round(ms / 1000)} seconds. ` +
    'This usually means the connection dropped without closing, or the browser storage holding ' +
    'the download stopped responding — check your connection and try again. What already arrived ' +
    'is kept, so retrying resumes where this left off.'
  );
}

export function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  const t = timer as unknown as { unref?: () => void };
  if (typeof t.unref === 'function') t.unref();
}

export function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

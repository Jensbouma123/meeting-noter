let inferenceTail: Promise<void> = Promise.resolve();

export function serialised<T>(task: () => Promise<T>): Promise<T> {
  const result = inferenceTail.then(task);
  inferenceTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

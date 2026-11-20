export const vocabularyFill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

export const vocabularyWordCount = (t: (key: string) => string, n: number) =>
  n === 1 ? t('vocab.one') : vocabularyFill(t('vocab.many'), { n });

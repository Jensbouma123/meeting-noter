'use client';

import { t } from './index';
import { useLanguage } from './useLanguage';
import type { Namespace } from './types';

export function useT<N extends Namespace>(namespace: N) {
  const language = useLanguage();
  return (key: string) => t(namespace, key, language);
}

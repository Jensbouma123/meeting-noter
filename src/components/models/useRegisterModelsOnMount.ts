'use client';

import { useEffect } from 'react';
import { registerModelsOnce } from './registerModelsOnce';

export function useRegisterModelsOnMount() {
  useEffect(() => {
    void registerModelsOnce();
  }, []);
}

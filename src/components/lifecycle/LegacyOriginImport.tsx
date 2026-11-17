'use client';

import { useEffect } from 'react';
import { importLegacyOrigin } from '@/lib/legacy-origin/import-legacy-origin';

export function LegacyOriginImport() {
  useEffect(() => {
    let active = true;
    importLegacyOrigin()
      .then((written) => {
        if (active && written) window.location.reload();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return null;
}

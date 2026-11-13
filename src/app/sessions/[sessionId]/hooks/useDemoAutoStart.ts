import { useEffect, useEffectEvent } from 'react';

export function useDemoAutoStart(startRecording: () => Promise<void>) {
  const autoStartDemo = useEffectEvent(() => {
    void startRecording();
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        const timer = setTimeout(autoStartDemo, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      return;
    }
  }, []);
}

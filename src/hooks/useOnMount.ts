import { useEffect, useEffectEvent } from 'react';

export function useOnMount(run: () => void) {
  const fire = useEffectEvent(run);
  useEffect(() => {
    fire();
  }, []);
}

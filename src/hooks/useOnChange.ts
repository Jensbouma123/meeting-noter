import { useEffect, useEffectEvent } from 'react';

export function useOnChange<T>(value: T, run: (value: T) => void) {
  const fire = useEffectEvent(run);
  useEffect(() => {
    fire(value);
  }, [value]);
}

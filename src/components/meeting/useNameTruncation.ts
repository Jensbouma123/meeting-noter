import { useEffect, useEffectEvent, useRef, useState } from 'react';

export function useNameTruncation(label: string, rail: boolean) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [nameTruncated, setNameTruncated] = useState(false);

  const measure = useEffectEvent(() => {
    const element = nameRef.current;
    if (element) setNameTruncated(element.scrollWidth > element.clientWidth);
  });

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label, rail]);

  return { nameRef, nameTruncated };
}

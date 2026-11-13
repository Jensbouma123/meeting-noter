import { useEffect, useRef, useState } from 'react';

export function useNameTruncation(label: string, rail: boolean) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [nameTruncated, setNameTruncated] = useState(false);

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    const measure = () => setNameTruncated(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label, rail]);

  return { nameRef, nameTruncated };
}

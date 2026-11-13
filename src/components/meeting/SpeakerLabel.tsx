'use client';

import { useEffect, useRef, useState } from 'react';
import { Text } from '@jensbouma123/acciva-ui';

export function SpeakerLabel({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label]);
  return (
    <Text as="span" size="sm" variant="muted" truncate className="block min-w-0" title={truncated ? label : undefined}>
      <span ref={ref} className="block min-w-0 truncate">{label}</span>
    </Text>
  );
}

import { useEffect, useState } from 'react';
import { WARM_SHARD } from '../../../../../scripts/echo-eval/lib/grid-url';
import { WARM_FALLBACK_MS, isTrustedSource, parseShardMessage } from './shardMessage';

export function useShardProgress(fallbackMs = WARM_FALLBACK_MS): { texts: Record<number, string>; warm: boolean } {
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = parseShardMessage(e.data);
      if (!msg || !isTrustedSource(e, window)) return;
      setTexts((prev) => (prev[msg.shard] === msg.text ? prev : { ...prev, [msg.shard]: msg.text }));
      if (msg.shard === WARM_SHARD && msg.ready) setWarm(true);
    };
    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => setWarm(true), fallbackMs);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [fallbackMs]);
  return { texts, warm };
}

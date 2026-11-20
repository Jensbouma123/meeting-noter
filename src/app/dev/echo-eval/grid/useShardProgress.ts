import { useEffect, useState } from 'react';
import { isTrustedSource, parseShardMessage } from './shardMessage';

export function useShardProgress(): Record<number, string> {
  const [texts, setTexts] = useState<Record<number, string>>({});
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = parseShardMessage(e.data);
      if (!msg || !isTrustedSource(e, window)) return;
      setTexts((prev) => (prev[msg.shard] === msg.text ? prev : { ...prev, [msg.shard]: msg.text }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return texts;
}

import { useEffect } from 'react';
import { SHARD_HEARTBEAT_MS, shardMessage } from './grid/shardMessage';

export function useShardReporter(shardIndex: number | undefined, text: string, phase: string): void {
  useEffect(() => {
    if (shardIndex === undefined || window.parent === window) return;
    const post = () => window.parent.postMessage(shardMessage(shardIndex, text, phase), '*');
    post();
    const timer = window.setInterval(post, SHARD_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [shardIndex, text, phase]);
}

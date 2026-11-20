export interface ShardCellProps {
  index: number;
  count: number;
  src: string;
  text: string | undefined;
}

export interface ShardMessage {
  type: string;
  shard: number;
  text: string;
  phase: string;
  ready: boolean;
}

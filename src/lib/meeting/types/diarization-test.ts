export type DiarizationTestTurn = {
  speaker: string;
  source: 'mic' | 'system';
  start: number;
  end: number;
  id?: string;
  final?: boolean;
  continues?: boolean;
};

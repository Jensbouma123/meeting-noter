export interface TurnPart {
  segmentId: string;
  start: number;
  offset: number;
}

export interface Turn {
  speakerId: string;
  text: string;
  end: number;
  parts: TurnPart[];
}

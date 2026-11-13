export interface ActionItem {
  id: string;
  text: string;
  ownerSpeakerId?: string;
  ownerName?: string;
  due?: string;
  done: boolean;
  sourceSegmentId?: string;
}

export interface Decision {
  id: string;
  text: string;
  sourceSegmentId?: string;
}

export interface Notes {
  actions: ActionItem[];
  decisions: Decision[];
}

export type ActionItemInput = Partial<Omit<ActionItem, 'id' | 'done' | 'text'>> & { done?: boolean };
export type DecisionInput = Omit<Decision, 'id'>;
export type ActionItemPatch = Partial<Omit<ActionItem, 'id'>>;
export type NotePatch = ActionItemPatch;

export interface NoteSuggestion {
  text: string;
  sourceSegmentId: string;
  kind: 'action' | 'decision';
}

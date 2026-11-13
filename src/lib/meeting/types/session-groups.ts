export interface GroupableSession {
  sessionId: string;
  title: string;
  createdAt: number;
}

export interface SessionGroup<T> {
  key: string;
  label: string;
  sessions: T[];
}

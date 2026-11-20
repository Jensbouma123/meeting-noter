export interface ExternalTurn {
  start: number;
  end: number;
  spk: string;
  text?: string;
}

export interface ExternalReference {
  id?: string;
  lang?: 'nl' | 'en';
  turns: ExternalTurn[];
}

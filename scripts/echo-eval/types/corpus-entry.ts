export interface CorpusEntry {
  id: string;
  language: 'nl' | 'en';
  speaker: string;
  seconds: number;
  source: string;
  license: string;
}

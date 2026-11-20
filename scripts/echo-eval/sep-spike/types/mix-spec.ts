export interface MixSpec {
  id: string;
  lang: 'nl' | 'en';
  loud: string;
  quiet: string;
  quietDb: number;
  overlap: number;
  quietFirst: boolean;
  bleed: boolean;
  seed: number;
}

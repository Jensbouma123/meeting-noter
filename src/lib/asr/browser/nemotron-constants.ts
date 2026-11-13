export const NEMOTRON = Object.freeze({
  sampleRate: 16000,
  nMels: 128,
  nFft: 512,
  hop: 160,
  win: 400,
  preemph: 0.97,
  logEps: 2 ** -24,

  chunkSamples: 8960,
  melFramesPerChunk: 56,
  preEncodeCache: 9,
  layers: 24,
  hidden: 1024,
  leftContext: 56,
  convContext: 8,
  predLayers: 2,
  predHidden: 640,
  vocabSize: 13088,
  blankId: 13087,
  maxSymbolsPerStep: 10,

  frameSeconds: 0.08,
});

export const NEMOTRON_LANG_IDS: Readonly<Record<string, number>> = Object.freeze({
  en: 0,
  'en-US': 0,
  'en-GB': 1,
  es: 3,
  fr: 8,
  de: 9,
  it: 15,
  nl: 16,
  pt: 13,
  auto: 101,
});

export function nemotronLangId(language: string | undefined): number {
  if (!language) return NEMOTRON_LANG_IDS.auto;
  return NEMOTRON_LANG_IDS[language] ?? NEMOTRON_LANG_IDS[language.split('-')[0]] ?? NEMOTRON_LANG_IDS.auto;
}

export const NEMOTRON_EMISSION_LEAD_S = 4 * NEMOTRON.frameSeconds;

export const LANGID_TOKEN_IDS: Readonly<Record<string, number>> = Object.freeze({
  en: 50259, zh: 50260, de: 50261, es: 50262, ru: 50263, ko: 50264, fr: 50265, ja: 50266,
  pt: 50267, tr: 50268, pl: 50269, ca: 50270, nl: 50271, ar: 50272, sv: 50273, it: 50274,
  id: 50275, hi: 50276, fi: 50277, vi: 50278, he: 50279, uk: 50280, el: 50281, ms: 50282,
  cs: 50283, ro: 50284, da: 50285, hu: 50286, ta: 50287, no: 50288, th: 50289, ur: 50290,
  hr: 50291, bg: 50292, lt: 50293, la: 50294, mi: 50295, ml: 50296, cy: 50297, sk: 50298,
  te: 50299, fa: 50300, lv: 50301, bn: 50302, sr: 50303, az: 50304, sl: 50305, kn: 50306,
  et: 50307, mk: 50308, br: 50309, eu: 50310, is: 50311, hy: 50312, ne: 50313, mn: 50314,
  bs: 50315, kk: 50316, sq: 50317, sw: 50318, gl: 50319, mr: 50320, pa: 50321, si: 50322,
  km: 50323, sn: 50324, yo: 50325, so: 50326, af: 50327, oc: 50328, ka: 50329, be: 50330,
  tg: 50331, sd: 50332, gu: 50333, am: 50334, yi: 50335, lo: 50336, uz: 50337, fo: 50338,
  ht: 50339, ps: 50340, tk: 50341, nn: 50342, mt: 50343, sa: 50344, lb: 50345, my: 50346,
  bo: 50347, tl: 50348, mg: 50349, as: 50350, tt: 50351, haw: 50352, ln: 50353, ha: 50354,
  ba: 50355, jw: 50356, su: 50357,
});

export const LANGID_LANGUAGE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  en: 'English', zh: 'Chinese', de: 'German', es: 'Spanish', ru: 'Russian', ko: 'Korean',
  fr: 'French', ja: 'Japanese', pt: 'Portuguese', tr: 'Turkish', pl: 'Polish', ca: 'Catalan',
  nl: 'Dutch', ar: 'Arabic', sv: 'Swedish', it: 'Italian', id: 'Indonesian', hi: 'Hindi',
  fi: 'Finnish', vi: 'Vietnamese', he: 'Hebrew', uk: 'Ukrainian', el: 'Greek', ms: 'Malay',
  cs: 'Czech', ro: 'Romanian', da: 'Danish', hu: 'Hungarian', ta: 'Tamil', no: 'Norwegian',
  th: 'Thai', ur: 'Urdu', hr: 'Croatian', bg: 'Bulgarian', lt: 'Lithuanian', la: 'Latin',
  mi: 'Maori', ml: 'Malayalam', cy: 'Welsh', sk: 'Slovak', te: 'Telugu', fa: 'Persian',
  lv: 'Latvian', bn: 'Bengali', sr: 'Serbian', az: 'Azerbaijani', sl: 'Slovenian',
  kn: 'Kannada', et: 'Estonian', mk: 'Macedonian', br: 'Breton', eu: 'Basque',
  is: 'Icelandic', hy: 'Armenian', ne: 'Nepali', mn: 'Mongolian', bs: 'Bosnian',
  kk: 'Kazakh', sq: 'Albanian', sw: 'Swahili', gl: 'Galician', mr: 'Marathi', pa: 'Punjabi',
  si: 'Sinhala', km: 'Khmer', sn: 'Shona', yo: 'Yoruba', so: 'Somali', af: 'Afrikaans',
  oc: 'Occitan', ka: 'Georgian', be: 'Belarusian', tg: 'Tajik', sd: 'Sindhi', gu: 'Gujarati',
  am: 'Amharic', yi: 'Yiddish', lo: 'Lao', uz: 'Uzbek', fo: 'Faroese', ht: 'Haitian Creole',
  ps: 'Pashto', tk: 'Turkmen', nn: 'Nynorsk', mt: 'Maltese', sa: 'Sanskrit',
  lb: 'Luxembourgish', my: 'Myanmar', bo: 'Tibetan', tl: 'Tagalog', mg: 'Malagasy',
  as: 'Assamese', tt: 'Tatar', haw: 'Hawaiian', ln: 'Lingala', ha: 'Hausa',
  ba: 'Bashkir', jw: 'Javanese', su: 'Sundanese',
});

export const LANGID_ID_TO_TOKEN: ReadonlyMap<number, string> = new Map(
  Object.entries(LANGID_TOKEN_IDS).map(([code, id]) => [id, code]),
);

export function languageNameFor(code: string): string {
  return LANGID_LANGUAGE_NAMES[code] ?? code;
}

export const ASR_SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'it',
  'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'ru', 'uk',
]);

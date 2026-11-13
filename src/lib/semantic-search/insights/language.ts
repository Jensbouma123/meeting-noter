import type { InsightLanguage } from './types/insight-language';

const WORDS: Record<InsightLanguage | 'other', ReadonlySet<string>> = {
  nl: new Set(('de het een en van ik je jij we wij dat dit niet op te zijn voor met maar ook dan nog wel er hij ze ons onze ' +
    'hebben heb heeft gaan ga gaat zullen zal wordt worden kunnen moet moeten naar om bij uit aan zo wat wie hoe waarom ' +
    'jullie morgen volgende week gewoon even dus nu toch hoor').split(' ')),
  en: new Set(('the a an and of i you we that this not on to be for with but also then still there he she they our ' +
    'have has will shall going go can must would should it it\'s i\'ll we\'ll let\'s you\'ll at by from what who how why ' +
    'tomorrow next week just so now yeah are was were do does').split(' ')),
  other: new Set(('der das und ist nicht ich du wir zwar können sie ein eine mit auch noch wenn dann es auf für zu den dem ' +
    'von entsprechend aber oder sind haben wird werden je ne pas le la les est une des que qui pour avec').split(' ')),
};

export function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[’]/gu, "'").match(/[\p{L}\p{N}']+/gu) ?? [];
}

export function detectLanguage(text: string): InsightLanguage | null {
  const words = tokens(text);
  const hits = (lang: keyof typeof WORDS) => words.filter((w) => WORDS[lang].has(w)).length;
  const nl = hits('nl');
  const en = hits('en');
  const other = hits('other');
  if (Math.max(nl, en) === 0 || other > Math.max(nl, en)) return null;
  return nl >= en ? 'nl' : 'en';
}

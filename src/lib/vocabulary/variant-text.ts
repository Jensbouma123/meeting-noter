import { cleanText } from './clean-text';

export function splitVariants(text: string): string[] {
  const variants: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && /[\\;|]/.test(text[i + 1] ?? '')) {
      current += text[i + 1];
      i++;
    } else if (ch === ';' || ch === '|') {
      variants.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  variants.push(current);
  return variants.map(cleanText).filter(Boolean);
}

export function joinVariants(variants: readonly string[]): string {
  return variants.map((v) => v.replace(/[\\;|]/g, (c) => `\\${c}`)).join('; ');
}

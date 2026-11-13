const STOPWORDS = new Set([
  'a', 'about', 'also', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'd', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'like', 'll', 'm', 'me', 'my',
  'no', 'not', 'of', 'oh', 'ok', 'okay', 'on', 'or', 'our', 're', 's', 'she', 'so',
  't', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to',
  'uh', 'um', 'us', 've', 'was', 'we', 'were', 'what', 'when', 'which', 'who', 'will',
  'with', 'would', 'yeah', 'you', 'your',
  'aan', 'al', 'als', 'dan', 'dat', 'de', 'der', 'die', 'dit', 'dus', 'een', 'eh',
  'er', 'en', 'ben', 'bij', 'hè', 'heb', 'hebben', 'het', 'hoe', 'ik', 'in', 'is',
  'ja', 'je', 'jij', 'kan', 'kun', 'maar', 'met', 'naar', 'nee', 'nog', 'nu', 'of',
  'om', 'op', 'oke', 'te', 'tot', 'uit', 'van', 'voor', 'wat', 'wel', 'we', 'wij',
  'zijn', 'zo',
]);

export function normalizeText(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\p{N}+$/u.test(t));
}

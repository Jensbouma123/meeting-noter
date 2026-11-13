export function countTerm(text, word) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'gu');
  return (text.match(re) ?? []).length;
}

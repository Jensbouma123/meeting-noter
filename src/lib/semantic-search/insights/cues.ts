import type { InsightKind } from './types/insight-kind';

const DAY = "(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
const WHEN = `(?:${DAY}|morgen|overmorgen|volgende week|eind van de (?:dag|week|maand)|\\d{1,2}(?:[-/ ]\\w+)?|tomorrow|next week|(?:the )?end of (?:the )?(?:day|week|month)|eod)`;

const word = (source: string) => new RegExp(`(?<![\\p{L}])(?:${source})(?![\\p{L}])`, 'u');

const DECISION = [
  'besloten', 'besluiten', 'besluit is', 'afgesproken', 'de afspraak is', 'we kiezen', 'gekozen voor', 'akkoord',
  'laten we', 'we gaan voor', 'we gaan het', 'we gaan dat', 'we gaan dit', 'we houden het', 'we stoppen met',
  'decided', 'the decision is', 'agreed', "let's", "we'll go with", 'we will go with', "we're going with", 'we go with',
  "we're going to", 'we are going to', 'settled', 'we chose', 'we choose', 'the plan is',
].map(word);

const ACTION = [
  'ik ga', 'ik zal', 'ik pak', 'ik stuur', 'ik regel', 'ik zorg', 'ik plan', 'ik maak', 'ik check', 'ik neem',
  'jij pakt', 'pak jij', 'jij gaat', 'jij zorgt', 'zorg jij', 'jij stuurt', 'we gaan', 'actiepunt', 'actie voor',
  'i will', "i'll", "i'm going to", 'i am going to', "you'll", 'you will', "we'll", 'we will',
  'action item', 'action point', 'todo', 'to-do', 'deadline', 'follow up', 'uiterlijk',
  `voor ${WHEN}`, `by ${WHEN}`,
].map(word);

const NEGATED = word("(?:ik ga|ik zal|i will|i'll|i'm going to|we gaan|we'll)(?: \\p{L}+)? (?:niet|nooit|geen|not|never)|won't|will not");

const NON_COMMITTAL = word([
  "we'll see", 'we will see', "let's see", 'laten we eens kijken', 'laten we eerlijk zijn', "i'll be honest", 'ik ga ervan uit',
  'weet niet', 'weet ik niet', 'geen idee', "don't know", 'not sure', 'no idea', 'misschien', 'maybe', 'i guess', 'i suppose',
  'denk ik', 'grapje', 'joke', 'joking',
].join('|'));

export function cueKinds(text: string): InsightKind[] {
  const lower = text.toLowerCase().replace(/[’]/gu, "'");
  if (NON_COMMITTAL.test(lower)) return [];
  const kinds: InsightKind[] = [];
  if (DECISION.some((re) => re.test(lower))) kinds.push('decision');
  if (!NEGATED.test(lower) && ACTION.some((re) => re.test(lower))) kinds.push('action');
  return kinds;
}

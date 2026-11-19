import type { CaseResult } from './case-result';

export type Group = [string, (r: CaseResult) => boolean];

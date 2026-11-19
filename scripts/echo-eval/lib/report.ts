import fs from 'node:fs';
import path from 'node:path';
import type { CaseResult } from '../types/case-result';
import type { RunMeta } from '../types/run-meta';
import { breakdownTable } from './breakdown';
import { factorGroups, groupTable, languageGroups, pairGroups } from './group-table';
import { echoPresent, isAllLost, isFalseDrop, isJunk, isMiss } from './classify';
import { pct, perGroup, wilson } from './stats';

function section(title: string, rows: CaseResult[], n: number, hit: (r: CaseResult) => boolean, group: (r: CaseResult) => string): string {
  const r = wilson(rows.filter(hit).length, rows.length);
  const g = perGroup(rows.map((x) => ({ group: group(x), hit: hit(x) })));
  return [
    `**${title}** (${n === rows.length ? '' : ''}n=${rows.length})`,
    `- per case: ${r.k}/${r.n} = ${pct(r)}`,
    `- per unique utterance (${g.groups} utterances): mean ${pct({ lo: g.lo, hi: g.hi }, g.mean)} (cluster bootstrap); any-case-hit ${g.anyHit.k}/${g.anyHit.n} = ${pct(g.anyHit)}`,
  ].join('\n');
}

export function writeReport(outDir: string, resultsFile: string, utterances: number): void {
  if (!fs.existsSync(resultsFile)) return;
  const all = fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as CaseResult);
  const md: string[] = [`# Echo-twin eval\n\nGenerated ${new Date().toISOString()}; ${all.length} cases from ${utterances} utterances. ${asrLine(outDir)}; merge: splitTranscript/dropEchoTwins.\n`];
  const failures: unknown[] = [];
  for (const split of ['all', 'dev', 'heldout'] as const) {
    const rows = all.filter((r) => split === 'all' || r.split === split);
    const echo = rows.filter((r) => r.kind === 'echo');
    const present = echo.filter(echoPresent);
    const cross = rows.filter((r) => r.kind === 'crosstalk');
    md.push(`\n## Split: ${split}\n`);
    md.push(section('MISS rate, echo cases where mic ASR heard text', present, echo.length, isMiss, (r) => r.systemUtt));
    md.push(`\nmic ASR silent (no duplicate to miss): ${echo.length - present.length}/${echo.length}; junk text survived (not a duplicate): ${echo.filter(isJunk).length}`);
    md.push(`\n${section('MISS rate, all echo cases (silent mic counts as handled)', echo, echo.length, isMiss, (r) => r.systemUtt)}`);
    md.push(`\n${section('FALSE-DROP rate, crosstalk (any genuine mic line removed)', cross, cross.length, isFalseDrop, (r) => r.micUtt ?? r.id)}`);
    md.push(`\n${section('FALSE-DROP strict (speaker fully lost)', cross, cross.length, isAllLost, (r) => r.micUtt ?? r.id)}`);
    md.push(`\nCrosstalk with bleed: ${wilsonStr(cross.filter((r) => r.bleed), isFalseDrop)}; without: ${wilsonStr(cross.filter((r) => !r.bleed), isFalseDrop)}`);
    md.push('\n### Miss by language (echo, mic heard text; system utterance language)\n', groupTable(present, languageGroups('echo'), isMiss));
    md.push('\n### Miss by new factor (echo, mic heard text)\n', groupTable(present, factorGroups, isMiss));
    md.push('\n### False drop by language (crosstalk; mic utterance language)\n', groupTable(cross, languageGroups('crosstalk'), isFalseDrop));
    md.push('\n### False drop by language pair (crosstalk)\n', groupTable(cross, pairGroups, isFalseDrop));
    md.push('\n### False drop by new factor (crosstalk with bleed)\n', groupTable(cross.filter((r) => r.bleed), factorGroups, isFalseDrop));
    if (split === 'all') {
      md.push('\n### Miss by factor (echo, mic heard text)\n', breakdownTable(present, isMiss));
      md.push('\n### False drop by factor (crosstalk with bleed)\n', breakdownTable(cross.filter((r) => r.bleed), isFalseDrop));
      failures.push(...present.filter(isMiss).slice(0, 40), ...cross.filter(isFalseDrop).slice(0, 40));
    }
  }
  fs.writeFileSync(path.join(outDir, 'report.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'failures.json'), JSON.stringify(failures, null, 2));
}

function asrLine(outDir: string): string {
  const file = path.join(outDir, 'meta.json');
  if (!fs.existsSync(file)) return 'ASR: backend not recorded';
  const m = JSON.parse(fs.readFileSync(file, 'utf8')) as RunMeta;
  return `ASR: Parakeet TDT v3 via the app's live path, backend ${m.backend}, browser ${m.userAgent}`;
}

function wilsonStr(rows: CaseResult[], hit: (r: CaseResult) => boolean): string {
  const r = wilson(rows.filter(hit).length, rows.length);
  return `${r.k}/${r.n} = ${r.n ? pct(r) : 'n/a'}`;
}

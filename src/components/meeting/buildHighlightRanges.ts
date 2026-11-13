import type { SearchMatch } from './TranscriptSearch.types';
import type { HighlightRanges } from './buildHighlightRanges.types';
import { MAX_HIGHLIGHT_RANGES } from './transcriptSearchConstants';

function collectTextNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue && node.nodeValue.length > 0) out.push(node as Text);
    node = walker.nextNode();
  }
  return out;
}

function groupMatchesBySegment(matches: SearchMatch[]): Map<string, SearchMatch[]> {
  const bySeg = new Map<string, SearchMatch[]>();
  for (const m of matches) {
    const list = bySeg.get(m.segId);
    if (list) list.push(m);
    else bySeg.set(m.segId, [m]);
  }
  return bySeg;
}

export function buildHighlightRanges(
  container: HTMLElement,
  matches: SearchMatch[],
  activeGlobalIdx: number,
): HighlightRanges {
  const bySeg = groupMatchesBySegment(matches);
  const baseRanges: Range[] = [];
  const activeRanges: Range[] = [];
  let globalIdx = 0;
  const turns = container.querySelectorAll('[data-seg-id]');
  for (const turn of turns) {
    const segId = turn.getAttribute('data-seg-id') ?? '';
    const segMatches = bySeg.get(segId);
    if (!segMatches || segMatches.length === 0) continue;
    const nodes = collectTextNodes(turn);
    let offset = 0;
    const spans = nodes.map((node) => {
      const start = offset;
      offset += node.nodeValue?.length ?? 0;
      return { node, start, end: offset };
    });
    for (const m of segMatches) {
      for (const span of spans) {
        const a = Math.max(span.start, m.start);
        const b = Math.min(span.end, m.end);
        if (b > a) {
          const range = document.createRange();
          range.setStart(span.node, a - span.start);
          range.setEnd(span.node, b - span.start);
          if (globalIdx === activeGlobalIdx) activeRanges.push(range);
          else baseRanges.push(range);
        }
      }
      globalIdx += 1;
    }
    if (baseRanges.length + activeRanges.length >= MAX_HIGHLIGHT_RANGES) break;
  }
  return { baseRanges, activeRanges };
}

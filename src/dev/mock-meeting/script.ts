import type { ScriptTurn } from './types';

export const MOCK_SCRIPT: ScriptTurn[] = [
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Good', 'morning', 'team,', 'thanks', 'for', 'hopping', 'on.',
      'Let\'s', 'quickly', 'review', 'the', 'new', 'realtime', 'meeting', 'noter', 'interface.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'Morning', 'Sarah!', 'I', 'love', 'how', 'clean', 'the', 'layout', 'is.',
      'The', 'transcript', 'column', 'is', 'super', 'readable', 'and', 'the', 'dock', 'stays', 'out', 'of', 'the', 'way.',
    ],
  },
  {
    speakerId: 'system:1',
    source: 'system',
    words: [
      'From', 'the', 'engine', 'side,', 'we', 'are', 'streaming', 'audio', 'frames', 'at', '100', 'millisecond', 'intervals.',
      'Inference', 'lag', 'is', 'sitting', 'right', 'around', '85', 'milliseconds.',
    ],
  },
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Notice', 'how', 'the', 'turns', 'are', 'grouped', 'by', 'speaker,', 'with', 'smooth', 'transitions',
      'when', 'partials', 'ease', 'into', 'final', 'segments.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'The', 'audio', 'meters', 'are', 'rendered', 'with', 'direct', 'CSS', 'transforms',
      'in', 'a', 'requestAnimationFrame', 'loop,', 'keeping', 'the', 'UI', 'at', 'a', 'rock-solid', '60', 'frames', 'per', 'second.',
    ],
  },
  {
    speakerId: 'system:1',
    source: 'system',
    words: [
      'We', 'also', 'added', 'the', 'right', 'rail', 'with', 'live', 'talk-time', 'bars', 'and', 'inline', 'speaker', 'renaming.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'And', 'the', 'floating', 'dock', 'makes', 'it', 'effortless', 'to', 'pause,', 'resume,', 'or', 'toggle', 'audio', 'sources.',
    ],
  },
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Everything', 'respects', 'reduced-motion', 'settings', 'and', 'acciva', 'design', 'tokens.', 'We', 'are', 'good', 'to', 'go!',
    ],
  },
];

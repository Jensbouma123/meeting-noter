import { removeDecision } from '@/lib/meeting/notes';
import { SourceText } from './SourceText';
import { RowMenu } from './RowMenu';
import type { DecisionRowProps } from './NotesPanel.types';

export function DecisionRow({ item, sessionId, t, flash }: DecisionRowProps) {
  return (
    <li ref={flash?.ref} className={`flex min-w-0 items-start gap-1 ${flash?.className ?? ''}`}>
      <SourceText t={t} text={item.text} segmentId={item.sourceSegmentId} />
      <RowMenu t={t} name={item.text} onDelete={() => removeDecision(sessionId, item.id)} />
    </li>
  );
}

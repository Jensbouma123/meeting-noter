import { Text } from '@jensbouma123/acciva-ui';
import { removeDecision } from '@/lib/meeting/notes';
import { RowMenu } from './RowMenu';
import type { DecisionRowProps } from './NotesPanel.types';

export function DecisionRow({ item, sessionId, t }: DecisionRowProps) {
  return <li className="flex min-w-0 items-start gap-1">
    <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">{item.text}</Text>
    <RowMenu t={t} name={item.text} onDelete={() => removeDecision(sessionId, item.id)} />
  </li>;
}

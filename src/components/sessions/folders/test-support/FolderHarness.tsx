import { ToastProvider } from '@jensbouma123/acciva-ui';
import { render } from '@testing-library/react';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { DraggableMeeting } from '../DraggableMeeting';
import { FolderTree } from '../FolderTree';
import { useFolderController } from '../useFolderController';
import { sessions } from './fixtures';

function Harness({ items = sessions }: { items?: readonly SessionMetadata[] }) {
  const ctl = useFolderController(items);
  return (
    <>
      <FolderTree controller={ctl} sessions={items} renderSession={(s) => <span>{s.title}</span>} />
      {items.filter((s) => Object.hasOwn(ctl.meetingFolders, s.sessionId) && !ctl.meetingFolders[s.sessionId]).map((s) => (
        <DraggableMeeting key={s.sessionId} sessionId={s.sessionId}>{s.title}</DraggableMeeting>
      ))}
      {ctl.dialogs}
    </>
  );
}

export const renderTree = () => render(<ToastProvider><Harness /></ToastProvider>);
export const renderTreeWith = (items: readonly SessionMetadata[]) => render(<ToastProvider><Harness items={items} /></ToastProvider>);

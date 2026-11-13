import type { DragEvent } from 'react';
import { FOLDER_MIME, MEETING_MIME, PLAIN_PREFIX } from './constants';
import type { DragItem } from './types';

export function readDragItem(dataTransfer: DataTransfer): DragItem | null {
  const meeting = dataTransfer.getData(MEETING_MIME);
  if (meeting) return { kind: 'meeting', id: meeting };
  const folder = dataTransfer.getData(FOLDER_MIME);
  if (folder) return { kind: 'folder', id: folder };
  const match = /^mn-folder-item:(meeting|folder):(.+)$/.exec(dataTransfer.getData('text/plain'));
  return match ? { kind: match[1] as 'meeting' | 'folder', id: match[2] } : null;
}

export function draggableProps(mime: string, id: string, onStart?: () => void) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData(mime, id);
      e.dataTransfer.setData('text/plain', `${PLAIN_PREFIX}${mime === MEETING_MIME ? 'meeting' : 'folder'}:${id}`);
      e.dataTransfer.effectAllowed = 'move';
      onStart?.();
    },
  };
}

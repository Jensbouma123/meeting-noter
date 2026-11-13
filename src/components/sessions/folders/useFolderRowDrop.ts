import { useEffect, useRef, useState, type DragEvent } from 'react';
import { AUTO_EXPAND_DELAY_MS, FOLDER_MIME } from './constants';
import { draggableProps, readDragItem } from './dragData';
import type { FolderController } from './types';

interface FolderRowDropInput {
  folderId: string;
  controller: FolderController;
  expanded: boolean;
  hasContent: boolean;
  onToggle: (id: string) => void;
}

export function useFolderRowDrop({ folderId, controller, expanded, hasContent, onToggle }: FolderRowDropInput) {
  const [over, setOver] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverTimer = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const rowProps = {
    ...draggableProps(FOLDER_MIME, folderId, () => controller.beginFolderDrag(folderId)),
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      controller.previewReorder(folderId);
      setOver(true);
      if (!expanded && hasContent && !hoverTimer.current) {
        hoverTimer.current = setTimeout(() => {
          hoverTimer.current = null;
          onToggle(folderId);
        }, AUTO_EXPAND_DELAY_MS);
      }
    },
    onDragLeave: (e: DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      clearHoverTimer();
      setOver(false);
    },
    onDragEnd: () => {
      clearHoverTimer();
      setOver(false);
      controller.commitReorder();
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearHoverTimer();
      setOver(false);
      const item = readDragItem(e.dataTransfer);
      if (item?.kind === 'meeting') void controller.dropMeeting(item.id, folderId);
      else if (item?.kind === 'folder' && !controller.isSibling(item.id, folderId)) void controller.dropFolder(item.id, folderId);
    },
  };
  return { over, rowProps };
}

import { fireEvent, screen } from '@testing-library/react';

export const openActions = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Actions for folder “${name}”` }));
export const pick = async (label: string) => fireEvent.click(await screen.findByRole('menuitem', { name: label, hidden: true }));

function createTransfer() {
  const values = new Map<string, string>();
  return { setData: (type: string, value: string) => values.set(type, value), getData: (type: string) => values.get(type) ?? '', effectAllowed: 'none', dropEffect: 'none', types: [] as string[] };
}

export function dragStart(element: HTMLElement) {
  const dataTransfer = createTransfer();
  fireEvent.dragStart(element, { dataTransfer });
  return dataTransfer;
}

export const draggableRow = (element: HTMLElement) => element.closest('[draggable="true"]') as HTMLElement;

export const AUTOCLOSE_STORAGE_KEY = 'mn.onboarding.autoclose.v1';

let memory = false;

export function readAutoCloseAck(): boolean {
  try {
    return localStorage.getItem(AUTOCLOSE_STORAGE_KEY) === '1';
  } catch {
    return memory;
  }
}

export function writeAutoCloseAck(value: boolean): void {
  memory = value;
  try {
    if (value) localStorage.setItem(AUTOCLOSE_STORAGE_KEY, '1');
    else localStorage.removeItem(AUTOCLOSE_STORAGE_KEY);
  } catch {}
}

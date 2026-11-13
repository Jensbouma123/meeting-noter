import type { AsrBackend } from './types/model-manifest';
import { notifyListeners, registryState } from './model-registry-state';

export function setActiveBackend(backend: AsrBackend): void {
  if (registryState.activeBackend === backend) return;
  registryState.activeBackend = backend;
  notifyListeners();
}

export function setDialogVisible(visible: boolean): void {
  if (registryState.dialogVisible === visible) return;
  registryState.dialogVisible = visible;
  notifyListeners();
}

export function openDialog(): void {
  setDialogVisible(true);
}

export function closeDialog(): void {
  registryState.dialogVisible = null;
  notifyListeners();
}

export type AssistantId = 'claude-desktop' | 'claude-code' | 'codex';
export type AssistantStatus = 'connected' | 'needs-repair' | 'not-connected' | 'not-found';

export interface AssistantInfo {
  id: AssistantId;
  status: AssistantStatus;
  canAutoConnect: boolean;
  manualCommand: string | null;
  configPath: string | null;
}

export type AssistantActionResult =
  | { ok: true; status: AssistantStatus }
  | { ok: false; error: string }
  | { needsConfirm: true; configPath: string; backupPath: string };

export interface AssistantCardProps {
  assistant: AssistantInfo;
  busy: boolean;
  error: string | null;
  confirm: { configPath: string; backupPath: string } | null;
  restartNotice: boolean;
  onConnect: (confirmed: boolean) => void;
  onDisconnect: () => void;
  onCancelConfirm: () => void;
}

export interface AssistantCopyButtonProps {
  text: string;
  label: string;
}

export interface AssistantCopyIconProps {
  text: string;
}

export interface AssistantConfirmProps {
  backupPath: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface AssistantPending {
  configPath: string;
  backupPath: string;
}

export interface AssistantLogoProps {
  id: AssistantId;
}

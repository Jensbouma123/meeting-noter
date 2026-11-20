import type {
  AssistantId,
  AssistantInfo,
  AssistantStatus,
} from "@/lib/assistants/types";

export type { AssistantId, AssistantInfo, AssistantStatus };

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
  size?: number;
}

export type AssistantState = ReturnType<
  typeof import("./AssistantState").useAssistantState
>;

export interface AssistantListProps {
  assistants: AssistantInfo[];
  state: AssistantState;
}

export interface AssistantKindTagProps {
  kind: import("@/lib/assistants/types").AssistantKind;
}

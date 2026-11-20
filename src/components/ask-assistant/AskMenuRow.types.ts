import type { ReactNode } from "react";

export interface AskMenuRowProps {
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}

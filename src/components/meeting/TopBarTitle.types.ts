export interface TopBarTitleProps {
  title: string;
  dateMs: number | null | undefined;
  onTitleChange: (newTitle: string) => void;
}

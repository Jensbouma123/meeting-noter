export interface DialogCase {
  name: string;
  title: { en: string; nl: string };
  render: (onClose: () => void) => React.ReactElement;
}

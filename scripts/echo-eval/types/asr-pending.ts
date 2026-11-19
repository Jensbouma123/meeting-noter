export interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export interface Server {
  sha: string | null;
  sidecarBody?: string;
  sidecarStatus: number;
  sidecarHangs: boolean;
  offline: boolean;
  body: Uint8Array<ArrayBuffer>;
  bodyStatus: number;
  bodyFetches: number;
  sidecarFetches: number;
}

export interface ModelFileUrls {
  encoderUrl: string;
  decoderUrl: string;
  tokenizerUrl: string;
  preprocessorUrl?: string;
  encoderDataUrl?: string | null;
  decoderDataUrl?: string | null;
  filenames: { encoder: string; decoder: string };
}

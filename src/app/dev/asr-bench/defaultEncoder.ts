import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser';
import { encoderQuantForFile } from './chain';

export const DEFAULT_ENCODER = encoderQuantForFile(PARAKEET_TDT_V3_WEBGPU.files[0]) ?? 'q4f16';

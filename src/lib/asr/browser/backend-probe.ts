import { getAsrModelFamily } from './model-family';
import { PARAKEET_TDT_V3_WEBGPU } from './model-manifest-parakeet';
import { webgpuEncodersAvailable } from './model-manifest-selection';
import type { AsrBackend } from './types/model-manifest';
import type { NavigatorGPU } from './types';

const MIN_GIB_FOR_WEBGPU_MODEL = 4;

function getNavigatorGpu(): NavigatorGPU | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { gpu?: NavigatorGPU }).gpu;
}

function getDeviceMemoryGiB(): number | null {
  if (typeof navigator === 'undefined') return null;
  const value = (navigator as unknown as { deviceMemory?: unknown }).deviceMemory;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export async function probeAsrBackend(): Promise<AsrBackend> {
  if (getAsrModelFamily() !== 'nemotron' && !webgpuEncodersAvailable()) return 'wasm';
  const deviceMemory = getDeviceMemoryGiB();
  if (deviceMemory !== null && deviceMemory < MIN_GIB_FOR_WEBGPU_MODEL) {
    console.info(
      `[asr] ${deviceMemory} GiB of RAM reported — using the smaller CPU model ` +
        `instead of the ${PARAKEET_TDT_V3_WEBGPU.fallbackSizeBytes}-byte WebGPU one.`,
    );
    return 'wasm';
  }
  const gpu = getNavigatorGpu();
  if (!gpu || typeof gpu.requestAdapter !== 'function') return 'wasm';
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

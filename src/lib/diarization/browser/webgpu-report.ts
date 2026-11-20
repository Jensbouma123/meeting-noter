let reported = false;

export function reportWebGpuUnavailable(reason: string | undefined): void {
  if (!reason || reported) return;
  reported = true;
  console.warn(`[diarizer] webgpu unavailable: ${reason}`);
}

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AsrBackend } from '@/lib/asr/browser';
import { DEFAULT_RUNS, MAX_RUNS } from '../constants';

export const clampRuns = (value: number): number => Math.max(1, Math.min(MAX_RUNS, value || 1));

export function useBenchParams() {
  const searchParams = useSearchParams();
  const [backend, setBackend] = useState<AsrBackend | 'auto'>(() => {
    const b = searchParams.get('backend');
    return b === 'webgpu' || b === 'wasm' ? b : 'auto';
  });
  const [encoder, setEncoder] = useState<string | null>(() => {
    const e = searchParams.get('encoder');
    return e === 'q4f16' || e === 'fp16' ? e : null;
  });
  const [runs, setRuns] = useState(() => {
    const r = searchParams.get('runs');
    return r !== null ? clampRuns(Number(r)) : DEFAULT_RUNS;
  });
  const [fileUrl] = useState<string | null>(() => searchParams.get('file'));
  const [autostart] = useState(() => searchParams.get('autostart') === '1');
  const [next] = useState<string | null>(() => searchParams.get('next'));
  return { backend, setBackend, encoder, setEncoder, runs, setRuns, fileUrl, autostart, next };
}

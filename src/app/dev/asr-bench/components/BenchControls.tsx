import type { AsrBackend } from '@/lib/asr/browser';
import { MAX_RUNS } from '../constants';
import { DEFAULT_ENCODER } from '../defaultEncoder';
import { clampRuns } from '../hooks/useBenchParams';
import type { BenchControlsProps } from './BenchControls.types';

export function BenchControls(props: BenchControlsProps) {
  const { backend, encoder, runs, busy, fileName } = props;
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <label>
        Backend{' '}
        <select
          value={backend}
          onChange={(e) => props.onBackendChange(e.target.value as AsrBackend | 'auto')}
          disabled={busy}
        >
          <option value="auto">auto (device default)</option>
          <option value="webgpu">webgpu ({DEFAULT_ENCODER})</option>
          <option value="wasm">wasm (int8)</option>
        </select>
      </label>
      <label>
        Encoder{' '}
        <select
          value={encoder ?? 'default'}
          onChange={(e) => props.onEncoderChange(e.target.value === 'default' ? null : e.target.value)}
          disabled={busy || backend !== 'webgpu'}
          title="WebGPU-only: leave on default to bench the app's own WebGPU encoder, or pick the fallback rung"
        >
          <option value="default">default ({DEFAULT_ENCODER})</option>
          <option value="q4f16">q4f16</option>
          <option value="fp16">fp16</option>
        </select>
      </label>
      <label>
        Runs{' '}
        <input
          type="number"
          min={1}
          max={MAX_RUNS}
          value={runs}
          disabled={busy}
          onChange={(e) => props.onRunsChange(clampRuns(Number(e.target.value)))}
          style={{ width: 56 }}
        />
      </label>
      <label>
        Speech clip (optional){' '}
        <input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(e) => void props.onFile(e.target.files?.[0]).catch(props.onFileError)}
        />
      </label>
      <button onClick={props.onRun} disabled={busy}>
        {busy ? 'Running…' : 'Run benchmark'}
      </button>
      {fileName && <span>clip: {fileName}</span>}
      {!fileName && <span>(no file = 10 s synthetic tone)</span>}
    </div>
  );
}

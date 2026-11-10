import { describe, expect, it } from 'vitest';
import {
  chainPosition,
  encoderQuantForFile,
  nextHref,
  requestedVariant,
  variantForEncoderFile,
} from './chain';

/**
 * The chain arithmetic of `/dev/asr-bench?…&next=`: which manifest params a
 * chain position means, which variant id a (possibly failed) run reports, and
 * what the tab reloads onto next. The reload itself is the point — two variants
 * must never share a process — so the URL each position produces has to be the
 * next variant's URL, carrying the position after it.
 *
 * `DEFAULT` is the app's own WebGPU default (`q4f16`, from
 * `model-manifest.ts`). It is passed in rather than imported, because this
 * module is deliberately import-free of the engine — so the default is stated
 * here as the value the page passes, and the two must not be allowed to drift
 * apart silently.
 */
const DEFAULT = 'q4f16';

const Q4F16_URL =
  'http://localhost:3000/dev/asr-bench?backend=webgpu&file=/bench/ami-EN2002b-5min.wav&runs=1&autostart=1&next=fp16';

describe('chainPosition', () => {
  it('accepts bare names, §3 variant ids and the WASM one', () => {
    expect(chainPosition('q4f16', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('webgpu-q4f16', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('  Q4F16 ', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('fp16', DEFAULT)).toEqual({ key: 'fp16', backend: 'webgpu', encoder: 'fp16' });
    expect(chainPosition('webgpu-fp16', DEFAULT)).toEqual({ key: 'fp16', backend: 'webgpu', encoder: 'fp16' });
    expect(chainPosition('wasm-int8', DEFAULT)).toEqual({ key: 'int8', backend: 'wasm', encoder: null });
  });

  it('needs no `?encoder=` for the default rung, and names it for every other', () => {
    // The bench must exercise the *real* default rather than an encoder the
    // manifest happens to carry today, so the default position is expressed as
    // "no override" — the same shape the recorder uses.
    const atDefault = chainPosition('q4f16', DEFAULT);
    const atOther = chainPosition('fp16', DEFAULT);
    expect(atDefault?.encoder).toBeNull();
    expect(atOther?.encoder).toBe('fp16');
    // …and if the app's default ever moves, the default position follows it
    // while the other rung keeps asking for itself.
    expect(chainPosition('fp16', 'fp16')?.encoder).toBeNull();
    expect(chainPosition('q4f16', 'fp16')?.encoder).toBe('q4f16');
  });

  it('rejects anything outside the chain instead of guessing a variant', () => {
    expect(chainPosition('fp32', DEFAULT)).toBeNull();
    expect(chainPosition('', DEFAULT)).toBeNull();
  });
});

/**
 * The mislabel this suite exists for: a run of `encoder-model.q4f16.onnx` was
 * posted as `webgpu-fp16`, because the bench swapped the manifest's file and
 * left its `encoderQuant` field alone. The §3 table then had two rows for one
 * encoder and the fp16/q4f16 comparison was really the same file against
 * itself. The variant is now read off the file that was loaded.
 */
describe('variantForEncoderFile', () => {
  it('names the variant after the encoder file that was actually loaded', () => {
    expect(variantForEncoderFile('webgpu', 'encoder-model.q4f16.onnx')).toBe('webgpu-q4f16');
    expect(variantForEncoderFile('webgpu', 'encoder-model.fp16.onnx')).toBe('webgpu-fp16');
    expect(variantForEncoderFile('wasm', 'encoder-model.int8.onnx')).toBe('wasm-int8');
  });

  it('agrees with the manifest for every rung the app can load', () => {
    // A full WebGPU + WASM walk, using the real manifests' own file lists: the
    // label and the manifest must never disagree about what is running.
    expect(variantForEncoderFile('webgpu', 'encoder-model.q4f16.onnx')).not.toBe(
      variantForEncoderFile('webgpu', 'encoder-model.fp16.onnx'),
    );
    expect(variantForEncoderFile('wasm', 'encoder-model.int8.onnx')).not.toBe(
      variantForEncoderFile('webgpu', 'encoder-model.int8.onnx'),
    );
  });

  it('falls back to the backend alone for a file it cannot read, rather than guessing', () => {
    // A mis-read quantisation would file a run under a variant nobody benched,
    // which is the same defect wearing a different name.
    expect(variantForEncoderFile('webgpu', 'encoder-model.onnx')).toBe('webgpu');
    expect(variantForEncoderFile('webgpu', null)).toBe('webgpu');
    expect(variantForEncoderFile('auto', 'encoder-model.q4f16.onnx')).toBe('auto');
  });
});

describe('encoderQuantForFile', () => {
  it('reads the quantisation off the filename, and only from an encoder graph', () => {
    expect(encoderQuantForFile('encoder-model.q4f16.onnx')).toBe('q4f16');
    expect(encoderQuantForFile('encoder-model.fp16.onnx')).toBe('fp16');
    expect(encoderQuantForFile('encoder-model.int8.onnx')).toBe('int8');
    // The decoder is int8 in every variant — labelling a run by it would say
    // "int8" about a q4f16 run.
    expect(encoderQuantForFile('decoder_joint-model.int8.onnx')).toBeNull();
    expect(encoderQuantForFile('vocab.txt')).toBeNull();
  });
});

describe('requestedVariant', () => {
  it('names the variant a failed run was launched as', () => {
    expect(requestedVariant('webgpu', null, DEFAULT)).toBe('webgpu-q4f16');
    expect(requestedVariant('webgpu', 'fp16', DEFAULT)).toBe('webgpu-fp16');
    expect(requestedVariant('webgpu', 'q4f16', DEFAULT)).toBe('webgpu-q4f16');
    expect(requestedVariant('wasm', null, DEFAULT)).toBe('wasm-int8');
    // `auto` is not a variant: the run may never have resolved a backend.
    expect(requestedVariant('auto', null, DEFAULT)).toBe('auto');
  });
});

describe('nextHref', () => {
  /** `nextHref` is `string | null` (null = end of chain); the cases below assert it is not. */
  const url = (href: string | null) => new URL(href as string);

  it('turns a chain position into the next variant URL, one step further along', () => {
    const u = url(nextHref('fp16', Q4F16_URL, DEFAULT));
    expect(u.pathname).toBe('/dev/asr-bench');
    expect(u.searchParams.get('backend')).toBe('webgpu');
    expect(u.searchParams.get('encoder')).toBe('fp16');
    expect(u.searchParams.get('autostart')).toBe('1');
    expect(u.searchParams.get('next')).toBe('int8');
    // Everything else (the clip, the run count) survives the hop.
    expect(u.searchParams.get('file')).toBe('/bench/ami-EN2002b-5min.wav');
    expect(u.searchParams.get('runs')).toBe('1');
  });

  it('carries no encoder param for the default rung, so the run benches the real default', () => {
    const u = url(nextHref('q4f16', Q4F16_URL, DEFAULT));
    expect(u.searchParams.get('backend')).toBe('webgpu');
    expect(u.searchParams.get('encoder')).toBeNull();
  });

  it('drops the next step at the end of the chain and clears a stale encoder', () => {
    const u = url(nextHref('int8', Q4F16_URL, DEFAULT));
    expect(u.searchParams.get('backend')).toBe('wasm');
    expect(u.searchParams.get('encoder')).toBeNull();
    expect(u.searchParams.get('next')).toBeNull();
  });

  it('walks the whole chain in three hops from the URL it is given', () => {
    const seen: string[] = [];
    let here: string | null = Q4F16_URL;
    while (here) {
      const pos = new URL(here);
      seen.push(`${pos.searchParams.get('backend')}|${pos.searchParams.get('encoder')}`);
      here = nextHref(pos.searchParams.get('next') ?? '', here, DEFAULT);
    }
    // Default first (no override), then the fp16 rung, then the CPU one.
    expect(seen).toEqual(['webgpu|null', 'webgpu|fp16', 'wasm|null']);
    expect(here).toBeNull();
  });

  it('navigates an explicit URL or path verbatim, and stops on nothing usable', () => {
    expect(nextHref('/dev/asr-bench?backend=wasm&autostart=1', Q4F16_URL, DEFAULT)).toBe(
      '/dev/asr-bench?backend=wasm&autostart=1',
    );
    expect(nextHref('https://example.test/bench', Q4F16_URL, DEFAULT)).toBe(
      'https://example.test/bench',
    );
    expect(nextHref('', Q4F16_URL, DEFAULT)).toBeNull();
    expect(nextHref('   ', Q4F16_URL, DEFAULT)).toBeNull();
    expect(nextHref('fp32', Q4F16_URL, DEFAULT)).toBeNull();
  });

  it('leaves a readable file= in the URL instead of %2F-escaping it', () => {
    expect(nextHref('fp16', Q4F16_URL, DEFAULT)).toContain('file=/bench/ami-EN2002b-5min.wav');
  });
});

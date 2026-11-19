import type { BleedParams } from '../types/bleed-params';

const NONLINEAR: Record<string, (keyof BleedParams)[]> = {
  clipping: ['clipDrive'],
  compression: ['compressThresholdDb', 'compressRatio'],
  'clock drift': ['driftPpm'],
  'AEC residual': ['aecDb', 'aecDuckDb'],
};

const ALL_KEYS = Object.values(NONLINEAR).flat();

export function linearOf(b: BleedParams): BleedParams {
  const out: BleedParams = { ...b };
  for (const k of ALL_KEYS) delete out[k];
  return out;
}

export function variantsOf(b: BleedParams): { name: string; bleed: BleedParams }[] {
  const base = linearOf(b);
  const out = [{ name: 'as drawn', bleed: b }, { name: 'linear only', bleed: base }];
  for (const [name, keys] of Object.entries(NONLINEAR)) {
    if (b[keys[0]] === undefined) continue;
    const v: BleedParams = { ...base };
    for (const k of keys) Object.assign(v, { [k]: b[k] });
    out.push({ name: `${name} only`, bleed: v });
  }
  return out;
}

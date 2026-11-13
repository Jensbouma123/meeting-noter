import { ROUND_CONSTANTS } from './sha256-constants';

export function compressBlock(
  state: Uint32Array,
  schedule: Uint32Array,
  data: Uint8Array,
  offset: number,
): void {
  const w = schedule;
  for (let i = 0; i < 16; i += 1) {
    const j = offset + i * 4;
    w[i] = ((data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | data[j + 3]) >>> 0;
  }
  for (let i = 16; i < 64; i += 1) {
    const x = w[i - 15];
    const y = w[i - 2];
    const s0 = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) >>> 0;
    const s1 = (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) >>> 0;
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
  }

  let [a, b, c, d, e, f, g, h] = state;
  for (let i = 0; i < 64; i += 1) {
    const S1 = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
    const ch = ((e & f) ^ (~e & g)) >>> 0;
    const temp1 = (h + S1 + ch + ROUND_CONSTANTS[i] + w[i]) >>> 0;
    const S0 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
    const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
    const temp2 = (S0 + maj) >>> 0;
    h = g;
    g = f;
    f = e;
    e = (d + temp1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) >>> 0;
  }

  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0;
  state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0;
  state[7] = (state[7] + h) >>> 0;
}

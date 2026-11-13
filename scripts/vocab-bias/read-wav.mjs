import fs from 'node:fs';

export function readWav16kMono(file) {
  const buf = fs.readFileSync(file);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'data') {
      const out = new Float32Array(Math.floor(size / 2));
      for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(body + 2 * i) / 32768;
      return out;
    }
    offset = body + size + (size & 1);
  }
  throw new Error(`no data chunk in ${file}`);
}

import fs from 'node:fs';

export function wavDataChunk(buf: Buffer, label = 'wav'): { offset: number; size: number } {
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') return { offset: offset + 8, size: Math.min(size, buf.length - offset - 8) };
    offset += 8 + size + (size & 1);
  }
  throw new Error(`no data chunk in ${label}`);
}

export function readWav16kMono(file: string): Float32Array {
  const buf = fs.readFileSync(file);
  const chunk = wavDataChunk(buf, file);
  const out = new Float32Array(Math.floor(chunk.size / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(chunk.offset + 2 * i) / 32768;
  return out;
}

export function writeWav16kMono(file: string, audio: Float32Array): void {
  const data = Buffer.alloc(audio.length * 2);
  audio.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 2 * i));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(16000, 24);
  h.writeUInt32LE(32000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

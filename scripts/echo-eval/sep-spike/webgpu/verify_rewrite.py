"""Compare the original and rewritten MossFormer2 on real two-speaker mixes (ORT CPU).

usage: python verify_rewrite.py ORIG.onnx REWRITTEN.onnx CORPUS_DIR
Builds 3 overlapping mixes from corpus WAVs (16 kHz mono PCM16) and prints the max
abs diff of the separated sources; exits non-zero above TOLERANCE.
"""

import os
import sys
import wave

import numpy as np
import onnxruntime as ort

TOLERANCE = 1e-3
PAIRS = [(0, 1, 0.5), (2, 3, 0.8), (4, 5, 0.3)]


def read_wav(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == 16000 and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def mix_of(a, b, overlap):
    at = int(len(a) * (1 - overlap))
    out = np.zeros(max(len(a), at + len(b)), dtype=np.float32)
    out[: len(a)] += a
    out[at : at + len(b)] += b
    return out


def padded(x):
    t = 2048 * int(np.ceil(max(0, len(x) - 8) / 2048)) + 8
    out = np.zeros(t, dtype=np.float32)
    out[: len(x)] = x
    return out[None]


def session(path):
    opts = ort.SessionOptions()
    opts.log_severity_level = 3
    return ort.InferenceSession(path, opts, providers=["CPUExecutionProvider"])


def main(orig, rewritten, corpus):
    wavs = sorted(f for f in os.listdir(corpus) if f.endswith(".wav"))
    a, b = session(orig), session(rewritten)
    worst = 0.0
    for i, j, overlap in PAIRS:
        mix = padded(mix_of(read_wav(os.path.join(corpus, wavs[i])), read_wav(os.path.join(corpus, wavs[j])), overlap))
        ra = a.run(None, {"mix": mix})[0]
        rb = b.run(None, {"mix": mix})[0]
        diff = float(np.max(np.abs(ra - rb)))
        peak = float(np.max(np.abs(ra)))
        worst = max(worst, diff)
        print(f"{wavs[i]} + {wavs[j]} ({mix.shape[1] / 16000:.1f}s): max|diff|={diff:.3e} peak={peak:.3f}")
    print(f"worst max|diff|={worst:.3e} (tolerance {TOLERANCE})")
    if worst > TOLERANCE:
        raise SystemExit(1)


if __name__ == "__main__":
    main(*sys.argv[1:4])

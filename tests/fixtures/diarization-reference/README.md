# Diarization Reference Fixtures

Golden reference outputs, originally captured from the Python realtime WebSocket sidecar
(`server/realtime/server.py`, using its **mock inference worker**, `REALTIME_MOCK=1`) before
that sidecar — and the rest of `server/` — was removed from this repo (the app is now 100%
client-side; see the root `README.md`). These fixtures are deterministic, reproducible outputs
suitable for diffing the in-browser TypeScript diarizer (`src/lib/diarization/browser/**`)
against, and remain in use by its test suite (`core.test.ts`, `clusterer.test.ts`) regardless of
where they originally came from.

## How these were produced (historical — the pipeline below no longer exists in this repo)

Each fixture was run through the (now-removed) Python sidecar with:

```bash
# Start the mock server (no GPU/Metal required)
REALTIME_MOCK=1 python -m server.realtime.server --host 127.0.0.1 --port 8766

# Run the test client (replace --wav path as needed)
python server/realtime/test_client.py \
    --wav <fixture.wav> \
    --url ws://127.0.0.1:8766/ws \
    --source mic \
    [--language <code>] \
    --fast
```

The `--fast` flag sends audio chunks at 5ms intervals instead of 100ms (realtime pace).
This is intentional for testing — it makes the reference deterministic regardless of host CPU.

The "real-model" fixtures (`real-*.jsonl`) were captured the same way but against the actual
MLX models (Parakeet + Nemotron-3-Diarization) on Apple Silicon, via a capture script
(`scripts/capture-diarization-reference.sh`) that has also been removed along with `server/`.

**There is currently no way to regenerate or add to these fixtures** — doing so would mean
standing up an equivalent capture pipeline against the in-browser models instead (real audio +
a browser + the ONNX models this repo now ships), which hasn't been built. Treat the existing
files as frozen historical references.

## Fixture descriptions

### 043353db-english-3speakers.jsonl

- **Source audio:** `server/c47a51f1-513f-4f67-9a89-cedd5d699217/normalized.wav`
  (also available at `recordings/043353db-32a0-4996-a682-7de80e4fed76/mic.wav`)
- **Duration:** 20.3 seconds
- **Format:** 16 kHz, mono, 16-bit PCM
- **Speakers:** 3 (mic:0, mic:1, mic:2)
- **Language:** English (auto-detected, locked after ~15s of speech)
- **Source audio format:** `server/c47a51f1-513f-4f67-9a89-cedd5d699217/normalized.wav`
  (also available at `recordings/043353db-32a0-4996-a682-7de80e4fed76/mic.wav`)
- **Final segments:** 6 (mic-1 through mic-6), speakers: mic:0 (4 seg), mic:1 (1 seg), mic:2 (1 seg)
- **Speakers detected:** mic:0 (4 segments), mic:1 (1 segment), mic:2 (1 segment)
- **Known transcript (ground truth):**
  ```
  [Speaker 0] standup. Let's review our milestones
  [Speaker 1] Everything looks on track for the release.
  [Speaker 2] Everything looks on track for the release.
  [Speaker 0] Everything looks on track
  [Speaker 0] Good morning everyone, welcome to the weekly standup. Let's review our milestones
  [Speaker 0] Good morning everyone, welcome to the weekly
  ```
- **Models:** Parakeet TDT 0.6b v3 (ASR) + Nemotron-3-Diarization-8bit (diarization, "low" preset)

### 46a75962-dutch-2speakers.jsonl

- **Source audio:** `recordings/46a75962-bb52-4662-96b9-1478c7f8d6b5/mic.wav`
- **Duration:** 12.4 seconds
- **Format:** 16 kHz, mono, 16-bit PCM
- **Speakers:** 2 (mic:0, mic:1)
- **Language:** Dutch (nl) — explicitly requested with `--language nl`
- **Final segments:** 2
- **Speakers detected:** mic:0 (1 segment), mic:1 (1 segment)
- **Note on Dutch ground truth:** The `46a75962-ground-truth.jsonl` file in this directory
   contains the human-assigned transcript (1 speaker, Dutch text). The mock model produces
   mock English text with 2 speaker turns — the speaker turns and timestamps from the mock
   are the primary reference for the TypeScript port. The human transcript is included for
   comparison only (the TS port will likely produce mock output with the same speaker turns
   when run with `REALTIME_MOCK=1`).
- **Models:** Parakeet TDT 0.6b v3 (ASR, English) + Nemotron-3-Diarization-8bit (diarization, "low")
- **Note:** This fixture also has a `system.wav` source (system-audio tap) of the same duration,
  but only the `mic` source produced diarization segments. System-only audio without mic input
  produced 0 segments (expected — no speech detected from system source alone in mock mode).

## Diffing the TypeScript port

When comparing the TypeScript diarizer output against these references:

1. **Speaker assignments** — Compare `speaker` field values (e.g. `mic:0` vs `speaker_0`).
   The TS port may use a different speaker naming convention; normalize before comparison.

2. **Segment boundaries** — Compare `start` and `end` times (±0.5s tolerance for
   onset-correction timing differences).

3. **Final segment count** — Should match or have a reasonable number of extra/missing
   segments due to different VAD/silence-gap heuristics.

4. **Language** — Language detection may differ between Parakeet (English) and
   Nemotron streaming (non-English).

### DER (Di arization Error Rate) scoring

To compute DER, use the NIST SDC (Speaker Diarization Calibration) toolkit or Pyannote's
DER scoring:

```bash
# Using Pyannote audio pipeline (pip install pyannote.audio)
# 1. Convert JSONL segments to RTTM format:
#    For each segment, emit a "A" or "B" speaker label line:
#    A SPEAKER <start> <end> <speaker_id> <conf>

# 2. Use the SDC DER scoring:
#    perl $SDC/scripts/eval_diarization.pl \
#        -r reference.rttm -c system_output.rttm \
#        -o output_dir/

# Collar: 125ms (standard for conversational speech)
# Overlap handling: overlap is penalized in DER
# Diarization error = false alarm + missed detection + confusion
# DER = (FA + MD + Conf) / Total speech time
```

The reference files use a **125ms collar** (standard NIST SDC default). The diarization
model's "low" latency preset was used throughout. The Sortformer diarization reports
speaker turns with ~0.3-0.5s lag behind the true onset (documented in the now-removed
`server/realtime/engine.py`).

## Files in this directory

| File | Description |
|------|-------------|
| `043353db-english-3speakers.jsonl` | 20.3s, 3 speakers (mock), English, 6 final segments |
| `46a75962-dutch-2speakers.jsonl` | 12.4s, 2 speakers (mock), Dutch (nl), 2 final segments |
| `46a75962-ground-truth.jsonl` | 12.4s, 1 speaker (human-assigned), Dutch, known transcript |
| `system-silent-0segments.jsonl` | 20.3s system-only, 0 segments (silence/no speech) |



## Real-model fixtures

`real-*.jsonl` were produced by the **real MLX inference pipeline** (with GPU available),
captured via the now-removed `scripts/capture-diarization-reference.sh` against the now-removed
Python sidecar — see "How these were produced" above. They are the gold standard for verifying
the TypeScript diarizer port against real model outputs; there is no way to regenerate or add to
them with the tooling currently in this repo.

| Fixture | Duration | Speakers | Segments | Language | Models |
|---------|----------|----------|----------|----------|--------|
| `real-043353db-english-3speakers.jsonl` | 20.3 s | 3 (mic:0-2) | 6 | English | Parakeet + Nemotron "low" |
| `real-46a75962-dutch-2speakers.jsonl` | 12.4 s | 2 (mic:0-1) | 2 | Dutch (nl) | Parakeet + Nemotron "low" |

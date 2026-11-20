# Echo-bleed eval

Measures how often the app's echo-twin merge misses speaker bleed (MISS) or drops a genuine mic line (FALSE-DROP). It runs in a real browser through the app's own ASR path (`ensureBrowserASRReady`, `pushLiveAudio`, `flushLiveAudio`, `splitTranscript`), so the report reflects the backend that browser picks (WebGPU on a GPU host).

## Run

```
npm run eval:echo
```

The script copies the ORT wasm files, starts `next dev` on a fixed port (3333; override with `ECHO_EVAL_PORT`, and the script exits with an error when the port is busy rather than picking another), opens Google Chrome (falls back to the default browser) at `/dev/echo-eval?autostart=1`, polls until the run finishes, then stops the server. Keep the browser tab in the foreground; the first run downloads the speech model into IndexedDB. The model cache is per browser origin, so the fixed port is what lets later runs reuse it; a different port downloads everything again. With `autostart=1` the eval page accepts the model download itself (merging with the models already accepted, and again after a WebGPU or crash fallback swaps the model), so no download prompt needs a click; this is dev-only and never reaches the product UI.

Options: `-- --limit=2` runs only the first N cases; `-- --fake` swaps in a stub engine (plumbing check only); `-- --shards=4` splits the run over 4 shards shown in one grid tab (below).

### Parallel tabs

`ECHO_EVAL_SET=meetings npm run eval:echo -- --shards=4` opens one grid tab and prints its URL as the `open this:` line (`/dev/echo-eval/grid?shards=4&set=meetings`). The grid fills the viewport with one iframe per shard (2x2 for 4, as square as possible otherwise, stacked below the `md` breakpoint); each iframe loads `/dev/echo-eval?autostart=1&set=meetings&shard=<i>&shards=4`, and its cell header shows the shard label plus the status line the frame posts to the grid. Shard 1 starts alone and loads the speech model (and, for meetings, the diarizer) into the shared cache; the other cells show `waiting for shard 1 to cache the models…` and get their iframe only once shard 1 reports it is past loading (also when it failed, so they show their own error). The grid page takes the same params as `/dev/echo-eval` plus `shards` (2 to 16); it sets `autostart`, `shard` and `shards` itself for each frame. Keep the grid tab in the foreground: the frames are visible, same-origin iframes, so Chrome runs them at the same priority as a foreground tab, but a hidden grid tab throttles all of them. The script also prints the per-shard URLs as a fallback; opening them as separate tabs runs the same shards. Tab `i` runs the plan items whose index (after `--limit`) satisfies `index % 4 == i`, so the tabs never overlap. Each tab writes its own `meetings.shard<i>.jsonl` and `finished.meetings.shard<i>.json`, and resumes from its own file. When every shard has finished, the script merges the shard files into `meetings.jsonl` (rows already there are kept; a shard row wins on the same id) and writes `meetings-report.md` as for a single tab. A shard that fails (for example a model load error) marks only its own shard failed: the script waits for the others, prints the failed shard's URL (or reload its grid cell) and exits 1; rerun the same command to resume. Without `--shards` (or `shard`/`shards` page params) nothing changes.

### External recording

`ECHO_EVAL_SET=external ECHO_EVAL_EXTERNAL=<dir> npm run eval:echo` (add `-- --shards=2` to run both variants in parallel) scores one real recording instead of the synthesized meetings. Without `ECHO_EVAL_EXTERNAL` the script exits 2. `<dir>` holds:

- `audio16k.wav`: 16 kHz mono PCM16. Long files are fine; the bleed convolution switches to overlap-add blocks above 2^22 samples, because a single full-length FFT of a 99-minute recording needs about 4 GB.
- `reference.json`: either `{ "id"?: string, "lang"?: "nl" | "en", "turns": [...] }` or a bare turns array, each turn `{ "start": sec, "end": sec, "spk": string, "text"?: string }`. `id` defaults to the folder name, `lang` to `en`.

The plan has two cases, `<id>-ext-system` (the recording on the system channel, silent mic) and `<id>-ext-bleed` (the same plus a seeded speaker-to-mic bleed). Reference turns are sorted; a turn that starts inside another speaker's turn is an interrupt and pairs with the longest-overlapping earlier turn, and an overlapping turn shorter than 1 s is a backchannel. The page fetches the audio once (`GET op=wav&set=external`) and runs both cases through the meeting path. Output: `external.jsonl`, `finished.external.json`, `external-report.md` and `external-scores.json` (`.fake` and `.shard<i>` suffixes as above).

## Inputs and outputs

- Audio: `ECHO_EVAL_AUDIO` (default `/Users/jensbouma/Desktop/Meeting Noter/test-audio`) holding the AMI wav, words and label files.
- Output: `ECHO_EVAL_OUT` (default `~/Library/Application Support/OrchestratorAI/exchange/echo-eval/`): `results.jsonl` (or `results.fake.jsonl` for `--fake`), `meta.json` (recorded backend and user agent), `report.md`, `failures.json`.
- Sharded runs add `meetings.shard<i>.jsonl` and `finished.meetings.shard<i>.json` per tab (`.fake` before `.shard<i>` for `--fake`).
- Resume: cases already in `results.jsonl` (or `results.fake.jsonl`) are skipped on the next run. Delete the file for a fresh run.

## Corpus

`node scripts/echo-eval/fetch-corpus.mjs` (run it in the foreground) downloads openly licensed speech into `ECHO_EVAL_CORPUS` (default `.../exchange/echo-eval/corpus/`, never in the repo): Dutch from Multilingual LibriSpeech (CC-BY-4.0, 38 speakers, 76 utterances) and English from LibriSpeech test-clean (CC-BY-4.0, 35 speakers, 35 utterances), each cropped to 3.5-7.5 s. The AMI wavs in `ECHO_EVAL_AUDIO` add 15 English utterances. `scripts/echo-eval/corpus-manifest.json` records every utterance with its licence. Language is the `nl-` / `en-` id prefix. Dev and held-out are split by utterance hash.

## Cases

1040 echo and about 420 crosstalk cases (ids start `v2-`), split dev/held-out by utterance. Echo system utterances are two-thirds Dutch. Crosstalk cycles nl-nl, nl-en, en-nl, nl-nl, en-en, and two-thirds of it carries bleed (the near speaker talks over the echo: double-talk). Each bleed is drawn with optional extra factors:

- clipping: tanh drive 2-8 on the speaker feed
- compression: threshold -34..-18 dB, ratio 3-10
- clock drift: +-100 ppm between the two sources
- AEC residual: 8-24 dB extra attenuation with time-varying leakage, and 0-6 dB ducking of the near speaker while the system is active

`report.md` lists miss and false-drop rates per split, per language, per language pair and per factor, each with a Wilson 95% interval and its upper bound.

## Smoke sample

`ECHO_EVAL_DEV_SAMPLE=120` runs a stratified 120-case dev sample only (vitest runner, int8 model): `ECHO_EVAL_DEV_SAMPLE=120 ECHO_EVAL_OUT=<scratch> npx vitest run --configLoader runner -c scripts/echo-eval/vitest.config.ts echo-bleed`. It proves the pipeline; the host browser run of the full set is the real measurement. Thresholds are never retuned from this run.

## Dev only

`/dev/echo-eval` and `/api/dev/echo-eval` refuse requests in production builds and from non-local hosts.

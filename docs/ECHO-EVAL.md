# Echo-bleed eval

Measures how often the app's echo-twin merge misses speaker bleed (MISS) or drops a genuine mic line (FALSE-DROP). It runs in a real browser through the app's own ASR path (`ensureBrowserASRReady`, `pushLiveAudio`, `flushLiveAudio`, `splitTranscript`), so the report reflects the backend that browser picks (WebGPU on a GPU host).

## Run

```
npm run eval:echo
```

The script copies the ORT wasm files, starts `next dev` on a free port, opens Google Chrome (falls back to the default browser) at `/dev/echo-eval?autostart=1`, polls until the run finishes, then stops the server. Keep the browser tab in the foreground; the first run downloads the speech model into IndexedDB.

Options: `-- --limit=2` runs only the first N cases; `-- --fake` swaps in a stub engine (plumbing check only); `-- --shards=4` splits the run over 4 browser tabs (below).

### Parallel tabs

`ECHO_EVAL_SET=meetings npm run eval:echo -- --shards=4` opens 4 tabs, one per shard, and prints their URLs (`/dev/echo-eval?autostart=1&set=meetings&shard=<i>&shards=4`). Tab `i` runs the plan items whose index (after `--limit`) satisfies `index % 4 == i`, so the tabs never overlap. Each tab writes its own `meetings.shard<i>.jsonl` and `finished.meetings.shard<i>.json`, and resumes from its own file. When every shard has finished, the script merges the shard files into `meetings.jsonl` (rows already there are kept; a shard row wins on the same id) and writes `meetings-report.md` as for a single tab. A tab that fails (for example a model load error) marks only its own shard failed: the script waits for the others, prints the failed shard's URL and exits 1; rerun the same command to resume. Without `--shards` (or `shard`/`shards` page params) nothing changes.

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

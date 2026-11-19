# Echo-bleed eval

Measures how often the app's echo-twin merge misses speaker bleed (MISS) or drops a genuine mic line (FALSE-DROP). It runs in a real browser through the app's own ASR path (`ensureBrowserASRReady`, `pushLiveAudio`, `flushLiveAudio`, `splitTranscript`), so the report reflects the backend that browser picks (WebGPU on a GPU host).

## Run

```
npm run eval:echo
```

The script copies the ORT wasm files, starts `next dev` on a free port, opens Google Chrome (falls back to the default browser) at `/dev/echo-eval?autostart=1`, polls until the run finishes, then stops the server. Keep the browser tab in the foreground; the first run downloads the speech model into IndexedDB.

Options: `-- --limit=2` runs only the first N cases; `-- --fake` swaps in a stub engine (plumbing check only).

## Inputs and outputs

- Audio: `ECHO_EVAL_AUDIO` (default `/Users/jensbouma/Desktop/Meeting Noter/test-audio`) holding the AMI wav, words and label files.
- Output: `ECHO_EVAL_OUT` (default `~/Library/Application Support/OrchestratorAI/exchange/echo-eval/`): `results.jsonl`, `meta.json` (recorded backend and user agent), `report.md`, `failures.json`.
- Resume: cases already in `results.jsonl` are skipped on the next run. Delete the file for a fresh run.

## Dev only

`/dev/echo-eval` and `/api/dev/echo-eval` refuse requests in production builds and from non-local hosts.

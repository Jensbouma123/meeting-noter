# Gated Method B: rescore/ worker, handoff 6 (context nudge)

Branch `agent/9d71f141-116b-43e8-b773-42e9ba90549a`, HEAD 5cbc7de (WIP: types only). Tree clean.
`exchange/diar16/` no longer exists, so HANDOFF-gatedB-app-5-rescore.md was lost; the design
below was rebuilt from the code and from the transcripts of sessions 04792156 and f6aade18.
Scope: `src/lib/diarization/browser/rescore/*` + `types/rescore.ts` only.

## done
- `types/rescore.ts`: RescoreWindow, SpillRun, SpillBackend, SyncAccessHandleLike, OpfsFileLike,
  OpfsDirectoryLike, SpillEnvironment, SpillChunk, SpillReader, SpeakerEmbedderLike,
  RescoreTurnOptions, RescoreInput, RescoreResult. Lint `local/types-in-own-files` forces every
  new type into this file.

## left (design settled; write these)
Lint: no comments, max 150 lines, one exported class per file, *Store/*Service classes named after file.
Vitest: `npx vitest run --configLoader runner src/lib/diarization/browser/rescore`. IDB tests:
`import 'fake-indexeddb/auto'`. Commit prints a packed-refs.lock error but the commit succeeds.

1. `opfs-spill-backend.ts` class OpfsSpillBackend(dir, name, handle): Int16 at byte `offset*2`;
   read -> subarray(0, n/2); truncate(len*2); remove = close + dir.removeEntry.
2. `idb-spill-backend.ts` class IdbSpillBackend: DB `diarization-spill`, store `chunks`, keyPath
   ['spill','offset']. Chunks are contiguous, non-overlapping. read: descending cursor below
   [spill, offset+length), copy overlap, stop at chunk.offset <= offset (never getAll). truncate:
   delete [spill,len..], trim the chunk straddling len. remove: delete whole [spill,*] range.
3. `spill-backend.ts` openSpillBackend(name, env?: SpillEnvironment): OPFS when getDirectory and
   createSyncAccessHandle work (worker only), else IndexedDB (catch the throw too).
4. `audio-spill.ts` class AudioSpill implements SpillReader: static open(name, env?);
   append(Int16Array) -> offset, coalesced in a ~16000-sample staging buffer, writes serialised on a
   promise chain; rewind(offset) (cut staging or truncate backend); addRun(SpillRun); runs getter;
   readWindow(w): run with same channel containing [w.start,w.end) ->
   offset = run.offset + (w.start-run.startFrame)*160, length = min((w.end-w.start)*160+240, run end);
   flush(); delete() (await chain, backend.remove, clear runs).
5. `probs-collector.ts` class ProbsCollector(numChannels): Uint8 q = round(clamp(p)*255) in chunk
   list; push(probs) returns the quantised block; frames; toFloat32() (q/255); clear().
6. `run-spiller.ts` class RunSpiller(spill, numChannels, p): pushAudio(Float32 -> Int16 round(x*32767)),
   pushProbs(Uint8 block). Process frame t only once audio reaches t*160+240 (finish() drains the rest).
   owner = exactly one channel with q >= 128. Same owner: append that frame's 160 samples. Owner change:
   close run (len < minRunFrames -> rewind(runOffset); else append 240-sample tail, addRun with
   length len*160+240), then open new run. Drop pending audio before the current frame.
7. `length-batches.ts` lengthBatches(lengths, size): index groups of equal length, chunked to size.
8. `embedder.ts` class SpeakerEmbedder(load: () => Promise<Uint8Array|string>): lazy createSession
   from ../onnx-session; embed(feats[], frames[]) batches via lengthBatches(p.batch), tensor
   [N,T,80] on session.inputNames[0], output outputNames[0], returns [n*256] in input order;
   dispose() = session.release(), null it.
9. `label-mapping.ts` mapLabelsToChannels(newProbs, numLabels, oldProbs, numChannels): overlap counts
   (both > 0.5), greedy by overlap desc, each label/channel once, leftover labels get numChannels+i.
10. `rescore.ts` async rescore(input: RescoreInput): RescoreResult | null. windows = spill.runs sorted
   (channel, startFrame) flatMap runWindows; none -> null. Sort by length, slices of 64: readWindow,
   fbankCmn, embedder.embed, scatter; L2-normalise; clusterEmbeddings; relabelProbs; map labels;
   scatter into channel space (width max(numChannels, max+1)); TurnTracker push+flush with turnOptions.
11. Tests: spill (OPFS fake handle + IDB fallback + delete), collector + spiller, rescore (fake embedder
   keyed on audio content; old-label mapping keeps channels).

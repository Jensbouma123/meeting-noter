# Meeting Noter

Meeting Noter is een volledig lokale, browser-native vergadertranscriptie-app: spraakherkenning, sprekerherkenning (diarization) en taaldetectie draaien op je eigen apparaat via ONNX-modellen (WebGPU, met WASM als terugvaloptie). Er is geen server; audio verlaat de browser niet.

*English: Meeting Noter is a 100% client-side, browser-native meeting transcription app. ASR, speaker diarization and language ID run on-device (WebGPU, WASM fallback). Audio never leaves your browser. Quick start below.*

## Snel starten / Quick start

**Vereisten / Requirements**

- Node.js 20.9 of nieuwer (getest met 24) / Node.js 20.9+ (tested on 24)
- Chrome of Edge (WebGPU + opname van tab-audio). Safari werkt met een kleiner CPU-model (WASM).
- Optioneel, macOS 14.4+ met Xcode command line tools: de audio-helper voor systeemaudio.

```bash
npm install && npm run build && npm start
```

Open daarna / then open [http://localhost:3000](http://localhost:3000).

Op macOS bouwt en start `npm run app` alles in één keer (bouwt de webapp alleen als er nog geen build is, start de productieserver en de audio-helper; Ctrl-C stopt beide):

```bash
npm install
npm run app
```

## Modellen: wat wordt er gedownload? / Models

De repo bevat **geen modellen**. Bij eerste gebruik vraagt Instellingen > Spraakmodel om toestemming en downloadt de browser de modellen (daarna gecached in de browser):

- Parakeet TDT 0.6B v3 (spraakherkenning) van Hugging Face, WASM/int8-variant: ca. 650 MB.
- Diarization (pyannote-segmentation + WeSpeaker) en taaldetectie (Whisper-tiny) van Hugging Face: enkele tientallen tot honderden MB.
- WebGPU-encoders (q4f16 ≈ 516 MB, fp16 ≈ 1,2 GB) worden niet door Hugging Face geleverd. Host je ze zelf, zet dan `NEXT_PUBLIC_Q4F16_ENCODER_URL` / `NEXT_PUBLIC_FP16_ENCODER_URL` **vóór `npm run build`** (de standaard is `/models/parakeet-tdt-0.6b-v3-webgpu/...`, het conversiescript is niet meegeleverd). Zonder die bestanden mislukt het laden van de WebGPU-variant en valt de app terug op de WASM-variant (je moet de nieuwe download bevestigen).

*English: no models are shipped. On first use the browser downloads them after consent (~650 MB for the default WASM Parakeet model plus small diarization/language-ID models) and caches them. WebGPU encoders must be self-hosted via `NEXT_PUBLIC_Q4F16_ENCODER_URL` / `NEXT_PUBLIC_FP16_ENCODER_URL` at build time; without them the app falls back to WASM.*

## macOS audio-helper

Een kleine native helper neemt systeemaudio (gespreksdeelnemers) en microfoon op, zodat dat zonder schermdelen werkt. Hij luistert op poort 47853.

```bash
npm run helper:install     # bouwt de helper en installeert een LaunchAgent (start bij inloggen)
npm run helper:uninstall   # verwijdert de LaunchAgent en de gekopieerde binary
```

- De binary komt in `~/Library/Application Support/Meeting Noter/`, de agent in `~/Library/LaunchAgents/nl.jensbouma.meeting-noter.audio-helper.plist`, het log in `helper.log` naast de binary.
- Eerste keer vraagt macOS toestemming voor microfoon en systeemaudio-opname.
- Alleen handmatig draaien: `npm run helper`.
- Gebruik `npm run app` of `npm run helper:install`, niet beide tegelijk (poort 47853; `npm run app` hergebruikt een draaiende helper).

*English: `npm run helper:install` builds the helper and installs a login LaunchAgent; `npm run helper:uninstall` removes it.*

## Ontwikkelen / Development

```bash
npm run dev      # next dev + helper (macOS)
npm run dev:next # alleen next dev
npm test         # vitest
npm run lint
```

## Licentie

MIT, zie [LICENSE](LICENSE).

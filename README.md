# Meeting Noter

Meeting Noter is een volledig lokale, browser-native vergadertranscriptie-app: spraakherkenning, sprekerherkenning (diarization) en taaldetectie draaien op je eigen apparaat via ONNX-modellen (WebGPU, met WASM als terugvaloptie). Er is geen server; audio verlaat de browser niet.

*English: Meeting Noter is a 100% client-side, browser-native meeting transcription app. ASR, speaker diarization and language ID run on-device (WebGPU, WASM fallback). Audio never leaves your browser. Quick start below.*

## Installeren op je Mac

1. Open **Terminal**: druk op ⌘-spatie, typ `Terminal` en druk op Enter.
2. Plak deze regel in het venster en druk op Enter:

   ```bash
   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh | bash
   ```

3. Wacht ongeveer een minuut. **Meeting Noter** staat daarna bij je Apps (en in Spotlight) en opent vanzelf in je browser.

Bij het eerste gebruik vraagt de app toestemming om de spraakmodellen te downloaden (ca. 650 MB, eenmalig). Gebruik **Chrome** of **Edge** voor het snelste model; Safari werkt ook. Neem je voor het eerst op, dan vraagt macOS om toegang tot de microfoon: klik **Sta toe**.

**Bijwerken:** plak dezelfde regel opnieuw (de app biedt een nieuwe versie ook zelf aan). Je opnames blijven bewaard.

**Verwijderen:**

```bash
curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/uninstall.sh | bash
```

Na de installatie bouwt de installer eenmalig het snelle GPU-spraakmodel op je Mac (ca. 5-15 min, ca. 2,5 GB download van Hugging Face, 4 GB tijdelijk, 0,5 GB blijvend) voor live transcriptie. Je hebt geen Node.js, Xcode of beheerdersrechten nodig; macOS 13.5 of nieuwer. Alles draait op je eigen Mac; audio en transcripties verlaten je computer niet. Meer uitleg en hulp bij problemen: [docs/INSTALL-MAC.md](docs/INSTALL-MAC.md).

*English: open Terminal, paste the line above and press Enter. Meeting Noter appears in Applications and opens in your browser. To update, paste the same line again; to uninstall, run the `uninstall.sh` line. Everything runs on-device.*

## Geavanceerd: lokale installatie vanuit de broncode (Advanced: run from source)

### Met de ZIP en `Start Meeting Noter.command`

Je hebt een Mac en Google Chrome nodig. Verder niets: de app haalt zelf alles op wat ze nodig heeft.

1. Klik op deze GitHub-pagina op **Code > Download ZIP**.
2. Dubbelklik het ZIP-bestand in Downloads om het uit te pakken.
3. Klik in de uitgepakte map met **rechtermuisknop op `Start Meeting Noter.command` > Open** en bevestig met **Open**. macOS waarschuwt de eerste keer omdat het bestand van internet komt. Staat er geen Open-knop, ga dan naar **Systeeminstellingen > Privacy en beveiliging**, scroll naar beneden en klik **Toch openen**.
4. Wacht de eerste keer enkele minuten: er wordt eenmalig alles geïnstalleerd en gebouwd (het venster laat zien waar het mee bezig is; laat het openstaan). Daarna opent Chrome vanzelf op `http://localhost:3000`. Bij het eerste gebruik vraagt de app toestemming om spraakmodellen te downloaden (ca. 650 MB, eenmalig, daarna bewaard in de browser).
5. Gebruik **Chrome** (of Edge). Safari werkt ook, maar met een kleiner, trager model.

Stoppen: sluit het Terminal-venster, of dubbelklik `Stop Meeting Noter.command`.

In gewoon Nederlands: de snelste (grafische-kaart-)variant van het spraakmodel wordt niet automatisch meegeleverd. De app valt daarom terug op een iets tragere variant die op elke computer werkt; je moet die eenmalig bevestigen.

Systeemaudio van gespreksdeelnemers opnemen kan met de audio-helper. Die heeft Apple's "Command Line Tools" nodig; het startbestand biedt aan die te installeren. Zonder helper werkt de app met je microfoon en met het delen van een browsertabblad met geluid.

### Updaten

Bij elke start kijkt `Start Meeting Noter.command` of er een nieuwe versie is. Zo ja, dan vraagt het "Nieuwe versie X beschikbaar. Nu updaten? (j/n)": typ **j** en druk op Enter. Ook in de app zelf verschijnt een melding; sluit de app dan en start opnieuw via `Start Meeting Noter.command`. Je instellingen en opnames (opgeslagen in de browser) blijven bewaard.

Privacy: voor de updatecheck vraagt de app (en het startbestand) alleen het versienummer van de nieuwste release op bij GitHub (`api.github.com`). Audio en transcripties verlaten je computer niet.

*English: for non-technical Mac users: download the ZIP, unzip, right-click `Start Meeting Noter.command` > Open, wait for the first-time setup, use Chrome. It fetches its own Node.js, builds the app and opens it. Updates are offered at each start (and via an in-app banner); only the latest release version number is fetched from GitHub.*

### Je meetings bewaren

- Een update of herinstallatie van de app laat je meetings staan. Ze worden bewaard in deze browser, op deze Mac, en niet op een server.
- Gebruik daarom steeds dezelfde browser (en open de app op http://localhost:3000). In een andere browser of ander profiel zie je je meetings niet.
- Na je eerste meeting vraagt de app de browser om de opslag te beschermen, zodat de browser hem niet uit zichzelf opruimt. In Instellingen > Opslag zie je of dat aan staat.
- Meetings worden standaard na 2 jaar automatisch verwijderd (met hun transcript). Je kunt dit wijzigen naar 1 jaar, 5 jaar of Nooit bij Instellingen > Opslag > "Meetings automatisch verwijderen na".

### Opnamemodus

Onderaan kies je **Mic** (alleen je microfoon) of **Mic + gesprek** (je microfoon plus het geluid van de andere deelnemers; deel een browsertabblad of je scherm met geluid, of gebruik de audio-helper).

## Voor ontwikkelaars

De Mac-installer wordt gebouwd door `.github/workflows/release.yml` (zie [docs/RELEASING.md](docs/RELEASING.md)).

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

# Meeting Noter installeren op een Mac

Eén regel in Terminal installeert Meeting Noter. U heeft geen Node.js, Xcode of
beheerdersrechten nodig, en er komt geen waarschuwing van macOS.

## Installeren

1. Open **Terminal** (Spotlight: druk op ⌘-spatie, typ `Terminal`, druk op Enter).
2. Plak deze regel en druk op Enter:

   ```bash
   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh | bash
   ```

3. Wacht enkele minuten. De app draait daarna; de installer bereidt dan nog eenmalig
   het snelle GPU-spraakmodel voor (zie hieronder, ca. 5-15 minuten extra). Daarna opent Meeting Noter in uw browser op
   `http://localhost:3000`, en staat **Meeting Noter** in de map **Apps**
   (Programma's) en in Spotlight. Bent u geen beheerder van de Mac, dan staat het
   in de map Apps in uw thuismap (`~/Applications`).

**Snel GPU-spraakmodel.** Na de installatie bouwt de installer eenmalig het
WebGPU-model (`encoder-model.q4f16.onnx`, 516 MB) op uw eigen Mac: hij downloadt
daarvoor het bronmodel (ca. 2,5 GB) van Hugging Face en het hulpprogramma `uv`
(vastgepinde versie, SHA-256 gecontroleerd) en zet het om. Dat kost ca. 5-15
minuten en ca. 4 GB tijdelijke schijfruimte (wordt daarna verwijderd); er is
minimaal 6 GB vrije ruimte en 8 GB werkgeheugen nodig. Het resultaat staat in
`~/Library/Application Support/Meeting Noter/models/` en blijft bewaard bij
updates (het wordt niet opnieuw gebouwd). Met dit model kunt u live
transcriberen; bij het eerste gebruik vraagt de app toestemming om het te laden.
Mislukt de bouw (of is er te weinig ruimte), dan werkt de app met het CPU-model:
transcriptie pas na Stop. Opnieuw proberen:
`curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh | bash -s -- --gpu-model`.
Logbestand: `logs/model-build.log`.

Nodig: macOS 13.5 of nieuwer. Systeemaudio van gespreksdeelnemers opnemen (de
audio-helper) vraagt macOS 14.4 of nieuwer; op een oudere Mac werkt de app met de
microfoon en met het delen van een browsertabblad met geluid.

## Gebruiken

Open **Meeting Noter** uit Apps of Spotlight. De app draait op de achtergrond, ook
na een herstart van de Mac; het icoon opent alleen de browser.

**Microfoon:** de eerste keer dat u opneemt vraagt macOS of de audio-helper de
microfoon (en systeemaudio) mag gebruiken. Klik **Sta toe**. Na een update kan
macOS dit opnieuw vragen, omdat de helper niet bij Apple is ondertekend; klik dan
weer **Sta toe**.

## Bijwerken

Plak dezelfde regel opnieuw in Terminal. Is er al de nieuwste versie, dan meldt de
installer dat en verandert er niets. De app zelf biedt bij het openen ook een
nieuwe versie aan (**Bijwerken**). Uw opnames en instellingen blijven bewaard.

## Verwijderen

```bash
curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/uninstall.sh | bash
```

of, zonder internet:

```bash
bash ~/Library/Application\ Support/Meeting\ Noter/uninstall.sh
```

Dit verwijdert de app en de achtergronddiensten. Uw opnames staan in de browser en
blijven bewaard; wis die via de websitegegevens van `localhost` in uw browser.

## Problemen

- **"Poort 3000 is al in gebruik"**: er draait nog een andere Meeting Noter
  (bijvoorbeeld `Start Meeting Noter.command`). Sluit die en plak de regel opnieuw.
- **"Kon de nieuwste versie niet ophalen"** vlak na een nieuwe release: de
  downloads worden nog gebouwd. Probeer het over 15 minuten opnieuw.
- **De app opent niet**: plak de installatieregel opnieuw. Logbestanden staan in
  `~/Library/Application Support/Meeting Noter/logs/` (`server.log`,
  `helper.log`, `update.log`); stuur die mee als u hulp vraagt.

## Wat er wordt geïnstalleerd

| Waar | Wat |
| --- | --- |
| `~/Library/Application Support/Meeting Noter/` | de app met eigen Node.js, de audio-helper, logbestanden, `uninstall.sh` |
| `~/Library/LaunchAgents/nl.jensbouma.meeting-noter.server.plist` | start de webserver op `127.0.0.1:3000` bij het inloggen |
| `~/Library/LaunchAgents/nl.jensbouma.meeting-noter.audio-helper.plist` | start de audio-helper (alleen macOS 14.4+) |
| `~/Library/Application Support/Meeting Noter/models/` | het zelfgebouwde WebGPU-spraakmodel (blijft bewaard bij updates) |
| `~/Library/Application Support/Meeting Noter/bin/uv` | modelbouwer, alleen gebruikt om het model te maken |
| `/Applications/Meeting Noter.app` (of `~/Applications/…`) | opent `http://localhost:3000`, biedt updates aan |

De installer downloadt van GitHub-releases (de app en `uv`, SHA-256 gecontroleerd)
en, voor het spraakmodel, van Hugging Face (`istupakov/parakeet-tdt-0.6b-v3-onnx`). Voor de updatecheck vraagt de app alleen het versienummer
van de nieuwste release op bij `api.github.com`. Audio en transcripties verlaten uw
Mac niet.

*English: open Terminal, paste the line above, press Enter; Meeting Noter appears in
Applications and opens in your browser. Update: paste the same line again (the
app also offers updates). Uninstall: the `uninstall.sh` line above; recordings stay
in the browser. Needs macOS 13.5+ (system audio helper: 14.4+).*

## Voor de beheerder: een release maken

Zie `docs/RELEASING.md`. Zodra een release is gepubliceerd, bouwt
`.github/workflows/release.yml` op een arm64- en een Intel-runner
`meeting-noter-macos-{arm64,x64}.tar.gz` (+ `.sha256`) met
`scripts/installer/package.sh` en hangt daarna `install.sh` en `uninstall.sh` aan
de release. De versie in `package.json` moet gelijk zijn aan de tag. Lokaal testen:

```bash
bash scripts/installer/package.sh        # build/installer/meeting-noter-macos-<arch>.tar.gz
HOME=/tmp/mn-home MEETING_NOTER_NO_LAUNCHD=1 MEETING_NOTER_NO_OPEN=1 \
  MEETING_NOTER_DOWNLOAD_BASE="file://$PWD/build/installer" bash scripts/installer/install.sh
```

(Een pad met spaties schrijft u in de `file://`-URL als `%20`.)

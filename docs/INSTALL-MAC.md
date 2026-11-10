# Meeting Noter installeren op een Mac

Eén regel in Terminal installeert Meeting Noter. U heeft geen Node.js, Xcode of
beheerdersrechten nodig, en er komt geen waarschuwing van macOS.

## Installeren

1. Open **Terminal** (Spotlight: druk op ⌘-spatie, typ `Terminal`, druk op Enter).
2. Plak deze regel en druk op Enter:

   ```bash
   curl -fsSL https://github.com/Jensbouma123/meeting-noter/releases/latest/download/install.sh | bash
   ```

3. Wacht enkele minuten: de installer downloadt ook het snelle spraakmodel
   (ca. 0,5 GB extra, eenmalig; bij een onderbroken download gaat de volgende
   keer verder waar het stopte). Daarna opent Meeting Noter in uw browser op
   `http://localhost:3000`, en staat **Meeting Noter** in de map **Apps**
   (Programma's) en in Spotlight. Bent u geen beheerder van de Mac, dan staat het
   in de map Apps in uw thuismap (`~/Applications`).

Het spraakmodel (WebGPU, q4f16, 516 MB) komt van de GitHub-release `models-v1` en
staat in `~/Library/Application Support/Meeting Noter/models/`; het blijft bewaard
bij updates. Bij het eerste gebruik vraagt de app toestemming om het (en het kleine
decodermodel) in de browser te laden, waarna u live kunt transcriberen. Optioneel
het fp16-model (1,2 GB, reserve voor GPU's die q4f16 niet aankunnen):
`curl -fsSL .../install.sh | bash -s -- --fp16`. Lukt de modeldownload niet, dan
gebruikt de app het CPU-model: transcriptie pas na Stop.

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
| `~/Library/Application Support/Meeting Noter/models/` | het WebGPU-spraakmodel (blijft bewaard bij updates) |
| `/Applications/Meeting Noter.app` (of `~/Applications/…`) | opent `http://localhost:3000`, biedt updates aan |

De installer downloadt alleen van GitHub-releases
(`releases/latest` en `releases/download/models-v1`) en controleert de
SHA-256 van elke download. Voor de updatecheck vraagt de app alleen het versienummer
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

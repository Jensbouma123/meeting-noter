# Third-party notices / Vermeldingen van derden

Meeting Noter's own code is MIT licensed (see [LICENSE](LICENSE)). The data
and models below come from other people's work and keep their own license.

De eigen code van Meeting Noter valt onder de MIT-licentie. Onderstaande data
en modellen komen uit het werk van anderen en houden de eigen licentie.

## FrequencyWords (Dutch and English word frequency lists)

- **Used in / Gebruikt in:** `src/lib/vocabulary/frequent-words-nl.json`,
  `src/lib/vocabulary/frequent-words-en.json`
- **What / Wat:** the 2000 most frequent words per language, taken from
  `content/2018/nl/nl_50k.txt` and `content/2018/en/en_50k.txt`, lowercased and
  reduced to letters only. Used to keep glossary correction from replacing
  common words.
- **Author / Auteur:** Hermit Dave, <https://github.com/hermitdave/FrequencyWords>
- **Underlying data / Brondata:** OpenSubtitles 2018 corpus, via OPUS
  (<https://opus.nlpl.eu/>), <https://www.opensubtitles.org/>
- **License / Licentie:** Creative Commons Attribution-ShareAlike 4.0
  International (CC BY-SA 4.0),
  <https://creativecommons.org/licenses/by-sa/4.0/>

These two JSON files, and any changed versions of them, are shared under
CC BY-SA 4.0. Thank you to Hermit Dave for compiling and publishing these lists.

Deze twee JSON-bestanden, en gewijzigde versies ervan, vallen onder
CC BY-SA 4.0. Dank aan Hermit Dave voor het samenstellen en publiceren van
deze lijsten.

## WeSpeaker ResNet34 speaker embedding model (VoxCeleb)

- **Used in / Gebruikt in:** speaker detection, downloaded by the browser after
  consent (not shipped in this repo): `wespeaker_en_voxceleb_resnet34.onnx`
  from <https://huggingface.co/csukuangfj/speaker-embedding-models>
- **What / Wat:** a ResNet34 model that turns speech into a voice fingerprint.
  Used to re-group speakers after a meeting.
- **Authors / Auteurs:** the WeSpeaker project,
  <https://github.com/wenet-e2e/wespeaker>; ONNX export by Fangjun Kuang
  (sherpa-onnx)
- **Underlying data / Brondata:** VoxCeleb (Nagrani, Chung, Zisserman et al.),
  <https://mm.kaist.ac.kr/datasets/voxceleb/>
- **License / Licentie:** Creative Commons Attribution 4.0 International
  (CC BY 4.0), <https://creativecommons.org/licenses/by/4.0/>. The Hugging
  Face repo has no model card; WeSpeaker's `docs/pretrained.md` states that its
  VoxCeleb models follow the VoxCeleb dataset license, CC BY 4.0. The WeSpeaker
  code is Apache 2.0.

Thank you to the WeSpeaker team, the VoxCeleb authors and Fangjun Kuang.

Dank aan het WeSpeaker-team, de makers van VoxCeleb en Fangjun Kuang.

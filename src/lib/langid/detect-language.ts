import * as ort from 'onnxruntime-web';
import { LANGID_DECODER_START_TOKEN } from './manifest';
import { LANGID_ID_TO_TOKEN } from './languages';
import type { LangIdModel, LangIdPrediction } from './types';

function findInputName(session: ort.InferenceSession, needle: string): string | undefined {
  return session.inputNames.find((n) => n.toLowerCase().includes(needle));
}

function findOutputName(session: ort.InferenceSession, needle: string): string {
  return session.outputNames.find((n) => n.toLowerCase().includes(needle)) ?? session.outputNames[0];
}

export async function detectLanguage(model: LangIdModel, melFeatures: Float32Array): Promise<LangIdPrediction[]> {
  const featuresTensor = new ort.Tensor('float32', melFeatures, [1, 80, melFeatures.length / 80]);
  const encoderInputName = model.encoder.inputNames[0];
  const encoderOut = await model.encoder.run({ [encoderInputName]: featuresTensor });
  const encoderOutputName = findOutputName(model.encoder, 'last_hidden_state');
  const encoderHiddenStates = encoderOut[encoderOutputName];

  const decoderFeeds: Record<string, ort.Tensor> = {};
  const inputIdsName = findInputName(model.decoder, 'input_ids');
  const encoderHiddenName = findInputName(model.decoder, 'encoder_hidden_states');
  const attentionMaskName = findInputName(model.decoder, 'attention_mask');
  if (inputIdsName) decoderFeeds[inputIdsName] = new ort.Tensor('int64', [BigInt(LANGID_DECODER_START_TOKEN)], [1, 1]);
  if (encoderHiddenName) decoderFeeds[encoderHiddenName] = encoderHiddenStates;
  if (attentionMaskName) decoderFeeds[attentionMaskName] = new ort.Tensor('int64', [BigInt(1)], [1, 1]);

  const decoderOut = await model.decoder.run(decoderFeeds);
  const logitsName = findOutputName(model.decoder, 'logits');
  const logits = decoderOut[logitsName];
  const vocabSize = logits.dims[logits.dims.length - 1];
  const logitsData = logits.data as Float32Array;

  const entries: Array<{ code: string; logit: number }> = [];
  for (const [id, code] of LANGID_ID_TO_TOKEN) {
    if (id < vocabSize) entries.push({ code, logit: logitsData[id] });
  }
  const maxLogit = Math.max(...entries.map((e) => e.logit));
  const expSum = entries.reduce((sum, e) => sum + Math.exp(e.logit - maxLogit), 0);
  return entries
    .map((e) => ({ code: e.code, confidence: Math.exp(e.logit - maxLogit) / expSum }))
    .sort((a, b) => b.confidence - a.confidence);
}

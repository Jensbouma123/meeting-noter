import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIAR_MODEL_DIR =
  process.env.ECHO_EVAL_DIAR_MODEL ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval/diar-model';
export const DIAR_GRAPH_FILE = path.join(DIAR_MODEL_DIR, 'onnx/model_q4f16.onnx');
export const DIAR_WEIGHTS_FILE = `${DIAR_GRAPH_FILE}_data`;
export const ORT_NODE_WASM_BASE = pathToFileURL(path.resolve('node_modules/onnxruntime-web/dist') + '/').href;

export const diarModelReady = (): boolean => fs.existsSync(DIAR_GRAPH_FILE) && fs.existsSync(DIAR_WEIGHTS_FILE);

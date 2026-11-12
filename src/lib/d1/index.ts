/**
 * Public entry point for LiquidAI D1 (`d1-omni-600M-ONNX`) text-only
 * client-side inference, downloader, prompt encoding, and protocol types.
 */

export {
  D1_CONFIG_FILE,
  D1_DEFAULT_TEMPERATURES,
  D1_DELIMITERS,
  D1_GRAPH_FILE,
  D1_GRAPH_Q4_FILE,
  D1_MARKER_TOKEN,
  D1_MAX_BATCH_SIZE,
  D1_MAX_TOKENS,
  D1_OMNI_REPO,
  D1_OMNI_REVISION,
  D1_QTYPES,
  D1_TEXT_FILES,
  D1_TOKENIZER_CONFIG_FILE,
  D1_TOKENIZER_FILE,
  D1_TOTAL_SIZE_BYTES,
  D1_WEIGHTS_FILE,
  D1_WEIGHTS_Q4_FILE,
  d1VariantFiles,
  d1VariantModelFiles,
  type D1ModelVariant,
  externalDataPath,
  type D1ModelFile,
} from './manifest';

export {
  assertD1ModelsCached,
  downloadD1Models,
  ensureD1ModelsCached,
  modelSource,
  readModelJson,
  revokeModelUrls,
  type DownloadProgress,
} from './downloader';

export {
  assertD1TokenizerSelfTest,
  bucketSequenceLength,
  collateD1Batch,
  decodeD1Answer,
  encodeD1Prompt,
  escapeD1Text,
  extractD1Temperatures,
  formatD1PromptTemplate,
  getQuestionOptionCount,
  getTemperatureKey,
  maskedSoftmax,
  renderD1Options,
  resolveTemperature,
  validateD1Question,
  type D1Answer,
  type D1ChoiceQuestion,
  type D1ConfigLike,
  type D1EncodedBatch,
  type D1EncodedPrompt,
  type D1NoulQuestion,
  type D1Question,
  type D1QuestionType,
  type D1ResolvedTokens,
  type D1ScoreQuestion,
  type D1Tokenizer,
} from './prompt';

export {
  createSession,
  Tensor,
  type ExternalDataFile,
  type InferenceSession,
  type SessionBackend,
} from './onnx-session';

export type {
  D1DecisionRequest,
  D1DecisionsResult,
  D1DetectedActionItem,
  D1DetectedDecision,
  D1SegmentInput,
  D1TriageResult,
  D1TriageSpanResult,
  D1TurnVerificationResult,
  D1WindowClassification,
  D1WindowLabel,
  D1WorkerErrorCode,
  D1WorkerInMessage,
  D1WorkerOutMessage,
} from './protocol';

export {
  createD1Client,
  D1_DISPOSE_TIMEOUT_MS,
  d1Client,
  getD1Client,
  type D1Client,
  type D1ClientOptions,
  type DecisionsOptions,
  type TriageOptions,
  type VerifyTurnsOptions,
  type WorkerLike,
} from './client';

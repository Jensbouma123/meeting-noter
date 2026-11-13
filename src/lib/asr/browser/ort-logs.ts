import * as ort from 'onnxruntime-web';

export function silenceOrtSessionLogs(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    void 0;
  }
  try {
    const Session = ort.InferenceSession as unknown as {
      create: (...args: unknown[]) => Promise<ort.InferenceSession>;
    };
    const original = Session.create.bind(Session);
    Session.create = (...args: unknown[]) => {
      const optionsIndex = 1;
      const existing = args[optionsIndex];
      args[optionsIndex] =
        existing && typeof existing === 'object'
          ? { ...(existing as object), logSeverityLevel: 3 }
          : { logSeverityLevel: 3 };
      return original(...args);
    };
  } catch {
    void 0;
  }
}

import path from 'node:path';
import type { AppAssistant, AssistantDeps, AssistantInfo } from './types';

export const APP_NAME: Record<AppAssistant, string> = {
  'codex-app': 'Codex',
  'gemini-app': 'Gemini',
};

export function appBundlePaths(id: AppAssistant, env: NodeJS.ProcessEnv): string[] {
  const bundle = `${APP_NAME[id]}.app`;
  const dirs = ['/Applications', env.HOME ? path.join(env.HOME, 'Applications') : null];
  return dirs.filter((d): d is string => d !== null).map((d) => path.join(d, bundle));
}

export function appInfo(id: AppAssistant, deps: Pick<AssistantDeps, 'env' | 'fileExists'>): AssistantInfo {
  const found = appBundlePaths(id, deps.env).find((file) => deps.fileExists(file)) ?? null;
  return {
    id,
    status: found ? 'installed' : 'not-found',
    canAutoConnect: false,
    manualCommand: null,
    configPath: found,
  };
}

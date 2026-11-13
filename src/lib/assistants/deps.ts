import { findCli, runCli } from './cli';
import type { AssistantDeps } from './types';

export function defaultDeps(env: NodeJS.ProcessEnv = process.env): AssistantDeps {
  return { env, now: () => new Date(), findCli: (name) => findCli(name, env), runCli };
}

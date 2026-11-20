import { resolveAskTarget } from './resolveAskTarget';
import type { AskAssistant, AskDeliveryIo, AskOutcome } from './types';

async function viaClipboard(copied: Promise<boolean>): Promise<AskOutcome> {
  return (await copied) ? 'copied' : 'copy-failed';
}

export async function deliverPrompt(assistant: AskAssistant, prompt: string, io: AskDeliveryIo): Promise<AskOutcome> {
  if (assistant.serverLaunch === 'terminal') {
    if ((await io.requestLaunch(assistant.id, prompt)).ok) return 'opened';
    return viaClipboard(io.copy(prompt));
  }
  const target = resolveAskTarget(assistant, prompt);
  if (assistant.serverLaunch === 'app') {
    const copied = io.copy(prompt);
    const result = await io.requestLaunch(assistant.id, prompt);
    if (!result.ok) {
      if (target.webUrl) io.openWeb(target.webUrl);
      return target.prefilled ? 'opened' : viaClipboard(copied);
    }
    if (result.prefilled) return 'opened';
    return result.reason === 'accessibility' ? 'accessibility' : 'copied';
  }
  const copied = target.prefilled ? Promise.resolve(true) : io.copy(prompt);
  if (target.appUrl) io.launchApp(target.appUrl, target.webUrl);
  else if (target.webUrl) io.openWeb(target.webUrl);
  return target.prefilled ? 'opened' : viaClipboard(copied);
}

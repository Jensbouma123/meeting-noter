export const APP_LAUNCH_WAIT_MS = 1500;

import type { LaunchDeps } from './launchAppLink.types';

function browserDeps(): LaunchDeps {
  return {
    navigate: (url) => window.location.assign(url),
    openWeb: (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    win: window,
    doc: document,
  };
}

export function launchAppLink(appUrl: string, webUrl: string | null, deps: LaunchDeps = browserDeps()): void {
  let appTookFocus = false;
  const onBlur = () => {
    appTookFocus = true;
  };
  const onVisibility = () => {
    if (deps.doc.visibilityState === 'hidden') appTookFocus = true;
  };
  deps.win.addEventListener('blur', onBlur);
  deps.doc.addEventListener('visibilitychange', onVisibility);
  deps.navigate(appUrl);
  deps.win.setTimeout(() => {
    deps.win.removeEventListener('blur', onBlur);
    deps.doc.removeEventListener('visibilitychange', onVisibility);
    if (!appTookFocus && webUrl) deps.openWeb(webUrl);
  }, APP_LAUNCH_WAIT_MS);
}

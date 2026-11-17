export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lifecycle, startIdleShutdown } = await import('./lib/lifecycle/server-lifecycle');
  startIdleShutdown();
  const { install } = lifecycle();
  if (install.kind !== 'installer') return;
  const { startLegacyBridge } = await import('./lib/legacy-origin/legacy-bridge');
  void startLegacyBridge(install.root, Number(process.env.PORT), install.current).catch(() => undefined);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startIdleShutdown } = await import('./lib/lifecycle/server-lifecycle');
  startIdleShutdown();
}

// Runs once when the Next.js server starts: arms the idle shutdown of the
// on-demand server (a no-op unless launcher.sh asked for it).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startIdleShutdown } = await import('./lib/lifecycle/server-lifecycle');
  startIdleShutdown();
}

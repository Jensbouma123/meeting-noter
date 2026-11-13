export async function stopTestServer({ root, port, run, read }) {
  const pids = new Set();
  try { pids.add(Number(read('server.pid').trim())); } catch { void 0; }
  const lsof = await run('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], process.env);
  for (const pid of lsof.out.split(/\s+/).filter(Boolean)) {
    const cwd = await run('/usr/sbin/lsof', ['-p', pid, '-a', '-d', 'cwd', '-Fn'], process.env);
    if (cwd.out.includes(`n${root}/`)) pids.add(Number(pid));
  }
  for (const pid of pids) {
    try { if (pid > 0) process.kill(pid); } catch { void 0; }
  }
}

import { useCallback, useState } from 'react';

export function useBenchLog() {
  const [log, setLog] = useState<string[]>([]);
  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${line}`]);
  }, []);
  return { log, appendLog };
}

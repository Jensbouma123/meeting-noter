// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_EVAL_PORT, evalPort, portBusyMessage } from './eval-port';

describe('evalPort', () => {
  it('defaults to the fixed eval port so every run shares one origin', () => {
    expect(evalPort(undefined)).toBe(3333);
    expect(evalPort('')).toBe(DEFAULT_EVAL_PORT);
  });

  it('takes ECHO_EVAL_PORT as an override', () => {
    expect(evalPort('4100')).toBe(4100);
  });

  it('rejects a port that is not a valid integer', () => {
    for (const bad of ['abc', '0', '70000', '33.5']) expect(() => evalPort(bad)).toThrow(/ECHO_EVAL_PORT/);
  });

  it('names the port and the override in the busy message', () => {
    expect(portBusyMessage(3333)).toMatch(/port 3333 is busy.*ECHO_EVAL_PORT/);
  });
});

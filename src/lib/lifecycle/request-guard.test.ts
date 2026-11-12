import { describe, expect, it } from 'vitest';
import { refuseForeign } from './request-guard';

const call = (headers: Record<string, string>) => refuseForeign(new Request('http://localhost:3000/api/app/x', { headers }));

describe('refuseForeign', () => {
  it('lets same-origin localhost pages and header-less local calls through', () => {
    expect(call({ host: 'localhost:3000' })).toBeNull();
    expect(call({ host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' })).toBeNull();
    expect(call({ host: '[::1]:3000', origin: 'http://[::1]:3000' })).toBeNull();
    expect(call({ host: 'localhost' })).toBeNull();
  });

  it.each([
    ['DNS rebinding (foreign Host)', { host: 'evil.example:3000' }],
    ['no Host at all', {}],
    ['Host that only starts with localhost', { host: 'localhost.evil.example:3000' }],
    ['Host with localhost as a suffix label', { host: 'evil.localhost:3000' }],
    ['foreign Origin', { host: 'localhost:3000', origin: 'https://evil.example' }],
    ['Origin on another port', { host: 'localhost:3000', origin: 'http://localhost:4000' }],
    ['null Origin (sandboxed iframe)', { host: 'localhost:3000', origin: 'null' }],
    ['malformed Origin', { host: 'localhost:3000', origin: 'not a url' }],
    ['Origin that embeds the host in userinfo', { host: 'localhost:3000', origin: 'http://localhost:3000@evil.example' }],
  ])('refuses %s with 403', async (_name, headers) => {
    const res = call(headers);
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ ok: false, error: 'forbidden' });
  });
});

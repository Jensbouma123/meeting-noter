import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMeetingsMcpServer } from './meetings-server';
import { connect, connectClient, removeTempDirs } from './test-client';

afterEach(removeTempDirs);

describe('meetings MCP server errors', () => {
  it('says there are no meetings when the DB does not exist yet', async () => {
    const { call } = await connect();
    const res = await call('list_meetings');
    expect(res.isError).toBe(false);
    expect(res.text).toBe('Meeting database not found. Open Meeting Noter once to create it.');
  });

  it('returns a generic error without the DB path, and logs the detail to stderr', async () => {
    const secretPath = '/Users/someone/Library/Application Support/Meeting Noter/meetings.db';
    const server = createMeetingsMcpServer(() => {
      throw new Error(`unable to open database file: ${secretPath}`);
    });
    const client = await connectClient(server);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = (await client.callTool({ name: 'list_meetings', arguments: {} })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toBe('Could not read the meetings database. Open Meeting Noter once, then try again.');
      expect(res.content[0].text).not.toContain(secretPath);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain(secretPath);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readActiveMeeting } from '../../lib/active-meeting/read';
import { renderMeetingMarkdown } from '../../lib/meeting-db/markdown';
import { textResult } from '../tool-result';
import type { WithDb } from './types';

const NONE = 'No meeting is open in Meeting Noter right now. Open or start a meeting in the app, then ask again.';

export function registerGetActiveMeeting(server: McpServer, withDb: WithDb, activeMeetingFile: string): void {
  server.registerTool(
    'get_active_meeting',
    {
      title: 'Get active meeting',
      description:
        'Read the meeting currently open in the Meeting Noter app (the one the user is looking at), ' +
        'as Markdown with the transcript so far. is_live says whether it is being recorded right now.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const { meetingId, isLive } = readActiveMeeting(activeMeetingFile);
      if (!meetingId) return textResult(NONE);
      return withDb((db) => {
        const meeting = db.get(meetingId);
        if (!meeting) return textResult(`The open meeting "${meetingId}" has no saved transcript yet. ${isLive ? 'Recording just started, try again in a few seconds.' : NONE}`);
        return textResult(`is_live: ${isLive}\n\n${renderMeetingMarkdown(meeting)}`);
      });
    },
  );
}

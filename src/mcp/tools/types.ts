import type { MeetingsDb } from '../../lib/meeting-db/db';
import type { ToolResult } from '../types';

export type WithDb = (fn: (db: MeetingsDb) => ToolResult) => ToolResult;

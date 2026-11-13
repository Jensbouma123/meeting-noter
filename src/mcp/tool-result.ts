import type { ToolResult } from './types';

export const textResult = (value: string, isError = false): ToolResult => ({
  content: [{ type: 'text', text: value }],
  ...(isError ? { isError } : {}),
});

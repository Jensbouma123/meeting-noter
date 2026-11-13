declare module 'node:sqlite' {
  type SQLInputValue = null | number | bigint | string | Uint8Array;
  type SQLOutputValue = null | number | bigint | string | Uint8Array;

  interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  class StatementSync {
    all(...params: SQLInputValue[]): Record<string, SQLOutputValue>[];
    all(named: Record<string, SQLInputValue>, ...params: SQLInputValue[]): Record<string, SQLOutputValue>[];
    get(...params: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    get(named: Record<string, SQLInputValue>, ...params: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...params: SQLInputValue[]): StatementResultingChanges;
    run(named: Record<string, SQLInputValue>, ...params: SQLInputValue[]): StatementResultingChanges;
  }

  interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    timeout?: number;
  }

  class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    readonly isOpen: boolean;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}

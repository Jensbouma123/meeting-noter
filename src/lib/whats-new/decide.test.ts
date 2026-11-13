import { describe, expect, it } from 'vitest';
import { markWhatsNewSeen, shouldShowWhatsNew } from './decide';
import { registerTempDirs } from '../meeting-db/test-support';

const { openDb } = registerTempDirs();

describe('whats-new show-once', () => {
  it('never shows on a fresh install, and records the version', () => {
    const db = openDb();
    expect(shouldShowWhatsNew(db, '1.2.0')).toBe(false);
    expect(db.getMeta('whatsNewLastSeen')).toBe('1.2.0');
  });

  it('shows after an upgrade until it is marked seen', () => {
    const db = openDb();
    db.setMeta('whatsNewLastSeen', '1.1.0');
    expect(shouldShowWhatsNew(db, '1.2.0')).toBe(true);
    expect(shouldShowWhatsNew(db, '1.2.0')).toBe(true);
    markWhatsNewSeen(db, '1.2.0');
    expect(shouldShowWhatsNew(db, '1.2.0')).toBe(false);
  });

  it('does not show after a downgrade', () => {
    const db = openDb();
    db.setMeta('whatsNewLastSeen', '1.3.0');
    expect(shouldShowWhatsNew(db, '1.2.0')).toBe(false);
  });
});

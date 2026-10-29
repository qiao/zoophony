import { describe, expect, it } from 'vitest';

import { SNAPSHOT_IMAGES, snapshotFolder, snapshotIndex } from './snapshot.ts';
import type { SnapshotCommit } from './snapshot.ts';

const commit: SnapshotCommit = {
  hash: '7c62dc38',
  date: '2026-10-10',
  subject: 'docs(research): report the arms close to the body',
  dirty: false,
};

describe('snapshotFolder', () => {
  it('names the folder by the date and the hash of the commit', () => {
    expect(snapshotFolder(commit)).toBe('scratch/snapshots/2026-10-10-7c62dc38');
  });
});

describe('snapshotIndex', () => {
  it('gives the commit, the command, and a row with a link for each image', () => {
    const index = snapshotIndex(commit, SNAPSHOT_IMAGES);
    expect(index).toContain('`7c62dc38`: docs(research): report the arms close to the body.');
    expect(index).toContain('`pnpm snapshot`');
    for (const image of SNAPSHOT_IMAGES) {
      expect(index).toContain(`[\`${image.file}\`](${image.file})`);
    }
    expect(index).not.toContain('not committed');
  });

  it('says when the working tree had changes', () => {
    expect(snapshotIndex({ ...commit, dirty: true }, SNAPSHOT_IMAGES)).toContain(
      'The working tree had changes that were not committed.',
    );
  });
});

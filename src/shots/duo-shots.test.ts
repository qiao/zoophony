import { describe, expect, it } from 'vitest';

import { chamberShotScenes } from './test-shots.ts';

describe('the two-shot of a duo (design 5.6)', () => {
  it('films the violin and the piano of a duo in a two-shot', () => {
    // The check reads the layout and the bodies of one demo: a taller soloist needs a camera
    // further away, beyond the limit of the close shots (SUBJECT_SIZES.twoShotMargin).
    const scene = chamberShotScenes().find((c) => c.file === 'violin-piano.mid');
    const kinds = (scene?.plan.shots ?? [])
      .slice(1)
      .map((s) => `${s.kind} ${s.seats.toSorted((a, b) => a - b).join('+')}`);
    expect(kinds).toContain('section 0+1');
  });
});

import { describe, expect, it } from 'vitest';

import { patchedDemo } from '../../tools/patch-demos.ts';
import { shotSceneOf } from './test-shots.ts';

describe('the choir shots of the Ode to Joy (design 5.6)', async () => {
  const { bytes } = await patchedDemo('beethoven-9.mid');
  const scene = shotSceneOf('beethoven-9.mid', bytes);
  const choir = scene.score.seats.findIndex((s) => s.section === 'choir');

  it('films the choir of the Ode to Joy while it sings the theme', () => {
    // The choir sings the theme from 0 s to about 64 s. The plan showed it only in one side
    // view at 22.9 s, because it never carried the lead.
    const theme = scene.plan.shots.filter(
      (s) => s.startSec < 64 && (s.kind === 'section' || s.kind === 'solo') && s.seats[0] === choir,
    );
    expect(theme.length).toBeGreaterThanOrEqual(2);
  });
});

import { describe, expect, it } from 'vitest';

import { layoutScene } from '../src/models/layout-scene.ts';
import { scoreOf } from '../src/score/test-score.ts';
import { perf60Bytes } from './write-perf-60.ts';

describe('perf60Bytes', () => {
  const score = scoreOf(perf60Bytes(), 'one-per-part');

  // The layout builds the models of all players. It takes 0.7 s on an idle Mac, so a high load
  // can pass the default limit of 5 s.
  it('gives 60 players with the section size "One per part" (design 9.5)', () => {
    expect(layoutScene(score).players).toHaveLength(60);
  }, 20_000);

  it('holds 60 s of notes', () => {
    expect(score.durationSec).toBeGreaterThanOrEqual(59.5);
    expect(score.durationSec).toBeLessThanOrEqual(60);
    expect(score.notes.filter((n) => n.startSec >= 59)).not.toHaveLength(0);
  });
});

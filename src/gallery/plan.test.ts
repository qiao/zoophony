import { describe, expect, it } from 'vitest';

import { CONDUCTOR } from '../models/cast.ts';
import { ModelCache } from '../models/model-cache.ts';
import { INSTRUMENT_SUPPORTS } from '../models/player.ts';
import { galleryPlan, testBeats, testPlayerNotes } from './plan.ts';
import type { GalleryAnimal } from './plan.ts';
import { DEFAULT_TEST_NOTES, parseTestNotes } from './notes.ts';
import type { TestNote } from './notes.ts';

const NOTES: readonly TestNote[] = (() => {
  const result = parseTestNotes(DEFAULT_TEST_NOTES);
  return result.ok ? result.notes : [];
})();

describe('testPlayerNotes', () => {
  it('gives each test note to the seat with the velocity 100, sorted by start', () => {
    const notes = testPlayerNotes(NOTES.slice(0, 2).toReversed(), 3);
    expect(notes.map((n) => [n.startSec, n.endSec, n.pitch])).toEqual([
      [0, 0.5, 60],
      [0.5, 1, 64],
    ]);
    expect(notes.every((n) => n.seatIndex === 3 && n.velocity === 100)).toBe(true);
  });
});

describe('testBeats (design 7.1)', () => {
  it('gives 4/4 at 120 BPM until the end of the last note', () => {
    const beats = testBeats(NOTES);
    // The last note ends at 4.0 s.
    expect(beats.map((b) => b.timeSec)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(beats.map((b) => b.indexInBar)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(testBeats([])).toEqual([]);
  });
});

describe('galleryPlan (design 7.1)', () => {
  const models = new ModelCache();
  /** Places an animal in its own seat. */
  const animal = (
    species: GalleryAnimal['place']['cast']['species'],
    instrument: GalleryAnimal['place']['cast']['instrument'],
    seatIndex: number,
  ): GalleryAnimal => ({
    model: models.get(species, instrument),
    place: {
      position: [seatIndex * 2, 0, 0],
      facing: Math.PI,
      cast: {
        seatIndex,
        player: 0,
        species,
        instrument,
        kettles: 4,
        support: INSTRUMENT_SUPPORTS[instrument],
      },
    },
  });

  it('lets each player play the test notes, and the bear conduct them', () => {
    const plan = galleryPlan(
      [animal('rabbit', 'violin', 0), animal('wolf', 'clarinet', 1)],
      animal(CONDUCTOR.species, CONDUCTOR.instrument, 2),
      NOTES,
    );
    expect(plan.players.map((p) => p.note.family)).toEqual(['bowed', 'woodwind']);
    expect(plan.conductor?.note.family).toBe('conductor');
    expect([...plan.beats]).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    // The players look straight ahead.
    for (const player of plan.players) {
      expect(player.lookYaw).toBeCloseTo(0, 9);
      expect(player.lookPitch).toBeCloseTo(0, 9);
    }
  });

  it('lets the players play alone on a page with no bear', () => {
    const plan = galleryPlan([animal('penguin', 'choir-folder', 0)], null, NOTES);
    expect(plan.conductor).toBeNull();
    expect(plan.players.map((p) => p.note.family)).toEqual(['choir']);
    expect([...plan.beats]).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  });
});

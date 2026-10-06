import { describe, expect, it } from 'vitest';

import { layoutScene } from '../models/layout-scene.ts';
import { chord, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { playerSpots } from './stage-scene.ts';

describe('playerSpots', () => {
  it('gives each player of the layout, then the bear on the podium top (design 4.5)', () => {
    const score = scoreOf(
      {
        tracks: [
          track([programChange(0, 0, 40)], chord(0, 0, [72, 76])),
          track([programChange(0, 1, 42)], chord(0, 1, [48])),
        ],
      },
      'full',
    );
    const layout = layoutScene(score);
    const spots = playerSpots(layout);

    expect(layout.players).toHaveLength(7);
    expect(spots).toHaveLength(layout.players.length + 1);
    for (const [i, place] of layout.players.entries()) {
      expect(spots[i]).toEqual({
        species: place.cast.species,
        instrument: place.cast.instrument,
        kettles: place.cast.kettles,
        support: place.cast.support,
        position: place.position,
        facing: place.facing,
      });
    }
    const [x, y, z] = layout.podium;
    expect(spots.at(-1)).toEqual({
      species: 'bear',
      instrument: 'baton',
      kettles: 4,
      support: 'stand',
      position: [x, y + 0.25, z],
      facing: 0,
    });
  });

  it('gives no bear to a chamber group (design 4.2)', () => {
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 40)], chord(0, 0, [72, 76])),
        track([programChange(0, 1, 42)], chord(0, 1, [48])),
      ],
    });
    const layout = layoutScene(score);
    expect(layout.players).toHaveLength(3);
    expect(layout.conductor).toBeNull();
    expect(playerSpots(layout).map((spot) => spot.species)).toEqual(['rabbit', 'rabbit', 'dog']);
  });
});

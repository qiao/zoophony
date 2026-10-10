import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
} from 'three';

import { layoutScene } from '../models/layout-scene.ts';
import { PODIUM_SIZE } from '../models/stage.ts';
import { chord, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { effectTime, lightEffects, playerSpots } from './stage-scene.ts';

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
      position: [x, y + PODIUM_SIZE[1], z],
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

describe('lightEffects (design 4.5, post effects)', () => {
  it('finds the meshes and the points that write no depth, also in a nested group', () => {
    const opaque = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    // A player has the matte and the metal material (design 4.5).
    const player = new Mesh(new BoxGeometry(), [new MeshBasicMaterial(), new MeshBasicMaterial()]);
    const beam = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ depthWrite: false }));
    const motes = new Points(new BufferGeometry(), new PointsMaterial({ depthWrite: false }));
    const scene = new Group().add(opaque, player, new Group().add(beam, motes));
    expect(lightEffects(scene)).toEqual([beam, motes]);
  });
});

describe('effectTime (design 2.5, review of step 8, L3)', () => {
  it('follows the wall time, and stands still with reduced motion', () => {
    expect(effectTime(12_500, false)).toBe(12.5);
    expect(effectTime(12_500, true)).toBe(0);
    expect(effectTime(99_000, true)).toBe(0);
  });
});

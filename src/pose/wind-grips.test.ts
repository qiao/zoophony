import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { WIND_HOLDS, windGrips, windRig } from './winds.ts';

describe('windGrips (design 4.6, 5.3)', () => {
  const oboe = windRig(buildPlayer('wolf', 'oboe'), 'oboe');
  const flute = windRig(buildPlayer('wolf', 'flute'), 'flute');

  it('turns each grip around the mouthpiece, so that it keeps its distance from the mouth', () => {
    const play = windGrips(flute, 1);
    for (const side of ['L', 'R'] as const) {
      const bind = side === 'L' ? flute.left.grip : flute.right.grip;
      const before = new Vector3(...bind).distanceTo(new Vector3(...flute.pivot));
      const after = new Vector3(...play[side].grip).distanceTo(new Vector3(...flute.pivot));
      expect(after).toBeCloseTo(before, 9);
      expect(new Vector3(...play[side].grip).distanceTo(new Vector3(...bind))).toBeGreaterThan(
        0.01,
      );
    }
  });

  it('keeps the grips of a hold with no playing turn at their bind places', () => {
    expect(WIND_HOLDS.oboe.play).toEqual([0, 0, 0, 1]);
    const play = windGrips(oboe, 1);
    expect(play.L.grip).toEqual(oboe.left.grip);
    expect(play.R.grip).toEqual(oboe.right.grip);
  });

  it('moves the right shoulder joint forward by the reach turn of the hold', () => {
    const model = buildPlayer('wolf', 'oboe');
    const bindR = model.skeleton.positions[boneIndex('upperArmR')] ?? [0, 0, 0];
    const bindL = model.skeleton.positions[boneIndex('upperArmL')] ?? [0, 0, 0];
    const play = windGrips(oboe, 1);

    expect(WIND_HOLDS.oboe.reach).toBeGreaterThan(0);
    expect(play.R.joint[2]).toBeLessThan(bindR[2] - 0.005);
    expect(new Vector3(...play.L.joint).distanceTo(new Vector3(...bindL))).toBeLessThan(1e-9);
  });

  it('moves the grips by the rest turn and the rest move in the rest pose', () => {
    const rest = windGrips(oboe, 0);
    const play = windGrips(oboe, 1);
    expect(new Vector3(...rest.L.grip).distanceTo(new Vector3(...play.L.grip))).toBeGreaterThan(
      0.01,
    );
  });
});

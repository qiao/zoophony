import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BRASS, buildBrass } from './brass.ts';

describe('buildBrass', () => {
  it('puts the mouthpiece at the mouth, on a bone of the chest', () => {
    for (const id of ['horn', 'trumpet', 'trombone', 'tuba'] as const) {
      const model = buildBrass(id);
      expect(model.parent).toBe('chest');
      expect(model.pieces[0]?.hold.anchor).toBe('mouth');
      expect(model.grips.mouth).toEqual({ bone: 'instrument', at: [0, 0, 0] });
      expect(model.targets.some((t) => t.kind === 'bell')).toBe(true);
    }
  });

  it('points the trumpet forward (design 4.6)', () => {
    const hold = buildBrass('trumpet').pieces[0]?.hold;
    const along = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion(...(hold?.rotation ?? [0, 0, 0, 1])),
    );
    expect(along.z).toBeLessThan(-0.99);
  });

  it('puts the trombone slide on its bone, in the right hand, with its travel (design 4.6)', () => {
    const model = buildBrass('trombone');
    const slide = model.pieces.find((p) => p.bone === 'slide');
    expect(slide?.hold.anchor).toBe('instrument');
    expect(model.grips.palmR?.bone).toBe('slide');
    const line = model.targets.find((t) => t.kind === 'slide');
    expect(line?.bone).toBe('slide');
    const travel = new Vector3(...(line?.to ?? [0, 0, 0])).sub(
      new Vector3(...(line?.from ?? [0, 0, 0])),
    );
    expect(travel.x).toBeCloseTo(BRASS.trombone.travel, 9);
    expect(travel.length()).toBeCloseTo(BRASS.trombone.travel, 9);
  });

  it('opens the tuba bell up, and the horn bell to the right and to the back', () => {
    const tuba = buildBrass('tuba').targets.find((t) => t.kind === 'bell');
    expect(tuba?.normal).toEqual([0, 1, 0]);
    const horn = buildBrass('horn').targets.find((t) => t.kind === 'bell');
    expect(horn?.normal[0]).toBeGreaterThan(0.5);
    expect(horn?.normal[2]).toBeGreaterThan(0.4);
  });
});

import { describe, expect, it } from 'vitest';

import { rotate } from '../math.ts';
import { BATON_TIP, buildBaton } from './baton.ts';

describe('buildBaton', () => {
  it('puts the baton in the right hand on its bone, with the tip at the end (design 4.6)', () => {
    const model = buildBaton();
    expect(model.pieces.map((p) => p.bone)).toEqual(['baton']);
    expect(model.grips.palmR).toEqual({ bone: 'baton', at: [0, 0, 0] });
    expect(model.targets).toHaveLength(1);
    expect(model.targets[0]?.from).toEqual([BATON_TIP, 0, 0]);
    expect(model.size[0]).toBeCloseTo(0.4, 2);
  });

  it('points the baton forward in the hanging right hand', () => {
    const hold = buildBaton().pieces[0]?.hold;
    expect(hold?.anchor).toBe('palmR');
    expect(rotate(hold?.rotation ?? [0, 0, 0, 1], [1, 0, 0])[2]).toBeCloseTo(-1, 9);
  });
});

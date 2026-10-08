import { describe, expect, it } from 'vitest';

import { buildBiped } from '../src/models/biped.ts';
import { STANDING_BASE, seated } from '../src/models/body-frame.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import { SPECIES } from '../src/models/species.ts';
import { sculptRig } from './sculpt-rig.ts';

describe('sculptRig', () => {
  const rig = sculptRig('fox-red');

  it('gives the bones and the body points of the parametric body in each stance', () => {
    const body = buildBiped(new MeshBuilder(), SPECIES['fox-red'], seated(0.35));

    expect(rig.stances.seated.bones).toEqual(body.positions);
    expect(rig.stances.seated.mouth).toEqual(body.mouth);
    expect(rig.stances.seated.palmR).toEqual(body.palmR);
    expect(rig.stances.seated.fingerBlockL).toEqual(body.fingerBlockL);
  });

  it('puts the seated body on a seat of 0.35 m, and the standing body on its legs', () => {
    const h = rig.h;

    expect(h).toBeCloseTo(0.38, 12);
    expect(rig.stances.seated.bones.hips[1]).toBeCloseTo(0.35 + 0.15 * h, 12);
    expect(rig.stances.standing.bones.hips[1]).toBeCloseTo((STANDING_BASE + 0.15) * h, 12);
  });

  it('gives the colors of the species, and the iris of the eyes', () => {
    expect(rig.colors).toEqual({
      fur: SPECIES['fox-red'].colors.fur,
      belly: SPECIES['fox-red'].colors.belly,
      accent: SPECIES['fox-red'].colors.accent,
      iris: '#c98a2e',
    });
  });
});

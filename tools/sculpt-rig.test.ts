import { describe, expect, it } from 'vitest';

import { buildBiped } from '../src/models/biped.ts';
import { seated } from '../src/models/body-frame.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import { proportionsOf } from '../src/models/proportions.ts';
import { SPECIES } from '../src/models/species.ts';
import { sculptRig, sculptStances } from './sculpt-rig.ts';

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
    const { headHeight, shoulderHeight, standingBase } = proportionsOf(SPECIES['fox-red']);
    // The hips bone is 0.15 H above the base of the torso on the default skeleton, and it scales
    // with the shoulder joints (0.98 H).
    const pelvis = (0.15 * shoulderHeight) / 0.98;

    expect(h).toBe(headHeight);
    expect(rig.stances.seated.bones.hips[1]).toBeCloseTo(0.35 + pelvis * h, 12);
    expect(rig.stances.standing.bones.hips[1]).toBeCloseTo((standingBase + pelvis) * h, 12);
  });

  it('gives the skeleton of the species', () => {
    expect(rig.proportions).toEqual(proportionsOf(SPECIES['fox-red']));
    expect(rig.proportions.headHeight).toBe(rig.h);
  });

  it('gives the colors of the species, and the iris of the eyes', () => {
    expect(rig.colors).toEqual({
      fur: SPECIES['fox-red'].colors.fur,
      belly: SPECIES['fox-red'].colors.belly,
      accent: SPECIES['fox-red'].colors.accent,
      iris: '#6e3a1e',
    });
  });

  it('gives the accent parts of the species', () => {
    expect(rig.accentParts).toEqual(['lower-legs', 'feet', 'hands']);
    expect(sculptRig('wolf').accentParts).toEqual(['inner-ears']);
  });

  it('gives the bench of the piano to the species of the piano only', () => {
    const pianist = sculptRig('polar-bear');
    const body = buildBiped(new MeshBuilder(), SPECIES['polar-bear'], seated(0.45));

    expect(sculptStances('polar-bear')).toEqual(['seated', 'bench', 'standing']);
    expect(Object.keys(pianist.stances)).toEqual(['seated', 'bench', 'standing']);
    expect(pianist.stances.bench?.bones).toEqual(body.positions);
    expect(sculptStances('fox-red')).toEqual(['seated', 'standing']);
    expect(Object.keys(rig.stances)).toEqual(['seated', 'standing']);
  });
});

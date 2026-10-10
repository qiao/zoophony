import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FLAP_EAR_ANGLE } from './ears.ts';
import type { Vec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import {
  H,
  boundsOf,
  rabbit,
  reachFrom,
  spanOf,
  topOf,
  trianglesOn,
  variant,
  volumeOn,
} from './test-body.ts';

/** The ear types that the tests build (design 4.3). */
const EAR_TYPES: readonly SpeciesParams['ears'][] = [
  'long',
  'pointed',
  'round',
  'large-round',
  'floppy',
  'large-flap',
  'small',
  'side-round',
  'antlered',
  'none',
];

describe('addEars', () => {
  it('gives the long ears 1.25 H on the ear bones (design 4.5)', () => {
    const { mesh, positions } = rabbit();
    // The ears lean back and out, so their height is a little less than their length.
    const earHeight = topOf(mesh, 'earL') - positions.earL[1];
    expect(earHeight).toBeGreaterThan(1.18 * H);
    expect(earHeight).toBeLessThanOrEqual(1.25 * H);
    // The ear is a flat plate 0.4 H wide, with its inner face turned out to the side.
    const ear = boundsOf(mesh, 'earR');
    expect(ear.max[0] - ear.min[0]).toBeGreaterThan(0.4 * H * Math.cos((30 * Math.PI) / 180));
  });

  it('builds each ear type on the ear bones, with the left ear as the mirror image of the right', () => {
    for (const ears of EAR_TYPES) {
      const { mesh, body } = variant({ ears });
      const left = boundsOf(mesh, 'earL');
      const right = boundsOf(mesh, 'earR');
      expect(trianglesOn(mesh, 'earL')).toBe(trianglesOn(mesh, 'earR'));
      expect(body.positions.earL[0]).toBeCloseTo(-body.positions.earR[0], 9);
      if (ears === 'none') {
        expect(trianglesOn(mesh, 'earR')).toBe(0);
        continue;
      }
      expect(trianglesOn(mesh, 'earR')).toBeGreaterThan(0);
      expect(left.min[0]).toBeCloseTo(-right.max[0], 6);
      expect(left.max[1]).toBeCloseTo(right.max[1], 6);
      // The faces of each part point out, also on the mirror side.
      expect(volumeOn(mesh, 'earL')).toBeGreaterThan(0);
      expect(volumeOn(mesh, 'earR')).toBeCloseTo(volumeOn(mesh, 'earL'), 9);
    }
  });

  it('gives the parametric ears their sizes', () => {
    // A pointed ear reaches 0.55 H from its base.
    const pointed = variant({ ears: 'pointed' });
    expect(reachFrom(pointed.mesh, 'earR', pointed.body.positions.earR)).toBeCloseTo(0.55 * H, 2);
    // The disc ears are 0.3, 0.7, and 0.2 H wide.
    for (const [ears, width] of [
      ['round', 0.3],
      ['large-round', 0.7],
      ['small', 0.2],
    ] as const) {
      const { mesh } = variant({ ears });
      expect(spanOf(mesh, 'earR')).toBeCloseTo(width * H, 6);
    }
    // A floppy ear hangs 0.5 H down from its base.
    const floppy = variant({ ears: 'floppy' });
    const drop = floppy.body.positions.earR[1] - boundsOf(floppy.mesh, 'earR').min[1];
    expect(drop).toBeGreaterThan(0.4 * H);
    expect(drop).toBeLessThan(0.5 * H);
  });

  it('gives the deer antlers on the head, and the monkey round ears at the sides', () => {
    const deer = variant({ ears: 'antlered' });
    const head = boundsOf(deer.mesh, 'head');
    // The antlers follow the head bone and rise 0.4 H above the head.
    expect(head.max[1]).toBeGreaterThan(deer.body.headCenter[1] + 0.85 * H);
    expect(head.max[0]).toBeCloseTo(-head.min[0], 6);
    // The ears of the deer point out to the sides, lower than the top of the head.
    expect(boundsOf(deer.mesh, 'earR').max[1]).toBeLessThan(deer.body.headCenter[1] + 0.5 * H);
    const monkey = variant({ ears: 'side-round' });
    const ear = boundsOf(monkey.mesh, 'earR');
    expect(ear.min[1]).toBeLessThan(monkey.body.positions.eyeR[1]);
    expect(ear.min[0]).toBeGreaterThan(0.35 * H);
    expect(spanOf(monkey.mesh, 'earR')).toBeCloseTo(0.32 * H, 6);
  });

  it('makes the large-flap ear 0.9 H wide and no higher than the head, with the inner ear in front', () => {
    const { mesh, body } = variant({ ears: 'large-flap', accentParts: ['inner-ears'] });
    const { min, max } = boundsOf(mesh, 'earR');
    const back: Vec3 = [Math.sin(FLAP_EAR_ANGLE), 0, Math.cos(FLAP_EAR_ANGLE)];
    // The plate is 0.06 H thick, so its extent along `back` is a little more than 0.9 H.
    const width = (max[0] - min[0]) * back[0] + (max[2] - min[2]) * back[2];
    expect(width).toBeGreaterThan(0.9 * H);
    expect(width).toBeLessThan(1.0 * H);
    // The ear does not reach above the head.
    expect(max[1]).toBeLessThanOrEqual(body.headCenter[1] + 0.5 * H + 1e-6);
    // The vertices of the inner ear are in front of the plate.
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const front = new Vector3(Math.cos(FLAP_EAR_ANGLE), 0, -Math.sin(FLAP_EAR_ANGLE));
    const inner: number[] = [];
    const outer: number[] = [];
    for (let v = 0; v < mesh.bones.length; v++) {
      if (mesh.bones[v] !== boneIndex('earR')) {
        continue;
      }
      const p = new Vector3(
        mesh.positions[v * 3] ?? 0,
        mesh.positions[v * 3 + 1] ?? 0,
        mesh.positions[v * 3 + 2] ?? 0,
      );
      const isInner = Math.abs((mesh.colors[v * 3] ?? 0) - accent[0]) < 1e-6;
      (isInner ? inner : outer).push(p.dot(front));
    }
    expect(inner.length).toBeGreaterThan(0);
    expect(Math.min(...inner)).toBeGreaterThan(Math.max(...outer) - 1e-6);
  });
});

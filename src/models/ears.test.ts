import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FLAP_EAR_ANGLE } from './ears.ts';
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

  it('gives the ears the sizes of design 4.5', () => {
    // A pointed ear reaches 0.55 H from its base.
    const pointed = variant({ ears: 'pointed' });
    expect(reachFrom(pointed.mesh, 'earR', pointed.body.positions.earR)).toBeCloseTo(0.55 * H, 2);
    // The disc ears are 0.34, 0.7, and 0.2 H wide. The round ears of the bear and the panda were
    // 0.3 H wide and flat.
    for (const [ears, width] of [
      ['round', 0.34],
      ['large-round', 0.7],
      ['small', 0.2],
    ] as const) {
      const { mesh } = variant({ ears });
      expect(spanOf(mesh, 'earR')).toBeCloseTo(width * H, 6);
    }
    // A floppy ear hangs 0.96 H down from its base, below the chin, as the beagle ears of
    // mockup.png (1.1 H). The first floppy ear of 0.5 H read as a brown cheek.
    const floppy = variant({ ears: 'floppy' });
    const ear = boundsOf(floppy.mesh, 'earR');
    const drop = floppy.body.positions.earR[1] - ear.min[1];
    expect(drop).toBeGreaterThan(0.94 * H);
    expect(drop).toBeLessThan(1.0 * H);
    expect(ear.min[1]).toBeLessThan(floppy.body.headCenter[1] - 0.6 * H);
    // The ear is 0.36 H wide, and it hangs beside the cheek.
    expect(ear.max[2] - ear.min[2]).toBeGreaterThan(0.3 * H);
    expect(ear.min[0]).toBeGreaterThan(floppy.body.headCenter[0] + 0.4 * H);
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

  it('makes the large-flap ear 1.4 H high beside the face, with the inner ear in front', () => {
    const { mesh, body } = variant({ ears: 'large-flap', accentParts: ['inner-ears'] });
    const { min, max } = boundsOf(mesh, 'earR');
    const c = body.headCenter;
    // The ear is 1.4 H high, as the elephant of mockup.png, from the top of the head to below
    // the chin. The first ear was 1.1 H high and pointed back behind the head.
    expect(max[1] - min[1]).toBeGreaterThan(1.38 * H);
    expect(max[1] - min[1]).toBeLessThan(1.42 * H);
    expect(max[1]).toBeLessThanOrEqual(c[1] + 0.5 * H + 1e-6);
    expect(min[1]).toBeLessThan(c[1] - 0.8 * H);
    // The ear stands 0.25 H out past the cheeks of the rabbit (0.66 H), and its front edge is
    // beside the face, near the head center. The first ear started 0.05 H behind it.
    expect(max[0] - c[0]).toBeGreaterThan(0.9 * H);
    expect(min[2]).toBeLessThan(c[2] + 0.05 * H);
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

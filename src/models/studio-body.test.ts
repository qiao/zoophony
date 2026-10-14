import { describe, expect, it } from 'vitest';

import { SPECIES_COLORS } from './colors.ts';
import { FINISH_ORDER, MeshBuilder, srgb } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { box } from './primitives.ts';
import { boneIndex } from './rig.ts';
import { STUDIO_BONES } from './studio-format.ts';
import { buildStudioBody, studioRenderMesh, studioRigOf } from './studio-body.ts';
import { studioNormals } from './studio-normals.ts';

describe('buildStudioBody (design 4.4)', () => {
  const builder = new MeshBuilder();
  const body = buildStudioBody(builder, 'studio-bear', true);
  const mesh = builder.build();
  const rig = studioRigOf('studio-bear', true);

  it('adds one triangle for each face of the studio, with its color', () => {
    expect(mesh.finishes).toHaveLength(rig.mesh.corners.length / 3);
    expect(mesh.colors[0]).toBeCloseTo(rig.mesh.colors[0] ?? -1, 6);
  });

  it('hangs the paws below the shoulders in the bind pose of the player', () => {
    for (const side of ['L', 'R'] as const) {
      const shoulder = body.positions[`upperArm${side}`];
      const hand = boneIndex(`hand${side}`);
      let count = 0;
      for (let c = 0; c < mesh.bones.length; c++) {
        if (mesh.bones[c] === hand) {
          count++;
          expect(mesh.positions[c * 3 + 1] ?? 0).toBeLessThan(shoulder[1] - 0.2);
          expect(Math.abs((mesh.positions[c * 3] ?? 0) - shoulder[0])).toBeLessThan(0.12);
        }
      }
      expect(count).toBeGreaterThan(20);
    }
  });

  it('puts the mouth under the nose and the palms below the wrists', () => {
    expect(body.mouth[1]).toBeLessThan(rig.body.nose[1]);
    expect(body.palmR[1]).toBeLessThan(body.positions.handR[1]);
    expect(body.headHeight).toBe(rig.body.headHeight);
  });
});

describe('buildStudioBody with another palette (design 4.4, 4.5)', () => {
  const build = (palette?: 'tan'): MeshData => {
    const builder = new MeshBuilder();
    buildStudioBody(builder, 'studio-fox', false, palette);
    return builder.build();
  };
  const red = build();
  const tan = build('tan');
  const matte = FINISH_ORDER.indexOf('matte');

  /**
   * Gives the mean color of the faces of a mesh whose red color is near a color: the faces of one
   * class of the colors of the red fox.
   *
   * @param mesh The mesh.
   * @param near The linear color of the class.
   * @returns The mean linear color.
   */
  const meanNear = (mesh: MeshData, near: readonly number[]): number[] => {
    const sum = [0, 0, 0];
    let count = 0;
    for (const [t, finish] of red.finishes.entries()) {
      const color = [0, 1, 2].map((k) => red.colors[t * 9 + k] ?? 0);
      if (finish === matte && Math.hypot(...color.map((c, k) => c - (near[k] ?? 0))) < 0.1) {
        count++;
        for (let k = 0; k < 3; k++) {
          sum[k] = (sum[k] ?? 0) + (mesh.colors[t * 9 + k] ?? 0);
        }
      }
    }
    return sum.map((value) => value / count);
  };

  it('keeps the faces and the gloss of the eyes and of the nose', () => {
    expect([...tan.positions]).toEqual([...red.positions]);
    expect([...tan.finishes]).toEqual([...red.finishes]);
    for (const [t, finish] of red.finishes.entries()) {
      if (finish !== matte) {
        expect([...tan.colors.subarray(t * 9, t * 9 + 9)]).toEqual([
          ...red.colors.subarray(t * 9, t * 9 + 9),
        ]);
      }
    }
  });

  it('moves the fur faces of the red fox mesh toward the tan fur', () => {
    const redFur = srgb(SPECIES_COLORS['fox-red'].fur);
    const tanFur = srgb(SPECIES_COLORS['fox-tan'].fur);
    const off = (color: readonly number[]): number =>
      Math.hypot(...color.map((c, k) => c - (tanFur[k] ?? 0)));

    expect(off(meanNear(tan, redFur))).toBeLessThan(off(meanNear(red, redFur)) / 2);
  });
});

describe('studioRenderMesh (design 4.4)', () => {
  const builder = new MeshBuilder();
  buildStudioBody(builder, 'studio-bear', true);
  const baton = boneIndex('baton');
  builder.add(box(0.01, 0.01, 0.4), { color: [1, 1, 1], bone: baton });
  const rig = studioRigOf('studio-bear', true);
  const render = studioRenderMesh(rig, builder.build());
  const bodyCorners = rig.mesh.corners.length;

  it('draws the body in the bind pose of the studio, with the skin of the studio', () => {
    const v = rig.mesh.corners[5] ?? 0;
    expect([...render.data.positions.subarray(15, 18)]).toEqual([
      ...rig.mesh.positions.subarray(v * 3, v * 3 + 3),
    ]);
    expect(render.joints[20]).toBe(rig.mesh.joints[(rig.mesh.corners[5] ?? 0) * 4]);
    expect(render.correctives).toHaveLength(2);
  });

  it('keeps the instrument on the bones of the player, after the bones of the studio', () => {
    expect(render.joints[bodyCorners * 4]).toBe(STUDIO_BONES.length + baton);
    expect(render.weights[bodyCorners * 4]).toBe(1);
    expect(render.correctives[0]?.[bodyCorners * 3]).toBe(0);
  });
});

describe('studioRenderMesh with a crease angle (design 4.5)', () => {
  const builder = new MeshBuilder();
  buildStudioBody(builder, 'studio-bear', true);
  const mesh = builder.build();
  const rig = studioRigOf('studio-bear', true);

  it('gives each corner of the body the smooth normal of the crease angle of the body', () => {
    const smooth = studioRenderMesh({ ...rig, body: { ...rig.body, crease: 30 } }, mesh);
    expect(smooth.normals.corners).toEqual(studioNormals(rig.mesh, 30));
  });

  it('turns the normals with each corrective shape, as the normals of the moved skin', () => {
    const smooth = studioRenderMesh({ ...rig, body: { ...rig.body, crease: 30 } }, mesh).normals;
    expect(smooth.moves).toHaveLength(rig.mesh.correctives.length);
    for (const [s, corrective] of rig.mesh.correctives.entries()) {
      const moved = rig.mesh.positions.map((p, i) => p + (corrective[i] ?? 0));
      const target = studioNormals({ ...rig.mesh, positions: moved }, 30);
      let turned = 0;
      for (let c = 0; c < rig.mesh.corners.length; c++) {
        const normal = [0, 1, 2].map(
          (k) => (smooth.corners[c * 3 + k] ?? 0) + (smooth.moves[s]?.[c * 3 + k] ?? 0),
        );
        const length = Math.hypot(...normal);
        const dot = normal.reduce((sum, n, k) => sum + (n / length) * (target[c * 3 + k] ?? 0), 0);
        expect(dot).toBeGreaterThan(0.9999);
        const before = [0, 1, 2].reduce(
          (sum, k) => sum + (smooth.corners[c * 3 + k] ?? 0) * (target[c * 3 + k] ?? 0),
          0,
        );
        if (before < Math.cos(Math.PI / 18)) {
          turned++;
        }
      }
      // Some corners of the shoulder turn by more than 10° with the shape.
      expect(turned).toBeGreaterThan(10);
      expect(smooth.moves[s]).toHaveLength(mesh.bones.length * 3);
    }
  });
});

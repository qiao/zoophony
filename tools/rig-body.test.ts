import { describe, expect, it } from 'vitest';
import { unpackMesh } from '../src/models/packed-mesh.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import { RIGGED_BONES } from '../src/models/rigged-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { packRig, riggedModule } from './rig-body.ts';
import type { BodyConfig, RigOutput } from './rig-body.ts';

/** The place in the skin of each vertex of {@link tetrahedron}. */
const UV = [
  [0.25, 0.75],
  [0.5, 0.25],
  [0.75, 0.5],
  [0.125, 0.125],
] as const;

/**
 * A rig of four vertices in the axes of Blender (+x the left side, -y the front, +z up): a
 * tetrahedron from the floor at z = 0.5 to the top at z = 1.5, with its faces turned outward.
 */
function tetrahedron(weights: RigOutput['weights'] = []): RigOutput {
  const heads = Object.fromEntries(RIGGED_BONES.map((bone): [string, Vec3] => [bone, [0, 0, 1]]));
  return {
    floor: 0.5,
    top: 1.5,
    vertices: [
      [0, 0, 1.5],
      [1, 0, 0.5],
      [0, -1, 0.5],
      [-1, 1, 0.5],
    ],
    faces: [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ],
    // Each vertex has one place in the skin, so the packer keeps the four vertices.
    uvs: [
      [UV[0], UV[2], UV[1]],
      [UV[0], UV[1], UV[3]],
      [UV[0], UV[3], UV[2]],
      [UV[1], UV[2], UV[3]],
    ],
    weights:
      weights.length > 0
        ? weights
        : [
            [['head', 1]],
            [
              ['thighL', 0.7],
              ['shinL', 0.3],
            ],
            [['hips', 1]],
            [
              ['spine', 0.5],
              ['chest', 0.5],
            ],
          ],
    heads: { ...heads, hips: [0, 0.25, 1] },
    eyes: {
      eyeL: { middle: [1, -1, 1], normal: [0.6, -0.8, 0], radius: 0.1 },
      eyeR: { middle: [-1, -1, 1], normal: [-0.6, -0.8, 0], radius: 0.1 },
    },
    nose: [0, -1, 1],
  };
}

/** The config of the tetrahedron: it doubles the height of 1 to 2 m. */
const CONFIG: BodyConfig = {
  source: 'test.glb',
  height: 2,
  headCenter: [0, 0, 1.25],
  headHeight: 0.25,
  extraBones: [
    { bone: 'fingersL', head: [0.5, 0, 1], tail: [0.75, 0, 1] },
    { bone: 'fingersR', head: [-0.5, 0, 1], tail: [-0.75, 0, 1] },
  ],
};

/** Gives the signed volume of a closed mesh: positive when the faces turn outward. */
function volume(positions: Float64Array, corners: Uint32Array): number {
  let sum = 0;
  for (let c = 0; c < corners.length; c += 3) {
    const [a, b, d] = [0, 1, 2].map((k) => {
      const v = corners[c + k] ?? 0;
      return [positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0];
    });
    if (a && b && d) {
      sum +=
        (a[0] ?? 0) * ((b[1] ?? 0) * (d[2] ?? 0) - (b[2] ?? 0) * (d[1] ?? 0)) -
        (a[1] ?? 0) * ((b[0] ?? 0) * (d[2] ?? 0) - (b[2] ?? 0) * (d[0] ?? 0)) +
        (a[2] ?? 0) * ((b[0] ?? 0) * (d[1] ?? 0) - (b[1] ?? 0) * (d[0] ?? 0));
    }
  }
  return sum / 6;
}

describe('the packer of a rigged body (pnpm rig-body)', () => {
  it('turns the left side to -x and the front to -z, and scales the body to its height', () => {
    const body = packRig(tetrahedron(), CONFIG);
    const mesh = unpackMesh(body.mesh);
    const ys = [1, 4, 7, 10].map((k) => mesh.positions[k] ?? 0);
    const left = [...mesh.bones].indexOf(BONE_NAMES.indexOf('thighL'));
    const front = [...mesh.bones].indexOf(BONE_NAMES.indexOf('hips'));

    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(2, 6);
    expect(mesh.positions[left * 3]).toBeCloseTo(-2, 6);
    expect(mesh.positions[front * 3 + 2]).toBeCloseTo(-2.5, 6);
    expect(body.eyes.eyeL.middle[0]).toBeLessThan(0);
    expect(body.eyes.eyeL.normal[2]).toBeCloseTo(-0.8, 6);
    expect(body.headHeight).toBeCloseTo(0.5, 6);
    expect(body.fingerTips.fingersL[0]).toBeCloseTo(-1.5, 6);
  });

  it('keeps the faces turned outward', () => {
    const mesh = unpackMesh(packRig(tetrahedron(), CONFIG).mesh);
    expect(volume(mesh.positions, mesh.corners)).toBeGreaterThan(0);
  });

  it('gives each vertex its main bone, its second bone, and the share of the second bone', () => {
    const mesh = unpackMesh(packRig(tetrahedron(), CONFIG).mesh);
    const v = [...mesh.bones].indexOf(BONE_NAMES.indexOf('thighL'));
    const rigid = [...mesh.bones].indexOf(BONE_NAMES.indexOf('head'));

    expect(mesh.blendBones[v]).toBe(BONE_NAMES.indexOf('shinL'));
    expect(mesh.blendWeights[v]).toBeCloseTo(0.3, 2);
    expect(mesh.blendBones[rigid]).toBe(BONE_NAMES.indexOf('head'));
    expect(mesh.blendWeights[rigid]).toBe(0);
  });

  it('keeps the skin coordinates of each corner, and splits a vertex on a seam of the skin', () => {
    const rig = tetrahedron();
    const mesh = unpackMesh(packRig(rig, CONFIG).mesh);
    const corners = [...mesh.corners].map((v) => [mesh.uvs[v * 2], mesh.uvs[v * 2 + 1]]);
    expect(corners).toEqual(rig.uvs.flat());

    // The last face gives the vertex 1 a second place in the skin.
    const seam = { ...rig, uvs: [...rig.uvs.slice(0, 3), [[0.5, 0.5], UV[2], UV[3]]] };
    const split = unpackMesh(packRig(seam, CONFIG).mesh);
    expect(split.positions).toHaveLength(5 * 3);
    expect([...split.corners].map((v) => [split.uvs[v * 2], split.uvs[v * 2 + 1]])).toEqual(
      seam.uvs.flat(),
    );
  });

  it('lets the plates of the eyes follow the eye bones', () => {
    const rig = tetrahedron([[['eyeL', 1]], [['head', 1]], [['eyeR', 1]], [['head', 1]]]);
    const mesh = unpackMesh(packRig(rig, CONFIG).mesh);
    expect([...mesh.bones]).toContain(BONE_NAMES.indexOf('eyeL'));
    expect([...mesh.bones]).toContain(BONE_NAMES.indexOf('eyeR'));
  });

  it('writes a module that gives the URL of the skin beside it', () => {
    const text = riggedModule('rabbit', 'test.glb', packRig(tetrahedron(), CONFIG));
    expect(text).toContain("new URL('./rabbit-skin.webp', import.meta.url).href");
    expect(text).toContain('skin: SKIN,');
  });

  it('refuses a weight on a bone that a rigged body does not place', () => {
    const rig = tetrahedron([[['jaw', 1]], [['head', 1]], [['head', 1]], [['head', 1]]]);
    expect(() => packRig(rig, CONFIG)).toThrow(/jaw/);
  });
});

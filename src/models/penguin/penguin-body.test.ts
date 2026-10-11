import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { seated } from '../body-frame.ts';
import type { Stance } from '../body-frame.ts';
import { MeshBuilder, srgb, triangleNormal } from '../mesh.ts';
import type { MeshData, Rgb } from '../mesh.ts';
import { proportionsOf } from '../proportions.ts';
import { BONE_NAMES, boneIndex } from '../rig.ts';
import type { BoneName } from '../rig.ts';
import { SPECIES } from '../species.ts';
import type { BuiltBody } from '../test-body.ts';
import { buildPenguinBody } from './penguin-body.ts';
import { MOUTH_COLOR } from './penguin-parts.ts';

const PENGUIN = SPECIES.penguin;
const H = proportionsOf(PENGUIN).headHeight;

/**
 * Builds the body of the penguin in a stance.
 *
 * @param stance The stance.
 * @returns The mesh and the bones.
 */
function penguin(stance: Stance): BuiltBody {
  const builder = new MeshBuilder();
  const body = buildPenguinBody(builder, PENGUIN, stance);
  return { mesh: builder.build(), body };
}

const { mesh, body } = penguin({ kind: 'standing' });

/** The bones of the egg: the body below the head, and the head. */
const EGG: readonly BoneName[] = ['spine', 'chest', 'head'];

/** One triangle of the mesh: its main bone, its color, its centroid, and its unit normal. */
interface Face {
  readonly bone: BoneName;
  readonly color: Rgb;
  readonly centroid: Vector3;
  readonly normal: Vector3;
}

/**
 * Lists the triangles of a mesh.
 *
 * @param data The mesh.
 * @returns The triangles.
 */
function facesOf(data: MeshData): Face[] {
  const faces: Face[] = [];
  const p = data.positions;
  for (let t = 0; t < data.bones.length / 3; t++) {
    const centroid = new Vector3();
    for (let k = 0; k < 3; k++) {
      centroid.add(new Vector3(p[t * 9 + k * 3], p[t * 9 + k * 3 + 1], p[t * 9 + k * 3 + 2]));
    }
    faces.push({
      bone: BONE_NAMES[data.bones[t * 3] ?? 0] ?? 'root',
      color: [data.colors[t * 9] ?? 0, data.colors[t * 9 + 1] ?? 0, data.colors[t * 9 + 2] ?? 0],
      centroid: centroid.multiplyScalar(1 / 3),
      normal: new Vector3(...triangleNormal(Array.from(p.slice(t * 9, t * 9 + 9)), 0)).normalize(),
    });
  }
  return faces;
}

/**
 * Tells if two colors are the same, after the 32-bit store of the mesh.
 *
 * @param a The first color.
 * @param b The second color.
 * @returns True for the same color.
 */
function same(a: Rgb, b: Rgb): boolean {
  return a.every((c, k) => Math.abs(c - (b[k] ?? 0)) < 1e-6);
}

const faces = facesOf(mesh);
const colors = {
  black: srgb(PENGUIN.colors.fur),
  white: srgb(PENGUIN.colors.belly),
  orange: srgb(PENGUIN.colors.accent),
  mouth: srgb(MOUTH_COLOR),
};

/**
 * Gives the corners of the triangles of some bones.
 *
 * @param bones The bones.
 * @returns The corners.
 */
function cornersOf(bones: readonly BoneName[]): Vector3[] {
  const wanted = new Set(bones.map(boneIndex));
  const out: Vector3[] = [];
  for (let v = 0; v < mesh.bones.length; v++) {
    if (wanted.has(mesh.bones[v] ?? -1)) {
      out.push(new Vector3().fromArray(mesh.positions, v * 3));
    }
  }
  return out;
}

describe('the body of the penguin (design 4.4)', () => {
  it('is one egg, 2.2 to 2.6 times as tall as wide, as in the reference images', () => {
    const corners = cornersOf(EGG);
    const ys = corners.map((p) => p.y);
    const xs = corners.map((p) => p.x);
    const height = Math.max(...ys) - Math.min(...ys);
    const width = Math.max(...xs) - Math.min(...xs);
    expect(height / width).toBeGreaterThan(2.2);
    expect(height / width).toBeLessThan(2.6);
  });

  it('has no neck: the head is as wide as the top of the body under it', () => {
    // The parametric body had a round head 1.26 H wide on a thin neck.
    const halfWidth = (corners: readonly Vector3[]): number =>
      Math.max(...corners.map((p) => Math.abs(p.x)));
    const neck = body.positions.neck[1];
    const top = cornersOf(['chest']).filter((p) => p.y > neck - 0.3 * H && p.y < neck);
    const head = halfWidth(cornersOf(['head']));
    expect(head / halfWidth(top)).toBeGreaterThan(0.9);
    expect(head / halfWidth(top)).toBeLessThan(1.05);
  });

  it('has a black back and crown, and a white front from under the beak to the bottom', () => {
    const egg = faces.filter((f) => EGG.includes(f.bone));
    const jaw = body.positions.jaw;
    const front = egg.filter(
      (f) => f.normal.z < -0.85 && f.centroid.y > 0.4 * H && f.centroid.y < jaw[1] - 0.2 * H,
    );
    // The back is behind the axis of the body. The root of the beak inside the head faces back.
    const back = egg.filter((f) => f.normal.z > 0.85 && f.centroid.z > 0);
    // The crown is the top of the head, above the eyes and their white patches.
    const crown = egg.filter(
      (f) => f.normal.y > 0.85 && f.centroid.y > body.positions.eyeR[1] + 0.15 * H,
    );
    expect(front.length).toBeGreaterThan(10);
    expect(front.filter((f) => !same(f.color, colors.white))).toEqual([]);
    expect(back.length).toBeGreaterThan(10);
    expect(back.filter((f) => !same(f.color, colors.black))).toEqual([]);
    expect(crown.length).toBeGreaterThan(3);
    expect(crown.filter((f) => !same(f.color, colors.black))).toEqual([]);
  });

  it('has a large orange beak, with the lower half on the jaw', () => {
    const head = cornersOf(['head']);
    // The skull of the head is black and white. The beak is orange, with the dark mouth.
    const skull = faces.filter(
      (f) => f.bone === 'head' && (same(f.color, colors.black) || same(f.color, colors.white)),
    );
    const lower = faces.filter((f) => f.bone === 'jaw');
    expect(lower.length).toBeGreaterThan(0);
    expect(lower.every((f) => same(f.color, colors.orange) || same(f.color, colors.mouth))).toBe(
      true,
    );
    // The face is the front of the egg at the height of the jaw hinge.
    const jaw = new Vector3(...body.positions.jaw);
    const face = Math.min(
      ...skull
        .filter((f) => Math.abs(f.centroid.y - jaw.y) < 0.1 * H && Math.abs(f.centroid.x) < 0.1 * H)
        .map((f) => f.centroid.z),
    );
    const tip = Math.min(...head.map((p) => p.z));
    expect(face - tip).toBeGreaterThan(0.3 * H);
    // The beak is about half as wide as the head.
    const beak = faces.filter((f) => f.bone === 'head' && same(f.color, colors.orange));
    const beakWidth = 2 * Math.max(...beak.map((f) => Math.abs(f.centroid.x)));
    const headWidth = Math.max(...head.map((p) => p.x)) - Math.min(...head.map((p) => p.x));
    expect(beakWidth / headWidth).toBeGreaterThan(0.3);
  });

  it('has black flippers on the arm bones, with the palms at their tips', () => {
    for (const side of ['L', 'R'] as const) {
      const flipper = faces.filter((f) =>
        [`upperArm${side}`, `forearm${side}`, `hand${side}`].includes(f.bone),
      );
      expect(flipper.length).toBeGreaterThan(0);
      expect(flipper.every((f) => same(f.color, colors.black))).toBe(true);
      const tip = cornersOf([`hand${side}`]);
      const palm = new Vector3(...(side === 'L' ? body.palmL : body.palmR));
      const nearest = Math.min(...tip.map((p) => p.distanceTo(palm)));
      expect(nearest).toBeLessThan(0.1 * H);
    }
    expect(faces.some((f) => f.bone === 'fingersL' || f.bone === 'fingersR')).toBe(false);
  });

  it('shows two orange feet on the floor in front of the egg, and no legs', () => {
    const legs = new Set<BoneName>(['thighL', 'shinL', 'thighR', 'shinR']);
    expect(faces.some((f) => legs.has(f.bone))).toBe(false);
    const eggFront = Math.min(
      ...cornersOf(EGG)
        .filter((p) => p.y < 0.3 * H)
        .map((p) => p.z),
    );
    for (const bone of ['footL', 'footR'] as const) {
      const foot = faces.filter((f) => f.bone === bone);
      expect(foot.length).toBeGreaterThan(0);
      expect(foot.every((f) => same(f.color, colors.orange))).toBe(true);
      const corners = cornersOf([bone]);
      expect(Math.min(...corners.map((p) => p.y))).toBeCloseTo(0, 9);
      expect(Math.min(...corners.map((p) => p.z))).toBeLessThan(eggFront);
    }
  });

  it('makes each part a closed shell, so that a turn of the head or the chest shows no hole', () => {
    // In a closed shell with outward faces, each edge from a to b has one edge from b to a.
    const edges = new Map<string, number>();
    const key = (bone: number, v: number): string =>
      `${bone}:${mesh.positions[v * 3]},${mesh.positions[v * 3 + 1]},${mesh.positions[v * 3 + 2]}`;
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      const bone = mesh.bones[t * 3] ?? 0;
      for (let k = 0; k < 3; k++) {
        const edge = `${key(bone, t * 3 + k)}>${key(bone, t * 3 + ((k + 1) % 3))}`;
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
    const open = [...edges.keys()].filter((edge) => {
      const [a = '', b = ''] = edge.split('>');
      return edges.get(`${b}>${a}`) !== edges.get(edge);
    });
    expect(open).toEqual([]);
  });

  it('stands on the top of a seat with the same form', () => {
    // The cast never seats a penguin, but each support gives a valid body.
    const onSeat = penguin(seated(0.45, 0, 0.1));
    expect(onSeat.mesh.positions.length).toBe(mesh.positions.length);
    const lowest = Math.min(
      ...Array.from(
        { length: onSeat.mesh.bones.length },
        (_, v) => onSeat.mesh.positions[v * 3 + 1] ?? 0,
      ),
    );
    expect(lowest).toBeCloseTo(0.45, 6);
  });
});

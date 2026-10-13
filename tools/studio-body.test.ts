import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STUDIO_BONES, unpackStudioMesh } from '../src/models/studio-format.ts';
import { PIANO, PIANO_BENCH } from '../src/models/instruments/piano.ts';
import {
  ANIMALS,
  inspectStudioGlb,
  inspectionLines,
  ownBone,
  studioBody,
  studioModule,
} from './studio-body.ts';

/** The GLB file of the studio bear. */
const SOURCE = 'lowpoly-studio/animals/bear/out/bear.glb';

describe('pnpm studio-body (design 4.4)', async () => {
  const bytes = await readFile(join(import.meta.dirname, '..', SOURCE));
  const { body, sheetWeights } = studioBody(bytes, SOURCE, {
    landmark: 'shoulders',
    height: 1,
    seated: false,
    constant: 'STUDIO_BEAR',
  });
  const mesh = unpackStudioMesh(body.mesh);

  it('scales the animal so that its shoulder joints are at the height of the settings', () => {
    expect(body.heads.upper_arm_L[1]).toBeCloseTo(1, 5);
    expect(body.heads.upper_arm_R[1]).toBeCloseTo(1, 5);
    expect(body.scale).toBeGreaterThan(1);
  });

  it('keeps a standing body over the origin with no seat', () => {
    expect(body.floor).toEqual([0, 0, 0]);
    expect(body.seatHeight).toBeNull();
  });

  it('turns the animal to face -z with its left side at -x', () => {
    expect(body.heads.upper_arm_L[0]).toBeLessThan(0);
    expect(body.heads.upper_arm_R[0]).toBeGreaterThan(0);
    expect(body.nose[2]).toBeLessThan(body.headCenter[2]);
    expect(body.heads.eye_L[0]).toBeLessThan(0);
  });

  it('keeps the two sides of the skeleton mirror images', () => {
    for (const bone of STUDIO_BONES.filter((b) => b.endsWith('_L'))) {
      const left = body.heads[bone];
      const right = body.heads[STUDIO_BONES.find((b) => b === bone.replace(/_L$/, '_R')) ?? bone];
      expect(right[0], bone).toBeCloseTo(-left[0], 5);
      expect(right[1], bone).toBeCloseTo(left[1], 5);
      expect(right[2], bone).toBeCloseTo(left[2], 5);
    }
  });

  it('keeps the body and the eyes, and drops the baton of the studio', () => {
    expect(mesh.corners.length / 3).toBeGreaterThan(2000);
    const used = new Set<number>();
    for (let v = 0; v < mesh.weights.length; v++) {
      if ((mesh.weights[v] ?? 0) > 0) {
        used.add(mesh.joints[v] ?? 0);
      }
    }
    expect(used.has(STUDIO_BONES.indexOf('eye_L'))).toBe(true);
    expect(used.has(STUDIO_BONES.indexOf('eye_R'))).toBe(true);
    expect(Math.max(...used)).toBeLessThan(STUDIO_BONES.length);
  });

  it('gives each vertex weights that add up to 1', () => {
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const sum = [0, 1, 2, 3].reduce((s, k) => s + (mesh.weights[v * 4 + k] ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('keeps the faces turned outward', () => {
    // The signed volume of the closed shells is positive when the faces point out.
    let volume = 0;
    const at = (v: number, k: number): number => mesh.positions[v * 3 + k] ?? 0;
    for (let t = 0; t < mesh.corners.length; t += 3) {
      const [a, b, c] = [mesh.corners[t] ?? 0, mesh.corners[t + 1] ?? 0, mesh.corners[t + 2] ?? 0];
      volume +=
        (at(a, 0) * (at(b, 1) * at(c, 2) - at(b, 2) * at(c, 1)) -
          at(a, 1) * (at(b, 0) * at(c, 2) - at(b, 2) * at(c, 0)) +
          at(a, 2) * (at(b, 0) * at(c, 1) - at(b, 1) * at(c, 0))) /
        6;
    }
    expect(volume).toBeGreaterThan(0);
  });

  it('moves only the skin of its own side with each corrective shape', () => {
    const [left, right] = mesh.correctives;
    expect(left && right).toBeTruthy();
    let movedLeft = 0;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const x = mesh.positions[v * 3] ?? 0;
      const moveLeft = Math.hypot(...[0, 1, 2].map((k) => left?.[v * 3 + k] ?? 0));
      const moveRight = Math.hypot(...[0, 1, 2].map((k) => right?.[v * 3 + k] ?? 0));
      if (moveLeft > 0) {
        movedLeft += 1;
        expect(x).toBeLessThan(0.05);
      }
      if (moveRight > 0) {
        expect(x).toBeGreaterThan(-0.05);
      }
    }
    expect(movedLeft).toBeGreaterThan(100);
  });

  it('gives the corrective shapes their full weight in the pose of the sheet', () => {
    expect(sheetWeights).toEqual([1, 1]);
    // The arms of the sheet hang down and a little out.
    expect(body.sheetArms.L[1]).toBeLessThan(-0.5);
    expect(body.sheetArms.L[0]).toBeLessThan(0);
    expect(body.sheetArms.R[0]).toBeGreaterThan(0);
  });

  it('writes a module with the constant of the body', () => {
    const text = studioModule('bear', 'STUDIO_BEAR', body);
    expect(text).toContain('export const STUDIO_BEAR = {');
    expect(text).toContain('} satisfies StudioBody;');
    expect(text).toContain(body.sha256);
  });
});

describe('pnpm studio-body with four digits on each paw (design 4.4)', async () => {
  const source = 'lowpoly-studio/animals/polar-bear/out/polar-bear.glb';
  const bytes = await readFile(join(import.meta.dirname, '..', source));
  const settings = ANIMALS.get('polar-bear');
  if (!settings) {
    throw new Error('The polar bear has no settings.');
  }
  const { body } = studioBody(bytes, source, settings);
  const mesh = unpackStudioMesh(body.mesh);

  it('gives each digit to the finger bone of its side', () => {
    expect(ownBone('finger3_L')).toBe('fingers_L');
    expect(ownBone('finger1_R')).toBe('fingers_R');
    expect(ownBone('hand_L')).toBe('hand_L');
  });

  it('moves the claws of each paw with its finger bone', () => {
    for (const side of ['L', 'R'] as const) {
      const bone = STUDIO_BONES.indexOf(`fingers_${side}`);
      let count = 0;
      for (let v = 0; v < mesh.positions.length / 3; v++) {
        const w = [0, 1, 2, 3].reduce(
          (sum, k) => sum + (mesh.joints[v * 4 + k] === bone ? (mesh.weights[v * 4 + k] ?? 0) : 0),
          0,
        );
        count += w > 0.5 ? 1 : 0;
      }
      expect(count, side).toBeGreaterThan(50);
      // The claw tips are beyond the knuckles.
      const knuckle = body.heads[`fingers_${side}`];
      const wrist = body.heads[`hand_${side}`];
      const tip = body.fingerTips[side];
      const along = (p: readonly number[]): number =>
        [0, 1, 2].reduce(
          (sum, k) => sum + ((p[k] ?? 0) - (wrist[k] ?? 0)) * ((knuckle[k] ?? 0) - (wrist[k] ?? 0)),
          0,
        );
      expect(along(tip), side).toBeGreaterThan(along(knuckle));
    }
  });
});

describe('pnpm studio-body with a seated body (design 4.4)', async () => {
  const source = 'lowpoly-studio/animals/polar-bear/out/polar-bear.glb';
  const bytes = await readFile(join(import.meta.dirname, '..', source));
  const settings = ANIMALS.get('polar-bear');
  if (!settings) {
    throw new Error('The polar bear has no settings.');
  }
  const { body } = studioBody(bytes, source, settings);
  const mesh = unpackStudioMesh(body.mesh);
  const at = (v: number, k: number): number => mesh.positions[v * 3 + k] ?? 0;
  const count = mesh.positions.length / 3;

  it('drops the seated body so that its soles are on the floor', () => {
    let low = Infinity;
    for (let v = 0; v < count; v++) {
      low = Math.min(low, at(v, 1));
    }
    expect(low).toBeCloseTo(0, 3);
    expect(body.heads.hips[1]).toBeGreaterThan(body.heads.thigh_L[1] - 0.05);
  });

  it('puts the keys of the app a little below the elbows of the seated bind pose', () => {
    for (const side of ['L', 'R'] as const) {
      const elbow = body.heads[`forearm_${side}`][1];
      expect(elbow - PIANO.keyTop, side).toBeGreaterThan(0);
      expect(elbow - PIANO.keyTop, side).toBeLessThan(0.2);
    }
  });

  it('rests the body on a bench that no part of it goes into', () => {
    const seat = body.seatHeight ?? 0;
    expect(seat).toBeGreaterThan(0);
    let low = Infinity;
    for (let v = 0; v < count; v++) {
      const inside =
        Math.abs(at(v, 0)) <= PIANO_BENCH.width / 2 && Math.abs(at(v, 2)) <= PIANO_BENCH.depth / 2;
      if (inside) {
        low = Math.min(low, at(v, 1));
      }
    }
    // The packed places have steps of 1 mm or less.
    expect(Math.abs(low - seat)).toBeLessThan(0.001);
    // The hips are above the seat, and the body sits in front of the center of the bench.
    expect(body.heads.hips[1]).toBeGreaterThan(seat);
    expect(body.floor[1]).toBe(0);
    expect(body.floor[2]).toBeLessThan(0);
  });
});

describe('pnpm studio-body --inspect (design 4.4)', async () => {
  const read = async (animal: string): Promise<Buffer> =>
    readFile(join(import.meta.dirname, '..', `lowpoly-studio/animals/${animal}/out/${animal}.glb`));
  const bear = inspectStudioGlb(await read('bear'), ANIMALS.get('bear') ?? null);
  const polar = inspectStudioGlb(await read('polar-bear'), ANIMALS.get('polar-bear') ?? null);
  const bearText = inspectionLines(bear).join('\n');
  const polarText = inspectionLines(polar).join('\n');

  it('prints each part that a new studio body needs', () => {
    for (const text of [bearText, polarText]) {
      for (const part of [
        'Scale:',
        'Scene nodes',
        'Joints of the skin',
        'Digits of the left paw',
        'Morph targets',
        'Clips',
        'Hips in the bind pose',
        'Lowest point of the skin',
        'Props',
      ]) {
        expect(text, part).toContain(part);
      }
      // Each length is in units of the studio and in meters.
      expect(text).toMatch(/Hips in the bind pose: [\d.]+ u \([\d.]+ m\)/);
    }
  });

  it('lists the skinned mesh, the root joint, and the joints that the export drops', () => {
    expect(bear.nodes.filter((node) => node.kind === 'skinned mesh')).toHaveLength(1);
    const root = bear.nodes.find((node) => node.kind === 'joint');
    expect(root?.joints).toBe(bear.joints.all.length);
    expect(bear.joints.dropped).toEqual(['baton']);
    expect(bear.props).toEqual([]);
    for (const facts of [bear, polar]) {
      expect(facts.joints.missing).toEqual([]);
      expect(facts.joints.unknown).toEqual([]);
    }
  });

  it('lists the digits of each paw, and the morph targets that the export drops', () => {
    expect(bear.joints.digits.L).toEqual([]);
    expect(polar.joints.digits.L.length).toBeGreaterThan(1);
    expect(polar.joints.digits.R.length).toBe(polar.joints.digits.L.length);
    expect(polarText).toMatch(/Digits of the right paw: finger\d_R/);
    expect(polar.targets.filter((t) => t.kept).map((t) => t.name)).toEqual([
      'arm_down_L',
      'arm_down_R',
    ]);
    expect(polar.targets.some((t) => !t.kept)).toBe(true);
  });

  it('gives the hips of the seated clips below the hips of the bind pose', () => {
    const play = polar.clips.find((clip) => clip.name === 'play');
    expect(play?.seconds).toBeGreaterThan(0);
    expect(play?.hips).toBeLessThan(polar.bindHips - 0.05);
    // The soles of a seated bind pose are above the floor, and a standing body stands on it.
    expect(polar.lowest[1]).toBeGreaterThan(0.05);
    expect(Math.abs(bear.lowest[1])).toBeLessThan(0.05);
    expect(bear.clips.map((clip) => clip.name)).toContain('reference');
  });

  it('gives the bench top, the key top, and the key front at the scale of the settings', () => {
    expect(polar.props.map((prop) => prop.name)).toEqual(
      expect.arrayContaining(['bench', 'piano', 'piano_key_*']),
    );
    const bench = polar.props.find((prop) => prop.name === 'bench');
    const keys = polar.keys;
    if (!bench || !keys || polar.benchTop === null) {
      throw new Error('The polar bear has no bench or no keys.');
    }
    expect(polar.benchTop).toBeLessThan(keys.top);
    // The front edge of the keys is the edge near the player, in front of the bench.
    expect(keys.front).toBeGreaterThan(bench.box.max[2]);
    expect(keys.front).toBeLessThan(
      polar.props.find((prop) => prop.name === 'piano_key_*')?.box.max[2] ?? 0,
    );
    expect(keys.top * polar.scale).toBeCloseTo(PIANO.keyTop, 5);
    expect(polarText).toContain('Key front');
  });

  it('gives the scale of the export, and assumes the shoulders at 1 m for a new animal', async () => {
    const bytes = await read('polar-bear');
    const settings = ANIMALS.get('polar-bear');
    if (!settings) {
      throw new Error('The polar bear has no settings.');
    }
    expect(polar.scale).toBeCloseTo(studioBody(bytes, 'x.glb', settings).body.scale, 5);

    const facts = inspectStudioGlb(bytes, null);
    expect(facts.scaleFrom).toContain('assumed');
    const assumed = { ...settings, landmark: 'shoulders', height: 1, seated: false } as const;
    expect(facts.scale).toBeCloseTo(studioBody(bytes, 'x.glb', assumed).body.scale, 5);
  });
});

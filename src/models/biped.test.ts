import { Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { FOOT } from './legs.ts';
import { seated } from './body-frame.ts';
import { LIMB_BULGE } from './body-parts.ts';
import { EYE_DIRECTION, HEAD_RINGS, headSurface } from './head.ts';
import { RHINO_HORN_AXIS } from './snouts.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { FINISH_ORDER, MeshBuilder, srgb } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { BONE_NAMES, boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { EYE_COLOR, EYE_LIGHT_COLOR, SPECIES, TEETH_COLOR } from './species.ts';
import type { AccentPart, SpeciesParams } from './species.ts';
import {
  H,
  SEAT,
  boundsOf,
  bottomOf,
  rabbit,
  reachFrom,
  spanOf,
  topOf,
  trianglesOn,
  variant,
  verticesWithColor,
  volumeOn,
} from './test-body.ts';

const SNOUT_TYPES: readonly SpeciesParams['snout'][] = [
  'short',
  'long',
  'blunt',
  'broad',
  'pointed',
  'buck-teeth',
  'trunk',
  'flat-nose',
  'horn',
  'beak',
];

const TAIL_TYPES: readonly SpeciesParams['tail'][] = ['none', 'puff', 'bushy', 'thin', 'flat'];

const FACE_PATTERNS: readonly SpeciesParams['facePattern'][] = [
  'none',
  'eye-patches',
  'cap',
  'stripe',
  'forehead-stripes',
  'face-disc',
  'eye-rings',
];

describe('buildBiped', () => {
  it('builds the rabbit body within the budget of 2,600 triangles (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(mesh.positions.length / 9).toBeLessThanOrEqual(2600);
  });

  it('makes each part rigid: the three corners of a triangle follow one bone (design 4.4)', () => {
    const { mesh } = rabbit();
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      expect(mesh.bones[t * 3 + 1]).toBe(mesh.bones[t * 3]);
      expect(mesh.bones[t * 3 + 2]).toBe(mesh.bones[t * 3]);
    }
  });

  it('puts the top of the head 2.3 H above the seat, with H 0.38 m (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(topOf(mesh, 'head')).toBeCloseTo(SEAT + 2.3 * H, 6);
  });

  it('puts the torso above the chest bone on `chest`, with the arms (design 4.7)', () => {
    const { mesh, positions } = rabbit();
    const chest = positions.chest[1];
    expect(chest).toBeCloseTo(SEAT + 0.75 * H, 9);
    expect(bottomOf(mesh, 'chest')).toBeCloseTo(chest, 6);
    expect(topOf(mesh, 'chest')).toBeCloseTo(SEAT + 1.35 * H, 6);
    expect(topOf(mesh, 'spine')).toBeCloseTo(chest, 6);
    expect(bottomOf(mesh, 'spine')).toBeCloseTo(SEAT, 6);
  });

  it('makes the round head of the polished images: 1.26 H wide and 1.0 H tall (design 4.5)', () => {
    const { mesh, positions } = rabbit();
    const head = boundsOf(mesh, 'head');
    const center = positions.head[1] + 0.5 * H;
    // The head bone is 0.5 H below the head center.
    expect(head.max[1] - (center - 0.5 * H)).toBeCloseTo(1.0 * H, 6);
    // The widest rings have corners at the sides, so the head is 1.26 H wide.
    expect(head.max[0] - head.min[0]).toBeCloseTo(1.26 * H, 6);
    const cheeks = HEAD_RINGS.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
    expect(2 * cheeks.halfWidth).toBeCloseTo(1.26, 9);
    expect(Math.abs(cheeks.y)).toBeLessThan(0.15);
    // The crown is round: 0.04 H below the top, the head is still 0.4 of its width.
    const crown = HEAD_RINGS.filter((ring) => ring.y > 0.4 && ring.y < 0.5);
    expect(Math.max(...crown.map((ring) => ring.halfWidth))).toBeGreaterThan(0.4 * 0.63);
    // The face is full: the front of the cheeks below the eyes is the front of the head, and it
    // is almost as wide as the cheeks. The head of animals.webp came to a point there.
    const face = HEAD_RINGS.reduce((a, b) => (b.front > a.front ? b : a));
    expect(face.y).toBeLessThan(-0.15);
    expect(face.front).toBeLessThan(0.65);
    expect(face.halfWidth).toBeGreaterThan(0.8 * cheeks.halfWidth);
  });

  it('gives each eye an upright oval of 0.13 × 0.18 H on the face, with a white light', () => {
    const { mesh, positions } = rabbit();
    const eye = boundsOf(mesh, 'eyeR');
    expect(eye.max[1] - eye.min[1]).toBeGreaterThan(0.17 * H);
    expect(eye.max[1] - eye.min[1]).toBeLessThan(0.19 * H);
    // The oval lies on the face, which turns about 30° to the side.
    expect(eye.max[0] - eye.min[0]).toBeGreaterThan(0.1 * H);
    expect(eye.max[0] - eye.min[0]).toBeLessThan(0.14 * H);
    // The eye center is a little inside the surface, so the eye shows half.
    const center: Vec3 = [positions.head[0], positions.head[1] + 0.5 * H, positions.head[2]];
    const c = new Vector3(...center);
    const eyeCenter = new Vector3(...positions.eyeR);
    const { point } = headSurface(H, center, toVec3(eyeCenter.clone().sub(c)));
    const inside = new Vector3(...point).distanceTo(c) - eyeCenter.distanceTo(c);
    expect(inside).toBeGreaterThan(0);
    expect(inside).toBeLessThan(0.02 * H);
    // The white light is on the eye bone, above the middle of the eye and in front of it, so
    // it closes with the eye.
    const light = verticesWithColor(mesh, srgb(EYE_LIGHT_COLOR), ['eyeR']);
    expect(light.length).toBeGreaterThan(0);
    for (const p of light) {
      expect(p[1]).toBeGreaterThan(positions.eyeR[1]);
      expect(p[2]).toBeLessThan(positions.eyeR[2] + 0.01 * H);
    }
    // The eyes have the wet finish.
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      if (mesh.bones[t * 3] === boneIndex('eyeR')) {
        expect(mesh.finishes[t]).toBe(FINISH_ORDER.indexOf('lacquer'));
      }
    }
  });

  it('rests the large round feet flat on the floor (design 4.5)', () => {
    const { mesh } = rabbit();
    const foot = boundsOf(mesh, 'footL');
    expect(foot.min[1]).toBeCloseTo(0, 6);
    expect(foot.max[1]).toBeCloseTo(FOOT.height * H, 6);
    expect(foot.max[2] - foot.min[2]).toBeCloseTo(FOOT.length * H, 6);
    expect(foot.max[0] - foot.min[0]).toBeCloseTo(FOOT.width * H, 6);
  });

  it('rests the feet on the floor for each size and seat height (design 4.5)', () => {
    for (const size of [0.75, 1, 1.35]) {
      for (const seat of [SEAT, 0.6]) {
        const builder = new MeshBuilder();
        buildBiped(builder, { ...SPECIES.rabbit, size }, seated(seat));
        const mesh = builder.build();
        // The mesh data holds 32-bit floats.
        expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
        expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      }
    }
  });

  it('rests the feet on a foot ring above the floor, with the shin of a chair', () => {
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.rabbit, seated(0.7, 0.25));
    const mesh = builder.build();
    expect(bottomOf(mesh, 'footL')).toBeCloseTo(0.25, 6);
    const p = body.positions;
    // The shin is the seat height plus 0.2 H above the foot rest (design 4.5).
    expect(p.shinL[1] - p.footL[1]).toBeCloseTo(0.7 - 0.25 + 0.2 * H, 9);
    expect(topOf(mesh, 'earL') - 0.7).toBeCloseTo(topOf(rabbit().mesh, 'earL') - SEAT, 5);
  });

  it('stands on straight legs with the feet on the floor', () => {
    for (const size of [0.75, 1, 1.35]) {
      const h = H * size;
      const builder = new MeshBuilder();
      const body = buildBiped(builder, { ...SPECIES.rabbit, size }, { kind: 'standing' });
      const mesh = builder.build();
      const p = body.positions;
      expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
      expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      // The knee is 0.45 H straight below the hip, and the shin reaches down to the ankle.
      expect(toVec3(new Vector3(...p.thighL).sub(new Vector3(...p.shinL)))).toEqual(
        [0, 0.45 * h, 0].map((v) => expect.closeTo(v, 9)),
      );
      expect(p.thighL[1]).toBeCloseTo(0.94 * h, 9);
      expect(p.shinL[1] - p.footL[1]).toBeCloseTo(0.39 * h, 9);
      // The top of the head is 2.4 H above the base of the torso, which is 0.75 H high.
      expect(topOf(mesh, 'head')).toBeCloseTo(0.77 * h + 2.3 * h, 2);
    }
  });

  it('gives the standing bear legs of 25% to 30% of its height (review of step 4, F3)', () => {
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.bear, { kind: 'standing' });
    const mesh = builder.build();
    let top = 0;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      top = Math.max(top, mesh.positions[v * 3 + 1] ?? 0);
    }
    // The bear was 2.02 m tall with legs of 41%. The reference bear has legs of about 25%. The
    // shorter torso of animals.webp makes it 1.63 m tall (was 1.67 m).
    expect(top).toBeCloseTo(1.63, 2);
    const legs = body.positions.thighL[1] / top;
    expect(legs).toBeGreaterThanOrEqual(0.25);
    expect(legs).toBeLessThanOrEqual(0.3);
  });

  it('puts the left side of the animal at -x, because it faces -z', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[0]).toBeLessThan(0);
    expect(positions.upperArmR[0]).toBeGreaterThan(0);
    expect(positions.shinL[2]).toBeLessThan(positions.thighL[2]);
  });

  it('gives the arm segments of design 4.5: 0.7 H and 0.65 H', () => {
    const { positions } = rabbit();
    expect(positions.upperArmL[1] - positions.forearmL[1]).toBeCloseTo(0.7 * H, 9);
    expect(positions.forearmL[1] - positions.handL[1]).toBeCloseTo(0.65 * H, 9);
  });

  it('gives the middle of each finger block, below the knuckles', () => {
    const { mesh, body } = variant({});
    for (const side of ['L', 'R'] as const) {
      const { min, max } = boundsOf(mesh, `fingers${side}`);
      const middle = min.map((low, i) => (low + (max[i] ?? 0)) / 2);
      const block = side === 'L' ? body.fingerBlockL : body.fingerBlockR;
      for (const [i, value] of block.entries()) {
        expect(value, `${side} ${i}`).toBeCloseTo(middle[i] ?? 0, 6);
      }
      expect(body.positions[`fingers${side}`][1] - block[1]).toBeCloseTo(0.05 * H, 9);
    }
  });

  it('places a bone for each body bone of the rig', () => {
    const { positions } = rabbit();
    const instrumentBones = new Set(['instrument', 'bow', 'malletL', 'malletR', 'baton', 'slide']);
    const bodyBones = BONE_NAMES.filter((name) => !instrumentBones.has(name));
    expect(Object.keys(positions).toSorted()).toEqual(bodyBones.toSorted());
  });

  it('builds each snout type on the head, with faces that point out', () => {
    for (const snout of SNOUT_TYPES) {
      const { mesh } = variant({ snout });
      expect(mesh.positions.length / 9).toBeLessThanOrEqual(2600);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      // Only the beak has a part on the jaw, and only the trunk has parts on the trunk bones.
      expect(trianglesOn(mesh, 'jaw') > 0).toBe(snout === 'beak');
      for (const bone of ['trunk1', 'trunk2', 'trunk3'] as const) {
        expect(trianglesOn(mesh, bone) > 0).toBe(snout === 'trunk');
      }
    }
  });

  it('puts the mouth in the middle, below the eyes, at the front of each snout', () => {
    const snoutBones = ['head', 'jaw', 'trunk1'] as const;
    for (const snout of SNOUT_TYPES) {
      const { mesh, body } = variant({ snout });
      const center = new Vector3(...body.headCenter);
      const mouth = new Vector3(...body.mouth);
      const offset = mouth.clone().sub(center);
      expect(offset.x, snout).toBe(0);
      expect(body.mouth[1], snout).toBeLessThan(body.positions.eyeR[1]);
      expect(body.mouth[2], snout).toBeLessThan(body.positions.eyeR[2]);
      // The mouth is outside the head.
      const surface = headSurface(H, body.headCenter, toVec3(offset));
      expect(offset.length(), snout).toBeGreaterThan(
        new Vector3(...surface.point).distanceTo(center),
      );
      // A corner of the snout, the beak, or the trunk is near the mouth.
      let nearest = Infinity;
      for (let v = 0; v < mesh.bones.length; v++) {
        if (snoutBones.some((bone) => mesh.bones[v] === boneIndex(bone))) {
          const p = new Vector3(
            mesh.positions[v * 3] ?? 0,
            mesh.positions[v * 3 + 1] ?? 0,
            mesh.positions[v * 3 + 2] ?? 0,
          );
          nearest = Math.min(nearest, p.distanceTo(mouth));
        }
      }
      expect(nearest, snout).toBeLessThan(0.2 * H);
    }
  });

  it('gives the long snout and the beak their lengths in front of the face (design 4.5)', () => {
    // The face is the front of the cheeks of the head.
    const face = Math.max(...HEAD_RINGS.map((ring) => ring.front - (ring.z ?? 0)));
    for (const [snout, reach] of [
      ['long', 0.25],
      ['blunt', 0.3],
      ['pointed', 0.2],
      ['beak', 0.2],
    ] as const) {
      const { mesh, body } = variant({ snout });
      const front = Math.min(boundsOf(mesh, 'head').min[2], boundsOf(mesh, 'jaw').min[2]);
      const reachInFront = body.headCenter[2] - face * H - front;
      expect(reachInFront).toBeGreaterThan(reach * H - 0.02 * H);
      expect(reachInFront).toBeLessThan(reach * H + 0.02 * H);
    }
  });

  it('gives the buck teeth two white teeth below the muzzle (review of step 4)', () => {
    const { mesh, body } = variant({ snout: 'buck-teeth' });
    const teeth = verticesWithColor(mesh, srgb(TEETH_COLOR), ['head']);
    expect(teeth.length).toBeGreaterThan(0);
    for (const p of teeth) {
      expect(p[1]).toBeLessThan(body.headCenter[1] - 0.24 * H);
      expect(p[2]).toBeLessThan(body.headCenter[2] - 0.4 * H);
    }
    expect(Math.min(...teeth.map((p) => p[0]))).toBeCloseTo(
      -Math.max(...teeth.map((p) => p[0])),
      9,
    );
  });

  it('builds the trunk of 1.4 H on three bones (design 4.5)', () => {
    const { mesh, body } = variant({ snout: 'trunk' });
    const p = body.positions;
    expect(new Vector3(...p.trunk2).distanceTo(new Vector3(...p.trunk1))).toBeCloseTo(0.5 * H, 9);
    expect(new Vector3(...p.trunk3).distanceTo(new Vector3(...p.trunk2))).toBeCloseTo(0.5 * H, 9);
    // The last segment is 0.4 H long, and its tip has a radius of 0.08 H.
    expect(reachFrom(mesh, 'trunk3', p.trunk3)).toBeCloseTo(Math.hypot(0.4, 0.08) * H, 6);
    // The trunk starts low on the face, hangs down in front of the chest, and its tip curls up.
    expect(p.trunk1[1]).toBeLessThan(body.positions.eyeR[1] - 0.35 * H);
    expect(p.trunk3[1]).toBeLessThan(p.neck[1]);
    expect(p.trunk3[2]).toBeLessThan(p.trunk2[2]);
    expect(boundsOf(mesh, 'trunk3').max[1]).toBeGreaterThan(p.trunk3[1] + 0.3 * H);
  });

  it('makes the flat nose 0.4 H wide and the horn 0.4 H long, in their accent colors', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const flat = variant({ snout: 'flat-nose', accentParts: ['snout'] });
    const disc = verticesWithColor(flat.mesh, accent);
    const xs = disc.map((p) => p[0]);
    const ys = disc.map((p) => p[1]);
    // The disc is an octagon, 0.4 H wide and 0.3 H tall across its corners. Across its faces, it
    // is cos(22.5°) of that.
    const acrossFaces = Math.cos(Math.PI / 8);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.4 * H * acrossFaces, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.3 * H * acrossFaces, 6);
    const rhino = variant({ snout: 'horn', accentParts: ['horn'] });
    const horn = verticesWithColor(rhino.mesh, accent);
    const axis = new Vector3(...RHINO_HORN_AXIS).normalize();
    const along = horn.map((p) => new Vector3(...p).dot(axis));
    expect(Math.max(...along) - Math.min(...along)).toBeCloseTo(0.4 * H, 6);
  });

  it('builds each tail type on its bones, with faces that point out', () => {
    for (const tail of TAIL_TYPES) {
      const { mesh } = variant({ tail });
      const bones = { none: 0, puff: 1, bushy: 2, thin: 2, flat: 2 }[tail];
      expect(trianglesOn(mesh, 'tail1') > 0).toBe(bones >= 1);
      expect(trianglesOn(mesh, 'tail2') > 0).toBe(bones === 2);
      if (bones >= 1) {
        expect(volumeOn(mesh, 'tail1')).toBeGreaterThan(0);
      }
      if (bones === 2) {
        expect(volumeOn(mesh, 'tail2')).toBeGreaterThan(0);
      }
    }
  });

  it('gives the tails the lengths of design 4.5', () => {
    for (const [tail, total, tipRadius] of [
      ['bushy', 1.1, 0],
      ['thin', 0.7, 0.025],
    ] as const) {
      const { mesh, body } = variant({ tail });
      const { tail1, tail2 } = body.positions;
      const second = Math.sqrt(reachFrom(mesh, 'tail2', tail2) ** 2 - (tipRadius * H) ** 2);
      expect(new Vector3(...tail2).distanceTo(new Vector3(...tail1)) + second).toBeCloseTo(
        total * H,
        6,
      );
    }
    // The flat tail is a stalk and a paddle of 0.45 H wide and 0.06 H thick.
    const flat = variant({ tail: 'flat' });
    const { tail1, tail2 } = flat.body.positions;
    const paddle = Math.sqrt(
      reachFrom(flat.mesh, 'tail2', tail2) ** 2 - (0.225 ** 2 + 0.03 ** 2) * H * H,
    );
    expect(new Vector3(...tail2).distanceTo(new Vector3(...tail1)) + paddle).toBeCloseTo(
      0.5 * H,
      6,
    );
    // The puff is a ball of 0.42 H, and it stands 0.25 H out of the back of the torso.
    const puff = variant({ tail: 'puff' }).mesh;
    expect(spanOf(puff, 'tail1')).toBeCloseTo(0.42 * H, 6);
    expect(boundsOf(puff, 'tail1').max[2] - boundsOf(puff, 'spine').max[2]).toBeGreaterThan(
      0.25 * H,
    );
  });

  it('gives the bushy tail a tip of the belly color above the floor, seated and standing', () => {
    const belly = srgb(SPECIES.rabbit.colors.belly);
    for (const stance of [seated(0.4), { kind: 'standing' } as const]) {
      const builder = new MeshBuilder();
      const body = buildBiped(builder, { ...SPECIES.rabbit, tail: 'bushy' }, stance);
      const mesh = builder.build();
      const tip = verticesWithColor(mesh, belly, ['tail2']);
      expect(tip.length).toBeGreaterThan(0);
      // The tip is the lowest part of the tail, 0.12 m above the floor.
      expect(Math.min(...tip.map((p) => p[1]))).toBeCloseTo(bottomOf(mesh, 'tail2'), 9);
      expect(bottomOf(mesh, 'tail2')).toBeGreaterThan(0.1);
      expect(body.positions.tail2[1]).toBeGreaterThan(bottomOf(mesh, 'tail2'));
    }
  });

  it('builds each face pattern on the head surface, in the accent color', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const extra = {
      none: 0,
      'eye-patches': 40,
      cap: 0,
      stripe: 252,
      'forehead-stripes': 48,
      'face-disc': 40,
      'eye-rings': 40,
    };
    for (const facePattern of FACE_PATTERNS) {
      // The face disc and the eye rings have the belly color. The trunk has no muzzle of the
      // belly color, so the belly color on the head is only the face and the pattern.
      const disc = facePattern === 'face-disc' || facePattern === 'eye-rings';
      const snout = disc ? 'trunk' : 'short';
      const plain = variant({ snout, accentParts: ['face-pattern'] }).mesh;
      const { mesh, body } = variant({ facePattern, snout, accentParts: ['face-pattern'] });
      expect(mesh.bones.length / 3 - plain.bones.length / 3).toBe(extra[facePattern]);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      const pattern = verticesWithColor(mesh, disc ? belly : accent, ['head']);
      if (facePattern === 'none') {
        expect(pattern).toHaveLength(0);
        continue;
      }
      // Each vertex is near the surface of the head (1.0 is on it), and the pattern is symmetric.
      const center = new Vector3(...body.headCenter);
      for (const p of pattern) {
        const d = new Vector3(...p).sub(center);
        const { point } = headSurface(H, body.headCenter, toVec3(d));
        const r = d.length() / new Vector3(...point).distanceTo(center);
        // The boxes of a stripe stand a little above the flat crown.
        expect(r).toBeGreaterThan(0.9);
        expect(r).toBeLessThan(1.16);
      }
      const xs = pattern.map((p) => p[0]);
      expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
    }
  });

  it('gives the beagle a cap of the accent color, with a blaze of the belly color', () => {
    const { mesh, body } = variant({ facePattern: 'cap', accentParts: ['face-pattern'] });
    const c = body.headCenter;
    const accent = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']);
    const belly = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.belly), ['head']);
    // The cap covers the crown and the eyes, and it ends below the eyes.
    expect(Math.max(...accent.map((p) => p[1] - c[1]))).toBeCloseTo(0.5 * H, 6);
    expect(Math.min(...accent.map((p) => p[1] - c[1]))).toBeLessThan(
      body.positions.eyeR[1] - c[1] - 0.1 * H,
    );
    // The blaze runs up the middle of the face to the crown, and the muzzle below is white.
    const blaze = belly.filter((p) => p[2] < c[2] && Math.abs(p[0] - c[0]) < 0.05 * H);
    expect(Math.max(...blaze.map((p) => p[1] - c[1]))).toBeGreaterThan(0.4 * H);
    expect(Math.min(...belly.map((p) => p[1] - c[1]))).toBeLessThan(-0.4 * H);
    for (const p of accent) {
      expect(p[2] < c[2] && Math.abs(p[0] - c[0]) < 0.05 * H).toBe(false);
    }
  });

  it('raises the eyes over a patch around them, so that the patch does not hide them', () => {
    for (const [facePattern, out] of [
      ['eye-rings', true],
      ['eye-patches', true],
      ['face-disc', true],
      ['none', false],
      ['stripe', false],
    ] as const) {
      const { body } = variant({ facePattern });
      const c = new Vector3(...body.headCenter);
      const eye = new Vector3(...body.positions.eyeR);
      const { point } = headSurface(H, body.headCenter, toVec3(eye.clone().sub(c)));
      const above = eye.distanceTo(c) - new Vector3(...point).distanceTo(c);
      expect(above > 0, facePattern).toBe(out);
    }
  });

  it('makes the eye patches larger than the eyes, so that they show around them', () => {
    const { mesh } = variant({ facePattern: 'eye-patches', accentParts: ['face-pattern'] });
    const patch = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']).filter(
      (p) => p[0] > 0,
    );
    const eye = boundsOf(mesh, 'eyeR');
    const tall = (points: readonly Vec3[]): number =>
      Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
    expect(tall(patch)).toBeGreaterThan(eye.max[1] - eye.min[1] + 0.12 * H);
  });

  it('shows the black eyes of the penguin in white rings (audit 2, N8)', () => {
    // The black eyes on the black head of the penguin did not show in a close shot.
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.penguin, { kind: 'standing' });
    const mesh = builder.build();
    const h = H * SPECIES.penguin.size;
    const belly = srgb(SPECIES.penguin.colors.belly);
    const black = srgb(EYE_COLOR);
    const colorAt = (v: number): Rgb => [
      mesh.colors[v * 3] ?? 0,
      mesh.colors[v * 3 + 1] ?? 0,
      mesh.colors[v * 3 + 2] ?? 0,
    ];
    const same = (a: Rgb, b: Rgb): boolean => a.every((c, k) => Math.abs(c - (b[k] ?? 0)) < 1e-6);
    // The color of the first triangle that a ray from outside hits.
    const seen = (from: Vector3, toward: Vector3): Rgb | null => {
      const ray = new Ray(from, toward);
      const hit = new Vector3();
      let best = Infinity;
      let color: Rgb | null = null;
      const p = mesh.positions;
      for (let t = 0; t * 9 < p.length; t++) {
        const [a, b, c] = [0, 1, 2].map(
          (k) => new Vector3(p[t * 9 + k * 3], p[t * 9 + k * 3 + 1], p[t * 9 + k * 3 + 2]),
        );
        if (a && b && c && ray.intersectTriangle(a, b, c, false, hit)) {
          const d = hit.distanceTo(from);
          if (d < best) {
            best = d;
            color = colorAt(t * 3);
          }
        }
      }
      return color;
    };
    for (const side of [-1, 1]) {
      const surface = headSurface(h, body.headCenter, [
        side * EYE_DIRECTION[0],
        EYE_DIRECTION[1],
        EYE_DIRECTION[2],
      ]);
      const normal = new Vector3(...surface.normal);
      const up = new Vector3(0, 1, 0).projectOnPlane(normal).normalize();
      const look = (offset: number): Rgb | null => {
        const at = new Vector3(...surface.point).addScaledVector(up, offset * h);
        return seen(at.clone().addScaledVector(normal, h), normal.clone().negate());
      };
      // The eye shows over its full height, from 0.06 H below the surface point, with its white
      // light 0.035 H above it. The white ring shows above the eye on the black forehead, and
      // the white face below it. With the eye 0.01 H inside the surface, the ring hid its lower
      // half.
      for (const offset of [-0.06, -0.01, 0.07]) {
        expect(same(look(offset) ?? [0, 0, 0], black), `side ${side} at ${offset}`).toBe(true);
      }
      expect(same(look(0.035) ?? [0, 0, 0], srgb(EYE_LIGHT_COLOR)), `side ${side} light`).toBe(
        true,
      );
      expect(same(look(0.12) ?? [0, 0, 0], belly), `side ${side} above`).toBe(true);
      expect(same(look(0.2) ?? [0, 0, 0], srgb(SPECIES.penguin.colors.fur))).toBe(true);
    }
  });

  it('puts the forehead stripes above the eyes, and the stripe of the badger over the head', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const cat = variant({ facePattern: 'forehead-stripes', accentParts: ['face-pattern'] });
    for (const p of verticesWithColor(cat.mesh, accent, ['head'])) {
      expect(p[1]).toBeGreaterThan(cat.body.positions.eyeR[1]);
      expect(p[2]).toBeLessThan(cat.body.headCenter[2]);
    }
    const badger = variant({ facePattern: 'stripe', accentParts: ['face-pattern'] });
    const c = badger.body.headCenter;
    // The middle stripe has the belly color on the top of the head, where the head has the fur
    // color, and the accent stripes reach the back of the head.
    const top = verticesWithColor(badger.mesh, belly, ['head']).filter(
      (p) => p[1] > c[1] + 0.45 * H,
    );
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) {
      expect(Math.abs(p[0])).toBeLessThan(0.1 * H);
    }
    const back = verticesWithColor(badger.mesh, accent, ['head']).map((p) => p[2] - c[2]);
    expect(Math.max(...back)).toBeGreaterThan(0.2 * H);
  });

  it('gives the accent color to each accent part, and to no other part (design 4.5)', () => {
    const red = '#ff0000';
    const parts: readonly (readonly [AccentPart, Partial<SpeciesParams>, readonly BoneName[]])[] = [
      ['inner-ears', {}, ['earL', 'earR']],
      ['ears', {}, ['earL', 'earR']],
      ['nose', {}, ['head']],
      ['snout', { snout: 'flat-nose' }, ['head']],
      ['horn', { snout: 'horn' }, ['head']],
      ['beak', { snout: 'beak' }, ['head', 'jaw']],
      // The accent arms also color a band over the shoulders, as on the panda.
      ['arms', {}, ['upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'chest']],
      ['hands', {}, ['handL', 'handR', 'fingersL', 'fingersR']],
      ['legs', {}, ['thighL', 'thighR', 'shinL', 'shinR']],
      // The accent feet also color the lower part of the shins, as the socks of the fox.
      ['feet', {}, ['footL', 'footR', 'shinL', 'shinR']],
      ['tail', { tail: 'thin' }, ['tail1', 'tail2']],
      ['face-pattern', { facePattern: 'eye-patches' }, ['head']],
    ];
    const colors = { ...SPECIES.rabbit.colors, accent: red };
    for (const [part, change, bones] of parts) {
      const plain = variant({ ...change, colors, accentParts: [] }).mesh;
      expect(verticesWithColor(plain, srgb(red))).toHaveLength(0);
      const { mesh } = variant({ ...change, colors, accentParts: [part] });
      const accented = new Set<BoneName>();
      for (let v = 0; v < mesh.bones.length; v++) {
        if (mesh.colors[v * 3] === 1 && mesh.colors[v * 3 + 1] === 0) {
          accented.add(BONE_NAMES[mesh.bones[v] ?? 0] ?? 'root');
        }
      }
      expect([...accented].toSorted()).toEqual([...bones].toSorted());
    }
  });

  it('gives the belly color to the lower face, up to the eyes (design 4.3)', () => {
    const { mesh, body } = variant({});
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const fur = srgb(SPECIES.rabbit.colors.fur);
    const face = verticesWithColor(mesh, belly, ['head']);
    const top = Math.max(...face.map((p) => p[1] - body.positions.eyeR[1]));
    // The lower face ends at the eyes, and the forehead above it keeps the fur color.
    expect(Math.abs(top)).toBeLessThan(0.05 * H);
    // The cheeks at the sides of the head have the belly color, as the white cheeks of the fox.
    expect(Math.max(...face.map((p) => p[0] - body.headCenter[0]))).toBeGreaterThan(0.6 * H);
    const back = verticesWithColor(mesh, fur, ['head']).map((p) => p[2] - body.headCenter[2]);
    expect(Math.max(...back)).toBeGreaterThan(0.45 * H);
  });

  it('makes a short thick neck under the head (design 4.5)', () => {
    const { mesh, body } = variant({});
    const { min, max } = boundsOf(mesh, 'neck');
    // The faceted tube bulges by 1.1 at a third of its length, where its radius is 0.29 H.
    expect(max[0] - min[0]).toBeLessThanOrEqual(2 * LIMB_BULGE * 0.29 * H + 1e-9);
    expect(max[0] - min[0]).toBeGreaterThan(2 * 0.29 * H);
    expect(min[1]).toBeCloseTo(SEAT + 1.05 * H, 6);
    // The neck ends inside the head, and the torso reaches the chin.
    expect(max[1]).toBeLessThan(body.headCenter[1] - 0.25 * H);
    expect(topOf(mesh, 'chest')).toBeGreaterThan(body.headCenter[1] - 0.5 * H);
  });

  it('makes a round pear torso and round legs (design 4.5)', () => {
    const { mesh, body } = variant({});
    const spine = boundsOf(mesh, 'spine');
    // The torso is 1.28 H wide at the hips. The ring there has corners at the sides.
    expect(spine.max[0] - spine.min[0]).toBeCloseTo(1.28 * H, 6);
    // The ring of the hips has a corner at the front too: the belly, 1.08 times the half width.
    expect(body.positions.spine[2] - spine.min[2]).toBeCloseTo(1.08 * 0.64 * H, 6);
    // The back is 0.72 of the half width deep.
    expect(spine.max[2] - body.positions.spine[2]).toBeCloseTo(0.72 * 0.64 * H, 6);
    // The thigh bulges by 1.1 at a third of its length, from the radius 0.32 H to 0.27 H.
    const thigh = boundsOf(mesh, 'thighL');
    const bulge = 2 * LIMB_BULGE * (0.32 - 0.05 / 3) * H;
    expect(thigh.max[0] - thigh.min[0]).toBeLessThanOrEqual(bulge + 1e-9);
    expect(thigh.max[0] - thigh.min[0]).toBeGreaterThan(bulge * Math.cos(Math.PI / 8));
    // The knee is an icosahedron of 0.27 H, 0.85 of its radius wide on each side of its center.
    const shin = boundsOf(mesh, 'shinL');
    const across = (1 + Math.sqrt(5)) / 2 / Math.hypot(1, (1 + Math.sqrt(5)) / 2);
    expect(shin.max[0] - shin.min[0]).toBeCloseTo(2 * across * 0.27 * H, 6);
  });

  it('gives the belly color to a stripe down the front of the torso (design 4.3)', () => {
    const belly = srgb(SPECIES.wolf.colors.belly);
    const { mesh, body } = variant({ colors: SPECIES.wolf.colors });
    const stripe = verticesWithColor(mesh, belly, ['spine', 'chest']);
    expect(stripe.length).toBeGreaterThan(0);
    // The stripe is on the front, and it is narrower than the torso.
    const spine = boundsOf(mesh, 'spine');
    for (const p of stripe) {
      expect(p[2]).toBeLessThanOrEqual(body.positions.spine[2]);
    }
    const xs = stripe.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.75 * (spine.max[0] - spine.min[0]));
  });

  it('makes a thin body with a girth of 0.75 (review of step 4, the meerkat)', () => {
    const round = variant({}).mesh;
    const { mesh, body } = variant({ girth: 0.75 });
    const width = (m: MeshData, bone: BoneName): number => {
      const b = boundsOf(m, bone);
      return b.max[0] - b.min[0];
    };
    expect(width(mesh, 'spine')).toBeCloseTo(0.75 * width(round, 'spine'), 6);
    expect(width(mesh, 'thighL')).toBeCloseTo(0.75 * width(round, 'thighL'), 6);
    expect(body.positions.upperArmR[0]).toBeCloseTo(0.75 * 0.52 * H, 9);
    // The head keeps its size.
    expect(width(mesh, 'head')).toBeCloseTo(width(round, 'head'), 6);
  });
});

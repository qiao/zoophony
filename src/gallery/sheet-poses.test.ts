import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { placePoint } from '../models/instruments/hold.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { HEAD_BONES, partDistance, posedPart, signedDistance } from '../pose/test-clearance.ts';
import type { PosedPart } from '../pose/test-clearance.ts';
import { posedPiecePoint, posedPoint, poseSkeleton } from '../pose/test-kinematics.ts';
import type { PosedSkeleton } from '../pose/test-kinematics.ts';
import { sheetPose } from './sheet-poses.ts';
import { VIEW_SHEETS } from './sheets.ts';

/** The bones of the arm parts that keep out of the body: the forearm and the hand. */
const LOWER_ARMS: readonly BoneName[] = ['forearmL', 'handL', 'fingersL', 'forearmR', 'handR'];

/** The bones of the torso and the legs. */
const BODY: readonly BoneName[] = ['spine', 'chest', 'neck', 'thighL', 'thighR', 'shinL', 'shinR'];

/**
 * Gives the deepest place of the corners of a part in the closed shells of another part.
 *
 * @param part The part whose corners are tested.
 * @param body The part with the shells.
 * @returns The depth in meters: 0 if no corner is inside.
 */
function depthIn(part: PosedPart, body: PosedPart): number {
  let deepest = 0;
  for (const triangle of part.triangles) {
    for (const corner of [triangle.a, triangle.b, triangle.c]) {
      deepest = Math.max(deepest, -signedDistance(body, corner));
    }
  }
  return deepest;
}

/**
 * Gives the posed place of the bind position of a bone.
 *
 * @param posed The posed skeleton.
 * @param bone The bone.
 * @returns The place, in the axes of the model.
 */
function boneAt(posed: PosedSkeleton, bone: BoneName): Vector3 {
  const bind = posed.model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
  return new Vector3(...posedPoint(posed, bone, bind));
}

describe('sheetPose: the violin on the shoulder (design 7.1)', () => {
  for (const id of ['fox', 'rabbit'] as const) {
    const sheet = VIEW_SHEETS[id];
    const model = buildPlayer(sheet.species, sheet.instrument);
    const h = model.body.headHeight;
    const posed = poseSkeleton(model, sheetPose(model, sheet));

    // The rabbit has no checks of the left hand, the chin, the bow, and the right elbow.
    if (id === 'fox') {
      it(`raises the left hand to the height of the mouth (${id})`, () => {
        const head = new Vector3(...model.body.headCenter);
        // The left hand holds the neck near the scroll. With the hold of the stage, the wrist was
        // 0.77 H below the head center.
        expect((boneAt(posed, 'handL').y - head.y) / h).toBeGreaterThan(-0.45);
      });

      it(`keeps the violin at the chin, and the bow and the arms out of the body (${id})`, () => {
        const body = posedPart(posed, [...HEAD_BONES, ...BODY]);
        // The chin rests on the violin: the violin goes at most 0.03 H into the body. The violin of
        // the stage goes 0.036 H into the rabbit.
        expect(depthIn(posedPart(posed, ['instrument']), body) / h).toBeLessThan(0.03);
        expect(partDistance(posedPart(posed, ['bow']), body, 0.1)).toBeGreaterThan(0);
        expect(partDistance(posedPart(posed, LOWER_ARMS), body, 0.1) / h).toBeGreaterThan(0.01);
      });

      it(`plays in the middle of the bow, with the bow paw away from the head (${id})`, () => {
        // The sheets hold the bow paw at the chest, with the strings near the middle of the hair.
        // Near the frog, the bow paw of the red fox came 0.007 H from its head, over the muzzle.
        const target = (kind: 'bow-hair' | 'bow-contact') => {
          const found = model.instrument.targets.find((t) => t.kind === kind);
          if (!found) {
            throw new Error(`The violin has no target "${kind}".`);
          }
          return found;
        };
        const from = new Vector3(
          ...posedPiecePoint(posed, { bone: 'bow', at: target('bow-hair').from }),
        );
        const to = new Vector3(
          ...posedPiecePoint(posed, { bone: 'bow', at: target('bow-hair').to }),
        );
        const contact = new Vector3(
          ...posedPiecePoint(posed, { bone: 'instrument', at: target('bow-contact').from }),
        );
        const along = contact.sub(from).dot(to.clone().sub(from).normalize()) / to.distanceTo(from);
        expect(along).toBeGreaterThan(0.4);
        expect(along).toBeLessThan(0.6);

        const paw = posedPart(posed, ['forearmR', 'handR']);
        expect(partDistance(paw, posedPart(posed, HEAD_BONES), 0.3) / h).toBeGreaterThan(0.1);
      });

      it(`hangs the right elbow below the shoulder, as in the sheets (${id})`, () => {
        // With the elbow of the stage, which turns up toward the tip, the elbow was level with the
        // shoulder in the middle of the bow, and it stuck out to the side.
        const drop = boneAt(posed, 'forearmR').y - boneAt(posed, 'upperArmR').y;
        expect(drop / h).toBeLessThan(-0.2);
      });
    }

    it(`keeps the head upright (${id})`, () => {
      const turn = sheetPose(model, sheet).rotations.slice(
        boneIndex('head') * 4,
        boneIndex('head') * 4 + 4,
      );
      expect([...turn]).toEqual([0, 0, 0, 1]);
    });
  }
});

describe('sheetPose: the cello and the piano (design 7.1)', () => {
  it('keeps the bow and the arms of the dog out of its body', () => {
    const sheet = VIEW_SHEETS.dog;
    const model = buildPlayer(sheet.species, sheet.instrument);
    const posed = poseSkeleton(model, sheetPose(model, sheet));
    const body = posedPart(posed, [...HEAD_BONES, ...BODY]);
    const h = model.body.headHeight;
    expect(partDistance(posedPart(posed, ['bow']), body, 0.1) / h).toBeGreaterThan(0.1);
    expect(partDistance(posedPart(posed, LOWER_ARMS), body, 0.1) / h).toBeGreaterThan(0.1);
    // The neck of the cello passes the head, at least 0.03 m from it, as on the stage (design 5.3).
    const neck = partDistance(posedPart(posed, ['instrument']), posedPart(posed, HEAD_BONES), 0.2);
    expect(neck).toBeGreaterThan(0.03);
  });

  it('puts the palms of the polar bear on the keys of the piano', () => {
    const sheet = VIEW_SHEETS['polar-bear'];
    const model = buildPlayer(sheet.species, sheet.instrument);
    const posed = poseSkeleton(model, sheetPose(model, sheet));
    const { palmL, palmR } = model.instrument.grips;
    expect(palmL && palmR).toBeTruthy();
    if (!palmL || !palmR) {
      return;
    }
    for (const [bone, palm, grip] of [
      ['handL', model.body.palmL, palmL],
      ['handR', model.body.palmR, palmR],
    ] as const) {
      // The palm is 0.04 m above the keys while the key sounds (design 5.3).
      const keys = placePoint(model.pieces, grip)[1];
      expect(Math.abs(posedPoint(posed, bone, palm)[1] - keys)).toBeLessThan(0.03);
    }
  });
});

describe('sheetPose: the baton (design 7.1)', () => {
  it('raises both paws of the bear above the shoulders, and the baton above the right paw', () => {
    const sheet = VIEW_SHEETS.bear;
    const model = buildPlayer(sheet.species, sheet.instrument);
    const posed = poseSkeleton(model, sheetPose(model, sheet));
    const h = model.body.headHeight;
    for (const [hand, shoulder] of [
      ['handL', 'upperArmL'],
      ['handR', 'upperArmR'],
    ] as const) {
      expect(boneAt(posed, hand).y - boneAt(posed, shoulder).y, hand).toBeGreaterThan(0.2 * h);
    }
    const tip = model.instrument.targets.find((target) => target.kind === 'tip');
    expect(tip).toBeDefined();
    if (!tip) {
      return;
    }
    const top = posedPiecePoint(posed, { bone: tip.bone, at: tip.from });
    expect(top[1] - boneAt(posed, 'handR').y).toBeGreaterThan(0.5 * h);
  });
});

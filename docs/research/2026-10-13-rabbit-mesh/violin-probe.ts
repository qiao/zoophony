/**
 * Measures the violin hold of the rabbit violinist against the rule of a real violinist
 * (`docs/decisions/2026-10-13-studio-rabbit.md`): the turn of the violin to the left of the front
 * and the tilt of its scroll, the chin rest from the left shoulder joint and from the jaw, the left
 * elbow under the violin, the left palm at the neck, and the angle of the bow to the strings. It
 * poses the sheet moment of the violin (`SHEET_MOMENTS` of `src/gallery/sheet-poses.ts`), seated
 * and standing, at the frog, in the middle, and at the tip of a down-bow. Lengths are in head
 * heights H. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/violin-probe.ts ['violin@rabbit.<path>=<value>;...']
 */
import { Vector3 } from 'three';

import { SHEET_MOMENTS, sheetPose } from '../../../src/gallery/sheet-poses.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { poseSkeleton, posedPiecePoint, posedPoint } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const changes = setHolds(process.argv[2] ?? '');
console.log(`set: ${changes.text || 'none'}`);

const deg = (rad: number): string => ((rad * 180) / Math.PI).toFixed(0);

/**
 * Gives the posed place of a bone.
 *
 * @param posed The posed skeleton.
 * @param bone The bone.
 * @returns The place.
 */
function boneAt(posed: PosedSkeleton, bone: BoneName): Vector3 {
  return new Vector3(
    ...posedPoint(posed, bone, posed.model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]),
  );
}

for (const support of ['chair', 'stand'] as const) {
  const model = buildPlayer('rabbit', 'violin', 4, support);
  const h = model.body.headHeight;
  const { targets, grips } = model.instrument;
  const board = targets.find((t) => t.kind === 'fingerboard');
  const hair = targets.find((t) => t.kind === 'bow-hair');
  if (!board || !hair || !grips.chin) {
    throw new Error('The violin has no fingerboard, no bow hair, or no chin rest.');
  }
  for (const [label, time] of [
    ['frog', 1.1],
    ['middle', 2.4],
    ['tip', 4.7],
  ] as const) {
    const posed = poseSkeleton(
      model,
      sheetPose(
        model,
        { species: 'rabbit', instrument: 'violin' },
        {
          ...SHEET_MOMENTS.violin,
          time,
        },
      ),
    );
    const at = (bone: BoneName, p: readonly [number, number, number]): Vector3 =>
      new Vector3(...posedPiecePoint(posed, { bone, at: [p[0], p[1], p[2]] }));
    const nut = at('instrument', board.from);
    const end = at('instrument', board.to);
    const axis = nut.clone().sub(end).normalize();
    // The model faces -z, and its left side is -x.
    const left = Math.atan2(-axis.x, -axis.z);
    const tilt = Math.asin(axis.y);
    const chin = at('instrument', grips.chin.at);
    const shoulder = boneAt(posed, 'upperArmL');
    const fromShoulder = chin.clone().sub(shoulder).divideScalar(h);
    const mouth = new Vector3(...posedPoint(posed, 'head', model.body.mouth));
    const elbow = boneAt(posed, 'forearmL');
    // The elbow under the violin: its distance across the vertical plane of the violin axis.
    const side = new Vector3(axis.z, 0, -axis.x).normalize();
    const elbowAcross = elbow.clone().sub(end).dot(side) / h;
    const palm = new Vector3(...posedPoint(posed, 'handL', model.body.palmL));
    const segment = nut.clone().sub(end);
    const t = Math.min(1, Math.max(0, palm.clone().sub(end).dot(segment) / segment.lengthSq()));
    const palmToNeck = palm.distanceTo(end.clone().addScaledVector(segment, t)) / h;
    const bowFrom = at('bow', hair.from);
    const bowTo = at('bow', hair.to);
    const bow = bowTo.clone().sub(bowFrom).normalize();
    console.log(
      `${support} ${label}: violin ${deg(left)}° left of the front, scroll ${deg(tilt)}° up; ` +
        `chin rest from the left shoulder (out up forward) (${(-fromShoulder.x).toFixed(2)} ` +
        `${fromShoulder.y.toFixed(2)} ${(-fromShoulder.z).toFixed(2)}) H, ` +
        `${((mouth.y - chin.y) / h).toFixed(2)} H under the mouth; ` +
        `left elbow ${((end.y - elbow.y) / h).toFixed(2)} H under the violin end and ` +
        `${elbowAcross.toFixed(2)} H across its plane; left palm ${palmToNeck.toFixed(2)} H ` +
        `from the neck (${t.toFixed(2)} of the board from its end); bow at ` +
        `${deg(bow.angleTo(axis))}° to the violin axis`,
    );
  }
}
changes.undo();

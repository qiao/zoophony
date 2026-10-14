/**
 * Measures the violin hold of the rabbit and the red fox on the chair against their bodies, with
 * no idle motion, for the hold of the working tree and each variant of `--set` (the syntax of
 * `pnpm pose-depth --set`). It prints, in meters and in head heights `H` (model axes: +x is the
 * right of the player, +y up, -z the front):
 *
 * - the collarbone point: the highest point of the trunk skin (the corners of the chest, the
 *   neck, and the left shoulder bones) in a column halfway from the middle plane to the left
 *   shoulder joint, in front of that joint;
 * - the jaw point: the lowest corner of the head bone on the left of the middle plane, in front
 *   of the neck joint;
 * - the nose, and the tail end, the top of the strings at the tail end, and the scroll of the
 *   violin in the playing pose, with the turn of the violin to the left of the front and the
 *   rise of the scroll;
 * - the tail end, the scroll, and the axis of the violin in the rest pose, the top of the left
 *   thigh at the knee, and the grip and the tip of the bow at rest.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-14-fox-rabbit-form/hold-probe.ts [--set '<changes>']...
 */
import { Quaternion, Vector3 } from 'three';

import { placePoint } from '../../../src/models/instruments/hold.ts';
import { VIOLIN } from '../../../src/models/instruments/strings.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../../../src/pose/bowed.ts';
import { lapPoint } from '../../../src/pose/lap.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const sets = process.argv.flatMap((arg, i) => (process.argv[i - 1] === '--set' ? [arg] : []));

/**
 * Writes a point in meters and in head heights.
 *
 * @param p The point.
 * @param h The head height.
 * @returns The text.
 */
function text(p: Vector3, h: number): string {
  const m = p.toArray().map((v) => v.toFixed(3));
  const inH = p.toArray().map((v) => (v / h).toFixed(2));
  return `(${m.join(', ')}) m = (${inH.join(', ')}) H`;
}

for (const variant of ['', ...sets]) {
  const changes = variant ? setHolds(variant) : null;
  console.log(`\n${variant || 'base'}:`);
  for (const species of ['rabbit', 'fox-red'] as const) {
    const model = buildPlayer(species, 'violin', 4, 'chair');
    const h = model.body.headHeight;
    const at = (bone: string): Vector3 =>
      new Vector3(...(model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));
    const shoulder = at('upperArmL');
    const neck = at('neck');
    const { positions, bones } = model.mesh;
    const trunk = new Set(['chest', 'neck', 'shoulderL', 'spine'].map((b) => boneIndex(b)));
    const head = new Set([boneIndex('head'), boneIndex('jaw')]);
    const column = shoulder.x / 2;
    let collar: Vector3 | null = null;
    let jaw: Vector3 | null = null;
    for (let c = 0; c < bones.length; c++) {
      const p = new Vector3(positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]);
      const bone = bones[c] ?? -1;
      if (trunk.has(bone) && Math.abs(p.x - column) < 0.015 && p.z < shoulder.z) {
        if (!collar || p.y > collar.y) {
          collar = p;
        }
      }
      if (head.has(bone) && p.x < -0.005 && p.z < neck.z && (!jaw || p.y < jaw.y)) {
        jaw = p;
      }
    }

    const rig = bowedRig(model, 'violin', holdOf(species, 'violin'));
    const board = model.instrument.targets.find((t) => t.kind === 'fingerboard');
    const size = (board?.from[0] ?? VIOLIN.nut) / VIOLIN.nut;
    const { place } = createBowPlaces();
    const posedAt = (weight: number, point: Vec3): Vector3 => {
      instrumentAt(rig, playingFrames(rig), weight, place);
      return new Vector3(...placePoint(model.pieces, { bone: 'instrument', at: point }))
        .sub(new Vector3(...rig.pivot))
        .applyQuaternion(place.rotation)
        .add(place.pivot);
    };
    const tail = posedAt(1, [0, 0, 0]);
    const strings = posedAt(1, [0, VIOLIN.stringHeight * size, 0]);
    const scroll = posedAt(1, [VIOLIN.length * size, VIOLIN.stringHeight * size, 0]);
    const axis = scroll.clone().sub(tail).normalize();
    const left = (Math.atan2(-axis.x, -axis.z) * 180) / Math.PI;
    const rise = (Math.asin(axis.y) * 180) / Math.PI;
    const restTail = posedAt(0, [0, 0, 0]);
    const restScroll = posedAt(0, [VIOLIN.length * size, VIOLIN.stringHeight * size, 0]);
    const knee = new Vector3(...lapPoint(model, 'L', { along: 1, offset: [0, 0, 0] }));
    const grip = new Vector3(...rig.restBow.grip);
    const tip = new Vector3(0, 0, 1)
      .applyQuaternion(new Quaternion(...rig.restBow.rotation))
      .multiplyScalar(1);

    console.log(`${species}: H ${h.toFixed(3)} m, seat ${(model.seat?.seatHeight ?? 0).toFixed(3)} m, violin ${(VIOLIN.length * size).toFixed(3)} m`);
    console.log(`  left shoulder joint ${text(shoulder, h)}, neck joint ${text(neck, h)}`);
    console.log(`  collarbone ${collar ? text(collar, h) : 'none'}`);
    console.log(`  jaw ${jaw ? text(jaw, h) : 'none'}, nose ${text(new Vector3(...model.body.mouth), h)} (mouth)`);
    console.log(`  play: tail end ${text(tail, h)}, strings at the tail ${text(strings, h)}`);
    console.log(`        scroll ${text(scroll, h)}, ${left.toFixed(1)}° left of the front, scroll ${rise.toFixed(1)}° up`);
    if (collar) {
      console.log(`        tail end from the collarbone ${text(tail.clone().sub(collar), h)}`);
    }
    if (jaw) {
      console.log(`        strings at the tail from the jaw ${text(strings.clone().sub(jaw), h)}`);
    }
    console.log(`  rest: tail end ${text(restTail, h)}, scroll ${text(restScroll, h)}`);
    console.log(`        left knee top ${text(knee, h)}, bow grip ${text(grip, h)}, bow bone z axis ${text(tip, 1)}`);
  }
  changes?.undo();
}

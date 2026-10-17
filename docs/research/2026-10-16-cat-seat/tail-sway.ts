/**
 * Measures the curled seated tail of the cat in the app over the idle sway (`pose-at.ts`, the
 * tail sways 8 and 12 degrees around the vertical with a period of 5.5 s): the depth of the tail
 * corners into the seat top, into the closed body with no tail, and into the back posts of the
 * chair, the reach outside the seat seen from above, and the move of the tail tip. The sets are
 * the rest before the first play over one sway period (wall 10 s to 15.5 s at each 0.1 s), the
 * play of the sweep, the lift, and the lowering.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-16-cat-seat/tail-sway.ts [<demo>...]
 */
import { Vector3 } from 'three';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { CHAIR, chairBack } from '../../../src/models/props.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { closedDepth, closedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { scoreOf } from '../../../src/score/test-score.ts';

const BODY: readonly BoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'shoulderL',
  'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
];
const TAIL = new Set([boneIndex('tail1'), boneIndex('tail2')]);
const role = SWEEP_ROLES.violist;
const wanted = process.argv.slice(2);
const cm = (v: number): string => (v * 100).toFixed(1);

for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  if ((wanted.length > 0 && !wanted.includes(id)) || !role.hasRole(scoreOf(demo.bytes))) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  for (const player of role.players(scene)) {
    const seat = player.model.seat;
    if (!seat) {
      continue;
    }
    const { mesh } = player.model;
    const corners: number[] = [];
    const studio = player.model.studio;
    const tailBones = new Set(['tail', 'tail_tip'].map((b) => (STUDIO_BONES as readonly string[]).indexOf(b)));
    const share = (c: number): number => {
      if (!studio || c >= studio.mesh.corners.length) {
        return 0;
      }
      const v = studio.mesh.corners[c] ?? 0;
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        if (tailBones.has(studio.mesh.joints[v * 4 + k] ?? -1)) {
          sum += studio.mesh.weights[v * 4 + k] ?? 0;
        }
      }
      return sum;
    };
    const min = Number(process.env['SHARE'] ?? 0);
    for (let c = 0; c < mesh.bones.length; c++) {
      if (TAIL.has(mesh.bones[c] ?? -1) && share(c) >= min) {
        corners.push(c);
      }
    }
    const back = CHAIR.seatDepth / 2;
    const front = back - (seat.seatDepth ?? CHAIR.seatDepth);
    const half = CHAIR.seatWidth / 2;
    const posts = chairBack(seat.seatHeight);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const rest: SweepSample[] = [];
    for (let wall = 10; wall <= 15.5; wall += 0.1) {
      rest.push([start, wall, NOT_STARTED]);
    }
    const sets = [{ name: 'rest sway', samples: rest }, ...role.sampleSets(scene).filter((s) => s.name !== 'rest')];
    let loops = 0;
    for (const { name, samples } of sets) {
      let seatDepth = 0;
      let bodyDepth = 0;
      let postDepth = 0;
      let outside = 0;
      let low = Infinity;
      const tips: Vector3[] = [];
      let count = 0;
      for (const sample of samples) {
        count++;
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const points = corners.map((c) => new Vector3(...posedCorner(posed, c)));
        for (const p of points) {
          const over = Math.max(Math.abs(p.x) - half, p.z - back, front - p.z);
          outside = Math.max(outside, over);
          if (over <= 0) {
            seatDepth = Math.max(seatDepth, seat.seatHeight - p.y);
          }
          low = Math.min(low, p.y);
          for (const box of posts.slice(0, 2)) {
            if (p.x > box.min[0] && p.x < box.max[0] && p.y > box.min[1] && p.y < box.max[1] && p.z > box.min[2] && p.z < box.max[2]) {
              postDepth = Math.max(postDepth, Math.min(p.x - box.min[0], box.max[0] - p.x, p.z - box.min[2], box.max[2] - p.z));
            }
          }
        }
        let surface = null;
        for (let k = loops || 1; k < 12 && !surface; k++) {
          try {
            surface = closedPart(posed, BODY, k);
            loops = k;
          } catch {
            surface = null;
          }
        }
        if (surface) {
          const deep = closedDepth(points, surface);
          bodyDepth = Math.max(bodyDepth, deep.depth);
          if (process.env['TRACE'] && name === 'rest sway') {
            const q = points[deep.index] ?? new Vector3();
            console.log(`  wall ${sample[1].toFixed(1)}: body ${cm(deep.depth)} cm at (${cm(q.x)}, ${cm(q.y)}, ${cm(q.z)}) corner ${corners[deep.index]}`);
          }
        }
        let far = points[0] ?? new Vector3();
        for (const p of points) {
          if (p.z > far.z) {
            far = p;
          }
        }
        tips.push(points.reduce((a, b) => (b.z < a.z ? b : a), far));
      }
      const xs = tips.map((t) => t.x);
      const zs = tips.map((t) => t.z);
      console.log(
        `${id} ${player.name} ${name} (${count} samples, ${loops} open loops): seat ${cm(seatDepth)} cm, body ${cm(bodyDepth)} cm, back posts ${cm(postDepth)} cm, outside the seat ${cm(outside)} cm, lowest ${cm(low - 0)} cm above the floor (seat ${cm(seat.seatHeight)} cm); the front of the tail moves ${cm(Math.max(...xs) - Math.min(...xs))} cm across and ${cm(Math.max(...zs) - Math.min(...zs))} cm along`,
      );
    }
  }
}

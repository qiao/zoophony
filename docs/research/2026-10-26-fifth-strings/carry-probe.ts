// Probe of item 4 of the round fifth-strings: the turn of the instrument against the turn of the
// carrying left paw in each lift and each lowering, at steps of 0.01 s.
//
// Usage: node scratch/carry-probe.ts [role...] [--json <file>]
//
// For each role, demo, and move, it prints:
// - opp: the largest angle between the angular velocity of the instrument and of the left paw
//   (studio bone hand_L), over the steps where both turn faster than 20°/s, and the count of such
//   steps above 90°.
// - rel path: the sum of the step turns of the instrument relative to the paw (the path length).
// - rel net: the turn of the instrument relative to the paw from the first to the last step.
// - inst / paw: the total turn path of the instrument and of the paw.
import { writeFileSync } from 'node:fs';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { demoMoves, MOVE_STEP } from '../../../tools/arm-check.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets, twistAngle } from '../../../src/models/studio-rig.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../src/pose/rest.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

const args = process.argv.slice(2);
const opt = (name: string): string | null => {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? null) : null;
};
const jsonFile = opt('--json');
const setText = opt('--set');
const demoOnly = opt('--demo');
const valued = new Set(['--json', '--set', '--demo']);
const roles = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1] ?? ''));
if (setText) {
  setHolds(setText);
}
const ROLES = roles.length > 0 ? roles : ['violinist', 'fox-violinist', 'violist'];
const FAST = 20; // deg/s

const studioCount = STUDIO_BONES.length;
const INSTRUMENT = studioCount + boneIndex('instrument');
const HAND_L = STUDIO_BONES.indexOf('hand_L');
const FORE_L = STUDIO_BONES.indexOf('forearm_L');
const PLAYER_HAND_L = studioCount + boneIndex('handL');

function turnOf(m: ArrayLike<number>, bone: number): Quaternion {
  const mat = new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[bone * 16 + k] ?? 0));
  return new Quaternion().setFromRotationMatrix(mat);
}

/** World angular velocity from a to b over dt, in deg/s, as a vector. */
function omega(a: Quaternion, b: Quaternion, dt: number): Vector3 {
  const d = b.clone().multiply(a.clone().invert());
  if (d.w < 0) {
    d.set(-d.x, -d.y, -d.z, -d.w);
  }
  const angle = 2 * Math.acos(Math.min(1, d.w));
  const s = Math.sqrt(Math.max(0, 1 - d.w * d.w));
  if (s < 1e-9) {
    return new Vector3();
  }
  return new Vector3(d.x / s, d.y / s, d.z / s).multiplyScalar((angle * 180) / Math.PI / dt);
}

function angleDeg(a: Quaternion, b: Quaternion): number {
  return (2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180) / Math.PI;
}

interface MoveRow {
  role: string;
  demo: string;
  kind: string;
  at: number;
  oppMax: number;
  oppCount: number;
  bothFast: number;
  relPath: number;
  relNet: number;
  instPath: number;
  pawPath: number;
  twistFrom: number;
  twistTo: number;
  twistMax: number;
  twistTravel: number;
  handRelPath: number;
}

const demos = await probeDemos();
const rows: MoveRow[] = [];
for (const role of ROLES) {
  const source = FOLD_ROLES.get(role);
  if (!source) {
    throw new Error(`unknown role ${role}`);
  }
  for (const demo of demos) {
    if (demoOnly && demo.file !== `${demoOnly}.mid`) {
      continue;
    }
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(source, scene);
    if (bodies.length === 0) {
      continue;
    }
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const studio = createStudioPose();
    const [body] = bodies;
    if (!body || body.index === null || !body.model.studio) {
      continue;
    }
    const rig = body.model.studio;
    for (const move of demoMoves(scene.score.durationSec)) {
      const lead = countInAt(scene.plan.beats, move.at).lengthSec;
      const transport: Transport =
        move.kind === 'lift'
          ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
          : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
      const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
      const from = move.kind === 'lift' ? 0 : transport.holdSec;
      const count = Math.round((span - from) / MOVE_STEP) + 1;
      let prevI: Quaternion | null = null;
      let prevP: Quaternion | null = null;
      let firstRel: Quaternion | null = null;
      let lastRel: Quaternion | null = null;
      const row: MoveRow = {
        role,
        demo: demo.file,
        kind: move.kind,
        at: move.at,
        oppMax: 0,
        oppCount: 0,
        bothFast: 0,
        relPath: 0,
        relNet: 0,
        instPath: 0,
        pawPath: 0,
        twistFrom: 0,
        twistTo: 0,
        twistMax: 0,
        twistTravel: 0,
        handRelPath: 0,
      };
      let lastHandRel: Quaternion | null = null;
      const foreBind = new Vector3(...rig.arms.L.fore).normalize();
      let lastTwist: number | null = null;
      for (let k = 0; k < count; k++) {
        const wall = from + k * MOVE_STEP;
        const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
        const frame = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer);
        const pose = frame.players[body.index];
        if (!pose) {
          continue;
        }
        poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
        const qi = turnOf(studio.matrices, INSTRUMENT);
        const qp = turnOf(studio.matrices, HAND_L);
        const rel = qp.clone().invert().multiply(qi);
        const handRel = turnOf(studio.matrices, PLAYER_HAND_L).invert().multiply(qi);
        if (lastHandRel) {
          row.handRelPath += angleDeg(lastHandRel, handRel);
        }
        lastHandRel = handRel;
        const twist = (twistAngle(turnOf(studio.matrices, FORE_L).invert().multiply(qp), foreBind) * 180) / Math.PI;
        if (lastTwist === null) {
          row.twistFrom = twist;
        } else {
          let d = twist - lastTwist;
          d = ((d + 540) % 360) - 180;
          row.twistTravel += Math.abs(d);
        }
        row.twistTo = twist;
        row.twistMax = Math.max(row.twistMax, Math.abs(twist));
        lastTwist = twist;
        if (prevI && prevP && lastRel) {
          const wi = omega(prevI, qi, MOVE_STEP);
          const wp = omega(prevP, qp, MOVE_STEP);
          row.instPath += wi.length() * MOVE_STEP;
          row.pawPath += wp.length() * MOVE_STEP;
          row.relPath += angleDeg(lastRel, rel);
          if (wi.length() > FAST && wp.length() > FAST) {
            row.bothFast++;
            const a = (wi.angleTo(wp) * 180) / Math.PI;
            row.oppMax = Math.max(row.oppMax, a);
            if (a > 90) {
              row.oppCount++;
            }
          }
        }
        firstRel ??= rel.clone();
        prevI = qi;
        prevP = qp;
        lastRel = rel;
      }
      if (firstRel && lastRel) {
        row.relNet = angleDeg(firstRel, lastRel);
      }
      rows.push(row);
    }
  }
}

const f = (n: number): string => n.toFixed(0);
console.log(
  '| role | demo | move | at s | opp max ° | steps >90° / both fast | rel path ° | rel net ° | inst path ° | paw path ° | L twist from → to ° | twist travel ° | |twist| max ° |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(
    `| ${r.role} | ${r.demo} | ${r.kind} | ${r.at.toFixed(1)} | ${f(r.oppMax)} | ${r.oppCount} / ${r.bothFast} | ${f(r.relPath)} | ${f(r.relNet)} | ${f(r.instPath)} | ${f(r.pawPath)} | ${f(r.twistFrom)} → ${f(r.twistTo)} | ${f(r.twistTravel)} | ${f(r.twistMax)} |`,
  );
}
for (const role of ROLES) {
  const own = rows.filter((r) => r.role === role);
  const max = (key: keyof MoveRow): number => Math.max(...own.map((r) => Number(r[key])));
  console.log(
    `${role}: opp max ${f(max('oppMax'))}°, steps >90° ${own.reduce((s, r) => s + r.oppCount, 0)} of ${own.reduce((s, r) => s + r.bothFast, 0)}, rel path max ${f(max('relPath'))}°, rel net max ${f(max('relNet'))}°, inst path max ${f(max('instPath'))}°, paw path max ${f(max('pawPath'))}°, twist travel max ${f(max('twistTravel'))}°, hand rel path max ${f(max('handRelPath'))}°, |twist| max ${f(max('twistMax'))}°`,
  );
}
if (jsonFile) {
  writeFileSync(jsonFile, JSON.stringify(rows, null, 1));
}

// Random search of the flute rest of the tan fox, one side at a time.
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
import { FLUTIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { RoleSweep } from '../../../src/pose/test-sweep.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { SPECIES_WIND_HOLDS, fluteTurn, windHoldOf, windRig } from '../../../src/pose/winds.ts';
import { Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { WindHold } from '../../../src/pose/winds.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
import { foldedFaces, mainBone } from '../../../tools/fold-probe.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { posedPart, surfaceGap } from '../../../src/pose/test-clearance.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';

const base = SPECIES_WIND_HOLDS['fox-tan']!.flute!;
const fluteRole: RoleSweep = {
  ...FLUTIST_SWEEP,
  parts: [{ name: 'flute', bones: ['instrument'] }],
  obstacles: FLUTIST_SWEEP.obstacles.filter((o) => o.name === 'body'),
};

export let lastDetail: Record<string, string> = {};
export interface Params {
  keysAngle: number; down: number; lean: number; shift: Vec3; poleR: Vec3;
  along: number; off: Vec3; palm: Vec3; fingers: Vec3; poleL: Vec3; arc: Vec3;
}

export function holdOf(p: Params): WindHold {
  const k = (p.keysAngle * Math.PI) / 180;
  return {
    ...base,
    rest: fluteTurn(p.lean, p.down, [Math.cos(k), 0, Math.sin(k)]),
    restShift: p.shift,
    restPoleR: p.poleR,
    restPoleL: p.poleL,
    restFreeL: { lap: { along: p.along, offset: p.off }, palm: p.palm, fingers: p.fingers, arc: p.arc },
  };
}

export async function evaluate(p: Params, demo = 'beethoven-8', sets = ['rest']) {
  const demos = (process.env.DEMOS ?? demo).split(',');
  const all: Record<string, number>[] = [];
  const details: Record<string, string> = {};
  for (const d of demos) {
    all.push(await evaluateOne(p, d, sets));
    for (const [k, v] of Object.entries(lastDetail)) details[`${k}@${d}`] = v;
  }
  const out: Record<string, number> = {};
  for (const m of all) for (const [k, v] of Object.entries(m)) out[k] = k.startsWith('foot') || k === 'tilt' || k.startsWith('elbow') ? v : Math.max(out[k] ?? -Infinity, v);
  lastDetail = details;
  return out;
}

async function evaluateOne(p: Params, demo: string, sets: string[]) {
  SPECIES_WIND_HOLDS['fox-tan'] = { flute: holdOf(p) };
  const scene = await demoSceneOf(`${demo}.mid`);
  const [player] = FLUTIST_SWEEP.players(scene);
  if (!player) throw new Error('no flutist');
  const out: Record<string, number> = {};
  const detail: Record<string, string> = {};
  lastDetail = detail;
  for (const set of FLUTIST_SWEEP.sampleSets(scene).filter((s) => sets.includes(s.name))) {
    const samples = [...set.samples];
    let worst = 0;
    for (const pair of sweepDepths(FLUTIST_SWEEP, player, samples)) {
      if (pair.depth > worst) { worst = pair.depth; detail[set.name] = `${pair.part}>${pair.into} ${pair.bone} ${pair.along.toFixed(2)} ${(pair.depth * 100).toFixed(1)}`; }
    }
    out[`${set.name}Depth`] = worst * 100;
    let fl = 0;
    for (const pair of sweepDepths(fluteRole, player, samples)) fl = Math.max(fl, pair.depth);
    out[`${set.name}Flute`] = fl * 100;
    if (set.name === 'rest') {
      const pose = player.poseAt(samples[0]!);
      const posed = poseSkeleton(player.model, pose);
      const body = FLUTIST_SWEEP.obstacles[0]!.surface(posed);
      const gap = (bones: Parameters<typeof posedPart>[1]) => surfaceGap(posedPart(posed, bones).triangles, body, 0.3).gap * 100;
      out.fluteGap = gap(['instrument']);
      out.pawGap = gap(['handL', 'fingersL']);
      {
        const rig = windRig(player.model, 'flute', windHoldOf('fox-tan', 'flute'));
        const arm = rig.left.arm;
        const length = new Vector3(...arm.bind.elbow).distanceTo(new Vector3(...arm.bind.shoulder)) + new Vector3(...arm.bind.wrist).distanceTo(new Vector3(...arm.bind.elbow));
        const free = rig.freeL;
        if (free?.kind === 'lap') {
          const root = posed.frames[boneIndex('root')]!;
          const target = new Vector3(...free.wrist).applyQuaternion(root.rotation).add(root.position);
          out.reachL = target.distanceTo(posed.frames[boneIndex('upperArmL')]!.position) / length;
        }
      }
      const e = posed.frames[13]; void e;
      const at = (name: string) => posed.frames[BONE_NAMES.indexOf(name as never)]!.position;
      const foot = posedPiecePoint(posed, { bone: 'instrument', at: [0.52, 0, 0] });
      const knee = at('shinR');
      out.footX = (foot[0] - knee.x) * 100; out.footY = (foot[1] - knee.y) * 100; out.footZ = (foot[2] - knee.z) * 100;
      const top = posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] });
      out.tilt = (Math.acos(Math.max(-1, Math.min(1, (top[1] - foot[1]) / 0.52))) * 180) / Math.PI;
      out.elbowOut = (at('upperArmL').x - at('forearmL').x) * 100;
      out.elbowBack = (at('forearmL').z - at('upperArmL').z) * 100;
      const rig = player.model.studio!;
      const studio = poseStudioBones(rig, player.model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
      const faces = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
      let left = 0; let right = 0; let other = 0;
      for (const f of faces) {
        const b = mainBone(rig.mesh, f);
        if (b.endsWith('_L')) left++; else if (b.endsWith('_R')) right++; else other++;
      }
      Object.assign(out, { folds: faces.length, left, right, other });
    }
  }
  return out;
}

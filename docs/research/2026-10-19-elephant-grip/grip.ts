/**
 * Prints the grip measures of the elephant timpanist of one demo for each variant of --set: the
 * strikes within 5 mm, the paw turn on the forearm (at the strikes, between the strikes, and in
 * all samples), the mallet pitch and its turn in the top view (out from forward, positive out) at
 * the strike and between strikes, the forearm turn in the top view, and the angle of the V of the
 * two mallets between strikes.
 * Usage: DEMO=beethoven-9 node docs/research/2026-10-19-elephant-grip/grip.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { armKeys } from '../../../tools/raise-fit.ts';
import { meanTurn } from '../../../tools/fold-probe.ts';
import { pawAngles } from '../../../tools/hold-fit.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../src/models/studio-rig.ts';
import type { Quat } from '../../../src/models/tuples.ts';

const args = process.argv.slice(2);
const sets = [''];
for (let i = 0; i < args.length; i++) if (args[i] === '--set') sets.push(args[++i] ?? '');
const demo = (await patchedDemos()).find((d) => d.file.startsWith(process.env['DEMO'] ?? 'beethoven-9'));
if (!demo) throw new Error('no demo');
const deg = (r: number) => (r * 180) / Math.PI;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const f = (x: number, d = 0) => x.toFixed(d);

for (const text of sets) {
  const changes = text ? setHolds(text) : null;
  try {
    const scene = sceneOf(demo.bytes);
    const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
    const plan = scene.plan.players[index]!;
    const place = scene.layout.players[index]!;
    if (plan.note.family !== 'percussion') throw new Error('no percussion');
    const { species, instrument, kettles, support } = place.cast;
    const model = scene.models.get(species, instrument, kettles, support);
    const rig = model.studio!;
    const buffer = createScenePose(scene.plan);
    const audible = allAudible(scene.score);
    const countIn = countInAt(scene.plan.beats, 0).lengthSec;
    const rows: string[] = [];
    const restYaw: Record<string, number> = {};
    for (const side of ['L', 'R'] as const) {
      const axis = new Vector3(...rig.body.heads[`hand_${side}`]).sub(new Vector3(...rig.body.heads[`forearm_${side}`])).normalize();
      const track = side === 'L' ? plan.note.left : plan.note.right;
      if (!track) continue;
      const out = side === 'L' ? -1 : 1;
      const hitQ: Quat[] = [];
      const restQ: Quat[] = [];
      const allQ: Quat[] = [];
      const m = { err: [] as number[], pitchHit: [] as number[], yawHit: [] as number[], pitchRest: [] as number[], yawRest: [] as number[], foreYaw: [] as number[], foreMallet: [] as number[] };
      const sample = (song: number, hit: boolean) => {
        const pose = poseAt(scene.plan, song, 10 + song + countIn, PLAYING, audible, buffer).players[index];
        if (!pose) return;
        const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
        const keys = armKeys(studio.matrices, side);
        (hit ? hitQ : restQ).push(keys.wrist);
        allQ.push(keys.wrist);
        const posed = poseSkeleton(model, pose);
        const e = posed.frames[boneIndex(`forearm${side}`)]!.position.clone();
        const w = posed.frames[boneIndex(`hand${side}`)]!.position.clone();
        const bone = side === 'L' ? 'malletL' : 'malletR';
        const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
        const head = new Vector3(...posedPiecePoint(posed, { bone, at: [0.3, 0, 0] }));
        const mal = head.clone().sub(grip).normalize();
        const fore = w.clone().sub(e).normalize();
        const pitch = deg(Math.asin(mal.y));
        const yaw = deg(Math.atan2(mal.x * out, -mal.z));
        if (hit) {
          const k = track.starts.indexOf(song - plan.timeOffset);
          m.err.push(head.distanceTo(new Vector3(track.points[3 * k], track.points[3 * k + 1], track.points[3 * k + 2])));
          m.pitchHit.push(pitch);
          m.yawHit.push(yaw);
          m.foreYaw.push(deg(Math.atan2(fore.x * out, -fore.z)));
          m.foreMallet.push(deg(fore.angleTo(mal)));
        } else {
          m.pitchRest.push(pitch);
          m.yawRest.push(yaw);
        }
      };
      for (const [i, start] of track.starts.entries()) {
        const song = start + plan.timeOffset;
        sample(song, true);
        const next = track.starts[i + 1];
        if (next !== undefined && next - start > 0.6) sample(song + (next - start) / 2, false);
      }
      const turn = (list: Quat[]) => {
        const a = pawAngles(meanTurn(list) ?? [0, 0, 0, 1], axis);
        return `${f(a.paw)}° (tw ${f(a.twist)}, sw ${f(a.swing)})`;
      };
      const near = m.err.filter((x) => x <= 0.005).length;
      restYaw[side] = mean(m.yawRest);
      rows.push(`${side}: strikes ${near}/${m.err.length}; paw strike ${turn(hitQ)}, rest ${turn(restQ)}, all ${turn(allQ)}; mallet strike ${f(mean(m.pitchHit))}° pitch, ${f(mean(m.yawHit))}° out; rest ${f(mean(m.pitchRest))}° pitch, ${f(mean(m.yawRest))}° out; forearm ${f(mean(m.foreYaw))}° out, forearm to mallet ${f(mean(m.foreMallet))}°`);
    }
    console.log(`== ${text || 'tree'}`);
    for (const row of rows) console.log(`  ${row}`);
    // In the top view, the V of the two mallets: the angle between them. Both point in: the sum of
    // the in angles.
    console.log(`  V between strikes: ${f(-(restYaw['L'] ?? 0) - (restYaw['R'] ?? 0))}° (each mallet in from forward: L ${f(-(restYaw['L'] ?? 0))}°, R ${f(-(restYaw['R'] ?? 0))}°)`);
  } finally {
    changes?.undo();
  }
}

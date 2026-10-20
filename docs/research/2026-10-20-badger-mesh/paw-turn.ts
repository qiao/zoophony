/**
 * Prints the turn of each studio paw on its forearm for the badger with one percussion instrument in one demo or tool score, as
 * `pnpm hold-fit` measures it: the mean wrist turn, with its twist and swing, at the strikes and
 * between the strikes, and the arm twist of the upper arm. Usage:
 * DEMO=beethoven-9 INSTRUMENT=bass-drum node docs/research/2026-10-20-badger-mesh/paw-turn.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { armKeys } from '../../../tools/raise-fit.ts';
import { meanTurn, turnAngle } from '../../../tools/fold-probe.ts';
import { pawAngles } from '../../../tools/hold-fit.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../src/models/studio-rig.ts';
import type { Quat } from '../../../src/models/tuples.ts';

const args = process.argv.slice(2);
const sets = [''];
for (let i = 0; i < args.length; i++) if (args[i] === '--set') sets.push(args[++i] ?? '');
const demo = (await probeDemos()).find((d) => d.file.startsWith(process.env['DEMO'] ?? 'beethoven-9'));
if (!demo) throw new Error('no demo');
for (const text of sets) {
  const changes = text ? setHolds(text) : null;
  try {
    const scene = sceneOf(demo.bytes);
    const index = scene.layout.players.findIndex((p) => p.cast.species === 'badger' && p.cast.instrument === (process.env['INSTRUMENT'] ?? 'bass-drum'));
    const plan = scene.plan.players[index]!;
    const place = scene.layout.players[index]!;
    if (plan.note.family !== 'percussion') throw new Error('no percussion');
    const { species, instrument, kettles, support } = place.cast;
    const model = scene.models.get(species, instrument, kettles, support);
    const rig = model.studio!;
    const buffer = createScenePose(scene.plan);
    const audible = allAudible(scene.score);
    const countIn = countInAt(scene.plan.beats, 0).lengthSec;
    const out: string[] = [];
    for (const side of ['L', 'R'] as const) {
      const axis = new Vector3(...rig.body.heads[`hand_${side}`]).sub(new Vector3(...rig.body.heads[`forearm_${side}`])).normalize();
      const track = side === 'L' ? plan.note.left : plan.note.right;
      if (!track) continue;
      const hit: Quat[] = [];
      const cock: Quat[] = [];
      const all: Quat[] = [];
      const upper: Quat[] = [];
      const take = (song: number, list: Quat[]) => {
        const pose = poseAt(scene.plan, song, 10 + song + countIn, PLAYING, audible, buffer).players[index];
        if (!pose) return;
        const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
        const keys = armKeys(studio.matrices, side);
        list.push(keys.wrist);
        all.push(keys.wrist);
        upper.push(keys.upper);
      };
      for (const [i, start] of track.starts.entries()) {
        const song = start + plan.timeOffset;
        take(song, hit);
        const next = track.starts[i + 1];
        if (next !== undefined && next - start > 0.6) take(song + (next - start) / 2, cock);
      }
      const fmt = (list: Quat[]) => {
        const a = pawAngles(meanTurn(list) ?? [0, 0, 0, 1], axis);
        return `${a.paw.toFixed(0)}° (${a.twist.toFixed(0)}°, ${a.swing.toFixed(0)}°)`;
      };
      out.push(`${side}: strike ${fmt(hit)}, cock ${fmt(cock)}, all ${fmt(all)}, upper ${turnAngle(meanTurn(upper) ?? [0, 0, 0, 1], [0, 0, 0, 1]).toFixed(0)}°`);
    }
    console.log(`${text || 'tree'}\n  ${out.join('\n  ')}`);
  } finally {
    changes?.undo();
  }
}

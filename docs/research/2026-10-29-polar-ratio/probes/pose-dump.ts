/**
 * Dumps the posed skin of the polar bear pianist: the rest pose before the first play, and the
 * play sample at the start of the middle note of the first demo with a piano. Each state gives the
 * joints (the bone frame positions) and the triangles with the bone of each triangle, in meters,
 * in the axes of the player. `ratio_table.py` reads the file.
 *
 * Usage, from the root of the tree: node <this file> <out.json>
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

let root = import.meta.dirname;
while (!existsSync(join(root, 'package.json'))) {
  root = dirname(root);
}
const load = (path: string) => import(pathToFileURL(join(root, path)).href);
const { BONE_NAMES, boneIndex } = await load('src/models/rig.ts');
const { countInAt } = await load('src/pose/count-in.ts');
const { createScenePose, poseAt } = await load('src/pose/pose-at.ts');
const { posedPart } = await load('src/pose/test-clearance.ts');
const { poseSkeleton } = await load('src/pose/test-kinematics.ts');
const { NOT_STARTED, PLAYING, allAudible, sceneOf } = await load('src/pose/test-scene.ts');
const { FOLD_ROLES, roleBodies } = await load('tools/fold-probe.ts');
const { probeDemos } = await load('tools/probe-demos.ts');

const out = process.argv[2] ?? 'pose-dump.json';
const role = FOLD_ROLES.get('pianist');
const dump = (posed: any) => {
  const joints: Record<string, number[]> = {};
  for (const name of BONE_NAMES) {
    const p = posed.frames[boneIndex(name)]?.position;
    if (p) joints[name] = [p.x, p.y, p.z];
  }
  const tris: number[][] = [];
  const bones: string[] = [];
  for (const name of BONE_NAMES) {
    const part = posedPart(posed, [name]);
    for (const t of part.triangles as any[]) {
      tris.push([t.a.x, t.a.y, t.a.z, t.b.x, t.b.y, t.b.z, t.c.x, t.c.y, t.c.z]);
      bones.push(name);
    }
  }
  return { joints, tris, bones, seat: posed.model.seat.seatHeight };
};
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  const [first] = roleBodies(role, scene);
  if (!first || first.index === null) continue;
  const { index, model } = first;
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const cast = scene.layout.players[index]?.cast;
  const notes = scene.score.notes.filter(
    (n: any) => n.seatIndex === cast?.seatIndex && n.player === cast.player,
  );
  const times = notes.map((n: any) => n.startSec + 0.02).toSorted((a: number, b: number) => a - b);
  const song = times[Math.floor(times.length / 2)] ?? 0;
  const rest = dump(
    poseSkeleton(model, poseAt(scene.plan, start, 10, NOT_STARTED, audible, buffer).players[index]),
  );
  const play = dump(
    poseSkeleton(
      model,
      poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[index],
    ),
  );
  writeFileSync(out, JSON.stringify({ demo: demo.file, song, rest, play }));
  console.log(`dumped ${demo.file} at ${song.toFixed(2)} s: ${play.tris.length} triangles`);
  break;
}

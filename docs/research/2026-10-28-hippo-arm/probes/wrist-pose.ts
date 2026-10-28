// Poses the hippo bassist at demo times, writes the posed mesh as OBJ files, and prints the fold
// angles of the faces at the right wrist (the faces with a corner on the wrist helper and a corner
// with no wrist helper and a hand weight).
// Usage: node docs/research/2026-10-28-hippo-arm/probes/wrist-pose.ts <out dir> <demo> <time>... [--side R|L] [--rest]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { foldAngle, roleBodies } from '../../../../tools/fold-probe.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../../src/models/studio-rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, demoSceneOf } from '../../../../src/pose/test-scene.ts';
import { galleryPlan } from '../../../../src/gallery/plan.ts';
import { parseTestNotes } from '../../../../src/gallery/notes.ts';

/** The test notes of the bassist in ROLE_VIEWS of tools/close-views.ts. */
const GALLERY_NOTES = ['0.5 2 G2', '3 0.25 E1', '3.25 0.25 G2', '3.5 0.25 E1'].join('\n');

const args = process.argv.slice(2);
const sideAt = args.indexOf('--side');
const side = sideAt >= 0 ? (args[sideAt + 1] ?? 'R') : 'R';
const rest = args.includes('--rest');
const words = args.filter((a, i) => !a.startsWith('--') && !(sideAt >= 0 && i === sideAt + 1));
const [out = 'scratch/wrist', demo = 'boulanger-matin.mid', ...times] = words;
mkdirSync(out, { recursive: true });

const gallery = demo === 'gallery';
const scene = await demoSceneOf(gallery ? 'boulanger-matin.mid' : demo);
const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
const rig = body?.model.studio;
if (!body || !rig || body.index === null) {
  throw new Error('no hippo');
}
const { mesh } = rig;
const bone = (name: string): number => STUDIO_BONES.indexOf(name as (typeof STUDIO_BONES)[number]);
const wrist = bone(`wrist_${side}`);
const hand = bone(`hand_${side}`);
const fingers = bone(`fingers_${side}`);
const weightOf = (v: number, b: number): number => {
  let w = 0;
  for (let k = 0; k < 4; k++) {
    if ((mesh.joints[v * 4 + k] ?? -1) === b) {
      w += mesh.weights[v * 4 + k] ?? 0;
    }
  }
  return w;
};
const band: number[] = [];
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  const onWrist = c.some((v) => weightOf(v, wrist) > 0);
  const onPaw = c.some(
    (v) => weightOf(v, wrist) === 0 && weightOf(v, hand) + weightOf(v, fingers) > 0.3,
  );
  if (onWrist && onPaw) {
    band.push(t);
  }
}
console.log(`band faces (${band.length}): ${band.join(',')}`);

const writeObj = (path: string, places: ArrayLike<number>): void => {
  const lines: string[] = [];
  for (let v = 0; v < places.length / 3; v++) {
    lines.push(`v ${places[v * 3]} ${places[v * 3 + 1]} ${places[v * 3 + 2]}`);
  }
  for (let t = 0; t < mesh.corners.length / 3; t++) {
    const c = [0, 1, 2].map((k) => (mesh.corners[t * 3 + k] ?? 0) + 1);
    lines.push(`f ${c.join(' ')}`);
  }
  writeFileSync(path, `${lines.join('\n')}\n`);
};
writeObj(join(out, 'bind.obj'), mesh.positions);
writeFileSync(join(out, 'band.json'), JSON.stringify(band));
for (const name of [`wrist_${side}`, `elbow_${side}`, `forearm_seg3_${side}`, `hand_${side}`]) {
  const b = bone(name);
  const faces: number[] = [];
  for (let t = 0; t < mesh.corners.length / 3; t++) {
    const mean = [0, 1, 2].reduce((acc, k) => acc + weightOf(mesh.corners[t * 3 + k] ?? 0, b), 0) / 3;
    if (mean > 0.3) {
      faces.push(t);
    }
  }
  writeFileSync(join(out, `mark-${name}.json`), JSON.stringify(faces));
}

const parsed = parseTestNotes(GALLERY_NOTES);
const galleryOwn =
  gallery && parsed.ok
    ? galleryPlan(
        [{ model: body.model, place: scene.layout.players[body.index] ?? (undefined as never) }],
        null,
        parsed.notes,
      )
    : null;
const plan = galleryOwn ?? scene.plan;
const playerIndex = galleryOwn ? 0 : body.index;
const audible = galleryOwn ? [] : allAudible(scene.score);
const buffer = createScenePose(plan);
const studio = createStudioPose();
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const samples: [string, number, number, typeof PLAYING][] = rest
  ? [['rest', start, 10, NOT_STARTED]]
  : [];
for (const time of times) {
  const song = Number(time);
  samples.push([`t${time}`, song, 10 + song - start, PLAYING]);
}
for (const [name, song, wall, transport] of samples) {
  const frame = poseAt(plan, song, wall, transport, audible, buffer);
  const pose = frame.players[playerIndex];
  if (!pose) {
    continue;
  }
  poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
  const posed = skinStudioMesh(mesh, studio);
  writeObj(join(out, `${name}.obj`), posed);
  const at = (name: string): number[] => {
    const b = bone(name);
    const h = (rig.body.heads as Record<string, number[]>)[name] ?? [0, 0, 0];
    const m = studio.matrices;
    return [0, 1, 2].map(
      (r) =>
        (m[b * 16 + r] ?? 0) * (h[0] ?? 0) +
        (m[b * 16 + 4 + r] ?? 0) * (h[1] ?? 0) +
        (m[b * 16 + 8 + r] ?? 0) * (h[2] ?? 0) +
        (m[b * 16 + 12 + r] ?? 0),
    );
  };
  const sh = at(`upper_arm_${side}`);
  const el = at(`forearm_${side}`);
  const wr = at(`hand_${side}`);
  const fi = at(`fingers_${side}`);
  const dirOf = (p: number[], q: number[]): number[] => {
    const d = [0, 1, 2].map((k) => (q[k] ?? 0) - (p[k] ?? 0));
    const l = Math.hypot(...d);
    return d.map((x) => x / l);
  };
  const ang = (u: number[], v: number[]): number =>
    (Math.acos(Math.min(1, u.reduce((s2, x, k) => s2 + x * (v[k] ?? 0), 0))) * 180) / Math.PI;
  console.log(
    `${name}: elbow bend ${ang(dirOf(sh, el), dirOf(el, wr)).toFixed(0)}°, paw bend ${ang(dirOf(el, wr), dirOf(wr, fi)).toFixed(0)}°, elbow ${el.map((x) => x.toFixed(3)).join(',')} wrist ${wr.map((x) => x.toFixed(3)).join(',')}`,
  );
  {
    const hb = bone(`hand_${side}`);
    const m = studio.matrices;
    const pb = (rig.body.palms as Record<string, number[]>)[side] ?? [0, 0, 0];
    const palm = [0, 1, 2].map(
      (r) =>
        (m[hb * 16 + r] ?? 0) * (pb[0] ?? 0) +
        (m[hb * 16 + 4 + r] ?? 0) * (pb[1] ?? 0) +
        (m[hb * 16 + 8 + r] ?? 0) * (pb[2] ?? 0),
    );
    const f = dirOf(el, wr);
    const p2 = dirOf(wr, fi);
    const along = p2.reduce((s2, x, k) => s2 + x * (f[k] ?? 0), 0);
    const off = p2.map((x, k) => x - along * (f[k] ?? 0));
    const flex = off.reduce((s2, x, k) => s2 + x * (palm[k] ?? 0), 0);
    const pl = Math.hypot(...palm);
    console.log(`${name}: paw off the forearm line toward the palm ${(flex / pl).toFixed(3)} of ${Math.hypot(...off).toFixed(3)}`);
  }
  const ids = new Set(band.flatMap((t) => [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0)));
  const mid = [0, 1, 2].map(
    (k) => [...ids].reduce((s, v) => s + (posed[v * 3 + k] ?? 0), 0) / ids.size,
  );
  console.log(`${name}: band middle ${mid.map((x) => x.toFixed(4)).join(',')}`);
  const angles = band.map((t) => [t, foldAngle(mesh, studio.matrices, posed, t)] as const);
  angles.sort((a, b) => b[1] - a[1]);
  const over = (limit: number): number => angles.filter(([, a]) => a > limit).length;
  console.log(
    `${name}: band max ${angles[0]?.[1].toFixed(0)}°, >45° ${over(45)}, >60° ${over(60)}, >75° ${over(75)}, >90° ${over(90)}; worst ${angles
      .slice(0, 8)
      .map(([t, a]) => `${t}:${a.toFixed(0)}`)
      .join(' ')}`,
  );
}

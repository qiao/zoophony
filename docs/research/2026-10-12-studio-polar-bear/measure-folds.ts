/**
 * Counts the folded faces of the skin of the studio bodies in the poses of the app (the report
 * `2026-10-12-studio-polar-bear.md`, section 5): the polar bear pianist in each demo with a piano,
 * and the bear conductor in each demo with a conductor. A face is folded when its posed normal is
 * more than 90° from its bind normal moved by the mean of the skin matrices of its corners (the
 * test of the studio). Run from the repository root:
 * `node docs/research/2026-10-12-studio-polar-bear/measure-folds.ts`.
 */
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import type { PlayerModel } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh } from '../../../src/models/studio-rig.ts';
import type { StudioRig } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { AnimalPose, Transport } from '../../../src/pose/types.ts';

/** The step of the song time of a full play, in seconds. */
const STEP = 0.25;

/** Writes the normal of a triangle of a flat array of places, with the length of twice its area. */
function normal(p: ArrayLike<number>, a: number, b: number, c: number): [number, number, number] {
  const u = [0, 1, 2].map((k) => (p[b * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const v = [0, 1, 2].map((k) => (p[c * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const [ux = 0, uy = 0, uz = 0] = u;
  const [vx = 0, vy = 0, vz = 0] = v;
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/** Moves a normal by the cofactor of a 3 × 3 linear part, column by column. */
function cofactor(m: readonly number[], n: readonly number[]): [number, number, number] {
  const [a = 0, d = 0, g = 0, b = 0, e = 0, h = 0, c = 0, f = 0, i = 0] = m;
  const [x = 0, y = 0, z = 0] = n;
  return [
    (e * i - f * h) * x - (d * i - f * g) * y + (d * h - e * g) * z,
    -(b * i - c * h) * x + (a * i - c * g) * y - (a * h - b * g) * z,
    (b * f - c * e) * x - (a * f - c * d) * y + (a * e - b * d) * z,
  ];
}

/** The worst sample of a body, and the folds of all samples by the main bone of the player. */
interface Folds {
  most: number;
  label: string;
  samples: number;
  withFold: number;
  byBone: Map<string, number>;
}

/**
 * Counts the folded faces of a studio body in one pose.
 *
 * @param model The player model.
 * @param rig The studio rig.
 * @param pose The pose of the player.
 * @param label The label of the sample.
 * @param folds The counts to update.
 */
function countFolds(model: PlayerModel, rig: StudioRig, pose: AnimalPose, label: string, folds: Folds): void {
  const studio = poseStudioBones(rig, model.skeleton, pose.rotations, pose.rootOffset, 1, createStudioPose());
  const posed = skinStudioMesh(rig.mesh, studio);
  const m = studio.matrices;
  let folded = 0;
  for (let t = 0; t < rig.mesh.corners.length / 3; t++) {
    const corners = [0, 1, 2].map((k) => rig.mesh.corners[t * 3 + k] ?? 0);
    const linear = new Array<number>(9).fill(0);
    for (const v of corners) {
      for (let k = 0; k < 4; k++) {
        const w = rig.mesh.weights[v * 4 + k] ?? 0;
        const j = (rig.mesh.joints[v * 4 + k] ?? 0) * 16;
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 3; row++) {
            linear[col * 3 + row] = (linear[col * 3 + row] ?? 0) + (w / 3) * (m[j + col * 4 + row] ?? 0);
          }
        }
      }
    }
    const [a = 0, b = 0, c = 0] = corners;
    const expected = cofactor(linear, normal(rig.mesh.positions, a, b, c));
    const now = normal(posed, a, b, c);
    if (now[0] * expected[0] + now[1] * expected[1] + now[2] * expected[2] < 0) {
      folded++;
      const bone = BONE_NAMES[model.mesh.bones[t * 3] ?? 0] ?? '';
      folds.byBone.set(bone, (folds.byBone.get(bone) ?? 0) + 1);
    }
  }
  folds.samples++;
  if (folded > 0) {
    folds.withFold++;
  }
  if (folded > folds.most) {
    folds.most = folded;
    folds.label = label;
  }
}

const pianist: Folds = { most: 0, label: '', samples: 0, withFold: 0, byBone: new Map() };
const conductor: Folds = { most: 0, label: '', samples: 0, withFold: 0, byBone: new Map() };
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const samples: [number, number, Transport, string][] = [[start, 10, NOT_STARTED, 'rest']];
  for (let song = start; song <= scene.score.durationSec; song += STEP) {
    samples.push([song, 10 + song - start, PLAYING, `play ${song.toFixed(2)} s`]);
  }
  const play: Transport = { ...PLAYING, changedAtWall: 10 };
  for (let wall = 10; wall < 13; wall += 0.1) {
    samples.push([Math.min(0, start + wall - 10), wall, play, `lift wall ${wall.toFixed(1)} s`]);
  }
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'piano');
  const place = scene.layout.players[index];
  const piano = place ? scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles) : null;
  const bear = scene.plan.conductor ? scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4) : null;
  for (const [song, wall, transport, label] of samples) {
    const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
    const pose = frame.players[index];
    if (piano?.studio && pose) {
      countFolds(piano, piano.studio, pose, `${demo.file} ${label}`, pianist);
    }
    if (bear?.studio && frame.conductor) {
      countFolds(bear, bear.studio, frame.conductor, `${demo.file} ${label}`, conductor);
    }
  }
  console.error(`done ${demo.file}`);
}
for (const [name, folds] of [['pianist', pianist], ['conductor', conductor]] as const) {
  const bones = [...folds.byBone].toSorted((a, b) => b[1] - a[1]).map(([bone, n]) => `${bone} ${n}`);
  console.log(
    `${name}: ${folds.samples} samples, at most ${folds.most} folded faces (${folds.label}), ` +
      `${((100 * folds.withFold) / Math.max(1, folds.samples)).toFixed(1)}% of the samples with a fold; ` +
      `by the main bone: ${bones.join(', ')}`,
  );
}

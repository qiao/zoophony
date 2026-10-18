/**
 * Measures the cello of the dog against its body in the rest pose and in a play sample: the depth
 * of the deepest corner of the cello in the closed body with the bone of the nearest body part,
 * the gap of each knee (the thigh and the shin) to the cello, the gap of the head and the ears to
 * the cello, and the posed points. Usage:
 *
 *     node docs/research/2026-10-17-dog-mesh/cello-contact.ts [<hold changes>]
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { closedPart, closeSurface, openLoops, posedPart, surfaceGap } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, allAudible, demoSceneOf } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { playSample } from '../../../src/pose/test-sweep-roles.ts';

const sets = process.argv[2];
if (sets) setHolds(sets);
const scene = await demoSceneOf('mozart-k525.mid');
const index = scene.layout.players.findIndex((p) => p.cast.species === 'dog' && p.cast.instrument === 'cello');
const place = scene.layout.players[index];
if (!place) throw new Error('no dog');
const model = scene.models.get('dog', 'cello', place.cast.kettles, place.cast.support);
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const BODY = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'] as const;
const samples = [
  ['rest', [-2, 10, NOT_STARTED]],
  ['play 5 s', playSample(scene, 5)],
] as const;
for (const [name, sample] of samples) {
  const pose = poseAt(scene.plan, sample[0], sample[1], sample[2], audible, buffer).players[index];
  if (!pose) throw new Error('no pose');
  const posed = poseSkeleton(model, pose);
  const body = closedPart(posed, BODY, 6);
  const cello = posedPart(posed, ['instrument']);
  const shells = (cello.closed?.() ?? [cello]).filter((s) => openLoops(s.triangles) === 0);
  const celloSurface = closeSurface(shells.flatMap((s) => s.triangles), 0);
  // The deepest corner of the cello in the body, and the main bone of the nearest body triangle.
  let deepest = 0;
  let where = new Vector3();
  for (const t of cello.triangles) {
    for (const p of [t.a, t.b, t.c]) {
      const d = -Math.min(0, -0) ; void d;
    }
  }
  const corners = cello.triangles.flatMap((t) => [t.a, t.b, t.c]);
  const { closedDepth } = await import('../../../src/pose/test-clearance.ts');
  const dp = closedDepth(corners, body);
  deepest = dp.depth;
  where = corners[dp.index] ?? new Vector3();
  console.log(`${name}: cello in the body ${(deepest * 100).toFixed(1)} cm at (${where.toArray().map((v) => v.toFixed(3)).join(', ')})`);
  for (const bones of [['thighL', 'shinL'], ['thighR', 'shinR'], ['head', 'jaw'], ['earL'], ['earR'], ['chest', 'spine']] as const) {
    const part = posedPart(posed, bones);
    const gap = surfaceGap(part.triangles, celloSurface, 0.3);
    console.log(`  ${bones.join('+')} to the cello: ${(gap.gap * 100).toFixed(1)} cm`);
  }
}
void BONE_NAMES;

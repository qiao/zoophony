// Probes the feet and the knees of the pianist: the lowest point of the posed skin (the soles)
// above the floor, and the smallest gap of the legs to the closed case of the piano.
// Usage: node scratch/feet.ts [demo]
import { Triangle, Vector3 } from 'three';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { surfaceGap } from '../../../src/pose/test-clearance.ts';
import { PIANIST_SWEEP, pianoCase, playSample } from '../../../src/pose/test-sweep-roles.ts';

const id = process.argv[2] ?? 'boulanger-matin';
const demo = (await patchedDemos()).find((d) => d.file === `${id}.mid`);
if (!demo) {
  throw new Error(id);
}
const scene = sceneOf(demo.bytes);
const player = PIANIST_SWEEP.players(scene)[0];
if (!player) {
  throw new Error('no pianist');
}
const { mesh } = player.model;
const legBones = new Set(['hips', 'shinL', 'shinR', 'footL', 'footR']);
const NOT_BODY = new Set(['instrument', 'root']);
const legFirsts: number[] = [];
for (let c = 0; c < mesh.bones.length; c += 3) {
  if (legBones.has(BONE_NAMES[mesh.bones[c] ?? 0] ?? '')) {
    legFirsts.push(c);
  }
}
const sets = PIANIST_SWEEP.sampleSets(scene);
const rest = sets.find((s) => s.name === 'rest');
const samples = [
  ...(rest ? [...rest.samples].slice(0, 1).map((s) => ['rest', s] as const) : []),
  ...[30, 108.63].map((song) => [`play ${song}`, playSample(scene, song)] as const),
];
for (const [name, sample] of samples) {
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  let low = Infinity;
  let lowBone = '';
  let kneeTop = -Infinity;
  for (let c = 0; c < mesh.bones.length; c++) {
    const p = posedCorner(posed, c);
    if (NOT_BODY.has(BONE_NAMES[mesh.bones[c] ?? 0] ?? '')) {
      continue;
    }
    if (p[1] < low) {
      low = p[1];
      lowBone = BONE_NAMES[mesh.bones[c] ?? 0] ?? '';
    }
    const bone = BONE_NAMES[mesh.bones[c] ?? 0] ?? '';
    if (bone === 'hips' || bone.startsWith('shin')) {
      kneeTop = Math.max(kneeTop, p[1]);
    }
  }
  const triangles = legFirsts.map(
    (c) =>
      new Triangle(
        new Vector3(...posedCorner(posed, c)),
        new Vector3(...posedCorner(posed, c + 1)),
        new Vector3(...posedCorner(posed, c + 2)),
      ),
  );
  const { gap } = surfaceGap(triangles, pianoCase(posed).surface);
  console.log(
    `${id} ${name}: lowest skin ${(low * 100).toFixed(2)} cm (${lowBone}), top of hips and shins ${(kneeTop * 100).toFixed(1)} cm, hips and legs to case ${(gap * 100).toFixed(1)} cm`,
  );
}

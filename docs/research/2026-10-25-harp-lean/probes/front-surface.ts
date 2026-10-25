// The front surface of the deer trunk near the right shoulder: node docs/research/2026-10-25-harp-lean/probes/front-surface.ts
// For x and y in the model axes, the z of the front surface (the first point inside the closed
// body from the front), in the rest pose and at one play sample.
import { Vector3 } from 'three';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { closedDepth, closedPart } from '../../../../src/pose/test-clearance.ts';
import { SWEEP_ROLES, playSample } from '../../../../src/pose/test-sweep-roles.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import type { BoneName } from '../../../../src/models/rig.ts';
import type { PosedSkeleton } from '../../../../src/pose/test-kinematics.ts';

const sets = process.env['SET'] ?? '';
if (sets) setHolds(sets);
const BODY: readonly BoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1',
  'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
];
const demo = (await probeDemos()).find((d) => d.file === 'boulanger-matin.mid')!;
const scene = sceneOf(demo.bytes);
const [player] = SWEEP_ROLES['harpist']!.players(scene);
const model = player!.model;
const rest = SWEEP_ROLES['harpist']!.sampleSets(scene).find((s) => s.name === 'rest')!;
const [restSample] = [...rest.samples];
const poses: [string, () => PosedSkeleton][] = [
  ['rest', () => poseSkeleton(model, player!.poseAt(restSample!))],
  ['play 30 s', () => poseSkeleton(model, player!.poseAt(playSample(scene, 30)))],
];
for (const [name, make] of poses) {
  const posed = make();
  const i = boneIndex('instrument');
  const frame = posed.frames[i]!;
  const pivot = new Vector3(...model.skeleton.positions[i]!);
  const toWorld = (p: Vector3): Vector3 => p.clone().sub(pivot).applyQuaternion(frame.rotation).add(frame.position);
  const body = closedPart(posed, BODY, 3);
  console.log(`${name}: z of the front surface (model axes), rows y, columns x`);
  const xs = [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21];
  console.log(`   y \\ x ${xs.map((x) => x.toFixed(2).padStart(7)).join('')}`);
  for (const y of [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5, 0.4, 0.3]) {
    const row = xs.map((x) => {
      for (let z = -0.45; z < 0.2; z += 0.002) {
        if (closedDepth([toWorld(new Vector3(x, y, z))], body).depth > 0) return z.toFixed(3).padStart(7);
      }
      return '      -';
    });
    console.log(`  ${y.toFixed(2)}   ${row.join('')}`);
  }
}

/**
 * Dumps the posed skin of the left arm, the chest, the head, and the viola of the first cat
 * violist of a demo at some song times, for `arm-render.py` (research of 2026-10-17, round
 * `cat-hand`). The points are in meters in the model axes of the player (it faces -z, its left is
 * -x), from the posed left wrist. `--set` takes the changes of `pnpm pose-depth --set`, such as
 * `viola@cat.highTilt=0deg` for the paw of `main`. For each time, it also writes the depth of the
 * left forearm in the viola, in meters, as the sweep measures it (`closedDepth()`), and the bend of
 * the wrist: the angle in degrees between the forearm (elbow to wrist) and the paw (wrist to the
 * finger joint).
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-cat-hand/arm-dump.ts <demo> <out.json> <time>... [--set <changes>]
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';

import { boneIndex } from '../../../src/models/rig.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { VIOLIST_SWEEP, playSample } from '../../../src/pose/test-sweep-roles.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const changes = args.flatMap((arg, i) => (args[i - 1] === '--set' ? [arg] : []));
const plain = args.filter((arg, i) => arg !== '--set' && args[i - 1] !== '--set');
const [demo, out, ...times] = plain;
if (!demo || !out) {
  throw new Error('Usage: arm-dump.ts <demo> <out.json> <time>... [--set <changes>]');
}
const restore = changes.length > 0 ? setHolds(changes.join(';')).undo : null;
const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
const [player] = VIOLIST_SWEEP.players(scene);
if (!player) {
  throw new Error('The demo has no cat violist.');
}
const ARM = ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const;
const BODY = ['chest', 'neck', 'head', 'jaw', 'shoulderL', 'spine'] as const;
const kinds = new Map<number, string>([
  ...ARM.map((b): [number, string] => [boneIndex(b), 'arm']),
  ...BODY.map((b): [number, string] => [boneIndex(b), 'body']),
  [boneIndex('instrument'), 'viola'],
]);
const result: Record<string, unknown> = {};
for (const time of times) {
  const posed = poseSkeleton(player.model, player.poseAt(playSample(scene, Number(time))));
  const { bones, colors } = posed.model.mesh;
  const origin = posed.frames[boneIndex('handL')]?.position.clone() ?? new Vector3();
  const tris: number[][] = [];
  for (let c = 0; c + 2 < bones.length; c += 3) {
    const kind = kinds.get(bones[c] ?? 0);
    if (!kind) {
      continue;
    }
    const corners = [0, 1, 2].map((k) =>
      new Vector3(...posedCorner(posed, c + k)).sub(origin).toArray(),
    );
    tris.push([
      ...corners.flat(),
      colors[c * 3] ?? 0,
      colors[c * 3 + 1] ?? 0,
      colors[c * 3 + 2] ?? 0,
      kind === 'arm' ? 1 : kind === 'viola' ? 2 : 0,
    ]);
  }
  const viola = VIOLIST_SWEEP.obstacles.find((o) => o.name === 'viola')?.surface(posed);
  const forearm: Vector3[] = [];
  for (let c = 0; c < bones.length; c++) {
    if (bones[c] === boneIndex('forearmL')) {
      forearm.push(new Vector3(...posedCorner(posed, c)));
    }
  }
  const depth = viola ? closedDepth(forearm, viola).depth : Number.NaN;
  const at = (bone: 'forearmL' | 'handL' | 'fingersL'): Vector3 =>
    posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3();
  const bend = at('handL')
    .sub(at('forearmL'))
    .angleTo(at('fingersL').sub(at('handL')));
  result[time] = { tris, depth, bend: (bend * 180) / Math.PI };
}
writeFileSync(out, JSON.stringify(result));
restore?.();

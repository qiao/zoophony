/** Prints the hanging arm of each side of the conductor (`hangingArm()`). */
import { armRig } from '../src/pose/ik.ts';
import { hangingArm } from '../src/pose/hang.ts';
import { FOLD_ROLES, roleBodies } from '../tools/fold-probe.ts';
import { patchedDemo } from '../tools/patch-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';

const scene = sceneOf((await patchedDemo('mozart-k191.mid')).bytes);
const [body] = roleBodies(FOLD_ROLES.get('conductor')!, scene);
for (const side of ['L', 'R'] as const) {
  console.log(side, JSON.stringify(hangingArm(body!.model, armRig(body!.model, side))));
}

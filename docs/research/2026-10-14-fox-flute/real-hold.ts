// The real hold of a flutist on the tan fox: the head turned left by `turn` around the vertical
// axis through the neck joint, the lip plate at the turned mouth, and the flute square to the face,
// sloped `down` degrees to the right. Prints the distance from each shoulder joint to its grip, the
// miss against the arm, and the flute scale (around the lip plate) that puts each grip at the arm.
import { MathUtils, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { WOODWINDS } from '../../../src/models/instruments/woodwinds.ts';

const D = MathUtils.DEG2RAD;
const model = buildPlayer('fox-tan', 'flute');
const at = (b: string) => new Vector3(...(model.skeleton.positions[boneIndex(b as never)] ?? [0, 0, 0]));
const palm = (s: 'L' | 'R') => new Vector3(...(s === 'L' ? model.body.palmL : model.body.palmR));
const arm = (s: 'L' | 'R') =>
  at(`upperArm${s}`).distanceTo(at(`forearm${s}`)) + at(`forearm${s}`).distanceTo(at(`hand${s}`)) + at(`hand${s}`).distanceTo(palm(s));
const neck = at('neck');
const mouth = new Vector3(...model.body.mouth);
console.log(`neck ${neck.toArray().map((v) => v.toFixed(3))}, mouth ${mouth.toArray().map((v) => v.toFixed(3))}, arm L ${arm('L').toFixed(3)} R ${arm('R').toFixed(3)}`);
const f = WOODWINDS.flute;
// The palm holds the tube 0.025 m below its axis (buildWoodwind()).
for (const turn of [0, 15, 20, 30, 40]) {
  for (const down of [0, 10]) {
    // Turn the mouth left (counterclockwise from above) around the neck: +y rotation moves -z to -x.
    const m = mouth.clone().sub(neck).applyAxisAngle(new Vector3(0, 1, 0), turn * D).add(neck);
    // Square to the face: the face direction is -z turned by `turn`, so the flute (+x) turns too.
    const along = new Vector3(Math.cos(down * D), -Math.sin(down * D), 0).applyAxisAngle(new Vector3(0, 1, 0), turn * D);
    const below = new Vector3(Math.sin(down * D), Math.cos(down * D), 0).multiplyScalar(-0.025);
    const parts = (['L', 'R'] as const).map((s) => {
      const joint = at(`upperArm${s}`);
      const grip = (scale: number) => m.clone().addScaledVector(along, (s === 'L' ? f.palmL : f.palmR) * scale).add(below);
      const d = joint.distanceTo(grip(1));
      // The largest scale up to 1 at which the grip is within the arm.
      let fit = 0;
      for (let k = 1; k <= 100; k++) {
        if (joint.distanceTo(grip(k / 100)) <= arm(s)) fit = k / 100;
      }
      return `${s} ${d.toFixed(3)} (miss ${(d - arm(s)).toFixed(3)}, fits up to scale ${fit.toFixed(2)})`;
    });
    console.log(`head turn ${turn}, slope ${down}: mouth ${m.toArray().map((v) => v.toFixed(3))} | ${parts.join(' | ')}`);
  }
}

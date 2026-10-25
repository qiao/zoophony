// Prints the play turn of the panda trombone for each (right, down) pair, and the slide angles.
// Usage: node scratch/panda-turn.ts <right>,<down> ...
import { MathUtils, Quaternion, Vector3 } from 'three';

const bindSlide = new Vector3(0, -Math.sin(15 * MathUtils.DEG2RAD), -Math.cos(15 * MathUtils.DEG2RAD));
for (const arg of process.argv.slice(2)) {
  const [right, down] = arg.split(',').map(Number);
  const q = new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), -(right ?? 0) * MathUtils.DEG2RAD)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -(down ?? 0) * MathUtils.DEG2RAD));
  const d = bindSlide.clone().applyQuaternion(q);
  const below = Math.asin(-d.y) * MathUtils.RAD2DEG;
  const side = Math.atan2(d.x, -d.z) * MathUtils.RAD2DEG;
  console.log(
    `${arg}: [${q.toArray().map((v) => v.toFixed(6)).join(',')}] slide ${below.toFixed(1)}° below the level, ${side.toFixed(1)}° to the right`,
  );
}

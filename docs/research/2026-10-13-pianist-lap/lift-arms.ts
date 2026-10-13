/**
 * Measures the upper arms of the pianist in the lift at the play start (the report
 * `2026-10-13-pianist-lap.md`, section 5): at each 0.05 s of wall time over the first 3 s, the
 * angle of the line from the shoulder joint to the elbow joint from the line from the neck joint to
 * the hips joint, in the back view, positive out. It prints the angle at rest, the largest angle of
 * each demo with a piano, and its time. Run from the repository root:
 * `node docs/research/2026-10-13-pianist-lap/lift-arms.ts [--set <changes>]...`, one row for
 * each `--set`.
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { posedAt } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, PLAYING, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';

const DEG = 180 / Math.PI;
const args = process.argv.slice(2);
const variants = [''];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    variants.push(args[i + 1] ?? '');
  }
}
const demos = (await patchedDemos()).filter((d) =>
  sceneOf(d.bytes).score.seats.some((seat) => seat.section === 'piano'),
);
for (const variant of variants) {
  const changes = setHolds(variant);
  try {
    const parts: string[] = [];
    for (const demo of demos) {
      const scene = sceneOf(demo.bytes);
      const piano = firstPlayers(scene, ['piano'] as const)[0];
      if (!piano) {
        continue;
      }
      const start = -countInAt(scene.plan.beats, 0).lengthSec;
      const angle = (song: number, wall: number, play: boolean): number => {
        const transport = play ? { ...PLAYING, changedAtWall: 10 } : NOT_STARTED;
        const posed = posedAt(scene, piano, song, wall, transport);
        const at = (b: BoneName): Vector3 =>
          posed.frames[boneIndex(b)]?.position ?? new Vector3();
        const down = at('hips').sub(at('neck'));
        let most = -Infinity;
        for (const [s, sign] of [
          ['L', -1],
          ['R', 1],
        ] as const) {
          const arm = at(`forearm${s}`).sub(at(`upperArm${s}`));
          const a = Math.atan2(sign * arm.x, -arm.y) - Math.atan2(sign * down.x, -down.y);
          most = Math.max(most, a * DEG);
        }
        return most;
      };
      let peak = { value: -Infinity, wall: 0 };
      for (let wall = 10; wall < 13; wall += 0.05) {
        const value = angle(Math.min(0, start + wall - 10), wall, true);
        if (value > peak.value) {
          peak = { value, wall: wall - 10 };
        }
      }
      parts.push(
        `${demo.file}: rest ${angle(start, 10, false).toFixed(1)} deg, lift peak ${peak.value.toFixed(1)} deg at ${peak.wall.toFixed(2)} s`,
      );
    }
    console.log(`${variant || 'base'}\n  ${parts.join('\n  ')}`);
  } finally {
    changes.undo();
  }
}

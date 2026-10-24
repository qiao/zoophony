/**
 * Prints the table of the elbow angles of the rabbit, the cat, and the red fox at each share 0.1
 * to 0.9 of the lift and of the lowering, as the gallery poses them (`moveTransport()`), with the
 * holds of `main` (as hold changes on the working tree) and of the working tree. A cell gives the
 * left and the right elbow, in degrees (180° is a straight arm).
 *
 * Usage: node docs/research/2026-10-24-violin-moves/elbow-table.ts
 */
import { Vector3 } from 'three';
import { moveTransport } from '../../../src/gallery/items.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

/** The holds of `main` 6cd51b6e as changes of the working tree. */
const MAIN: Partial<Record<SpeciesId, string>> = {
  rabbit:
    'violin@rabbit.liftPlace=null;violin@rabbit.liftTiltL=0;violin@rabbit.liftPoleL=null;violin@rabbit.liftReach=[-0.1,0.2,-0.2];violin@rabbit.restBow.via.reach=[0.05,0,-0.3]',
  cat: 'viola@cat.liftPlace=null;viola@cat.liftTiltL=0;viola@cat.liftTurn={"axis":[-0.8,1,-0.5],"top":[0.2,0,1]}',
};

const angle = (a: Vector3, b: Vector3): number =>
  (Math.acos(Math.max(-1, Math.min(1, a.dot(b) / a.length() / b.length()))) * 180) / Math.PI;

/**
 * Gives the elbows of one species at each share of both moves.
 *
 * @param want The species.
 * @param changes The hold changes, or `null` for the working tree.
 * @returns The cells by the move and the share.
 */
async function elbows(want: SpeciesId, changes: string | null): Promise<Map<string, string>> {
  const undo = changes ? setHolds(changes) : null;
  try {
    const role = want === 'cat' ? 'violist' : 'violinist';
    const scene = sceneOf(
      (await patchedDemo(want === 'cat' ? 'mozart-k525.mid' : 'beethoven-8.mid')).bytes,
    );
    const player = SWEEP_ROLES[role].players(scene).find((p) => {
      const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
      return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
    });
    if (!player) {
      throw new Error(`no ${want}`);
    }
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    const plan = scene.plan.players[index]!;
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const cells = new Map<string, string>();
    for (const kind of ['lift', 'lower'] as const) {
      for (let k = 1; k <= 9; k++) {
        const transport = moveTransport({ kind, share: k / 10 }, plan.motion, 10);
        const song = kind === 'lift' ? start : scene.score.durationSec;
        const sample: SweepSample = [song, 10, transport];
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const at = (b: BoneName): Vector3 => posed.frames[boneIndex(b)]!.position.clone();
        const elbow = (side: 'L' | 'R'): number =>
          angle(
            at(`upperArm${side}`).sub(at(`forearm${side}`)),
            at(`hand${side}`).sub(at(`forearm${side}`)),
          );
        cells.set(`${kind} ${k / 10}`, `${elbow('L').toFixed(0)} / ${elbow('R').toFixed(0)}`);
      }
    }
    return cells;
  } finally {
    undo?.undo();
  }
}

const columns: [string, Map<string, string>][] = [
  ['rabbit main', await elbows('rabbit', MAIN.rabbit ?? null)],
  ['rabbit branch', await elbows('rabbit', null)],
  ['cat main', await elbows('cat', MAIN.cat ?? null)],
  ['cat branch', await elbows('cat', null)],
  ['red fox', await elbows('fox-red', null)],
];
console.log(`| Move | Share | ${columns.map(([name]) => name).join(' | ')} |`);
console.log(`|---|---|${columns.map(() => '---').join('|')}|`);
for (const kind of ['lift', 'lower']) {
  for (let k = 1; k <= 9; k++) {
    const key = `${kind} ${k / 10}`;
    console.log(
      `| ${kind} | ${(k / 10).toFixed(1)} | ${columns.map(([, cells]) => cells.get(key) ?? '-').join(' | ')} |`,
    );
  }
}

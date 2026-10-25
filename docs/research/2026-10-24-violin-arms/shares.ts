/**
 * Measures the lift and the lowering of the violin roles at each share of the move, as the gallery
 * poses them (`moveTransport()` of `src/gallery/items.ts`): the angle of each elbow, the angle of
 * the left upper arm from the vertical, the place of the instrument and of the left paw in front
 * of the chest and above the root, and the depth of each pair of the sweep of the role
 * (`sweepDepths()`), and the depth of the bow in the instrument, the body, and the arms
 * (`bowSweep()` of `tools/bow-sweep.ts`), in cm.
 *
 * Usage: node docs/research/2026-10-24-violin-arms/shares.ts [rabbit|cat|fox-red ...] [--set <changes>]... [--no-depth]
 *   [--step <share>] [--kind lift|lower]
 */
import { Vector3 } from 'three';
import { moveTransport } from '../../../src/gallery/items.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import type { SweepSample } from '../../../src/pose/test-sweep.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { bowSweep } from '../../../tools/bow-sweep.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}
const depths = !args.includes('--no-depth');
const summary = args.includes('--summary');
const step = Number(pick('--step')[0] ?? 0.1);
const kinds = (pick('--kind')[0] ?? 'lift,lower').split(',') as ('lift' | 'lower')[];
const flags = new Set(['--set', '--step', '--kind', '--demo']);
const wanted = args.filter(
  (a, i) => !a.startsWith('--') && !flags.has(args[i - 1] ?? ''),
) as SpeciesId[];
const species = wanted.length > 0 ? wanted : (['rabbit', 'cat', 'fox-red'] as SpeciesId[]);

const demoArg = pick('--demo')[0];
const scenes: Record<string, TestScene> = {
  violinist: sceneOf((await patchedDemo(`${demoArg ?? 'beethoven-8'}.mid`)).bytes),
  violist: sceneOf((await patchedDemo(`${demoArg ?? 'mozart-k525'}.mid`)).bytes),
};
const angle = (a: Vector3, b: Vector3): number =>
  (Math.acos(Math.max(-1, Math.min(1, a.dot(b) / a.length() / b.length()))) * 180) / Math.PI;
const PAIRS = [
  'instrument body',
  'forearms violin',
  'forearms viola',
  'upper arms violin',
  'upper arms viola',
  'paws violin',
  'paws viola',
  'forearms body',
  'upper arms body',
];
const SHORT: Record<string, string> = {
  'instrument body': 'inst>body',
  'forearms violin': 'fore>inst',
  'forearms viola': 'fore>inst',
  'upper arms violin': 'upper>inst',
  'upper arms viola': 'upper>inst',
  'paws violin': 'paw>inst',
  'paws viola': 'paw>inst',
  'forearms body': 'fore>body',
  'upper arms body': 'upper>body',
};

for (const want of species) {
  const role = want === 'cat' ? 'violist' : 'violinist';
  const scene = scenes[role]!;
  const sweep = SWEEP_ROLES[role];
  const player = sweep.players(scene).find((p) => {
    const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
    return scene.layout.players[index]?.cast.species === want && !p.name.includes('soloist');
  });
  if (!player) {
    console.log(`no ${want}`);
    continue;
  }
  const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
  const plan = scene.plan.players[index]!;
  const model = player.model;
  const h = model.body.headHeight;
  const root = new Vector3(...model.skeleton.positions[boneIndex('root')]!);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  console.log(`\n== ${want} (${player.name}), H = ${h.toFixed(4)} m`);
  const head = [
    'move  share',
    'elbL',
    'elbR',
    'upL',
    'inst fwd',
    'inst up',
    'inst x',
    'pawL fwd',
    'pawL up',
    ...(depths ? ['inst>body', 'fore>inst', 'upper>inst', 'paw>inst', 'fore>body', 'upper>body', 'bow>inst', 'bow>body', 'bow>arms'] : []),
  ];
  if (!summary) {
    console.log(head.map((c) => c.padStart(10)).join(''));
  }
  const most = { elbL: 0, elbR: 0, minL: 180, upL: 0, pawFwd: 0, pawUp: 0, depth: new Map<string, number>() };
  for (const kind of kinds) {
    for (let share = 0; share <= 1 + 1e-9; share += step) {
      const transport = moveTransport({ kind, share }, plan.motion, 10);
      const song = kind === 'lift' ? start : scene.score.durationSec;
      const sample: SweepSample = [song, 10, transport];
      const posed = poseSkeleton(model, player.poseAt(sample));
      const at = (b: BoneName): Vector3 => posed.frames[boneIndex(b)]!.position.clone();
      const elbow = (side: 'L' | 'R'): number =>
        angle(at(`upperArm${side}`).sub(at(`forearm${side}`)), at(`hand${side}`).sub(at(`forearm${side}`)));
      const upper = angle(at('forearmL').sub(at('upperArmL')), new Vector3(0, -1, 0));
      const chest = at('chest');
      // Forward is -z in the model axes; the root of the test scene has no turn in the probe.
      const fwd = (v: Vector3): number => (chest.z - v.z) / h;
      const cells = [
        `${kind} ${share.toFixed(1)}`.padStart(10),
        elbow('L').toFixed(0).padStart(10),
        elbow('R').toFixed(0).padStart(10),
        upper.toFixed(0).padStart(10),
        fwd(at('instrument')).toFixed(2).padStart(10),
        at('instrument').sub(root).divideScalar(h).y.toFixed(2).padStart(10),
        at('instrument').sub(root).divideScalar(h).x.toFixed(2).padStart(10),
        fwd(at('handL')).toFixed(2).padStart(10),
        at('handL').sub(root).divideScalar(h).y.toFixed(2).padStart(10),
      ];
      const inner = share > 0.05 && share < 0.95;
      if (inner) {
        most.elbL = Math.max(most.elbL, elbow('L'));
        most.minL = Math.min(most.minL, elbow('L'));
        most.elbR = Math.max(most.elbR, elbow('R'));
        most.upL = Math.max(most.upL, upper);
        most.pawFwd = Math.max(most.pawFwd, fwd(at('handL')));
        most.pawUp = Math.max(most.pawUp, at('handL').sub(root).divideScalar(h).y);
      }
      if (depths) {
        const bow = bowSweep();
        const pairs = sweepDepths(sweep, player, [sample], bow.visit);
        const bowDepth = (names: string[]): number =>
          Math.max(0, ...bow.depths().filter((d) => names.includes(d.into)).map((d) => d.depth)) * 100;
        const value = (short: string): number => {
          const found = pairs.filter((p) => SHORT[`${p.part} ${p.into}`] === short);
          return Math.max(0, ...found.map((p) => p.depth)) * 100;
        };
        for (const short of ['inst>body', 'fore>inst', 'upper>inst', 'paw>inst', 'fore>body', 'upper>body']) {
          const deep = pairs
            .filter((p) => SHORT[`${p.part} ${p.into}`] === short)
            .sort((a, b) => b.depth - a.depth)[0];
          const tag = args.includes('--bones') && deep && deep.depth > 0.015 ? `${deep.bone ?? '?'}:` : '';
          cells.push(`${tag}${value(short).toFixed(1)}`.padStart(10));
          if (inner) {
            most.depth.set(short, Math.max(most.depth.get(short) ?? 0, value(short)));
          }
        }
        for (const [short, names] of [['bow>inst', ['violin', 'viola']], ['bow>body', ['body']], ['bow>arms', ['arms']]] as const) {
          const v = bowDepth([...names]);
          cells.push(v.toFixed(1).padStart(10));
          if (inner) {
            most.depth.set(short, Math.max(most.depth.get(short) ?? 0, v));
          }
        }
      }
      if (!summary) {
        console.log(cells.join(''));
      }
    }
  }
  console.log(
    `summary ${want}: elbL ${most.minL.toFixed(0)}..${most.elbL.toFixed(0)} elbR max ${most.elbR.toFixed(0)} upL max ${most.upL.toFixed(0)} pawL fwd ${most.pawFwd.toFixed(2)} up ${most.pawUp.toFixed(2)} | ${[...most.depth].map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' ')}`,
  );
}
void PAIRS;

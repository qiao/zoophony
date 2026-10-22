/**
 * Measures the seat of the polar bear pianist in the poses of the app: the hip, knee, and ankle
 * angles of the left leg from the side, the gap between the haunch and the bench top, the soles
 * on the floor, the center of mass over the bench, and the knees against the key bed of the
 * piano. The axes are the axes of the player: -z forward, +y up, in meters. The bench of the app
 * has its center over the origin of the player (`buildSupport()` of `src/models/props.ts`).
 *
 * - The hip angle is the angle between the trunk axis (the middle of the hip joints to the neck
 *   joint) and the thigh axis (the hip joint to the knee joint), from the side, as `hip_angle()`
 *   of `tools/blender/rig_mesh.py`. The knee angle is the angle between the thigh and the shin
 *   (the knee joint to the ankle joint). The ankle angle is the angle between the shin and the
 *   line from the ankle joint to the front of the sole, from the side.
 * - The haunch gap is the lowest corner of the trunk triangles (hips, spine, tail) over the bench
 *   top less the bench top: above 0 the haunch floats, below 0 it sinks into the bench.
 * - The soles: the lowest corner of the feet above the floor, and the share of the foot corners
 *   within 3 cm of the lowest corner that lie within 5 mm of it.
 * - The center of mass is the volume centroid of the body (signed tetrahedra), with no prop. The
 *   table gives its place behind the front edge of the bench (above 0: over the bench).
 * - The arms: the elbow joints above the key tops, and the slope of the forearm from the elbow
 *   joint up to the wrist joint (the rule of `docs/decisions/2026-10-14-polar-bench.md`: the
 *   forearm about level, the elbows about level with the keys).
 * - The knees: the highest corner of the thighs and the shins, its gap below the case bottom of
 *   the piano (0.62 m), and the most forward leg corner behind the front edge of the keys.
 * - The lap: the most forward leg corner in front of the most forward corner of the trunk (hips,
 *   spine, and spine1), from the side. Above 0, the knees stand out in front of the belly.
 * - The size: the highest body corner (the head top, with the ears), and the head height H of the
 *   studio module of the polar bear.
 *
 * The samples are the rest pose before the first play (wall 10 s), and the play of the first demo
 * with the role at steps of 0.5 s of song time while the bear plays a note: the median and the
 * most forward sample of the lean.
 *
 * Usage: node docs/research/2026-10-22-polar-legs/seat-probe.ts [--glb <file>]
 *
 * With `--glb`, the probe runs on the studio body that the export makes from the file, in a copy
 * of `src/` (`tools/glb-swap.ts`).
 */
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const glbAt = process.argv.indexOf('--glb');
const glb = glbAt > 0 ? process.argv[glbAt + 1] : undefined;
const here = join(import.meta.dirname, '..', '..', '..');
if (glb && !process.env.SEAT_ROOT) {
  const swap = await import(pathToFileURL(join(here, 'tools', 'glb-swap.ts')).href);
  process.exitCode = await swap.withGlbBody('polar-bear', resolve(glb), (dir: string) => {
    copyFileSync(import.meta.filename, join(dir, 'tools', 'seat-probe-copy.ts'));
    return swap.runTool(dir, 'seat-probe-copy.ts', [], { ...process.env, SEAT_ROOT: dir });
  });
} else {
  await main(process.env.SEAT_ROOT ?? here);
}

/**
 * Runs the probe on the tree at a root.
 *
 * @param root The root of the tree.
 */
async function main(root: string): Promise<void> {
  const load = (path: string) => import(pathToFileURL(join(root, path)).href);
  const { boneIndex, BONE_NAMES } = await load('src/models/rig.ts');
  const { countInAt } = await load('src/pose/count-in.ts');
  const { createScenePose, poseAt } = await load('src/pose/pose-at.ts');
  const { posedPart } = await load('src/pose/test-clearance.ts');
  const { poseSkeleton } = await load('src/pose/test-kinematics.ts');
  const { NOT_STARTED, PLAYING, allAudible, sceneOf } = await load('src/pose/test-scene.ts');
  const { FOLD_ROLES, roleBodies } = await load('tools/fold-probe.ts');
  const { probeDemos } = await load('tools/probe-demos.ts');
  const { PIANO, PIANO_BENCH } = await load('src/models/instruments/piano.ts');

  type V = { x: number; y: number; z: number };
  type Tri = { a: V; b: V; c: V };
  const PROPS = ['instrument', 'slide', 'bow', 'malletL', 'malletR', 'baton'];
  const deg = (r: number): number => (r * 180) / Math.PI;
  const side = (a: V, b: V): [number, number] => [b.z - a.z, b.y - a.y];
  const angle = (u: [number, number], v: [number, number]): number =>
    deg(Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)));

  const measure = (posed: { frames: { position: V }[]; model: { seat: { seatHeight: number } } }) => {
    const at = (b: string): V => posed.frames[boneIndex(b)]?.position as V;
    const hipL = at('thighL');
    const hipR = at('thighR');
    const mid = { x: 0, y: (hipL.y + hipR.y) / 2, z: (hipL.z + hipR.z) / 2 };
    const knee = at('shinL');
    const ankle = at('footL');
    const hip = angle(side(mid, at('neck')), side(hipL, knee));
    const kneeAngle = angle(side(knee, hipL), side(knee, ankle));
    const feet = posedPart(posed, ['footL', 'footR']).triangles as Tri[];
    const soleCorners = feet.flatMap((t) => [t.a, t.b, t.c]);
    const sole = Math.min(...soleCorners.map((p) => p.y));
    const lowFoot = soleCorners.filter((p) => p.y <= sole + 0.03);
    const flat = lowFoot.filter((p) => p.y <= sole + 0.005).length / lowFoot.length;
    const leftSole = (posedPart(posed, ['footL']).triangles as Tri[])
      .flatMap((t) => [t.a, t.b, t.c])
      .filter((p) => p.y <= sole + 0.02);
    const toe = leftSole.reduce((best, p) => (p.z < best.z ? p : best));
    const ankleAngle = angle(side(ankle, knee), side(ankle, toe));

    const top = posed.model.seat.seatHeight;
    const halfW = PIANO_BENCH.width / 2;
    const halfD = PIANO_BENCH.depth / 2;
    const trunk = posedPart(posed, ['hips', 'spine', 'tail1', 'tail2']).triangles as Tri[];
    let low = Infinity;
    for (const t of trunk) {
      for (const p of [t.a, t.b, t.c]) {
        if (Math.abs(p.x) <= halfW && Math.abs(p.z) <= halfD) {
          low = Math.min(low, p.y);
        }
      }
    }

    const body = posedPart(
      posed,
      BONE_NAMES.filter((b: string) => !PROPS.includes(b)),
    ).triangles as Tri[];
    let volume = 0;
    const sum = [0, 0, 0];
    for (const { a, b, c } of body) {
      const v =
        (a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x)) /
        6;
      volume += v;
      sum[0] += ((a.x + b.x + c.x) / 4) * v;
      sum[1] += ((a.y + b.y + c.y) / 4) * v;
      sum[2] += ((a.z + b.z + c.z) / 4) * v;
    }
    const headTop = Math.max(...body.flatMap((t) => [t.a.y, t.b.y, t.c.y]));
    const belly = (posedPart(posed, ['hips', 'spine', 'spine1']).triangles as Tri[]).flatMap(
      (t) => [t.a.z, t.b.z, t.c.z],
    );
    const com = sum.map((s) => s / volume) as [number, number, number];

    const legs = posedPart(posed, ['thighL', 'thighR', 'shinL', 'shinR']).triangles as Tri[];
    const legCorners = legs.flatMap((t) => [t.a, t.b, t.c]);
    const kneeTop = Math.max(...legCorners.map((p) => p.y));
    const legFront = Math.min(...legCorners.map((p) => p.z));
    const keys = at('instrument');
    return {
      hip,
      knee: kneeAngle,
      ankle: ankleAngle,
      gap: low - top,
      seat: top,
      sole,
      flat,
      comBehindFront: com[2] + halfD,
      comHeight: com[1],
      kneeTop,
      underCase: PIANO.caseBottom - kneeTop,
      legBehindKeys: legFront - keys.z,
      lap: Math.min(...belly) - legFront,
      headTop,
      shoulder: (at('upperArmL').y + at('upperArmR').y) / 2,
      elbow: (at('forearmL').y + at('forearmR').y) / 2 - PIANO.keyTop,
      forearm:
        (['L', 'R'] as const)
          .map((s) => {
            const e = at(`forearm${s}`);
            const w = at(`hand${s}`);
            return deg(Math.atan2(w.y - e.y, Math.hypot(w.x - e.x, w.z - e.z)));
          })
          .reduce((a, b) => a + b) / 2,
    };
  };

  const { STUDIO_POLAR_BEAR } = await load('src/models/studio/polar-bear.ts');
  const role = FOLD_ROLES.get('pianist');
  for (const demo of await probeDemos()) {
    const scene = sceneOf(demo.bytes);
    const [first] = roleBodies(role, scene);
    if (!first || first.index === null) {
      continue;
    }
    const { index, model } = first;
    const buffer = createScenePose(scene.plan);
    const audible = allAudible(scene.score);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const cast = scene.layout.players[index]?.cast;
    const notes = scene.score.notes.filter(
      (n: { seatIndex: number; player: number }) =>
        n.seatIndex === cast?.seatIndex && n.player === cast.player,
    );
    const playing = (song: number): boolean =>
      notes.some((n: { startSec: number; endSec: number }) => n.startSec <= song && song < n.endSec);
    const rows: [string, ReturnType<typeof measure>][] = [];
    const rest = poseAt(scene.plan, start, 10, NOT_STARTED, audible, buffer).players[index];
    rows.push(['rest', measure(poseSkeleton(model, rest))]);
    const play: ReturnType<typeof measure>[] = [];
    for (let song = 0; song <= scene.score.durationSec; song += 0.5) {
      if (playing(song)) {
        const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[
          index
        ];
        play.push(measure(poseSkeleton(model, pose)));
      }
    }
    const by = play.toSorted((a, b) => a.comBehindFront - b.comBehindFront);
    rows.push(['play, median', by[Math.round(0.5 * (by.length - 1))] as ReturnType<typeof measure>]);
    rows.push(['play, most forward', by[0] as ReturnType<typeof measure>]);
    const cm = (m: number): string => (m * 100).toFixed(1);
    console.log(
      `Demo ${demo.file}, player ${index}, ${play.length} note samples. Bench ${cm(PIANO_BENCH.width)} x ${cm(PIANO_BENCH.depth)} cm, top ${cm(rows[0]?.[1].seat ?? 0)} cm. H ${cm(STUDIO_POLAR_BEAR.headHeight)} cm, scale ${STUDIO_POLAR_BEAR.scale} m for each unit.`,
    );
    console.log(
      '| Sample | Hip ° | Knee ° | Ankle ° | Haunch gap cm | Lowest sole cm | Low foot corners within 5 mm | Center of mass behind the bench front cm | Center of mass height cm | Knee top cm | Knee top below the case cm | Legs behind the keys cm | Shoulder joints cm | Elbows above the key tops cm | Forearm slope up to the wrist ° | Knees in front of the belly cm | Head top cm |',
    );
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [name, m] of rows) {
      console.log(
        `| ${name} | ${m.hip.toFixed(0)} | ${m.knee.toFixed(0)} | ${m.ankle.toFixed(0)} | ${cm(m.gap)} | ${cm(m.sole)} | ${(m.flat * 100).toFixed(0)}% | ${cm(m.comBehindFront)} | ${cm(m.comHeight)} | ${cm(m.kneeTop)} | ${cm(m.underCase)} | ${cm(m.legBehindKeys)} | ${cm(m.shoulder)} | ${cm(m.elbow)} | ${m.forearm.toFixed(1)} | ${cm(m.lap)} | ${cm(m.headTop)} |`,
      );
    }
    break;
  }
}

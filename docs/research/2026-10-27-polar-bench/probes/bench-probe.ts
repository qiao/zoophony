/**
 * Measures the seat of the polar bear pianist in the poses of the app (round `sixth-polar-bench`):
 * the bench, the joints of the legs, the angles of the thigh, the shin, and the knee from the
 * side, the haunch on the bench, the soles, the head top, and the elbows against the keys. The
 * axes are the axes of the player: -z forward, +y up, in meters. The floor point of the player
 * is the origin.
 *
 * - The key top is the top of the white keys of the app: `PIANO.keyTop * PIANO_SCALE`.
 * - The thigh angle is the slope of the left thigh (the hip joint to the knee joint) below the
 *   level, from the side: above 0 the knee is lower than the hip. The shin angle is the slope of
 *   the left shin (the knee joint to the ankle joint) from the vertical, from the side: above 0
 *   the ankle is in front of the knee. The knee angle is the angle between the thigh and the shin
 *   from the side. The right leg presses the damper pedal in the play, so the left leg gives the
 *   angles.
 * - The haunch: the corners of the trunk (hips, spine, tail) and the thighs from the bench top up
 *   to 0.15 m above it. "Behind the bench back" is the last of these corners less the back edge of
 *   the bench: above 0, the haunch hangs over the back. "Haunch gap" is the lowest corner of the
 *   trunk over the bench, less the bench top: below 0, it goes into the bench.
 * - The soles: the lowest corner of the feet, and the share of the foot corners within 3 cm of it
 *   that lie within 5 mm of it.
 * - The arms: the elbow joints above the key top, and the slope of the forearm from the elbow joint
 *   up to the wrist joint. The reach is the distance from the shoulder joint to the wrist joint,
 *   over the length of the upper arm and the forearm.
 *
 * - The underside: with `PROFILE=1`, the lowest corner of the trunk and the thighs over the bench
 *   width, less the bench top, in bins of 4 cm along z, for each sample. A bin below 0 goes into
 *   the bench top when it lies over the bench.
 *
 * The samples: the rest pose before the first play (wall 10 s), and the play of the first demo
 * with the role at steps of 0.5 s while the bear plays a note. The table gives the rest, the
 * median of each value over the play, and the largest value over the play.
 *
 * Usage: node <this file> [--glb <file>] [--json <file>]
 *
 * With `--glb`, the probe runs on the studio body that the export makes from the file, in a copy
 * of `src/` (`tools/glb-swap.ts`).
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const glbAt = process.argv.indexOf('--glb');
const glb = glbAt > 0 ? process.argv[glbAt + 1] : undefined;
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt > 0 ? resolve(process.argv[jsonAt + 1] ?? '') : undefined;

/**
 * Finds the root of the tree: the first folder up from this file with `package.json`.
 *
 * @returns The root.
 */
function treeRoot(): string {
  let dir = import.meta.dirname;
  while (!existsSync(join(dir, 'package.json'))) {
    const up = dirname(dir);
    if (up === dir) {
      throw new Error('No package.json above the probe.');
    }
    dir = up;
  }
  return dir;
}

const here = treeRoot();
if (glb && !process.env.BENCH_ROOT) {
  const swap = await import(pathToFileURL(join(here, 'tools', 'glb-swap.ts')).href);
  process.exitCode = await swap.withGlbBody('polar-bear', resolve(glb), (dir: string) => {
    copyFileSync(import.meta.filename, join(dir, 'tools', 'bench-probe-copy.ts'));
    const args = jsonOut ? ['--json', jsonOut] : [];
    return swap.runTool(dir, 'bench-probe-copy.ts', args, { ...process.env, BENCH_ROOT: dir });
  });
} else {
  await main(process.env.BENCH_ROOT ?? here);
}

/**
 * Runs the probe on the tree at a root.
 *
 * @param root The root of the tree.
 */
async function main(root: string): Promise<void> {
  const load = (path: string) => import(pathToFileURL(join(root, path)).href);
  const { boneIndex } = await load('src/models/rig.ts');
  const { countInAt } = await load('src/pose/count-in.ts');
  const { createScenePose, poseAt } = await load('src/pose/pose-at.ts');
  const { posedPart } = await load('src/pose/test-clearance.ts');
  const { poseSkeleton } = await load('src/pose/test-kinematics.ts');
  const { NOT_STARTED, PLAYING, allAudible, sceneOf } = await load('src/pose/test-scene.ts');
  const { FOLD_ROLES, roleBodies } = await load('tools/fold-probe.ts');
  const { probeDemos } = await load('tools/probe-demos.ts');
  const { buildSupport } = await load('src/models/props.ts');
  const { PIANO, PIANO_SCALE } = await load('src/models/instruments/piano.ts');
  const { STUDIO_POLAR_BEAR } = await load('src/models/studio/polar-bear.ts');

  type V = { x: number; y: number; z: number };
  type Tri = { a: V; b: V; c: V };
  const keyTop = PIANO.keyTop * PIANO_SCALE;
  const deg = (r: number): number => (r * 180) / Math.PI;
  const corners = (bones: string[], posed: unknown): V[] =>
    (posedPart(posed, bones).triangles as Tri[]).flatMap((t) => [t.a, t.b, t.c]);

  const measure = (posed: {
    frames: { position: V }[];
    model: { seat: { seatHeight: number }; support: string };
  }) => {
    const at = (b: string): V => posed.frames[boneIndex(b)]?.position as V;
    const hipL = at('thighL');
    const hipR = at('thighR');
    const kneeL = at('shinL');
    const kneeR = at('shinR');
    const ankleL = at('footL');
    const thighAngle = deg(Math.atan2(hipL.y - kneeL.y, Math.abs(hipL.z - kneeL.z)));
    const shinAngle = deg(Math.atan2(kneeL.z - ankleL.z, kneeL.y - ankleL.y));
    const u = [hipL.z - kneeL.z, hipL.y - kneeL.y];
    const w = [ankleL.z - kneeL.z, ankleL.y - kneeL.y];
    const knee = deg(
      Math.acos((u[0]! * w[0]! + u[1]! * w[1]!) / Math.hypot(u[0]!, u[1]!) / Math.hypot(w[0]!, w[1]!)),
    );

    // The bench in the axes of the player, from its mesh.
    const bench = buildSupport(posed.model.support, posed.model.seat);
    let bz0 = Infinity;
    let bz1 = -Infinity;
    for (let i = 0; i < bench.positions.length; i += 3) {
      bz0 = Math.min(bz0, bench.positions[i + 2]);
      bz1 = Math.max(bz1, bench.positions[i + 2]);
    }
    const top = posed.model.seat.seatHeight;
    const trunk = corners(['hips', 'spine', 'tail1', 'tail2'], posed);
    const haunch = [...trunk, ...corners(['thighL', 'thighR'], posed)].filter(
      (p) => p.y >= top - 0.02 && p.y <= top + 0.15,
    );
    const rear = Math.max(...haunch.map((p) => p.z));
    let low = Infinity;
    for (const p of trunk) {
      if (p.z >= bz0 && p.z <= bz1) {
        low = Math.min(low, p.y);
      }
    }
    const feet = corners(['footL', 'footR'], posed);
    const sole = Math.min(...feet.map((p) => p.y));
    const lowFoot = feet.filter((p) => p.y <= sole + 0.03);
    const flat = lowFoot.filter((p) => p.y <= sole + 0.005).length / lowFoot.length;
    const body = corners(
      ['hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'earL', 'earR', 'jaw'],
      posed,
    );
    const headTop = Math.max(...body.map((p) => p.y));
    const legs = corners(['thighL', 'thighR', 'shinL', 'shinR'], posed);
    const kneeTop = Math.max(...legs.map((p) => p.y));
    const legFront = Math.min(...legs.map((p) => p.z));
    const belly = corners(['hips', 'spine', 'spine1'], posed).map((p) => p.z);
    const arms = (['L', 'R'] as const).map((s) => {
      const sh = at(`upperArm${s}`);
      const e = at(`forearm${s}`);
      const wr = at(`hand${s}`);
      const d = (a: V, b: V): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      return {
        elbow: e.y - keyTop,
        slope: deg(Math.atan2(wr.y - e.y, Math.hypot(wr.x - e.x, wr.z - e.z))),
        reach: d(sh, wr) / (d(sh, e) + d(e, wr)),
        shoulder: sh.y,
      };
    });
    const mean = (f: (a: (typeof arms)[number]) => number): number =>
      arms.reduce((s, a) => s + f(a), 0) / arms.length;
    // The underside of the body over the bench width, in bins of 2 cm along z.
    const under = [...trunk, ...corners(['thighL', 'thighR'], posed)];
    const profile: string[] = [];
    for (let z = -0.6; z < 0.3; z += 0.04) {
      const ys = under.filter((p) => p.z >= z && p.z < z + 0.04 && Math.abs(p.x) <= 0.375).map((p) => p.y);
      if (ys.length > 0) {
        profile.push(`${(z * 100).toFixed(0)}:${((Math.min(...ys) - top) * 100).toFixed(1)}`);
      }
    }
    if (process.env.PROFILE === '1') {
      console.log(`underside over the bench top, z cm:gap cm (bench ${(bz0 * 100).toFixed(1)} to ${(bz1 * 100).toFixed(1)}): ${profile.join(' ')}`);
    }
    return {
      benchTop: top,
      benchDepth: bz1 - bz0,
      hip: (hipL.y + hipR.y) / 2,
      knee: (kneeL.y + kneeR.y) / 2,
      kneeL: kneeL.y,
      ankle: ankleL.y,
      thighAngle,
      shinAngle,
      kneeAngle: knee,
      rearOver: rear - bz1,
      rearZ: rear,
      benchBack: bz1,
      benchFront: bz0,
      hipZ: (hipL.z + hipR.z) / 2,
      kneeZ: kneeL.z,
      legFront,
      keysZ: at('instrument').z,
      gap: low - top,
      sole,
      flat,
      headTop,
      kneeTop,
      lap: Math.min(...belly) - legFront,
      shoulder: mean((a) => a.shoulder),
      elbow: mean((a) => a.elbow),
      elbowL: arms[0]!.elbow,
      elbowR: arms[1]!.elbow,
      slope: mean((a) => a.slope),
      reach: Math.max(...arms.map((a) => a.reach)),
    };
  };

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
    const rest = measure(
      poseSkeleton(model, poseAt(scene.plan, start, 10, NOT_STARTED, audible, buffer).players[index]),
    );
    const play: ReturnType<typeof measure>[] = [];
    for (let song = 0; song <= scene.score.durationSec; song += 0.5) {
      if (playing(song)) {
        const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).players[
          index
        ];
        play.push(measure(poseSkeleton(model, pose)));
      }
    }
    const median = (k: keyof ReturnType<typeof measure>): number => {
      const v = play.map((m) => m[k]).toSorted((a, b) => a - b);
      return v[Math.round(0.5 * (v.length - 1))] ?? NaN;
    };
    const keys = Object.keys(rest) as (keyof ReturnType<typeof measure>)[];
    const playMedian = Object.fromEntries(keys.map((k) => [k, median(k)]));
    const playMax = Object.fromEntries(keys.map((k) => [k, Math.max(...play.map((m) => m[k]))]));
    const out = {
      demo: demo.file,
      samples: play.length,
      scale: STUDIO_POLAR_BEAR.scale,
      H: STUDIO_POLAR_BEAR.headHeight,
      keyTop,
      rest,
      playMedian,
      playMax,
    };
    const cm = (m: number): string => (m * 100).toFixed(1);
    console.log(
      `Demo ${demo.file}, ${play.length} note samples. Scale ${out.scale} m/u, H ${cm(out.H)} cm, key top ${cm(keyTop)} cm.`,
    );
    console.log(
      '| Sample | Bench top | Bench depth | Hip | Knee L | Ankle | Thigh ° down | Shin ° | Knee ° | Haunch behind bench back | Haunch gap | Sole | Flat | Head top | Knee top | Lap | Shoulder | Elbow − key L / R | Forearm ° | Reach share max |',
    );
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [name, m] of [
      ['rest', rest],
      ['play median', playMedian],
      ['play max', playMax],
    ] as const) {
      const r = m as ReturnType<typeof measure>;
      console.log(
        `| ${name} | ${cm(r.benchTop)} | ${cm(r.benchDepth)} | ${cm(r.hip)} | ${cm(r.kneeL)} | ${cm(r.ankle)} | ${r.thighAngle.toFixed(1)} | ${r.shinAngle.toFixed(1)} | ${r.kneeAngle.toFixed(0)} | ${cm(r.rearOver)} | ${cm(r.gap)} | ${cm(r.sole)} | ${(r.flat * 100).toFixed(0)}% | ${cm(r.headTop)} | ${cm(r.kneeTop)} | ${cm(r.lap)} | ${cm(r.shoulder)} | ${cm(r.elbowL)} / ${cm(r.elbowR)} | ${r.slope.toFixed(1)} | ${r.reach.toFixed(3)} |`,
      );
    }
    if (jsonOut) {
      writeFileSync(jsonOut, JSON.stringify(out, null, 2));
    }
    break;
  }
}

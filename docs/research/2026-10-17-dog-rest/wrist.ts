// Measures the wrists and the elbows of a bowed role on the studio skin, in the axes of the hips
// (the player faces -z, its right is +x): node docs/research/2026-10-17-dog-rest/wrist.ts <role> [<changes>|-] [<demo>...]
// role: cellist (dog), violinist (rabbit and red fox), violist (cat).
// The wrist bend is the angle of the paw axis (hand head to fingers head) from the paw axis that
// the forearm would carry with the wrist of the bind (no bend from the mesh). raw is the angle
// between the forearm axis (elbow to wrist) and the paw axis. The palm is the normal of the palm
// (StudioBody.palms) in the axes of the hips: (in, up, forward), in = toward the middle plane.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../src/models/studio-rig.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { bowStateAt, createBowState } from '../../../src/pose/strokes.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const [roleName = 'cellist', changes = '-', ...wanted] = process.argv.slice(2);
if (changes !== '-') {
  setHolds(changes);
}
const sweep = SWEEP_ROLES[roleName as keyof typeof SWEEP_ROLES];
if (!sweep) {
  throw new Error(`no role ${roleName}`);
}
const idx = (n: string): number => STUDIO_BONES.indexOf(n as never);
const deg = (r: number): number => (r * 180) / Math.PI;
const TRUNK = new Set(['hips', 'spine', 'spine1', 'chest'].map(idx));

interface Arm {
  bend: number;
  raw: number;
  palm: Vector3;
  elbow: number;
  rise: number;
  out: number;
  back: number;
  upperV: number;
}
interface Row {
  set: string;
  song: number;
  wall: number;
  bow: number;
  string: number;
  pizz: number;
  L: Arm;
  R: Arm;
}

const rows = new Map<string, Row[]>();
for (const demo of await patchedDemos()) {
  if (wanted.length > 0 && !wanted.some((w) => demo.file.startsWith(w))) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  if (!sweep.hasRole(scene.score)) {
    continue;
  }
  for (const player of sweep.players(scene)) {
    if (player.name.includes('stand')) {
      continue;
    }
    const rig = player.model.studio;
    if (!rig) {
      continue;
    }
    const index = Number(/ (\d+) \(/.exec(player.name)?.[1]);
    const plan = scene.plan.players[index];
    const species = scene.layout.players[index]?.cast.species ?? '?';
    const key = `${species}`;
    const list = rows.get(key) ?? [];
    rows.set(key, list);
    if (list.length > 0 && wanted.length === 0 && list.some((r) => r.set === 'rest')) {
      // One demo for each species is enough with no demo list; the rest repeats.
    }
    const heads = rig.body.heads as Record<string, readonly number[]>;
    const head = (n: string): Vector3 => new Vector3(...(heads[n] ?? [0, 0, 0]));
    const palmsBind = rig.body.palms;
    const pos = rig.mesh.positions;
    const joints = rig.mesh.joints;
    const weights = rig.mesh.weights;
    const count = pos.length / 3;
    const mainBone = new Int16Array(count);
    for (let v = 0; v < count; v++) {
      let best = 0;
      for (let k = 1; k < 4; k++) {
        if ((weights[v * 4 + k] ?? 0) > (weights[v * 4 + best] ?? 0)) {
          best = k;
        }
      }
      mainBone[v] = joints[v * 4 + best] ?? 0;
    }
    const studio = createStudioPose();
    const bow = createBowState();
    for (const set of sweep.sampleSets(scene)) {
      for (const sample of set.samples) {
        const [song, wall] = sample;
        const pose = player.poseAt(sample);
        const s = poseStudioBones(
          rig,
          player.model.skeleton,
          pose.rotations,
          studioOffsets(pose),
          1,
          studio,
        );
        const mat = (n: string): Matrix4 => new Matrix4().fromArray(s.matrices, idx(n) * 16);
        const hips = mat('hips');
        const toHips = hips.clone().invert();
        const local = (p: Vector3): Vector3 => p.clone().applyMatrix4(toHips);
        const rot = (m: Matrix4): Quaternion => new Quaternion().setFromRotationMatrix(m);
        const hipsInv = rot(hips).invert();
        // The trunk, each vertex moved by its main bone, in the hips axes.
        const trunk: Vector3[] = [];
        for (let v = 0; v < count; v++) {
          const b = mainBone[v] ?? 0;
          if (!TRUNK.has(b)) {
            continue;
          }
          const p = new Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
          trunk.push(local(p.applyMatrix4(new Matrix4().fromArray(s.matrices, b * 16))));
        }
        const arm = (side: 'L' | 'R'): Arm => {
          const sign = side === 'R' ? 1 : -1;
          const sh = local(head(`upper_arm_${side}`).applyMatrix4(mat(`upper_arm_${side}`)));
          const el = local(head(`forearm_${side}`).applyMatrix4(mat(`forearm_${side}`)));
          const wr = local(head(`hand_${side}`).applyMatrix4(mat(`hand_${side}`)));
          const fi = local(head(`fingers_${side}`).applyMatrix4(mat(`hand_${side}`)));
          const fore = wr.clone().sub(el).normalize();
          const paw = fi.clone().sub(wr).normalize();
          // The paw axis with the wrist of the bind, carried by the forearm twist bone.
          const twist = mat(`forearm_twist_${side}`);
          const pawBind = head(`fingers_${side}`).sub(head(`hand_${side}`)).normalize();
          const carried = pawBind.applyQuaternion(rot(twist)).applyQuaternion(hipsInv);
          const palm = new Vector3(...palmsBind[side])
            .applyQuaternion(rot(mat(`hand_${side}`)))
            .applyQuaternion(hipsInv);
          const upper = el.clone().sub(sh);
          const near = trunk.filter((p) => Math.abs(p.y - el.y) < 0.015);
          const sideX = near.length > 0 ? Math.max(...near.map((p) => sign * p.x)) : NaN;
          const backZ = near.length > 0 ? Math.max(...near.map((p) => p.z)) : NaN;
          return {
            bend: deg(paw.angleTo(carried)),
            raw: deg(fore.angleTo(paw)),
            palm: new Vector3(-sign * palm.x, palm.y, -palm.z),
            elbow: 180 - deg(upper.angleTo(fore.clone().multiplyScalar(1))),
            rise: upper.y,
            out: sign * el.x - sideX,
            back: el.z - backZ,
            upperV: deg(upper.angleTo(new Vector3(0, -1, 0))),
          };
        };
        let place = NaN;
        let string = NaN;
        let pizz = NaN;
        if (plan && plan.note.family === 'bowed') {
          bowStateAt(plan.note.strokes, plan.note.starts, song - plan.timeOffset, bow);
          place = bow.bow;
          string = bow.string;
          pizz = bow.pizzicato;
        }
        list.push({ set: set.name, song, wall, bow: place, string, pizz, L: arm('L'), R: arm('R') });
      }
    }
    // The bind values of the mesh.
    const bindRaw = (side: 'L' | 'R'): number => {
      const el = head(`forearm_${side}`);
      const wr = head(`hand_${side}`);
      const fi = head(`fingers_${side}`);
      return deg(wr.clone().sub(el).angleTo(fi.clone().sub(wr)));
    };
    console.log(
      `${demo.file} ${player.name} ${species}: bind raw wrist L ${bindRaw('L').toFixed(0)} R ${bindRaw('R').toFixed(0)} deg`,
    );
  }
}

const f = (n: number, d = 0): string => (Number.isFinite(n) ? n.toFixed(d) : '-');
const v3 = (v: Vector3): string => `(${f(v.x, 2)},${f(v.y, 2)},${f(v.z, 2)})`;
const pct = (xs: number[], q: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? NaN;
};
for (const [species, list] of rows) {
  console.log(`\n## ${roleName} ${species}: ${list.length} samples`);
  const play = list.filter((r) => r.set === 'play' && r.pizz < 0.5 && Number.isFinite(r.bow));
  const lo = Math.min(...play.map((r) => r.bow));
  const hi = Math.max(...play.map((r) => r.bow));
  const span = hi - lo;
  const bins: [string, Row[]][] = [
    ['rest', list.filter((r) => r.set === 'rest')],
    ['frog', play.filter((r) => r.bow <= lo + 0.15 * span)],
    ['middle', play.filter((r) => Math.abs(r.bow - (lo + hi) / 2) <= 0.1 * span)],
    ['tip', play.filter((r) => r.bow >= hi - 0.15 * span)],
    ['cross', play.filter((r) => Math.abs(r.string - Math.round(r.string)) > 0.2)],
    ['lowstr', play.filter((r) => r.string < 0.5)],
    ['pizz', list.filter((r) => r.set === 'play' && r.pizz > 0.5)],
    ['lift', list.filter((r) => r.set === 'lift')],
    ['lower', list.filter((r) => r.set === 'lower')],
  ];
  console.log(`bow place on the strings ${f(lo * 100, 1)} to ${f(hi * 100, 1)} cm from the frog end`);
  console.log(
    'moment  n    | R bend med/p95/max  raw med  palm(in,up,fwd) at max | L bend med/max  raw med | R elbow deg, rise cm, out cm, upper from vertical | L elbow out cm, rise cm',
  );
  for (const [name, rs] of bins) {
    if (rs.length === 0) {
      console.log(`${name.padEnd(7)} 0`);
      continue;
    }
    const rb = rs.map((r) => r.R.bend);
    const worst = rs.reduce((a, b) => (b.R.bend > a.R.bend ? b : a));
    const lb = rs.map((r) => r.L.bend);
    const med = (g: (r: Row) => number): number => pct(rs.map(g), 0.5);
    console.log(
      `${name.padEnd(7)} ${String(rs.length).padEnd(4)} | ${f(pct(rb, 0.5))}/${f(pct(rb, 0.95))}/${f(Math.max(...rb))}  ${f(med((r) => r.R.raw))}  ${v3(worst.R.palm)} | ${f(pct(lb, 0.5))}/${f(Math.max(...lb))}  ${f(med((r) => r.L.raw))} | ${f(med((r) => r.R.elbow))}, ${f(med((r) => r.R.rise * 100), 1)}, ${f(med((r) => r.R.out * 100), 1)}, ${f(med((r) => r.R.upperV))} | ${f(med((r) => r.L.out * 100), 1)}, ${f(med((r) => r.L.rise * 100), 1)}`,
    );
  }
  const rest = list.find((r) => r.set === 'rest');
  if (rest) {
    console.log(
      `rest detail: R bend ${f(rest.R.bend)} raw ${f(rest.R.raw)} palm ${v3(rest.R.palm)} elbow ${f(rest.R.elbow)} rise ${f(rest.R.rise * 100, 1)} out ${f(rest.R.out * 100, 1)} back ${f(rest.R.back * 100, 1)} upper ${f(rest.R.upperV)}; L bend ${f(rest.L.bend)} raw ${f(rest.L.raw)} palm ${v3(rest.L.palm)} elbow ${f(rest.L.elbow)} rise ${f(rest.L.rise * 100, 1)} out ${f(rest.L.out * 100, 1)} back ${f(rest.L.back * 100, 1)} upper ${f(rest.L.upperV)}`,
    );
  }
}

if (process.env['SUMMARY']) {
  for (const [species, list] of rows) {
    const rest = list.find((r) => r.set === 'rest');
    const lift = list.filter((r) => r.set === 'lift');
    const lower = list.filter((r) => r.set === 'lower');
    if (!rest) {
      continue;
    }
    console.log(
      `SUMMARY ${species} ${changes} | rest R raw ${f(rest.R.raw)} palm ${v3(rest.R.palm)} elbow ${f(rest.R.elbow)} rise ${f(rest.R.rise * 100, 1)} out ${f(rest.R.out * 100, 1)} back ${f(rest.R.back * 100, 1)} upperV ${f(rest.R.upperV)} | L out ${f(rest.L.out * 100, 1)} rise ${f(rest.L.rise * 100, 1)} elbow ${f(rest.L.elbow)} upperV ${f(rest.L.upperV)} raw ${f(rest.L.raw)} | lift R raw max ${f(Math.max(...lift.map((r) => r.R.raw)))} lower R raw max ${f(Math.max(...lower.map((r) => r.R.raw)))} L out max lift ${f(Math.max(...lift.map((r) => r.L.out)) * 100, 1)}`,
    );
  }
}

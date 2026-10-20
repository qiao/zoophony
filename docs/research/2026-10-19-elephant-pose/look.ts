/**
 * Prints the look measures of the elephant timpanist of beethoven-9 for each variant of --set:
 * the forearm and the upper arm angles, the elbow place, the mallet angle at the strike and
 * between strikes, the paw against the near rim, and the gap of the near rims to the belly.
 * Usage: node docs/research/2026-10-19-elephant-pose/look.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { TIMPANI, kettleHeadRadius } from '../../../src/models/instruments/percussion.ts';

const args = process.argv.slice(2);
const sets = [''];
for (let i = 0; i < args.length; i++) if (args[i] === '--set') sets.push(args[++i] ?? '');
const demo = (await patchedDemos()).find((d) => d.file.startsWith(process.env.DEMO ?? 'beethoven-9'));
if (!demo) throw new Error('no demo');
const deg = (r: number) => (r * 180) / Math.PI;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const f = (x: number, d = 1) => x.toFixed(d);

for (const text of sets) {
  const changes = text ? setHolds(text) : null;
  try {
    const scene = sceneOf(demo.bytes);
    const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');
    const plan = scene.plan.players[index]!;
    const place = scene.layout.players[index]!;
    if (plan.note.family !== 'percussion') throw new Error('no percussion');
    const { species, instrument, kettles, support } = place.cast;
    const model = scene.models.get(species, instrument, kettles, support);
    const h = model.body.headHeight;
    const heads = model.instrument.targets.filter((t) => t.kind === 'head').map((t, i) => {
      const c = placePoint(model.pieces, { bone: t.bone, at: t.from });
      return { c, r: kettleHeadRadius(i) };
    });
    // The gap of the near rim of each kettle to the front of the belly (z -0.29 m at y 0.6 to 0.8).
    const rims = heads.map(({ c, r }) => Math.hypot(c[0], c[2]) - r);
    const buffer = createScenePose(scene.plan);
    const audible = allAudible(scene.score);
    const countIn = countInAt(scene.plan.beats, 0).lengthSec;
    const rows: string[] = [];
    for (const side of ['L', 'R'] as const) {
      const track = side === 'L' ? plan.note.left : plan.note.right;
      if (!track) continue;
      const m = { fore: [] as number[], foreFwd: [] as number[], upper: [] as number[], elbowOut: [] as number[], elbowFwd: [] as number[], malletHit: [] as number[], malletRest: [] as number[], outRest: [] as number[], pawUp: [] as number[], pawIn: [] as number[], wristBend: [] as number[], err: [] as number[], bend: [] as number[] };
      const at = (posed: ReturnType<typeof poseSkeleton>, bone: Parameters<typeof boneIndex>[0]) => posed.frames[boneIndex(bone)]!.position.clone();
      const sample = (song: number, hit: boolean) => {
        const pose = poseAt(scene.plan, song, 10 + song + countIn, PLAYING, audible, buffer).players[index];
        if (!pose) return;
        const posed = poseSkeleton(model, pose);
        const s = at(posed, `upperArm${side}`);
        const e = at(posed, `forearm${side}`);
        const w = at(posed, `hand${side}`);
        const bone = side === 'L' ? 'malletL' : 'malletR';
        const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
        const head = new Vector3(...posedPiecePoint(posed, { bone, at: [0.3, 0, 0] }));
        const mal = head.clone().sub(grip).normalize();
        const malletPitch = deg(Math.asin(mal.y));
        const outward = side === 'L' ? -1 : 1;
        if (!hit) { m.malletRest.push(malletPitch); m.outRest.push(deg(Math.atan2(mal.x * outward, -mal.z))); return; }
        const k = track.starts.indexOf(song - plan.timeOffset);
        m.err.push(head.distanceTo(new Vector3(track.points[3 * k], track.points[3 * k + 1], track.points[3 * k + 2])));
        m.malletHit.push(malletPitch);
        const fore = w.clone().sub(e).normalize();
        const up = e.clone().sub(s).normalize();
        m.fore.push(-deg(Math.asin(fore.y)));
        m.foreFwd.push(-fore.z);
        m.upper.push(-deg(Math.asin(up.y)));
        m.bend.push(deg(up.angleTo(fore)));
        if (process.env.DUMP && m.bend.length === 1) console.log(side, 'shoulder', s.toArray().map((x) => x.toFixed(3)), 'elbow', e.toArray().map((x) => x.toFixed(3)), 'wrist', w.toArray().map((x) => x.toFixed(3)), 'grip', grip.toArray().map((x) => x.toFixed(3)), 'head', head.toArray().map((x) => x.toFixed(3)));
        const out = side === 'L' ? -1 : 1;
        m.elbowOut.push(((e.x - s.x) * out) / h);
        m.elbowFwd.push(-(e.z - s.z) / h);
        m.wristBend.push(deg(fore.angleTo(mal)));
        // The paw: the grip. Its height over the head plane, and its place against the near rim
        // of the nearest kettle (positive: over the head).
        m.pawUp.push(grip.y - TIMPANI.headHeight);
        let best = Infinity, inside = 0;
        for (const { c, r } of heads) {
          const d = Math.hypot(grip.x - c[0], grip.z - c[2]);
          if (d - r < best) { best = d - r; inside = r - d; }
        }
        m.pawIn.push(inside);
      };
      for (const [i, start] of track.starts.entries()) {
        const song = start + plan.timeOffset;
        sample(song, true);
        const next = track.starts[i + 1];
        if (next !== undefined && next - start > 0.6) sample(song + (next - start) / 2, false);
      }
      const near = m.err.filter((x) => x <= 0.005).length;
      rows.push(`${side}: strikes ${near}/${m.err.length} within 5 mm, worst ${f(Math.max(...m.err) * 100)} cm`);
      rows.push(`${side}: forearm ${f(mean(m.fore))}° below level (forward share ${f(mean(m.foreFwd), 2)}), upper arm ${f(mean(m.upper))}° below, elbow bend ${f(mean(m.bend))}°, elbow out ${f(mean(m.elbowOut), 2)} H and forward ${f(mean(m.elbowFwd), 2)} H, mallet ${f(mean(m.malletHit))}° at strike / ${f(mean(m.malletRest))}° between (${m.malletRest.length}, out ${f(mean(m.outRest))}°), forearm to mallet ${f(mean(m.wristBend))}°, grip ${f(mean(m.pawUp) * 100)} cm over the head plane, ${f(mean(m.pawIn) * 100)} cm inside the near rim`);
    }
    console.log(`== ${text || 'base'}`);
    console.log(`  H ${f(h, 3)} m, kettles ${heads.length}, head height ${TIMPANI.headHeight} m (${f(TIMPANI.headHeight / h, 2)} H), diameters ${heads.map(({ r }) => f((2 * r) / h, 2)).join('/')} H, near rims ${rims.map((x) => f(x, 3)).join('/')} m from the middle (belly front 0.29 m)`);
    for (const row of rows) console.log(`  ${row}`);
  } finally {
    changes?.undo();
  }
}

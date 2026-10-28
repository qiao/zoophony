/**
 * For samples of the violist, finds the deepest corners of a part in an obstacle, and prints the
 * nearest corner of the obstacle mesh with its main bone, and the place of the deepest corner in
 * the axes of the posed instrument bone (x across, y along the strings to the scroll, z out of the
 * top plate, in meters from the instrument joint).
 * Usage: node scratch/where-in.ts <part bones> <obstacle bones> <demo>@<time>[@<set>]... [--set <changes>]
 */
import { Matrix4, Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import { BONE_NAMES, boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
if (args.includes('--set')) setHolds(opt('--set', ''));
const partBones = new Set(args[0]!.split(',').map((b) => boneIndex(b as BoneName)));
const obstacle = args[1]!;
const targets = args.slice(2).filter((a) => a.includes('@')).map((a) => a.split('@'));
const role = SWEEP_ROLES['violist'];
const demos = await probeDemos();
for (const [demoName, time, setName = 'play'] of targets) {
  const demo = demos.find((d) => d.file.startsWith(demoName!))!;
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0]!;
  const set = role.sampleSets(scene).find((s) => s.name === setName)!;
  const t = Number(time);
  const sample = set.samples.find((s) => Math.abs((setName === 'play' ? s[0] : s[1]) - t) < 0.01)!;
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const surfaceOf = role.obstacles.find((o) => o.name === obstacle)!.surface;
  const surface = surfaceOf(posed);
  const mesh = player.model.mesh;
  const nc = mesh.bones.length;
  // The corners of the obstacle mesh, by its bones, to name the nearest bone.
  const obstacleBones = obstacle === 'body' ? ['hips', 'spine', 'chest', 'neck', 'head', 'jaw'] : ['instrument'];
  const obIdx = new Set(obstacleBones.filter((b) => (BONE_NAMES as readonly string[]).includes(b)).map((b) => boneIndex(b as BoneName)));
  const obCorners: [number, Vector3][] = [];
  for (let c = 0; c < nc; c++) if (obIdx.has(mesh.bones[c]!)) obCorners.push([c, new Vector3(...posedCorner(posed, c))]);
  const inst = posed.frames[boneIndex('instrument')]!;
  const toInst = new Matrix4().compose(inst.position, inst.rotation, new Vector3(1, 1, 1)).invert();
  const { closedDepth } = await import('../src/pose/test-clearance.ts');
  const rows: [number, number, Vector3][] = [];
  for (let c = 0; c < nc; c++) {
    if (!partBones.has(mesh.bones[c]!)) continue;
    const p = new Vector3(...posedCorner(posed, c));
    const d = closedDepth([p], surface).depth;
    if (d > 0.003) rows.push([d, c, p]);
  }
  rows.sort((a, b) => b[0] - a[0]);
  console.log(`${demoName} ${setName} ${time}: ${rows.length} corners deeper than 3 mm`);
  const seen = new Set<string>();
  for (const [d, c, p] of rows) {
    let best = Infinity;
    let bone = '';
    for (const [oc, q] of obCorners) {
      const e = q.distanceTo(p);
      if (e < best) { best = e; bone = BONE_NAMES[mesh.bones[oc]!]!; }
    }
    const local = p.clone().applyMatrix4(toInst);
    const key = `${bone} ${local.toArray().map((v) => (v * 100).toFixed(0)).join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  ${(d * 100).toFixed(2)} cm corner ${c} (${BONE_NAMES[mesh.bones[c]!]}) nearest ${bone} ${(best * 100).toFixed(1)} cm, in the instrument axes (cm) ${local.toArray().map((v) => (v * 100).toFixed(1)).join(', ')}`);
    if (seen.size >= 8) break;
  }
}

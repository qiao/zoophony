/** Prints the open loops of the body part of the violist cat (the triangles whose main bone is a
 * body bone of the sweep): the count of edges of each loop, its middle (app meters), and the bones
 * of the triangles beside it. */
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
const BODY: BoneName[] = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'] as BoneName[];
const role = SWEEP_ROLES.violist!;
const demos = await probeDemos();
const scene = sceneOf(demos.find((d) => role.hasRole(sceneOf(d.bytes).score))!.bytes);
const mesh = role.players(scene)[0]!.model.mesh;
const wanted = new Set(BODY.map(boneIndex));
const tris: number[] = [];
for (let v = 0; v < mesh.bones.length; v += 3) if (wanted.has(mesh.bones[v] ?? -1)) tris.push(v / 3);
const P = mesh.positions;
const key = (c: number): string => `${P[c * 3]} ${P[c * 3 + 1]} ${P[c * 3 + 2]}`;
const edges = new Map<string, { uses: number; a: number; b: number }>();
for (const t of tris) for (let k = 0; k < 3; k++) {
  const a = t * 3 + k; const b = t * 3 + ((k + 1) % 3);
  const ka = key(a); const kb = key(b);
  const kk = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  const e = edges.get(kk);
  if (e) e.uses++; else edges.set(kk, { uses: 1, a, b });
}
const open = [...edges.values()].filter((e) => e.uses === 1);
const parent = new Map<string, string>();
const root = (k: string): string => { while (parent.get(k) !== k) k = parent.get(k)!; return k; };
for (const e of open) { for (const c of [e.a, e.b]) if (!parent.has(key(c))) parent.set(key(c), key(c)); parent.set(root(key(e.b)), root(key(e.a))); }
const loops = new Map<string, typeof open>();
for (const e of open) { const r = root(key(e.a)); loops.set(r, [...(loops.get(r) ?? []), e]); }
for (const l of loops.values()) {
  let x = 0, y = 0, z = 0;
  for (const e of l) { x += P[e.a * 3]!; y += P[e.a * 3 + 1]!; z += P[e.a * 3 + 2]!; }
  console.log(`loop of ${l.length} edges at (${(x / l.length).toFixed(3)}, ${(y / l.length).toFixed(3)}, ${(z / l.length).toFixed(3)})`);
}
for (const l of loops.values()) {
  if (l.length !== 2) continue;
  for (const e of l) console.log('  edge', key(e.a), '->', key(e.b), 'tri', Math.floor(e.a / 3), 'bone', mesh.bones[Math.floor(e.a / 3) * 3]);
}
import { STUDIO_BONES } from '../src/models/studio-format.ts';
const B = '-0.13967624306678772 0.8672095537185669 -0.16807928681373596';
const names = ['root','hips','spine','chest','neck','head','jaw','eyeL','eyeR','earL','earR','tail1','tail2','shoulderL','shoulderR'];
for (let t = 0; t < P.length / 9; t++) {
  for (let k = 0; k < 3; k++) if (key(t * 3 + k) === B) {
    console.log('tri', t, 'bones of corners', [0, 1, 2].map((i) => mesh.bones[t * 3 + i]), 'body', wanted.has(mesh.bones[t * 3] ?? -1));
  }
}
void STUDIO_BONES; void names;
{
  const bx = -0.13967624306678772, by = 0.8672095537185669, bz = -0.16807928681373596;
  for (let t = 0; t < P.length / 9; t++) {
    let near = false;
    for (let k = 0; k < 3; k++) {
      const c = t * 3 + k;
      if (Math.hypot(P[c * 3]! - bx, P[c * 3 + 1]! - by, P[c * 3 + 2]! - bz) < 0.004) near = true;
    }
    if (near) console.log('near tri', t, [0, 1, 2].map((k) => [0, 1, 2].map((a) => P[(t * 3 + k) * 3 + a]!.toFixed(5)).join(',')).join(' | '), 'bone', mesh.bones[t * 3]);
  }
}

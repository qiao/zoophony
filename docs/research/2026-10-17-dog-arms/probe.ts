/**
 * Measures the arm, the trunk, and H of a player, and for a bowed string the reached parts of the
 * fingerboard and of the bow hair in the playing pose of its hold, and the share of the strokes
 * of the demos whose hand place lies in the reached part of the fingerboard.
 * Usage (from the scratch tree): DOGV=a12 CS=0.93 node scratch/probe.ts <species> <instrument> [json]
 */
import { Vector3 } from 'three';

import { buildPlayer } from '../src/models/player.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { bowedRig, holdOf } from '../src/pose/bowed-rig.ts';
import type { BowedInstrument } from '../src/pose/bowed-rig.ts';
import { buildStrokes, vibratoRate } from '../src/pose/strokes.ts';
import { fingerboardPlace } from '../src/pose/fingering.ts';
import { scoreOf } from '../src/score/test-score.ts';
import { patchedDemos } from '../tools/patch-demos.ts';

const [species, instrument] = process.argv.slice(2) as [SpeciesId, BowedInstrument];
const stand = buildPlayer(species, instrument, 4, 'stand');
const seated = buildPlayer(species, instrument, 4, 'chair');
const joint = (m: typeof stand, name: string): Vector3 =>
  new Vector3(...(m.skeleton.positions[boneIndex(name as never)] ?? [0, 0, 0]));
const arm = (m: typeof stand, side: 'L' | 'R') => {
  const wrist = joint(m, `upperArm${side}`).distanceTo(joint(m, `forearm${side}`)) + joint(m, `forearm${side}`).distanceTo(joint(m, `hand${side}`));
  const palm = joint(m, `hand${side}`).distanceTo(new Vector3(...(side === 'L' ? m.body.palmL : m.body.palmR)));
  return { wrist, palm: wrist + palm };
};
const a = arm(stand, 'R');
const shoulders = joint(stand, 'upperArmL').add(joint(stand, 'upperArmR')).multiplyScalar(0.5);
const trunk = joint(stand, 'hips').distanceTo(shoulders);
const H = stand.body.headHeight;
// The standing height: the highest corner of the body bones.
let top = -Infinity;
const pos = stand.mesh.positions;
for (let v = 0; v < stand.mesh.bones.length; v++) {
  if ((stand.mesh.bones[v] ?? 0) < boneIndex('instrument' as never)) top = Math.max(top, pos[v * 3 + 1] ?? 0);
}
const out: Record<string, unknown> = {
  species, instrument, dogv: process.env.DOGV ?? '-', cs: process.env.CS ?? '1',
  height: top, H, trunk, armWrist: a.wrist, armPalm: a.palm,
  armTrunk: a.palm / trunk, armTrunkWrist: a.wrist / trunk, armH: a.palm / H, armHeight: a.palm / top, trunkHeight: trunk / top,
  shoulderY: shoulders.y, hipsY: joint(stand, 'hips').y,
};
const rig = bowedRig(seated, instrument, holdOf(species, instrument));
out.stopRange = rig.stopRange;
out.bowRange = rig.bowRange;
out.hair = rig.hairLength;
out.bowShare = (rig.bowRange[1] - rig.bowRange[0]) / (rig.hairLength - 2 * rig.hold.freeHair);
// The hand places of the strokes of the first player of each seat of the instrument.
const NO_BEATS = new Float64Array();
let total = 0;
let open = 0;
let inside = 0;
let insideNote = 0;
let above = 0;
const [low, high] = rig.stopRange;
for (const demo of await patchedDemos()) {
  const score = scoreOf(demo.bytes);
  for (const [seatIndex, seat] of score.seats.entries()) {
    if (seat.section !== instrument) continue;
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
    if (notes.length === 0) continue;
    const strokes = buildStrokes(notes, [], [0.03, 0.5], 1, instrument, vibratoRate(instrument, 0.5), NO_BEATS);
    for (const s of strokes) {
      total += 1;
      if (s.hand.open) { open += 1; inside += 1; insideNote += 1; continue; }
      if (s.hand.place >= low - 1e-9 && s.hand.place <= high + 1e-9) inside += 1;
      const note = fingerboardPlace(s.hand.semitones);
      if (note >= low - 1e-9 && note <= high + 1e-9) insideNote += 1;
      if (s.hand.place > high + 1e-9) above += 1;
    }
  }
}
out.strokes = total;
out.open = open;
out.handShare = inside / total;
out.noteShare = insideNote / total;
out.aboveShare = above / total;
if (process.argv[4] === 'json') {
  console.log(JSON.stringify(out));
} else {
  const f = (x: unknown) => (typeof x === 'number' ? x.toFixed(3) : Array.isArray(x) ? x.map((y) => Number(y).toFixed(3)).join('..') : String(x));
  console.log(Object.entries(out).map(([k, v]) => `${k} ${f(v)}`).join(', '));
}

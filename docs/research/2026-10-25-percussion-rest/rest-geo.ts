/**
 * Prints the rest geometry of the badger snare drummer, cymbalist, and xylophonist: the joints of
 * each arm at rest, the grip and the tip of each stick, the body front at the height of the grips,
 * and the near rim of the instrument.
 * Usage: node docs/research/2026-10-25-percussion-rest/rest-geo.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { parseTestNotes } from '../../../src/gallery/notes.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const ROLES = [
  { name: 'snare', instrument: 'snare-drum', notes: '0.5 0.25 38\n0.75 0.25 38' },
  { name: 'cymbal', instrument: 'cymbals', notes: '0.5 1 49' },
  {
    name: 'xylophone',
    instrument: 'xylophone',
    notes: process.env['NOTES'] ?? '0.5 0.25 C5\n0.75 0.25 F7',
  },
] as const;

const cm = (v: Vector3): string =>
  `${(v.x * 100).toFixed(1)},${(v.y * 100).toFixed(1)},${(v.z * 100).toFixed(1)}`;
const args = process.argv.slice(2);
const sets: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    sets.push(args[++i] ?? '');
  }
}
const changes = sets.length > 0 ? setHolds(sets.join(';')) : null;
const only = process.env['ROLE'];
const lift = process.env['LIFT'];
try {
  for (const role of ROLES) {
    if (only && only !== role.name) {
      continue;
    }
    const model = buildPlayer('badger', role.instrument);
    const animal: GalleryAnimal = {
      model,
      place: {
        position: [0, 0, 0],
        facing: Math.PI,
        cast: {
          species: 'badger',
          instrument: role.instrument,
          support: 'stand',
          seatIndex: 0,
          player: 0,
          kettles: 4,
        },
      },
    };
    const parsed = parseTestNotes(role.notes);
    if (!parsed.ok) {
      throw new Error('bad notes');
    }
    const plan = galleryPlan([animal], null, parsed.notes);
    const buffer = createScenePose(plan);
    let transport: Transport = NOT_STARTED;
    let wall = 20;
    if (lift) {
      transport = {
        playing: true,
        changedAtWall: 10,
        before: null,
        startSec: 0,
        holdSec: 3,
        leadSec: 2,
      };
      wall = 10 + Number(lift);
    }
    const time = Number(process.env['TIME'] ?? 0);
    if (process.env['TIME']) {
      transport = { playing: true, changedAtWall: -100, before: null, startSec: 0, holdSec: 3, leadSec: Number.POSITIVE_INFINITY };
    }
    const scene = poseAt(plan, time, wall, transport, [], buffer);
    const pose = scene.players[0];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    console.log(`== ${role.name} (H ${model.body.headHeight.toFixed(3)})`);
    for (const t of model.instrument.targets) {
      if (t.kind === 'head' || t.kind === 'bars') {
        console.log(`  target ${t.kind} ${t.from.map((v) => (v * 100).toFixed(1)).join(',')}`);
      }
    }
    for (const side of ['L', 'R'] as const) {
      const at = (bone: string): Vector3 =>
        posed.frames[boneIndex(bone as never)]?.position.clone() ?? new Vector3();
      const bone = side === 'L' ? 'malletL' : 'malletR';
      const head = model.instrument.targets.find(
        (t) => t.kind === 'mallet-head' && t.bone === bone,
      );
      const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
      const tip = new Vector3(...posedPiecePoint(posed, { bone, at: head?.from ?? [0, 0, 0] }));
      const d = tip.clone().sub(grip).normalize();
      console.log(
        `  ${side} shoulder ${cm(at(`upperArm${side}`))} elbow ${cm(at(`forearm${side}`))} wrist ${cm(at(`hand${side}`))}`,
      );
      console.log(
        `    grip ${cm(grip)} tip ${cm(tip)} dir ${d.x.toFixed(2)},${d.y.toFixed(2)},${d.z.toFixed(2)} up ${((Math.asin(d.y) * 180) / Math.PI).toFixed(0)}°`,
      );
    }
  }
} finally {
  changes?.undo();
}

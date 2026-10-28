// Measures the beater of the badger bass drummer: its length, the shaft that shows between the
// fist and the head, the grip along the shaft, the gap of the paw to the trunk, the playing spot
// on the head, the lift of the head between strikes, and the angle of the shaft to the head.
// Usage, from the root of the tree: node docs/research/2026-10-27-badger-beater/beater-probe.ts [variant changes]...
// On a tree before the round, the beater has a head of 5.5 cm in radius, and BASS_DRUM has no ball.
// FULL=1 prints each moment of the first variant.
import { Quaternion, Vector3 } from 'three';
import { twistAngle } from '../../../src/models/studio-rig.ts';
import { volumeMiddle } from '../../../tools/bow-grip.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { percussionTestFile } from '../../../tools/probe-demos.ts';
import { BASS_DRUM, malletButt } from '../../../src/models/instruments/percussion.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import {
  closeSurface,
  closedDepth,
  openLoops,
  partDistance,
  posedPart,
} from '../../../src/pose/test-clearance.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { PERCUSSION_HOLDS } from '../../../src/pose/percussion-rig.ts';

const cm = (v: number): string => (100 * v).toFixed(1);
const deg = (v: number): string => ((v * 180) / Math.PI).toFixed(0);
const variants = process.argv.slice(2);
if (variants.length === 0) variants.push('');

interface Moment {
  visible: number;
  fulcrum: number;
  buttOut: number;
  trunk: number;
  forearm: number;
  pawOut: number;
  gap: number;
  radial: number;
  down: number;
  toward: number;
  angle: number;
  miss: number;
  fore: number;
  reach: number;
  drum: number;
  armDrum: number;
  line: string;
}

for (const variant of variants) {
  const changes = setHolds(variant);
  const scene = sceneOf(percussionTestFile());
  const index = scene.layout.players.findIndex(
    (p) => p.cast.species === 'badger' && p.cast.instrument === 'bass-drum',
  );
  const place = scene.layout.players[index];
  if (!place) throw new Error('no player');
  const model = scene.models.get('badger', 'bass-drum', place.cast.kettles, place.cast.support);
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const head = model.instrument.targets.find((t) => t.kind === 'mallet-head');
  const drumHead = model.instrument.targets.find((t) => t.kind === 'head');
  if (!head || !drumHead) throw new Error('no targets');
  const ballRadius = (BASS_DRUM as { ball?: number }).ball ?? 0.055;
  const butt = malletButt('bass-drum');
  const length = head.from[0];
  const whole = butt + length + ballRadius;
  const normal = new Vector3(...drumHead.normal);
  const center = new Vector3(...drumHead.from);
  const down = new Vector3(0, -1, 0).projectOnPlane(normal).normalize();
  // The horizontal axis of the head plane toward the player at the origin.
  const toward = new Vector3().crossVectors(normal, down).normalize();
  if (toward.dot(center) > 0) toward.negate();

  const measure = (song: number, wall: number, transport = PLAYING): Moment => {
    const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
    if (!pose) throw new Error('no pose');
    const posed = poseSkeleton(model, pose);
    const start = new Vector3(...posedPiecePoint(posed, { bone: 'malletR', at: [-butt, 0, 0] }));
    const ball = new Vector3(...posedPiecePoint(posed, { bone: 'malletR', at: head.from }));
    const axis = ball.clone().sub(start).normalize();
    const shaft = ball.distanceTo(start);
    const pawPart = posedPart(posed, ['handR', 'fingersR']);
    const paw = closeSurface(pawPart.triangles, openLoops(pawPart.triangles));
    let first: number | null = null;
    let last = 0;
    for (let s = 0; s <= shaft; s += 0.002) {
      const p = start.clone().addScaledVector(axis, s);
      if (closedDepth([p], paw).depth > 0) {
        first ??= s;
        last = s;
      }
    }
    const trunk = posedPart(posed, ['hips', 'spine', 'chest']);
    const forearm = posedPart(posed, ['forearmR']);
    const middle = volumeMiddle(paw);
    const elbow = posed.frames[boneIndex("forearmR")]?.position ?? new Vector3();
    const wristP = posed.frames[boneIndex("handR")]?.position ?? new Vector3();
    const foreDir = wristP.clone().sub(elbow).normalize();
    const handRot = posed.frames[boneIndex('handR')]?.rotation;
    const vdir = (v: [number, number, number]): string => (handRot ? new Vector3(...v).applyQuaternion(handRot).toArray().map((c) => c.toFixed(2)).join(', ') : '-');
    const hi = boneIndex('handR') * 4;
    const local = new Quaternion(pose.rotations[hi], pose.rotations[hi + 1], pose.rotations[hi + 2], pose.rotations[hi + 3]);
    const playerTwist = (twistAngle(local, new Vector3(0, -1, 0)) * 180) / Math.PI;
    const paws = `player hand twist ${playerTwist.toFixed(0)}°, palm (${vdir([-1, 0, 0])}) thumb (${vdir([0, 0, -1])}) fingers (${vdir([0, -1, 0])})`;
    const shoulder = posed.frames[boneIndex('upperArmR')]?.position ?? new Vector3();
    const rel = ball.clone().sub(center);
    const spot = rel.clone().projectOnPlane(normal);
    const target = model.instrument.targets.find((t) => t.kind === 'head');
    void target;
    const m: Moment = {
      visible: shaft - ballRadius - last,
      fulcrum: first === null ? NaN : (first + last) / 2 / whole,
      buttOut: first ?? NaN,
      trunk: partDistance(pawPart, trunk, 0.5),
      forearm: partDistance(forearm, trunk, 0.5),
      pawOut: middle.x - shoulder.x,
      gap: rel.dot(normal) - ballRadius,
      radial: spot.length(),
      down: spot.dot(down),
      toward: spot.dot(toward),
      angle: Math.asin(Math.abs(axis.dot(normal))),
      miss: ball.distanceTo(center.clone().add(new Vector3(...PERCUSSION_HOLDS['bass-drum'].offsetR))),
      fore: foreDir.angleTo(axis),
      reach: wristP.distanceTo(shoulder) / 0.245,
      drum: partDistance(trunk, posedPart(posed, ['instrument']), 0.2),
      armDrum: partDistance(posedPart(posed, ['upperArmR', 'forearmR', 'handR', 'fingersR', 'upperArmL', 'forearmL', 'handL', 'fingersL']), posedPart(posed, ['instrument']), 0.2),
      line: '',
    };
    m.line = `shaft in paw ${first === null ? '-' : `${cm(first)}..${cm(last)}`} cm from the butt, fulcrum ${m.fulcrum.toFixed(2)}; visible ${cm(m.visible)}; paw-trunk ${cm(m.trunk)}, forearm-trunk ${cm(m.forearm)}; paw middle from the shoulder (${middle.clone().sub(shoulder).toArray().map(cm).join(', ')}); head gap ${cm(m.gap)}; spot ${cm(m.radial)} (down ${cm(m.down)}, toward the player ${cm(m.toward)}), ${cm(BASS_DRUM.radius - m.radial)} in from the rim; shaft ${deg(m.angle)}° to the head; forearm (${foreDir.toArray().map((v) => v.toFixed(2)).join(", ")}) at ${deg(foreDir.angleTo(axis))}° to the shaft; elbow (${elbow.toArray().map(cm).join(", ")}) wrist (${wristP.toArray().map(cm).join(", ")}) ball (${ball.toArray().map(cm).join(", ")}); ${paws}`;
    return m;
  };

  const lag = scene.plan.players[index]?.timeOffset ?? 0;
  const strikes = [2.4 + lag, 3.6 + lag];
  const wall = 20;
  const s0 = strikes[0] ?? 0;
  const s1 = strikes[1] ?? 0;
  const moments: [string, Moment][] = [
    ['strike', measure(s0, wall)],
    ['rebound', measure(s0 + 0.05, wall)],
    ['between', measure((s0 + s1) / 2, wall)],
    ['lift50', measure(s1 - 0.125, wall)],
  ];
  const sweep = SWEEP_ROLES['bass-drummer'];
  for (const set of sweep.sampleSets(scene)) {
    if (set.name !== 'rest') continue;
    for (const [song, w, transport] of set.samples) {
      moments.push(['rest', measure(song, w, transport)]);
      break;
    }
  }
  // The stroke: the head gap over one cycle between two strikes.
  const gaps: number[] = [];
  for (let t = s0; t <= s1 + 0.001; t += 0.025) {
    const pose = poseAt(scene.plan, t, wall, PLAYING, audible, buffer).players[index];
    if (!pose) continue;
    const posed = poseSkeleton(model, pose);
    const ball = new Vector3(...posedPiecePoint(posed, { bone: 'malletR', at: head.from }));
    gaps.push(ball.sub(center).dot(normal) - ballRadius);
  }
  const strike = moments[0]?.[1];
  const between = moments[2]?.[1];
  if (!strike || !between) continue;
  console.log(
    `${variant || 'tree'}: whole ${cm(whole)} cm, fulcrum ${strike.fulcrum.toFixed(2)}, butt out ${cm(strike.buttOut)}, visible ${cm(strike.visible)}; paw-trunk ${cm(strike.trunk)}..${cm(between.trunk)}, forearm-trunk ${cm(strike.forearm)}..${cm(between.forearm)}, paw out ${cm(strike.pawOut)}; spot ${cm(strike.radial)} (down ${cm(strike.down)}, toward ${cm(strike.toward)}); angle strike ${deg(strike.angle)}°, between ${deg(between.angle)}°; forearm-shaft ${deg(strike.fore)}°..${deg(between.fore)}°, trunk-drum ${cm(Math.min(...moments.map(([, m]) => m.drum)))}, arms-drum ${cm(Math.min(...moments.map(([, m]) => m.armDrum)))}, reach ${strike.reach.toFixed(2)}, miss ${cm(strike.miss)}; gap strike ${cm(strike.gap)}, between ${cm(between.gap)}, peak ${cm(Math.max(...gaps))}, min ${cm(Math.min(...gaps))}`,
  );
  if (process.env.FULL) {
    for (const [name, m] of moments) console.log(`  ${name}: ${m.line}`);
    console.log(`  gaps each 0.025 s: ${gaps.map(cm).join(' ')}`);
  }
  changes.undo();
}

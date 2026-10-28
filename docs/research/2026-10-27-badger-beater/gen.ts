// Prints the --set text of a bass drum hold from a few design values.
// Usage: node docs/research/2026-10-27-badger-beater/gen.ts xp zc ballY beta tilt pole pitch peak [lean]
// xp: the x of the batter head; zc: the z of the drum middle; ballY: the height of the ball at the
// strike; beta: the angle of the beater above the level, in degrees; tilt: malletTilt in radians.
const [xp, zc, ballY, beta, tilt, pole, pitch, peak, rest] = process.argv.slice(2);
const H = 0.243662;
const S = [0.145, 0.597, 0.021];
const ball = 0.0215;
const whole = 0.2584;
const butt = whole / 3;
const length = whole - butt - ball;
const x = Number(xp);
const z = Number(zc);
const radius = Number(process.env.RADIUS ?? 0.35);
const depth = Number(process.env.DEPTH ?? 0.32);
const yc = Number(process.env.YC ?? 0.5);
const xc = x - depth / 2;
const by = Number(ballY);
// The ball middle at the strike: one ball radius off the head. The beater points forward and up by beta.
const b = (Number(beta) * Math.PI) / 180;
const u = [0, Math.sin(b), -Math.cos(b)];
// The z of the ball: the given toward the player value comes from the spot rule below.
const toward = Number(process.env.TOWARD ?? 0.2);
const target = [x + ball, by, z + toward];
const home = target.map((v, i) => v - 0.3 * (u[i] ?? 0));
const hm = home.map((v, i) => Number(((v - (S[i] ?? 0)) / H).toFixed(3)));
const off = [ball, by - yc, toward].map((v) => Number(v.toFixed(4)));
const parts = [
  `bassDrum.center=[${xc.toFixed(4)},${yc},${z}]`,
  `bassDrum.radius=${radius}`,
  `bassDrum.depth=${depth}`,
  'bassDrum.turn=0',
  `bassDrum.mallet=${length.toFixed(4)}`,
  `bassDrum.ball=${ball}`,
  `bassDrum.malletButt=${butt.toFixed(4)}`,
  `bassDrum.malletTilt=${tilt}`,
  `bass-drum.offsetR=[${off.join(',')}]`,
  `bass-drum.home=[${hm.join(',')}]`,
  `bass-drum.poleR=${pole}`,
  `bass-drum.sizes={"lift":${process.env.LIFT ?? 0.13},"rest":${process.env.REST ?? 0.05}}`,
  process.env.ACROSS === '1'
    ? `bass-drum.across={"rest":${rest ?? 0.3},"lift":0,"pitch":${pitch},"peak":${peak}}`
    : `bass-drum.across=null;bass-drum.top=${process.env.TOP ?? 'up'}`,
];
if (process.env.LEAN) parts.push(`bass-drum.lean=${process.env.LEAN}`);
if (process.env.READY) parts.push(`bass-drum.ready=${process.env.READY}`);
console.log(parts.join(';'));

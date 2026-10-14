// Prints the shots of the Ode to Joy demo in its first 70 s, and the depth of the layout.
const root = process.argv[2] ?? '../../..';
const { patchedDemo } = await import(`${root}/tools/patch-demos.ts`);
const { shotSceneOf } = await import(`${root}/src/shots/test-shots.ts`);
const { bytes } = await patchedDemo('beethoven-9.mid');
const scene = shotSceneOf('beethoven-9.mid', bytes);
const choir = scene.score.seats.findIndex((s: { section: string }) => s.section === 'choir');
console.log('choir seat', choir, 'stageSide', scene.plan.stageSide?.toFixed?.(3));
for (const s of scene.plan.shots) {
  if (s.startSec > 70) break;
  const secs = s.seats.map((i: number) => scene.score.seats[i]?.section).join(',');
  console.log(s.startSec.toFixed(1), s.kind, secs, 'az', ((s.from.azimuth * 180) / Math.PI).toFixed(0), 'el', ((s.from.elevation * 180) / Math.PI).toFixed(0));
}
const fox = scene.layout.players.filter((p: { cast: { species: string } }) => p.cast.species === 'fox-red');
console.log('fox seats', fox.map((p: { position: number[] }) => p.position.map((v) => v.toFixed(2)).join(' ')).join(' | '));

// Prints the solo shots of the soloist of K. 315 and the shot kinds, with the layout of a tree.
const root = process.argv[2] ?? '../../..';
const { patchedDemo } = await import(`${root}/tools/patch-demos.ts`);
const { shotSceneOf } = await import(`${root}/src/shots/test-shots.ts`);
for (const file of ['mozart-k315.mid', 'beethoven-8.mid']) {
  const { bytes } = await patchedDemo(file);
  const scene = shotSceneOf(file, bytes);
  const soloist = scene.score.soloist;
  const place = scene.layout.players.find((p: any) => p.cast.seatIndex === soloist);
  const kinds: Record<string, number> = {};
  for (const s of scene.plan.shots) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
  console.log(file, 'stage', scene.layout.stageSide.toFixed(3), 'soloist', soloist, place?.cast.species, place?.position.map((v: number) => v.toFixed(2)).join(','), JSON.stringify(kinds));
  for (const s of scene.plan.shots.filter((s: any) => s.kind === 'solo')) {
    console.log('  solo', s.startSec.toFixed(1), s.endSec.toFixed(1), 'seat', s.seats[0], scene.score.seats[s.seats[0]]?.section);
  }
}

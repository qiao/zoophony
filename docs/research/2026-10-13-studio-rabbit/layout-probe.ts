const root = process.argv[2]!;
const { patchedDemos } = await import(`${root}/tools/patch-demos.ts`);
const { sceneOf } = await import(`${root}/src/pose/test-scene.ts`);
const demos = await patchedDemos();
const scene = sceneOf(
  demos.find((d: { file: string }) => d.file === (process.argv[3] ?? 'beethoven-8.mid'))!.bytes,
);
for (const [i, p] of scene.layout.players.entries()) {
  console.log(
    i,
    p.cast.species,
    p.cast.instrument,
    p.position.map((v: number) => v.toFixed(3)).join(' '),
    p.facing.toFixed(3),
    JSON.stringify(scene.plan.players[i]?.lookTarget),
  );
}

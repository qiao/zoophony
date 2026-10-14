/**
 * Puts each test file of `pnpm test` of the base into a group, with the action (keep or pause)
 * and a reason of one line (the report `2026-10-14-test-pause.md`). Run from the repository root:
 *
 * `node docs/research/2026-10-14-test-pause/classify.ts <times.tsv>`
 *
 * `<times.tsv>` is the output of `test-times.ts` for a run of the base. The probe asks Vitest for
 * the files of the project "paused" (`vitest list --project paused --filesOnly`), and stops when
 * the paused groups of this file and the list of `vite.config.ts` differ, or when a file has no
 * group. It prints the Markdown table of the files, then the table of the groups.
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

/** A group of test files. */
interface Group {
  /** The name of the group in the tables. */
  readonly name: string;
  /** True when `pnpm test` skips the files of the group. */
  readonly paused: boolean;
  /** The reason of a file of the group with no reason of its own. */
  readonly reason: string;
  /** The test files of the group: a regular expression on the path. */
  readonly files: RegExp;
}

/** The groups, in the order of the tables. The first group that holds a path takes it. */
const GROUPS: readonly Group[] = [
  {
    name: 'Clearance of the bodies',
    paused: true,
    reason: 'Sweeps the posed skin of a body against the body and the instrument.',
    files:
      /^src\/pose\/([a-z]+-clearance-[a-z0-9]+|violinist-standing-clearance|rest-clearance)\.test\.ts$/,
  },
  {
    name: 'Fit of a pose to a body',
    paused: true,
    reason: 'Checks where a pose puts the paws, the instrument, or the feet of a body.',
    files:
      /^src\/(pose\/(bowed|bow-hold|hands|winds|percussion|choir|seated-feet)|models\/player|gallery\/(sheet-poses|view-poses))\.test\.ts$/,
  },
  {
    name: 'Look of the bodies and the seats',
    paused: true,
    reason: 'Checks the forms, the colors, the sizes, or the triangles of a body or a seat.',
    files:
      /^src\/models\/(species|budget|proportions|legs|props|face-patterns|penguin\/penguin-body)\.test\.ts$/,
  },
  {
    name: 'Layout from the footprints',
    paused: true,
    reason: 'Checks the stage and the gaps that the footprints of the bodies give.',
    files: /^src\/(models\/layout-scene|scene\/hidden-heads)\.test\.ts$/,
  },
  {
    name: 'MIDI and score',
    paused: false,
    reason: 'Guards a rule of the MIDI file or of the score (One score).',
    files: /^src\/(midi|score)\//,
  },
  {
    name: 'Audio engine and scheduler',
    paused: false,
    reason: 'Guards the synth, the clock, the decode, or the block scheduler.',
    files: /^src\/audio\//,
  },
  {
    name: 'App and UI',
    paused: false,
    reason: 'Guards the app state, the URL, the transport, or the UI.',
    files: /^src\/(app|ui)\//,
  },
  {
    name: 'Pose rules',
    paused: false,
    reason: 'Guards a motion rule that reads no form of a body.',
    files: /^src\/pose\//,
  },
  {
    name: 'Model code',
    paused: false,
    reason: 'Tests a builder, a codec, or a rule with test input or with any body.',
    files: /^src\/models\//,
  },
  {
    name: 'Scene and camera',
    paused: false,
    reason: 'Guards a render rule or a camera rule.',
    files: /^src\/(scene|shots)\//,
  },
  {
    name: 'Gallery logic',
    paused: false,
    reason: 'Tests the query, the items, or the plan of a gallery page.',
    files: /^src\/gallery\//,
  },
  {
    name: 'Tools and docs paths',
    paused: false,
    reason: 'Tests a repository tool or a docs path.',
    files: /^(tools\/|src\/test-shards\.test\.ts$)/,
  },
];

/** The reasons of the files that differ from the reason of their group. */
const REASONS = new Map<string, string>([
  ['src/pose/bowed.test.ts', 'The bow on the strings, the violin at the shoulder, the rest bow.'],
  ['src/pose/bow-hold.test.ts', 'The bow stick in the fingers and out of the paw.'],
  ['src/pose/hands.test.ts', 'The palms on the keys and the strings, the reach, the rest lean.'],
  ['src/pose/winds.test.ts', 'The mouth on the mouthpiece, the palms on the grips, the reach.'],
  ['src/pose/percussion.test.ts', 'The mallet heads on their targets, the reach, the rest arms.'],
  ['src/pose/choir.test.ts', 'The folder and the flippers out of the penguin body.'],
  ['src/pose/seated-feet.test.ts', 'The feet on the floor or on the foot ring of each species.'],
  ['src/models/player.test.ts', 'The instruments on the bind pose, the bodies before the chair.'],
  ['src/gallery/sheet-poses.test.ts', 'The poses of the sheet pages against the bodies.'],
  ['src/gallery/view-poses.test.ts', 'The poses of the gallery pages against the bodies.'],
  ['src/models/species.test.ts', 'The forms, the colors, and the budget of each species.'],
  ['src/models/budget.test.ts', 'The triangle budgets of the bodies, the props, and the scene.'],
  ['src/models/proportions.test.ts', 'The skeleton table of design 4.3 in the bodies.'],
  ['src/models/legs.test.ts', 'The knee heights and the leg lengths of the reference images.'],
  ['src/models/props.test.ts', 'The seats that fit the legs, and the look of the props.'],
  ['src/models/face-patterns.test.ts', 'The eye patches against the eyes.'],
  ['src/models/penguin/penguin-body.test.ts', 'The egg body of the penguin.'],
  ['src/models/layout-scene.test.ts', 'The stage growth and the gaps from the footprints.'],
  ['src/scene/hidden-heads.test.ts', 'The heads behind the large animals in the default view.'],
  ['src/pose/pose-at.test.ts', 'Stateless poses. Poses each species of perf-60.mid alone.'],
  ['src/pose/pose-timing.test.ts', 'The pose timing target of design 9.7.'],
  ['src/pose/conductor.test.ts', 'The cues, the count-in, and the seek of the conductor.'],
  ['src/pose/conductor-left.test.ts', 'The left hand of the conductor with no jump in a frame.'],
  ['src/pose/leader.test.ts', 'The leader of a chamber group: the looks and the nods.'],
  ['src/pose/lap.test.ts', 'Finds the lap point on any body.'],
  ['src/pose/test-clearance.test.ts', 'The depth and gap helpers of pnpm pose-depth, on test shapes.'],
  ['src/pose/test-sweep.test.ts', 'The gap sweep of pnpm pose-depth, on test boxes.'],
  ['src/models/rig.test.ts', 'The bones of design 4.7 that each pose and the scene need.'],
  ['src/models/model-cache.test.ts', 'Builds each kind of player one time.'],
  ['src/models/cast.test.ts', 'The cast rules of the sections and the supports.'],
  ['src/models/layout.test.ts', 'The seat rule of design 4.5.'],
  ['src/models/footprint.test.ts', 'The footprint holds each vertex of any player.'],
  ['src/models/stage.test.ts', 'The stage, the planks, and the podium.'],
  ['src/models/studio-body.test.ts', 'Builds and draws a studio body with its skin.'],
  ['src/models/studio-rig.test.ts', 'Drives the bones of a studio body from a pose.'],
  ['src/models/studio-size.test.ts', 'The gzip budget of each studio body (design 7.2).'],
  ['src/scene/player.test.ts', 'The skin of the GPU matches the skin of the tests.'],
  ['src/shots/prepare.test.ts', 'The cut and shot rules of the camera plan.'],
  ['src/gallery/sheets.test.ts', 'The query of a sheet page and the size of each sheet image.'],
  ['src/gallery/views.test.ts', 'The rows and the turns of the animal views page.'],
  ['tools/body-probe.test.ts', 'The probe of pnpm body-probe. Slow: it builds each body.'],
  ['tools/check-commits.test.ts', 'The commit check and its cache. Slow: it runs git.'],
  ['tools/studio-body.test.ts', 'The export of pnpm studio-body on the studio files.'],
  ['tools/fold-probe.test.ts', 'The fold count of pnpm fold-probe.'],
  ['tools/hold-reach.test.ts', 'The rule of a violin shop of pnpm hold-reach.'],
  ['tools/measure-frame.test.ts', 'The parse and the gates of pnpm frame.'],
  ['tools/gpu-trace.test.ts', 'The GPU row and its self-check of pnpm frame.'],
]);

/** One row of the output of `test-times.ts`. */
interface TimeRow {
  /** The path of the test file. */
  readonly path: string;
  /** The run time of the file, in seconds. */
  readonly seconds: number;
  /** The count of the tests of the file. */
  readonly tests: number;
  /** The count of the commits of the model rounds that changed the file. */
  readonly edits: number;
}

const [timesPath] = process.argv.slice(2);
if (!timesPath) {
  throw new Error('Give the output of test-times.ts.');
}

const rows: TimeRow[] = [];
for (const line of (await readFile(timesPath, 'utf8')).split('\n')) {
  const [path = '', seconds = '', tests = '', , edits = ''] = line.split('\t');
  if (path.endsWith('.test.ts')) {
    rows.push({ path, seconds: Number(seconds), tests: Number(tests), edits: Number(edits) });
  }
}

const listed = execFileSync('pnpm', ['exec', 'vitest', 'list', '--project', 'paused', '--filesOnly'], {
  encoding: 'utf8',
});
const paused = new Set(
  listed
    .split('\n')
    .filter((line) => line.startsWith('[paused] '))
    .map((line) => line.slice('[paused] '.length).trim()),
);

const sums = new Map<Group, { files: number; tests: number; seconds: number; edits: number }>();
console.log('| File | Time (s) | Tests | Edits | Group | Action | Reason |');
console.log('|---|---|---|---|---|---|---|');
for (const row of rows) {
  const group = GROUPS.find((g) => g.files.test(row.path));
  if (!group) {
    throw new Error(`No group holds ${row.path}.`);
  }
  if (group.paused !== paused.has(row.path)) {
    throw new Error(`The group of ${row.path} and the list of vite.config.ts differ.`);
  }
  const sum = sums.get(group) ?? { files: 0, tests: 0, seconds: 0, edits: 0 };
  sums.set(group, {
    files: sum.files + 1,
    tests: sum.tests + row.tests,
    seconds: sum.seconds + row.seconds,
    edits: sum.edits + row.edits,
  });
  const reason = REASONS.get(row.path) ?? group.reason;
  const action = group.paused ? 'pause' : 'keep';
  console.log(
    `| \`${row.path}\` | ${row.seconds.toFixed(2)} | ${row.tests} | ${row.edits} | ` +
      `${group.name} | ${action} | ${reason} |`,
  );
}
if (paused.size !== [...sums].filter(([g]) => g.paused).reduce((n, [, s]) => n + s.files, 0)) {
  throw new Error('The project "paused" holds a file that the times do not hold.');
}

console.log('');
console.log('| Group | Action | Files | Tests | Time (s) | Edits | Reason |');
console.log('|---|---|---|---|---|---|---|');
for (const group of GROUPS) {
  const sum = sums.get(group) ?? { files: 0, tests: 0, seconds: 0, edits: 0 };
  const action = group.paused ? 'pause' : 'keep';
  console.log(
    `| ${group.name} | ${action} | ${sum.files} | ${sum.tests} | ${sum.seconds.toFixed(1)} | ${sum.edits} | ` +
      `${group.reason} |`,
  );
}

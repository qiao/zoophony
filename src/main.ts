import './style.css';

import { demoFromQuery, demoUrl, stepDemo } from './app/demos.ts';
import type { DemoId } from './app/demos.ts';
import type { DevHook } from './app/dev-hook.ts';
import { buttonAction, buttonView } from './app/play-button.ts';
import type { SampleState } from './app/play-button.ts';
import { STOPPED, followSongTime, setPlaying, startPoint } from './app/transport.ts';
import type { PlayState } from './app/transport.ts';
import type { Player } from './audio/player.ts';
import { fetchOk } from './audio/fetch-ok.ts';
import { layoutScene } from './models/layout-scene.ts';
import type { SceneLayout } from './models/layout.ts';
import { ModelCache } from './models/model-cache.ts';
import { boneIndex } from './models/rig.ts';
import { preparePoses } from './pose/plan.ts';
import type { PosePlan } from './pose/plan.ts';
import { createScenePose, poseAt } from './pose/pose-at.ts';
import type { ScenePoseBuffer } from './pose/pose-at.ts';
import { watchPixelRatio } from './scene/pixel-ratio.ts';
import { startTierOf } from './scene/quality.ts';
import { StageScene } from './scene/stage-scene.ts';
import { buildScore } from './score/score.ts';
import type { Score, SectionSize } from './score/types.ts';

/**
 * The seed of the pose. A fixed seed gives each demo the same seeded offsets and idle motion on
 * each visit (design 5.3).
 */
const POSE_SEED = 1;

/**
 * The id of `perf-60.mid`, the file of the frame target (design 9.5, 9.7). Only on the dev
 * server, the query `?demo=perf-60` shows it with the section size "One per part".
 * `tools/write-perf-60.ts` writes it into `perf/`, which the build does not copy into `dist/`.
 */
const PERF_60 = 'perf-60';

/** A file that the stage can show: a demo, or `perf-60.mid` on the dev server. */
type StageFile = DemoId | typeof PERF_60;

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (!canvas) {
  throw new Error('The page has no canvas with the id "stage".');
}
// Temporary until the bar of step 6 (design 2.3, 2.8): one play and pause button.
const button = document.querySelector<HTMLButtonElement>('#play');
if (!button) {
  throw new Error('The page has no button with the id "play".');
}

const scene = new StageScene(canvas, {
  tier: startTierOf(window),
  devicePixelRatio: window.devicePixelRatio,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
let current = demoFromQuery(window.location.search);
const showPerf60 =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === PERF_60;
/** The number of the last demo request. A later request replaces an earlier one. */
let request = 0;

/** One demo on the stage: its score, its pose plan, and the pose buffer of its frames. */
interface Piece {
  readonly score: Score;
  readonly plan: PosePlan;
  readonly poses: ScenePoseBuffer;
  /** The load of the samples of the score into the `Player`. */
  samples: SampleState;
}

/** The audio of the page: the `Player` and its error test, from the module that loads late. */
interface Audio {
  readonly player: Player;
  /**
   * Tells if a load failed because a later load replaced it (design 6.8).
   *
   * @param error The error of the load.
   * @returns True for a `LoadReplacedError`, which the page ignores.
   */
  readonly replaced: (error: Error) => boolean;
}

/** A demo after its load, with the layout and the player models of its scene. */
interface LoadedPiece {
  readonly piece: Piece;
  readonly layout: SceneLayout;
  readonly models: ModelCache;
}

let piece: Piece | null = null;
let audio: Audio | null = null;
/** True after the first start of the audio module. */
let audioStarted = false;
let state: PlayState = STOPPED;
/** True after the first play. Then a newly selected demo starts when it is ready (design 2.2). */
let played = false;
let songTime = 0;

/**
 * Loads a demo file, and calculates its score, its layout, and its pose plan. The layout, the
 * plan, and the scene share one model cache (audit 2026-10-05-pose-scene, finding 8).
 *
 * @param id The demo, or `perf-60.mid`.
 * @returns The demo, its layout, and its player models.
 * @throws Error if the file does not load, or if `buildScore()` refuses it.
 */
async function loadPiece(id: StageFile): Promise<LoadedPiece> {
  const base = import.meta.env.BASE_URL;
  const perf = id === PERF_60;
  const response = await fetchOk(perf ? `${base}perf/perf-60.mid` : demoUrl(id, base));
  const sectionSize: SectionSize = perf ? 'one-per-part' : 'auto';
  const result = buildScore(new Uint8Array(await response.arrayBuffer()), sectionSize);
  if (!result.ok) {
    throw new Error(`The demo "${id}" is not valid: ${result.error}.`);
  }
  const { score } = result;
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  const plan = preparePoses(score, layout, POSE_SEED, models);
  const loaded: Piece = { score, plan, poses: createScenePose(plan), samples: 'loading' };
  return { piece: loaded, layout, models };
}

function resize(): void {
  scene.resize(canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1, window.devicePixelRatio);
}

/**
 * Shows the state of the temporary button: it waits for the load, then plays or pauses. After a
 * failure, it shows "Play" again for a retry.
 */
function updateButton(): void {
  if (!button) {
    return;
  }
  const view = buttonView(piece?.samples ?? 'loading', state.transport.playing);
  button.disabled = view.disabled;
  button.textContent = view.label;
}

/**
 * Pauses the transport after a failure, and offers a retry on the button. Step 6 gives the
 * failures the messages of design 2.8.
 *
 * @param failed The demo whose audio failed.
 * @param error The error.
 */
function fail(failed: Piece, error: Error): void {
  console.error(error);
  failed.samples = 'failed';
  if (failed === piece) {
    state = setPlaying(state, false, performance.now() / 1000, songTime);
  }
  updateButton();
}

/**
 * Plays or pauses the current demo, and records the change in the transport of the pose.
 *
 * @param playing True to play, false to pause.
 */
function playOrPause(playing: boolean): void {
  if (!audio || piece?.samples !== 'ready') {
    return;
  }
  const now = audio.player.now();
  if (playing) {
    audio.player.play(0);
    played = true;
  } else {
    audio.player.pause();
  }
  const songSec = playing ? startPoint(now, piece.score.durationSec) : now;
  state = setPlaying(state, playing, performance.now() / 1000, songSec);
  updateButton();
}

/**
 * Loads the samples of a demo into the `Player`. A demo that the user selects after the first
 * play starts when its samples are ready (design 2.2).
 *
 * @param loading The demo.
 */
function loadAudio(loading: Piece): void {
  if (!audio) {
    return;
  }
  const { player, replaced } = audio;
  player
    .load(loading.score, () => undefined)
    .then(() => {
      loading.samples = 'ready';
      if (loading === piece && played) {
        playOrPause(true);
      }
      updateButton();
    })
    .catch((error: Error) => {
      // The page ignores a load that a later selection replaced (design 6.8).
      if (!replaced(error)) {
        fail(loading, error);
      }
    });
}

/**
 * Loads the audio module after the first frame of the scene (design 6.3, 7.2), creates the
 * `Player`, and loads the samples of the current demo before the first click.
 */
async function startAudio(): Promise<void> {
  const { LoadReplacedError, WorkletPlayer } = await import('./audio/player.ts');
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
  // A failure during play pauses the transport, so that the animals do not play with no sound.
  // The next load starts a new engine (design 6.8).
  const player = new WorkletPlayer(baseUrl, (error) => {
    if (piece) {
      fail(piece, error);
    }
  });
  audio = { player, replaced: (error) => error instanceof LoadReplacedError };
  if (piece) {
    loadAudio(piece);
  }
}

/**
 * Shows the scene of a demo in the rest pose, and loads its samples. The scene of the old demo
 * frees its GPU resources, and the page keeps its renderer. The old demo stops.
 *
 * @param id The demo, or `perf-60.mid`.
 */
async function showDemo(id: StageFile): Promise<void> {
  const ticket = ++request;
  const loaded = await loadPiece(id);
  if (ticket !== request || !canvas) {
    return;
  }
  if (state.transport.playing) {
    audio?.player.pause();
  }
  state = STOPPED;
  piece = loaded.piece;
  scene.show(loaded.layout, loaded.models);
  updateButton();
  loadAudio(piece);
  // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute.
  canvas.dataset['demo'] = id;
}

window.addEventListener('resize', resize);
watchPixelRatio(window, resize);
/**
 * Starts the audio module again, or loads the samples again, after a failure. A click on "Play"
 * asks for it, so the demo starts when its samples are ready.
 *
 * @param failed The demo whose audio failed.
 */
function retry(failed: Piece): void {
  failed.samples = 'loading';
  played = true;
  updateButton();
  if (audio) {
    loadAudio(failed);
  } else {
    startAudio().catch((error: Error) => {
      fail(failed, error);
    });
  }
}

button.addEventListener('click', () => {
  const action = buttonAction(piece?.samples ?? 'loading', state.transport.playing);
  if (action === 'retry' && piece) {
    retry(piece);
  } else if (action === 'play' || action === 'pause') {
    playOrPause(action === 'play');
  }
});

// Temporary for the review of step 4: the keys [ and ] show the previous and the next demo, and
// the query `?demo=<id>` keeps the demo on a reload. Step 6 replaces them with the demo list and
// the URL hash (design 2.2).
window.addEventListener('keydown', (event) => {
  if (event.key !== '[' && event.key !== ']') {
    return;
  }
  current = stepDemo(current, event.key === '[' ? -1 : 1);
  const url = new URL(window.location.href);
  url.searchParams.set('demo', current);
  window.history.replaceState(null, '', url);
  showDemo(current).catch(reportError);
});

/**
 * Poses the players from the song time of the `Player`, and renders the scene (design 5.1). Until
 * the samples of the demo are ready, the song time is 0 and the players keep the rest pose.
 */
function frame(): void {
  const wallTime = performance.now() / 1000;
  if (piece) {
    // After a failure, the clock of the `Player` stays at the song time of the failure (6.8).
    songTime = audio && piece.samples !== 'loading' ? audio.player.now() : 0;
    // The processor pauses at the song end (design 6.5).
    const before = state;
    state = followSongTime(state, songTime, piece.score.durationSec, wallTime);
    if (state.transport !== before.transport) {
      updateButton();
    }
    // An empty list: all seats sound until the seat list of step 6 (design 6.6).
    scene.pose(poseAt(piece.plan, songTime, wallTime, state.transport, [], piece.poses));
  }
  scene.render();
  if (piece && !audioStarted) {
    audioStarted = true;
    const first = piece;
    startAudio().catch((error: Error) => {
      fail(first, error);
    });
  }
  requestAnimationFrame(frame);
}

if (import.meta.env.DEV) {
  const hook: DevHook = {
    get songTime() {
      return songTime;
    },
    get playing() {
      return state.transport.playing;
    },
    get instruments() {
      return piece?.plan.players.map((p) => p.instrument) ?? [];
    },
    rotation(player, bone) {
      const rotations = piece?.poses.players[player]?.rotations;
      const i = boneIndex(bone) * 4;
      return rotations ? [...rotations.subarray(i, i + 4)] : [];
    },
  };
  window.zoophony = hook;
}

resize();
updateButton();
showDemo(showPerf60 ? PERF_60 : current).catch(reportError);
requestAnimationFrame(frame);

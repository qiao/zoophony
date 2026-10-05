import type { Player } from '../audio/player.ts';
import { fetchOk } from '../audio/fetch-ok.ts';
import { layoutScene } from '../models/layout-scene.ts';
import type { SceneLayout } from '../models/layout.ts';
import { ModelCache } from '../models/model-cache.ts';
import { preparePoses } from '../pose/plan.ts';
import type { PosePlan } from '../pose/plan.ts';
import { createScenePose, poseAt } from '../pose/pose-at.ts';
import type { ScenePoseBuffer } from '../pose/pose-at.ts';
import type { StageScene } from '../scene/stage-scene.ts';
import { buildScore } from '../score/score.ts';
import type { Score, SectionSize } from '../score/types.ts';
import { Ui } from '../ui/ui.ts';
import { DEFAULT_SPEED, DEFAULT_VOLUME, barShows, volumeGain } from './bar-rules.ts';
import type { Speed } from './bar-rules.ts';
import { DEMOS, demoUrl, isDemoId } from './demos.ts';
import type { DemoId } from './demos.ts';
import { loadShare, loadText, playAction, playLabel, showsFirstScreen } from './play-control.ts';
import type { LoadProgress, SampleState } from './play-control.ts';
import { followSeek, shownSongTime } from './seek.ts';
import { wholeSeconds } from './time-text.ts';
import { STOPPED, followSongTime, seekPlayState, setPlaying, startPlay } from './transport.ts';
import type { PlayState } from './transport.ts';

/**
 * The seed of the pose. A fixed seed gives each demo the same seeded offsets and idle motion on
 * each visit (design 5.3).
 */
const POSE_SEED = 1;

/**
 * The id of `perf-60.mid`, the file of the frame target (design 9.5, 9.7). Only the dev server
 * shows it, with the section size "One per part". `tools/write-perf-60.ts` writes it into
 * `perf/`, which the build does not copy into `dist/`.
 */
export const PERF_60 = 'perf-60';

/** A file that the stage can show: a demo, or `perf-60.mid` on the dev server. */
export type StageFile = DemoId | typeof PERF_60;

/** The current piece: its score, its pose plan, the pose buffer of its frames, and its load. */
interface Piece {
  readonly file: StageFile;
  readonly score: Score;
  readonly plan: PosePlan;
  readonly poses: ScenePoseBuffer;
  /** The load of the samples of the score into the `Player`. */
  samples: SampleState;
  /** The progress of the load, or `null` before the first decoded file. */
  progress: LoadProgress | null;
  /** True if the piece starts when its samples are ready (design 2.2, 2.4). */
  playWhenReady: boolean;
  /** True after the first play of the piece. */
  played: boolean;
}

/** The audio of the page: the `Player` and its helpers, from the module that loads late. */
interface Audio {
  readonly player: Player;
  /**
   * Tells if a load failed because a later load replaced it (design 6.8).
   *
   * @param error The error of the load.
   * @returns True for a `LoadReplacedError`, which the app ignores.
   */
  readonly replaced: (error: Error) => boolean;
  /**
   * Resumes the suspended audio context in a user gesture. A click that waits for the samples
   * calls it, because Safari can reject a resume outside a user gesture (design 2.4, 6.8).
   */
  readonly resume: () => void;
}

/** A piece after the load of its file, with the layout and the player models of its scene. */
interface LoadedPiece {
  readonly piece: Piece;
  readonly layout: SceneLayout;
  readonly models: ModelCache;
}

/**
 * Gives the title and the composer of a file (design 2.8, 8.2).
 *
 * @param file The demo, or `perf-60.mid`.
 * @returns The title and the composer.
 */
function fileTitle(file: StageFile): { readonly title: string; readonly composer: string } {
  return isDemoId(file) ? DEMOS[file] : { title: `${PERF_60}.mid`, composer: '' };
}

/**
 * Loads a file, and calculates its score, its layout, and its pose plan. The layout, the plan,
 * and the scene share one model cache (audit 2026-10-05-pose-scene, finding 8).
 *
 * @param file The demo, or `perf-60.mid`.
 * @param playWhenReady True if the piece starts when its samples are ready.
 * @returns The piece, its layout, and its player models.
 * @throws Error if the file does not load, or if `buildScore()` refuses it.
 */
async function loadPiece(file: StageFile, playWhenReady: boolean): Promise<LoadedPiece> {
  const base = import.meta.env.BASE_URL;
  const perf = file === PERF_60;
  const response = await fetchOk(perf ? `${base}perf/perf-60.mid` : demoUrl(file, base));
  const sectionSize: SectionSize = perf ? 'one-per-part' : 'auto';
  const result = buildScore(new Uint8Array(await response.arrayBuffer()), sectionSize);
  if (!result.ok) {
    throw new Error(`The demo "${file}" is not valid: ${result.error}.`);
  }
  const { score } = result;
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  const plan = preparePoses(score, layout, POSE_SEED, models);
  const piece: Piece = {
    file,
    score,
    plan,
    poses: createScenePose(plan),
    samples: 'loading',
    progress: null,
    playWhenReady,
    played: false,
  };
  return { piece, layout, models };
}

/**
 * The load flow and the transport of the page (design 2.2, 2.4, 6.5): it shows a piece on the
 * stage, loads its samples into the `Player`, plays it with the poses in sync, and connects the
 * UI to the transport.
 */
export class App {
  readonly #canvas: HTMLCanvasElement;
  readonly #scene: StageScene;
  readonly #ui: Ui;
  #piece: Piece | null = null;
  #audio: Audio | null = null;
  /** True after the first start of the audio module. */
  #audioStarted = false;
  #state: PlayState = STOPPED;
  /** The song time of `Player.now()` in the last frame. */
  #songTime = 0;
  /** The seek point that the listener does not hear yet, or `null` (`app/seek.ts`). */
  #seekSec: number | null = null;
  /** The number of the last selection. A later selection replaces an earlier one. */
  #request = 0;
  #speed: Speed = DEFAULT_SPEED;
  #volume = DEFAULT_VOLUME;
  #muted = false;
  /** The wall time of the last pointer motion or tap, in seconds. */
  #activeAt = 0;

  /**
   * Creates the UI over the canvas and connects its controls.
   *
   * @param canvas The canvas of the stage.
   * @param scene The 3D scene on the canvas.
   */
  constructor(canvas: HTMLCanvasElement, scene: StageScene) {
    this.#canvas = canvas;
    this.#scene = scene;
    this.#ui = new Ui(
      document.body,
      {
        onPlay: () => {
          this.#clickPlay();
        },
        onFirstPlay: () => {
          if (!this.#piece?.playWhenReady) {
            this.#clickPlay();
          }
        },
        onSeek: (songSec) => {
          this.#seek(songSec);
        },
        onSpeed: (speed) => {
          this.#speed = speed;
          this.#audio?.player.setRate(speed);
        },
        onVolume: (volume) => {
          this.#volume = volume;
          this.#muted = false;
          this.#applyVolume();
        },
        onMute: () => {
          this.#muted = !this.#muted;
          this.#applyVolume();
        },
        onResetView: () => {
          scene.resetView();
        },
        onFullScreen: () => {
          toggleFullScreen();
        },
        onDrawer: () => {
          this.#ui.drawer.setOpen(!this.#ui.drawer.open);
        },
        onSelectDemo: (id) => {
          // A selection is a clear wish to listen (design 2.2).
          this.#audio?.resume();
          this.select(id, true).catch(reportError);
        },
      },
      DEFAULT_VOLUME,
      document.fullscreenEnabled,
    );
    const active = (): void => {
      this.#activeAt = performance.now() / 1000;
    };
    window.addEventListener('pointermove', active);
    window.addEventListener('pointerdown', active);
  }

  /** The song time of `Player.now()` in the last frame: 0 until the samples are ready. */
  get songTime(): number {
    return this.#songTime;
  }

  /** True while the transport plays. */
  get playing(): boolean {
    return this.#state.transport.playing;
  }

  /** The pose plan of the current piece, or `null` before the first piece. */
  get plan(): PosePlan | null {
    return this.#piece?.plan ?? null;
  }

  /** The poses of the last frame, or `null` before the first piece. */
  get poses(): ScenePoseBuffer | null {
    return this.#piece?.poses ?? null;
  }

  /**
   * Shows a file on the stage in the rest pose, and loads its samples. The scene of the old piece
   * frees its GPU resources, and the page keeps its renderer. The old piece stops (design 2.2).
   * A selection of the current piece only plays it.
   *
   * @param file The demo, or `perf-60.mid`.
   * @param playWhenReady True if the piece starts when its samples are ready: a selection of the
   *   user. The first screen waits for a click.
   */
  async select(file: StageFile, playWhenReady: boolean): Promise<void> {
    const current = this.#piece;
    if (current?.file === file) {
      if (playWhenReady && !this.#state.transport.playing && !current.playWhenReady) {
        this.#clickPlay();
      }
      return;
    }
    const ticket = ++this.#request;
    const loaded = await loadPiece(file, playWhenReady);
    if (ticket !== this.#request) {
      return;
    }
    if (this.#state.transport.playing) {
      this.#audio?.player.pause();
    }
    this.#state = STOPPED;
    this.#seekSec = null;
    this.#piece = loaded.piece;
    this.#scene.show(loaded.layout, loaded.models);
    const { title, composer } = fileTitle(file);
    this.#ui.title.show(title, composer);
    this.#ui.demoList.show(isDemoId(file) ? file : null);
    this.#loadAudio(loaded.piece);
    // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute.
    this.#canvas.dataset['demo'] = file;
  }

  /**
   * Poses the players from the song time of the `Player`, updates the UI, and renders the scene
   * (design 5.1). Until the samples of the piece are ready, the song time is 0 and the players
   * keep the rest pose.
   */
  frame(): void {
    const wallTime = performance.now() / 1000;
    const piece = this.#piece;
    if (piece) {
      // After a failure, the clock of the `Player` stays at the song time of the failure (6.8).
      const audio = this.#audio;
      this.#songTime = audio && piece.samples !== 'loading' ? audio.player.now() : 0;
      this.#seekSec = followSeek(this.#seekSec, this.#songTime);
      // The processor pauses at the song end (design 6.5).
      this.#state = followSongTime(this.#state, this.#songTime, piece.score.durationSec, wallTime);
      // An empty list: all seats sound until the seat list (design 6.6).
      const transport = this.#state.transport;
      this.#scene.pose(poseAt(piece.plan, this.#songTime, wallTime, transport, [], piece.poses));
    }
    this.#updateUi(wallTime);
    this.#scene.render();
    if (piece && !this.#audioStarted) {
      this.#audioStarted = true;
      this.#startAudio().catch((error: Error) => {
        this.#fail(piece, error);
      });
    }
  }

  /**
   * Shows the state of the frame in the UI.
   *
   * @param wallTime The wall time of the frame, in seconds.
   */
  #updateUi(wallTime: number): void {
    const piece = this.#piece;
    const ui = this.#ui;
    const status = piece
      ? { ...piece, playing: this.#state.transport.playing }
      : ({ samples: 'loading', playing: false, playWhenReady: false, played: false } as const);
    const loading = status.samples === 'loading';
    ui.firstScreen.update({
      shown: showsFirstScreen(status),
      loading,
      loadShare: loadShare(piece?.progress ?? null),
      loadText: loadText(piece?.progress ?? null),
    });
    ui.bar.update({
      playLabel: playLabel(status),
      songSec: shownSongTime(this.#seekSec, this.#songTime),
      lengthSec: piece ? wholeSeconds(piece.score.durationSec) : 0,
      seekable: status.samples === 'ready',
      muted: this.#muted || this.#volume === 0,
      fullScreen: document.fullscreenElement !== null,
      drawerOpen: ui.drawer.open,
      shown: barShows({
        playing: status.playing,
        idleSec: wallTime - this.#activeAt,
        focused: ui.bar.focused,
        hovered: ui.bar.hovered,
        drawerOpen: ui.drawer.open,
      }),
    });
    // The smoke test and the screenshot script wait for this attribute (`SAMPLES_READY`).
    if (document.body.dataset['samples'] !== status.samples) {
      document.body.dataset['samples'] = status.samples;
    }
  }

  /** Does the action of a click on play (design 2.4). */
  #clickPlay(): void {
    const piece = this.#piece;
    if (!piece) {
      return;
    }
    const action = playAction({ ...piece, playing: this.#state.transport.playing });
    switch (action) {
      case 'play':
        this.#play(piece);
        break;
      case 'pause':
        this.#pause();
        break;
      case 'wait':
        piece.playWhenReady = true;
        this.#audio?.resume();
        break;
      case 'cancel':
        piece.playWhenReady = false;
        break;
      case 'retry':
        this.#retry(piece);
        break;
    }
  }

  /**
   * Plays the piece, and records the change in the transport of the pose. A play starts the
   * count-in from the start point (design 5.4, 6.5): the seek point that the listener does not
   * hear yet, else the song time of the `Player`.
   *
   * @param piece The current piece, with its samples ready.
   */
  #play(piece: Piece): void {
    const audio = this.#audio;
    if (!audio || piece.samples !== 'ready') {
      return;
    }
    const from = shownSongTime(this.#seekSec, audio.player.now());
    const wallTime = performance.now() / 1000;
    const start = startPlay(this.#state, from, piece.score.durationSec, piece.plan.beats, wallTime);
    audio.player.play(start.countInSec);
    this.#state = start.state;
    piece.played = true;
    piece.playWhenReady = false;
  }

  /** Pauses the piece. A pause in the count-in goes back to the start point and the rest pose. */
  #pause(): void {
    const audio = this.#audio;
    if (!audio) {
      return;
    }
    const now = audio.player.now();
    audio.player.pause();
    this.#state = setPlaying(this.#state, false, performance.now() / 1000, now);
  }

  /**
   * Seeks the piece (design 6.5). A seek during play ends the count-in.
   *
   * @param songSec The seek point, in song seconds.
   */
  #seek(songSec: number): void {
    const piece = this.#piece;
    const audio = this.#audio;
    if (!piece || !audio || piece.samples !== 'ready') {
      return;
    }
    const point = Math.min(Math.max(0, songSec), piece.score.durationSec);
    audio.player.seek(point);
    this.#seekSec = point;
    this.#state = seekPlayState(this.#state, point);
  }

  /** Sends the gain of the volume slider and the mute button to the `Player`. */
  #applyVolume(): void {
    this.#audio?.player.setVolume(volumeGain(this.#volume, this.#muted));
  }

  /**
   * Pauses the transport after a failure, and offers a retry on the play buttons (review of
   * step 5, F9). Step 6 gives the failures the messages of design 2.8.
   *
   * @param failed The piece whose audio failed.
   * @param error The error.
   */
  #fail(failed: Piece, error: Error): void {
    console.error(error);
    failed.samples = 'failed';
    failed.playWhenReady = false;
    if (failed === this.#piece) {
      this.#state = setPlaying(this.#state, false, performance.now() / 1000, this.#songTime);
      this.#seekSec = null;
    }
  }

  /**
   * Loads the samples of a piece into the `Player`. The piece starts when its samples are ready
   * if the user asked for it (design 2.2).
   *
   * @param loading The piece.
   */
  #loadAudio(loading: Piece): void {
    const audio = this.#audio;
    if (!audio) {
      return;
    }
    audio.player
      .load(loading.score, (done, total) => {
        loading.progress = { done, total };
      })
      .then(() => {
        loading.samples = 'ready';
        if (loading === this.#piece && loading.playWhenReady) {
          this.#play(loading);
        }
      })
      .catch((error: Error) => {
        // The app ignores a load that a later selection replaced (design 6.8).
        if (!audio.replaced(error)) {
          this.#fail(loading, error);
        }
      });
  }

  /**
   * Starts the audio module again, or loads the samples again, after a failure. A click on play
   * asks for it, so the piece starts when its samples are ready.
   *
   * @param failed The piece whose audio failed.
   */
  #retry(failed: Piece): void {
    failed.samples = 'loading';
    failed.progress = null;
    failed.playWhenReady = true;
    if (this.#audio) {
      this.#audio.resume();
      this.#loadAudio(failed);
    } else {
      this.#startAudio().catch((error: Error) => {
        this.#fail(failed, error);
      });
    }
  }

  /**
   * Loads the audio module after the first frame of the scene (design 6.3, 7.2), creates the
   * `Player` with the speed and the volume of the bar, and loads the samples of the current
   * piece before the first click.
   */
  async #startAudio(): Promise<void> {
    const { LoadReplacedError, WorkletPlayer } = await import('../audio/player.ts');
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    // A failure during play pauses the transport, so that the animals do not play with no sound.
    // The next load starts a new engine (design 6.8).
    const player = new WorkletPlayer(baseUrl, (error) => {
      if (this.#piece) {
        this.#fail(this.#piece, error);
      }
    });
    player.setRate(this.#speed);
    player.setVolume(volumeGain(this.#volume, this.#muted));
    this.#audio = {
      player,
      replaced: (error) => error instanceof LoadReplacedError,
      resume: () => {
        // A rejected resume needs no report here: the play after the load resumes again, and
        // `play()` gives a rejection to the error function (design 6.8).
        player.context.resume().catch(() => undefined);
      },
    };
    if (this.#piece) {
      this.#loadAudio(this.#piece);
    }
  }
}

/** Enters or leaves the full screen of the page. */
function toggleFullScreen(): void {
  const change = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  change.catch(reportError);
}

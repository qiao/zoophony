import { pieceGainDb } from '../audio/demo-loudness.ts';
import type { Player } from '../audio/player.ts';
import { fetchOk } from '../audio/fetch-ok.ts';
import { layoutScene } from '../models/layout-scene.ts';
import type { SceneLayout } from '../models/layout.ts';
import { ModelCache } from '../models/model-cache.ts';
import { preparePoses } from '../pose/plan.ts';
import type { PosePlan } from '../pose/plan.ts';
import { createScenePose, poseAt } from '../pose/pose-at.ts';
import type { ScenePoseBuffer } from '../pose/pose-at.ts';
import type { SeatAudibility } from '../pose/types.ts';
import type { StageScene } from '../scene/stage-scene.ts';
import { buildScore } from '../score/score.ts';
import { stageMix } from '../score/stage-mix.ts';
import type { ChannelMix } from '../score/stage-mix.ts';
import { cameraAt, createCameraPose } from '../shots/camera-at.ts';
import { SHOT_SEED, prepareShots } from '../shots/prepare.ts';
import type { CameraPose, ShotPlan } from '../shots/types.ts';
import type { Score, SectionSize } from '../score/types.ts';
import { focusKindOf } from '../ui/dom.ts';
import { Ui } from '../ui/ui.ts';
import { playWithSilentSwitch } from './audio-session.ts';
import { DEFAULT_SPEED, DEFAULT_VOLUME, barShows, volumeGain } from './bar-rules.ts';
import { motionEvent, nextMode, startMode } from './camera-mode.ts';
import type { CameraEvent, CameraMode } from './camera-mode.ts';
import type { Speed } from './bar-rules.ts';
import { DEMOS, PERF_60, demoHash, demoUrl, isDemoId } from './demos.ts';
import type { StageFile } from './demos.ts';
import { FILE_ERROR_TEXTS, fileTitle, readScoreFile } from './file-rules.ts';
import { keyAction, keySeekPoint } from './keys.ts';
import { failureMessage, followMessage, textMessage } from './messages.ts';
import type { Failure, Message } from './messages.ts';
import type { TitleLines } from './file-rules.ts';
import { firstScreenView, noPieceStatus, playAction, playLabel } from './play-control.ts';
import type { LoadProgress, SampleState } from './play-control.ts';
import { isClick, seatOfPlayer } from './pick.ts';
import type { PointerPoint } from './pick.ts';
import { changedSeats, followAudibility, seatsAudible, toggleSeatFlag } from './seat-flags.ts';
import type { SeatFlag, SeatFlags } from './seat-flags.ts';
import { seatRows } from './seat-text.ts';
import { followSeek, shownSongTime } from './seek.ts';
import { followFrame, renderTier, watchTier } from './settings.ts';
import type { QualitySetting, TierWatch } from './settings.ts';
import { songTimeValue, wholeSeconds } from './time-text.ts';
import { STOPPED, followSongTime, seekPlayState, setPlaying, startPlay } from './transport.ts';
import type { PlayState } from './transport.ts';

/**
 * The seed of the pose. A fixed seed gives each demo the same seeded offsets and idle motion on
 * each visit (design 5.3).
 */
const POSE_SEED = 1;

/** The current piece: its score, its pose plan, the pose buffer of its frames, and its load. */
interface Piece {
  /** The demo or `perf-60.mid`, or `null` for a file of the user (design 2.1). */
  readonly file: StageFile | null;
  readonly title: TitleLines;
  /** The bytes of the file. A change of the section size builds the score again from them. */
  readonly bytes: Uint8Array;
  /** The score. A change of the section size replaces it, its plan, and its poses (design 3.8). */
  score: Score;
  /**
   * The pan and the reverb send of each synth channel, from the layout of the score (design
   * 6.1). A change of the section size replaces it with the score.
   */
  mix: readonly ChannelMix[];
  plan: PosePlan;
  poses: ScenePoseBuffer;
  /** The camera shots of the score (design 5.6). */
  shots: ShotPlan;
  /** The load of the samples of the score into the `Player`. */
  samples: SampleState;
  /** The progress of the load, or `null` before the first decoded file. */
  progress: LoadProgress | null;
  /** True if the piece starts when its samples are ready (design 2.2, 2.4). */
  playWhenReady: boolean;
  /** True after the first play of the piece. */
  played: boolean;
  /** The mute and solo buttons of each seat. A new file resets them (design 6.6). */
  flags: readonly SeatFlags[];
  /** True for each seat that sounds, from {@link seatsAudible}. */
  audible: readonly boolean[];
  /** The audibility of each seat for `poseAt()` (design 5.5). */
  audibility: readonly (SeatAudibility | undefined)[];
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

/** The scene of a score: the layout, the player models, the pose plan, and the shot plan. */
interface ScoreScene {
  readonly layout: SceneLayout;
  /** The player models, which the layout, the plans, and the scene share. */
  readonly models: ModelCache;
  readonly plan: PosePlan;
  readonly shots: ShotPlan;
}

/** A piece after the load of its file, with the layout and the player models of its scene. */
interface LoadedPiece {
  readonly piece: Piece;
  readonly layout: SceneLayout;
  readonly models: ModelCache;
}

/**
 * Calculates the layout, the pose plan, and the shot plan of a score. The layout, the plans, and
 * the scene share one model cache (audit 2026-10-05-pose-scene, finding 8).
 *
 * @param score The score.
 * @returns The layout, the player models, and the plans.
 */
function planScene(score: Score): ScoreScene {
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  return {
    layout,
    models,
    plan: preparePoses(score, layout, POSE_SEED, models),
    shots: prepareShots(score, layout, SHOT_SEED, models),
  };
}

/**
 * Gives the section size of a file. `perf-60.mid` always uses "One per part" (design 9.5).
 *
 * @param file The demo or `perf-60.mid`, or `null` for a file of the user.
 * @param setting The value of the setting "Section size".
 * @returns The section size for `buildScore()`.
 */
function sectionSizeOf(file: StageFile | null, setting: SectionSize): SectionSize {
  return file === PERF_60 ? 'one-per-part' : setting;
}

/**
 * Builds the score of a file that the app already checked: a demo, or a file that
 * `readScoreFile()` accepted.
 *
 * @param bytes The bytes of the file.
 * @param sectionSize The section size.
 * @param name The name of the file, for the error.
 * @returns The score.
 * @throws Error if `buildScore()` refuses the file.
 */
function scoreOfBytes(bytes: Uint8Array, sectionSize: SectionSize, name: string): Score {
  const result = buildScore(bytes, sectionSize);
  if (!result.ok) {
    throw new Error(`The file "${name}" is not valid: ${result.error}.`);
  }
  return result.score;
}

/**
 * Gives the title and the composer of a demo or of `perf-60.mid` (design 2.8, 8.2).
 *
 * @param file The demo, or `perf-60.mid`.
 * @returns The title and the composer.
 */
function stageFileTitle(file: StageFile): TitleLines {
  return isDemoId(file) ? DEMOS[file] : { title: `${PERF_60}.mid`, composer: '' };
}

/** The file of a new piece: its score and bytes, its title, and its demo. */
interface PieceFile {
  /** The demo or `perf-60.mid`, or `null` for a file of the user. */
  readonly file: StageFile | null;
  readonly title: TitleLines;
  readonly bytes: Uint8Array;
  readonly score: Score;
}

/**
 * Fetches a demo or `perf-60.mid` from the site.
 *
 * @param file The demo, or `perf-60.mid`.
 * @returns The bytes of the file.
 * @throws Error if the file does not load.
 */
async function fetchStageFile(file: StageFile): Promise<Uint8Array> {
  const base = import.meta.env.BASE_URL;
  const response = await fetchOk(
    file === PERF_60 ? `${base}perf/perf-60.mid` : demoUrl(file, base),
  );
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Calculates the scene of a file, and makes its piece with no load and no seat flags.
 *
 * @param source The file and its score.
 * @param playWhenReady True if the piece starts when its samples are ready.
 * @returns The piece, its layout, and its player models.
 */
function preparePiece(source: PieceFile, playWhenReady: boolean): LoadedPiece {
  const { score } = source;
  const { layout, models, plan, shots } = planScene(score);
  const piece: Piece = {
    ...source,
    mix: stageMix(score, layout),
    plan,
    shots,
    poses: createScenePose(plan),
    samples: 'loading',
    progress: null,
    playWhenReady,
    played: false,
    flags: [],
    audible: score.seats.map(() => true),
    audibility: [],
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
  /** The demo whose file did not load, for "Try again", or `null` (design 2.2, 2.8). */
  #failedFile: StageFile | null = null;
  /**
   * True after a click on play before the first piece shows: the piece then starts when its
   * samples are ready (design 2.2).
   */
  #playWhenShown = false;
  #speed: Speed = DEFAULT_SPEED;
  #volume = DEFAULT_VOLUME;
  #muted = false;
  /** The value of the setting "Section size" (design 2.8, 3.8). */
  #sectionSize: SectionSize = 'auto';
  /** The value of the setting "Quality" (design 2.6). */
  #quality: QualitySetting = 'auto';
  /** The automatic tier, from the tier of the device at start (design 2.6). */
  #tierWatch: TierWatch;
  /** The wall time of the last pointer motion or tap, in seconds. */
  #activeAt = 0;
  /** The message at the bottom center, or `null` (design 2.8). */
  #message: Message | null = null;
  /** Cinematic or Free (design 2.5). */
  #cameraMode: CameraMode;
  /** The camera of the shot of the last frame, which `cameraAt()` writes. */
  readonly #shotCamera = createCameraPose();

  /**
   * Creates the UI over the canvas and connects its controls.
   *
   * @param canvas The canvas of the stage.
   * @param scene The 3D scene on the canvas.
   */
  constructor(canvas: HTMLCanvasElement, scene: StageScene) {
    this.#canvas = canvas;
    this.#scene = scene;
    this.#tierWatch = watchTier(scene.tier);
    this.#cameraMode = startMode(scene.reducedMotion);
    this.#ui = new Ui(
      document.body,
      {
        onPlay: () => {
          this.#clickPlay();
        },
        onFirstPlay: () => {
          // The large button follows the rules of the play button of the bar (design 2.2).
          this.#clickPlay();
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
        onCamera: () => {
          this.#changeCamera('toggle');
        },
        onResetView: () => {
          scene.resetView();
          this.#changeCamera('reset');
        },
        onFullScreen: () => {
          toggleFullScreen();
        },
        onDrawer: () => {
          this.#ui.drawer.setOpen(!this.#ui.drawer.open);
        },
        onSelectDemo: (id) => {
          this.#selectDemo(id);
        },
        onFile: (file) => {
          this.#audio?.resume();
          this.openFile(file).catch(reportError);
        },
        onSeatFlag: (seatIndex, flag) => {
          this.#toggleSeat(seatIndex, flag);
        },
        onSectionSize: (size) => {
          this.#setSectionSize(size);
        },
        onQuality: (quality) => {
          this.#quality = quality;
          this.#applySettings();
        },
        onRetry: () => {
          this.#message = null;
          if (this.#failedFile !== null) {
            this.#selectDemo(this.#failedFile);
          } else if (this.#piece?.samples === 'failed') {
            this.#retry(this.#piece);
          }
        },
        onCloseMessage: () => {
          this.#message = null;
        },
      },
      DEFAULT_VOLUME,
      document.fullscreenEnabled,
      window,
    );
    const active = (): void => {
      this.#activeAt = performance.now() / 1000;
    };
    window.addEventListener('pointermove', active);
    window.addEventListener('pointerdown', active);
    window.addEventListener('keydown', (event) => {
      this.#pressKey(event);
    });
    this.#listenForClicks(canvas);
    this.#applySettings();
  }

  /**
   * Does the action of a key of the page (design 2.4). Space plays and pauses, the arrows seek
   * 5 s, Home goes to the start, and C toggles the automatic camera. Escape closes the drawer,
   * and the drawer button gets the focus that the drawer held. A key action shows the bar, as a
   * pointer motion does.
   *
   * @param event The key event.
   */
  #pressKey(event: KeyboardEvent): void {
    const modified = event.ctrlKey || event.altKey || event.metaKey;
    if (event.key === 'Escape' && !modified && this.#ui.drawer.open) {
      const refocus = this.#ui.drawer.focused;
      this.#ui.drawer.setOpen(false);
      if (refocus) {
        this.#ui.bar.focusDrawerButton();
      }
      return;
    }
    const press = { key: event.key, repeat: event.repeat, modified };
    const action = keyAction(press, focusKindOf(document.activeElement));
    if (!action) {
      return;
    }
    event.preventDefault();
    this.#activeAt = performance.now() / 1000;
    if (action === 'play') {
      this.#clickPlay();
    } else if (action === 'camera') {
      this.#changeCamera('toggle');
    } else {
      this.#seek(keySeekPoint(action, shownSongTime(this.#seekSec, this.#songTime)));
    }
  }

  /** Shows the settings, and gives the renderer the tier of the quality setting (design 2.6). */
  #applySettings(): void {
    this.#ui.settings.show(this.#sectionSize, this.#quality);
    this.#scene.setTier(renderTier(this.#quality, this.#tierWatch));
  }

  /**
   * Builds the score of the current piece again with a new section size (design 3.8). The
   * players, the layout, and the poses change. The sound, the seats, the song time, the play
   * state, and the mute and solo flags stay, because the section size changes only the player
   * counts. The `Player` thus keeps its score, and the music does not stop.
   *
   * @param size The new section size.
   */
  #setSectionSize(size: SectionSize): void {
    if (size === this.#sectionSize) {
      return;
    }
    this.#sectionSize = size;
    this.#applySettings();
    const piece = this.#piece;
    if (!piece || piece.file === PERF_60) {
      return;
    }
    const score = scoreOfBytes(piece.bytes, size, piece.title.title);
    const { layout, models, plan, shots } = planScene(score);
    piece.score = score;
    piece.mix = stageMix(score, layout);
    piece.plan = plan;
    piece.shots = shots;
    piece.poses = createScenePose(plan);
    this.#scene.show(layout, models);
    // The build stops the frames, so the automatic tier starts a new window (design 2.6).
    this.#tierWatch = watchTier(this.#tierWatch.tier);
    this.#changeCamera('new-piece');
  }

  /**
   * Opens the seat row of an animal on a click (design 2.3). A drag of the orbit controls is not
   * a click: a drag of more than 4 px, a pinch, or a wheel changes the camera to Free mode
   * (design 2.5).
   *
   * @param canvas The canvas of the stage.
   */
  #listenForClicks(canvas: HTMLCanvasElement): void {
    let down: PointerPoint | null = null;
    /** The press of each pointer that is down on the stage. */
    const presses = new Map<number, PointerPoint>();
    canvas.addEventListener('pointerdown', (event) => {
      const point = { x: event.offsetX, y: event.offsetY };
      down = event.isPrimary && event.button === 0 ? point : null;
      presses.set(event.pointerId, point);
    });
    canvas.addEventListener('pointermove', (event) => {
      const press = presses.get(event.pointerId);
      if (!press) {
        return;
      }
      const motion = motionEvent(press, { x: event.offsetX, y: event.offsetY }, presses.size);
      if (motion) {
        this.#changeCamera(motion);
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      const up = { x: event.offsetX, y: event.offsetY };
      if (down && event.isPrimary && isClick(down, up)) {
        this.#openSeatAt(up);
      }
      down = null;
      presses.delete(event.pointerId);
    });
    canvas.addEventListener('pointercancel', (event) => {
      presses.delete(event.pointerId);
    });
    canvas.addEventListener(
      'wheel',
      () => {
        this.#changeCamera('wheel');
      },
      { passive: true },
    );
  }

  /**
   * Changes the camera mode after an event (design 2.5).
   *
   * @param event The event.
   */
  #changeCamera(event: CameraEvent): void {
    this.#cameraMode = nextMode(this.#cameraMode, event);
  }

  /** Cinematic or Free (design 2.5). */
  get cameraMode(): CameraMode {
    return this.#cameraMode;
  }

  /**
   * Opens the drawer at the seat row of the animal under a point (design 2.3).
   *
   * @param point The point on the canvas, in CSS pixels.
   */
  #openSeatAt(point: PointerPoint): void {
    const piece = this.#piece;
    if (!piece) {
      return;
    }
    const seat = seatOfPlayer(piece.plan.players, this.#scene.pick(point.x, point.y));
    if (seat !== null) {
      this.#ui.drawer.setOpen(true);
      this.#ui.seatList.reveal(seat);
    }
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
   * A selection of the current piece only plays it. A file that does not load keeps the current
   * piece, and the message of 2.8 offers "Try again" (`#failFile()`).
   *
   * @param file The demo, or `perf-60.mid`.
   * @param playWhenReady True if the piece starts when its samples are ready: a selection of the
   *   user. The first screen waits for a click.
   * @returns True if the file shows. False if it did not load, or a later selection replaced it.
   */
  async select(file: StageFile, playWhenReady: boolean): Promise<boolean> {
    const current = this.#piece;
    if (current?.file === file) {
      // A selection of the current demo replaces a failed selection and its message.
      if (this.#failedFile !== null) {
        this.#failedFile = null;
        this.#message = null;
      }
      if (playWhenReady && !this.#state.transport.playing && !current.playWhenReady) {
        this.#clickPlay();
      }
      return true;
    }
    const ticket = ++this.#request;
    const bytes = await fetchStageFile(file).catch((error: Error) => {
      if (ticket === this.#request) {
        this.#failFile(file, error);
      }
      return null;
    });
    if (!bytes || ticket !== this.#request) {
      return false;
    }
    const score = scoreOfBytes(bytes, sectionSizeOf(file, this.#sectionSize), file);
    const title = stageFileTitle(file);
    this.#showPiece(
      preparePiece({ file, title, bytes, score }, playWhenReady || this.#playWhenShown),
    );
    return true;
  }

  /**
   * Selects a demo for the user: a row of the demo list, or "Try again" after its file did not
   * load. The piece starts when its samples are ready (design 2.2). The URL hash names the demo
   * only after its file loads, so that a reload does not open a demo that did not show.
   *
   * @param file The demo, or `perf-60.mid`.
   */
  #selectDemo(file: StageFile): void {
    // A selection is a clear wish to listen (design 2.2).
    this.#audio?.resume();
    this.select(file, true)
      .then((shown) => {
        // The hash opens the demo again after a reload. It adds no entry to the history.
        if (shown && isDemoId(file)) {
          history.replaceState(history.state, '', demoHash(file));
        }
      })
      .catch(reportError);
  }

  /**
   * Records a demo file that did not load, and shows the message with "Try again" (design 2.8).
   * The current piece stays. Before the first piece, the title names the demo, and the play
   * buttons load the file again.
   *
   * @param file The demo, or `perf-60.mid`.
   * @param error The error of the fetch.
   */
  #failFile(file: StageFile, error: Error): void {
    console.error(error);
    this.#failedFile = file;
    this.#message = failureMessage('file', performance.now() / 1000);
    if (!this.#piece) {
      const title = stageFileTitle(file);
      this.#ui.title.show(title.title, title.composer);
    }
  }

  /**
   * Shows a file that the user selected or dropped, and plays it when its samples are ready
   * (design 2.1, 2.2). A file that the rules of 3.3 refuse keeps the current piece, and the page
   * shows the message of 2.8. It also keeps a demo that still loads. A selection while the page
   * reads the file replaces the file.
   *
   * @param file The file.
   */
  async openFile(file: File): Promise<void> {
    const before = this.#request;
    const sectionSize = this.#sectionSize;
    const result = await readScoreFile(file, sectionSize);
    if (before !== this.#request) {
      return;
    }
    if (!result.ok) {
      this.#showMessage(FILE_ERROR_TEXTS[result.error]);
      return;
    }
    this.#request++;
    const { bytes } = result;
    // The section size can change while the page reads the file.
    const score =
      sectionSize === this.#sectionSize
        ? result.score
        : scoreOfBytes(bytes, this.#sectionSize, file.name);
    const title = fileTitle(score.sequenceName, file.name);
    this.#showPiece(preparePiece({ file: null, title, bytes, score }, true));
  }

  /**
   * Replaces the current piece with a new one: it stops the old piece, shows the new scene and
   * title, and loads the samples of the new score (design 2.2).
   *
   * @param loaded The new piece, its layout, and its player models.
   */
  #showPiece(loaded: LoadedPiece): void {
    if (this.#state.transport.playing) {
      this.#audio?.player.pause();
    }
    this.#state = STOPPED;
    this.#seekSec = null;
    // A message of the old piece does not hold for the new one.
    this.#message = null;
    this.#failedFile = null;
    this.#playWhenShown = false;
    const { piece } = loaded;
    this.#piece = piece;
    this.#scene.show(loaded.layout, loaded.models);
    // The mode stays. Cinematic mode takes the shots of the new score (design 2.5).
    this.#changeCamera('new-piece');
    this.#ui.title.show(piece.title.title, piece.title.composer);
    const demo = piece.file !== null && isDemoId(piece.file) ? piece.file : null;
    this.#ui.demoList.show(demo);
    this.#ui.credits.show(demo);
    this.#ui.seatList.show(seatRows(piece.score.seats));
    this.#loadAudio(piece);
    // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute. A
    // file of the user has the value `file`.
    this.#canvas.dataset['demo'] = piece.file ?? 'file';
  }

  /**
   * Toggles the mute or the solo button of a seat (design 6.6). The seats that change get the new
   * value in the `Player` and in the poses. While the samples load, the `Player` gets the silent
   * seats when they are ready (`#sendSilentSeats()`).
   *
   * @param seatIndex The seat.
   * @param flag The button.
   */
  #toggleSeat(seatIndex: number, flag: SeatFlag): void {
    const piece = this.#piece;
    if (!piece) {
      return;
    }
    piece.flags = toggleSeatFlag(piece.flags, seatIndex, flag);
    const audible = seatsAudible(piece.flags, piece.score.seats.length);
    const changed = changedSeats(piece.audible, audible);
    piece.audibility = followAudibility(piece.audibility, audible, performance.now() / 1000);
    piece.audible = audible;
    this.#ui.seatList.update(piece.flags, audible);
    const player = this.#audio?.player;
    if (player && piece.samples === 'ready') {
      for (const i of changed) {
        player.setSeatAudible(i, audible[i] ?? true);
      }
    }
  }

  /**
   * Sends the silent seats of a piece to the `Player` after its samples load. A load resets the
   * seat flags of the `Player`, and a flag before the load has no effect on the new score
   * (design 6.6, 6.8).
   *
   * @param piece The piece with its samples ready.
   */
  #sendSilentSeats(piece: Piece): void {
    const player = this.#audio?.player;
    for (const [i, audible] of piece.audible.entries()) {
      if (!audible) {
        player?.setSeatAudible(i, false);
      }
    }
  }

  /**
   * Shows a message with no button to the user, for example the refusal of a file (design 2.8,
   * 3.3). It replaces the message that shows.
   *
   * @param text The message text of design 2.8.
   */
  #showMessage(text: string): void {
    this.#message = textMessage(text, performance.now() / 1000);
  }

  /**
   * Poses the players from the song time of the `Player`, updates the UI, and renders the scene
   * (design 5.1). Until the samples of the piece are ready, the song time is 0 and the players
   * keep the rest pose. In Cinematic mode, the camera of the shot of the song time shows (5.6).
   */
  frame(): void {
    const wallTime = performance.now() / 1000;
    const piece = this.#piece;
    let shot: CameraPose | null = null;
    if (piece) {
      // After a failure, the clock of the `Player` stays at the song time of the failure (6.8).
      const audio = this.#audio;
      this.#songTime = audio && piece.samples !== 'loading' ? audio.player.now() : 0;
      this.#seekSec = followSeek(this.#seekSec, this.#songTime);
      // The processor pauses at the song end (design 6.5).
      this.#state = followSongTime(this.#state, this.#songTime, piece.score.durationSec, wallTime);
      const transport = this.#state.transport;
      const { plan, audibility, poses } = piece;
      this.#scene.pose(poseAt(plan, this.#songTime, wallTime, transport, audibility, poses));
      if (this.#cameraMode === 'cinematic') {
        // With reduced motion, each shot holds its first camera, and each cut is hard (2.5).
        const view = { aspect: this.#scene.aspect, still: this.#scene.reducedMotion };
        shot = cameraAt(piece.shots, this.#songTime, transport, view, this.#shotCamera);
      }
    }
    this.#followTier(wallTime);
    this.#updateUi(wallTime);
    this.#scene.render(shot);
    if (piece && !this.#audioStarted) {
      this.#audioStarted = true;
      this.#startAudio().catch((error: Error) => {
        this.#fail(piece, error, 'load');
      });
    }
  }

  /**
   * Measures the frame for the automatic tier, and drops the tier of the renderer when the frames
   * are slow (design 2.6). It measures only while the music plays, the tab is visible, and the
   * quality setting is "Auto".
   *
   * @param wallTime The wall time of the frame, in seconds.
   */
  #followTier(wallTime: number): void {
    const measuring =
      this.#quality === 'auto' &&
      this.#state.transport.playing &&
      document.visibilityState === 'visible';
    const before = this.#tierWatch.tier;
    this.#tierWatch = followFrame(this.#tierWatch, wallTime, measuring);
    if (this.#tierWatch.tier !== before) {
      this.#applySettings();
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
      : noPieceStatus(this.#failedFile !== null, this.#playWhenShown);
    ui.firstScreen.update(firstScreenView(status, piece?.progress ?? null));
    ui.bar.update({
      playLabel: playLabel(status),
      songSec: shownSongTime(this.#seekSec, this.#songTime),
      lengthSec: piece ? wholeSeconds(piece.score.durationSec) : 0,
      seekable: status.samples === 'ready',
      muted: this.#muted || this.#volume === 0,
      automaticCamera: this.#cameraMode === 'cinematic',
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
    this.#message = followMessage(this.#message, wallTime, ui.message.held);
    ui.message.update(this.#message);
    // The smoke test and the screenshot script wait for this attribute (`SAMPLES_READY`).
    if (document.body.dataset['samples'] !== status.samples) {
      document.body.dataset['samples'] = status.samples;
    }
    // The smoke test reads the song time here on the built site, which has no dev hook (9.3).
    const songTime = songTimeValue(this.#songTime);
    if (this.#canvas.dataset['songTime'] !== songTime) {
      this.#canvas.dataset['songTime'] = songTime;
    }
  }

  /**
   * Does the action of a click on play (design 2.4). Before the first piece, a click loads the
   * demo file again after it did not load. Else it waits for the first piece, and a second click
   * cancels the wait (design 2.2).
   */
  #clickPlay(): void {
    const piece = this.#piece;
    if (!piece) {
      if (this.#failedFile !== null) {
        this.#selectDemo(this.#failedFile);
      } else {
        this.#playWhenShown = !this.#playWhenShown;
      }
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
    const { durationSec } = piece.score;
    const start = startPlay(
      this.#state,
      from,
      durationSec,
      piece.plan.beats,
      wallTime,
      this.#speed,
    );
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
   * step 5, F9) and in the message of the failure (design 2.8). The console gets the error.
   *
   * @param failed The piece whose audio failed.
   * @param error The error.
   * @param failure `load` for the audio module or the samples, `play` for a later failure.
   */
  #fail(failed: Piece, error: Error, failure: Failure): void {
    console.error(error);
    failed.samples = 'failed';
    failed.playWhenReady = false;
    if (failed === this.#piece) {
      const wallTime = performance.now() / 1000;
      this.#state = setPlaying(this.#state, false, wallTime, this.#songTime);
      this.#seekSec = null;
      this.#message = failureMessage(failure, wallTime);
      // "Try again" of this message retries the audio, not an earlier failed demo file.
      this.#failedFile = null;
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
    const score = { ...loading.score, mix: loading.mix, gainDb: pieceGainDb(loading.file) };
    audio.player
      .load(score, (done, total) => {
        loading.progress = { done, total };
      })
      .then(() => {
        loading.samples = 'ready';
        this.#sendSilentSeats(loading);
        if (loading === this.#piece && loading.playWhenReady) {
          this.#play(loading);
        }
      })
      .catch((error: Error) => {
        // The app ignores a load that a later selection replaced (design 6.8).
        if (!audio.replaced(error)) {
          this.#fail(loading, error, 'load');
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
    // The play button and the message both offer the retry. The message of the failure closes.
    this.#message = null;
    failed.samples = 'loading';
    failed.progress = null;
    failed.playWhenReady = true;
    if (this.#audio) {
      this.#audio.resume();
      this.#loadAudio(failed);
    } else {
      this.#startAudio().catch((error: Error) => {
        this.#fail(failed, error, 'load');
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
    // On iOS, the music plays with the silent switch on (design 2.4).
    playWithSilentSwitch(navigator);
    // A failure during play pauses the transport, so that the animals do not play with no sound.
    // The next load starts a new engine (design 6.8).
    const player = new WorkletPlayer(baseUrl, (error) => {
      if (this.#piece) {
        this.#fail(this.#piece, error, 'play');
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

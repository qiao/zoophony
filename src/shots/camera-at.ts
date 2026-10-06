import type { Vec3 } from '../models/tuples.ts';
import { lastAtOrBefore } from '../pose/blend.ts';
import { smoothstep } from '../pose/rest.ts';
import type { Transport } from '../pose/types.ts';
import { SHOT_BEAM_OPACITY } from './beam-opacity.ts';
import { keyDistance, writeKeyPosition } from './camera-keys.ts';
import type { CameraPose, CameraPoseBuffer, CameraView, Shot, ShotKey, ShotPlan } from './types.ts';
import { FIELD_OF_VIEW, defaultView, portraitWide } from './view.ts';

/**
 * Makes a camera buffer for {@link cameraAt}.
 *
 * @returns A buffer at the origin.
 */
export function createCameraPose(): CameraPoseBuffer {
  return { position: [0, 0, 0], target: [0, 0, 0], fov: FIELD_OF_VIEW, beam: 1 };
}

/** The key of the frame, which `cameraAt()` writes before it reads it. */
interface ScratchKey {
  azimuth: number;
  elevation: number;
  zoom: number;
  fov: number;
}

const scratchKey: ScratchKey = { azimuth: 0, elevation: 0, zoom: 1, fov: FIELD_OF_VIEW };

const blendStart: [number, number, number] = [0, 0, 0];

/**
 * Writes the camera of a shot at a part of its move. A wide shot follows the portrait rule of
 * design 4.5.
 *
 * @param plan The plan.
 * @param shot The shot.
 * @param u The eased part of the move, from 0 to 1.
 * @param aspect The aspect of the view.
 * @param out The position to write.
 * @returns The vertical field of view, in degrees.
 */
function writeShotCamera(
  plan: ShotPlan,
  shot: Shot,
  u: number,
  aspect: number,
  out: [number, number, number],
): number {
  const a: ShotKey = shot.from;
  const b: ShotKey = shot.to;
  const key = scratchKey;
  key.azimuth = a.azimuth + (b.azimuth - a.azimuth) * u;
  key.elevation = a.elevation + (b.elevation - a.elevation) * u;
  key.zoom = a.zoom + (b.zoom - a.zoom) * u;
  key.fov = a.fov + (b.fov - a.fov) * u;
  if (shot.kind === 'wide') {
    // The portrait rule (design 4.5). The larger zoom of the two keys is the zoom of the variant.
    const wide = portraitWide(
      key.azimuth,
      key.elevation,
      key.zoom,
      Math.max(a.zoom, b.zoom),
      aspect,
    );
    key.azimuth = wide.azimuth;
    key.elevation = wide.elevation;
    key.zoom = wide.zoom;
  }
  const distance = keyDistance(plan.stageSide, shot.radius, key, aspect);
  writeKeyPosition(shot.target, key.azimuth, key.elevation, distance, out);
  return key.fov;
}

/**
 * Copies a point into a writable tuple.
 *
 * @param from The point.
 * @param out The tuple to write.
 */
function copyPoint(from: Vec3, out: [number, number, number]): void {
  out[0] = from[0];
  out[1] = from[1];
  out[2] = from[2];
}

/**
 * Calculates the camera of one frame from the song time (design 5.6). Pure: the same plan, song
 * time, transport, and view give the same camera, so a seek, a pause, and a speed change are
 * always correct.
 *
 * 1. Before the first play, the camera is the default view of design 4.5.
 * 2. During play, the time is at least the start point, so the count-in holds the camera of the
 *    start point. While paused, the time is the song time.
 * 3. The shot of the time moves from its `from` key to its `to` key with a smoothstep. With
 *    `still`, it holds its `from` key. A wide shot follows the portrait rule of design 4.5.
 * 4. In the blend time after its start, the shot blends from the end camera of the previous
 *    shot. With `still`, each cut is hard.
 * 5. The factor of the beam opacity comes from the kind of the shot, so it is constant in a
 *    shot. A blend blends it with the camera. The default view has the full beam.
 *
 * @param plan The plan from `prepareShots()`.
 * @param songTime The song time, in seconds.
 * @param transport The play state.
 * @param view The aspect and the motion preference.
 * @param out The camera to write. A new buffer by default.
 * @returns `out`, with the camera of the frame.
 */
export function cameraAt(
  plan: ShotPlan,
  songTime: number,
  transport: Transport,
  view: CameraView,
  out: CameraPoseBuffer = createCameraPose(),
): CameraPose {
  const { aspect, still } = view;
  const time = transport.playing ? Math.max(songTime, transport.startSec) : songTime;
  const i = Math.max(0, lastAtOrBefore(plan.starts, time));
  const current = plan.shots[i];
  if (transport.changedAtWall === null || !current) {
    const first = defaultView(plan.stageSide, aspect, 1);
    copyPoint(first.position, out.position);
    copyPoint(first.target, out.target);
    out.fov = FIELD_OF_VIEW;
    out.beam = 1;
    return out;
  }
  // The move of the first shot starts at the downbeat: its count-in holds the first camera.
  const moveStart = Math.max(current.startSec, 0);
  const span = current.moveEndSec - moveStart;
  const u = still || span <= 0 ? 0 : smoothstep((time - moveStart) / span);
  out.fov = writeShotCamera(plan, current, u, aspect, out.position);
  copyPoint(current.target, out.target);
  out.beam = SHOT_BEAM_OPACITY[current.kind];
  const previous = plan.shots[i - 1];
  const sinceCut = time - current.startSec;
  if (still || !previous || current.blendSec <= 0 || sinceCut >= current.blendSec) {
    return out;
  }
  const w = smoothstep(sinceCut / current.blendSec);
  const fov = writeShotCamera(plan, previous, 1, aspect, blendStart);
  for (let k = 0; k < 3; k++) {
    const p = blendStart[k] ?? 0;
    const t = previous.target[k] ?? 0;
    out.position[k] = p + ((out.position[k] ?? 0) - p) * w;
    out.target[k] = t + ((out.target[k] ?? 0) - t) * w;
  }
  out.fov = fov + (out.fov - fov) * w;
  const beam = SHOT_BEAM_OPACITY[previous.kind];
  out.beam = beam + (out.beam - beam) * w;
  return out;
}

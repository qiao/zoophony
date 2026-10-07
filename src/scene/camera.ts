import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Vec3 } from '../models/tuples.ts';
import { viewFrame, viewOffset } from '../shots/frame.ts';
import type { FrameCover, ViewFrame } from '../shots/frame.ts';
import type { CameraPose } from '../shots/types.ts';
import {
  ELEVATION_LIMITS,
  FIELD_OF_VIEW,
  MAX_DISTANCE_FACTOR,
  MIN_DISTANCE,
  NEAR,
  defaultView,
  farPlane,
} from '../shots/view.ts';

/**
 * The move of the orbit target to the stage center after a change from a close shot to Free mode
 * (design 2.5). A drag in a close shot turned the view around a point 4 m away, and the camera
 * looked lost (UX audit 2026-10-05, SC6).
 */
export const FREE_TARGET_GLIDE = {
  /** The time of the move, in milliseconds. */
  durationMs: 400,
  /** A target nearer than this distance to the stage center does not move, in meters. */
  minDistance: 1,
  /**
   * In the same move, the camera moves out from the stage center to at least this part of the
   * distance of the default view. After a drag in a close shot, the camera stayed 4 m from the stage center,
   * among the stands (UX audit 2026-10-06, N19).
   */
  outShare: 0.6,
} as const;

/**
 * The glide of the frame after a change of the parts of the page over the canvas (design 2.8):
 * the frame follows its new place with this time constant, in milliseconds. It reaches 98% of
 * the move in about 200 ms, as the drawer and the first screen do. With reduced motion, it moves
 * at once.
 */
export const FRAME_GLIDE_MS = 50;

/**
 * Moves a value toward its target in a frame: the rest of the way shrinks by `exp(-dt / time)`.
 *
 * @param value The value of the last frame.
 * @param target The target.
 * @param dtMs The time since the last frame, in milliseconds.
 * @param timeMs The time constant, in milliseconds.
 * @returns The new value. It is the target when less than 0.01 remains.
 */
function glideTo(value: number, target: number, dtMs: number, timeMs: number): number {
  const next = target + (value - target) * Math.exp(-dtMs / timeMs);
  return Math.abs(next - target) < 0.01 ? target : next;
}

/** The move of the orbit target that runs: its start point and its start time. */
interface TargetGlide {
  readonly from: Vector3;
  readonly startMs: number;
  /** The camera at the start of the move. */
  readonly position: Vector3;
  /** The distance of the camera from the stage center at the end of the move. */
  readonly outDistance: number;
}

/**
 * The camera and the orbit controls of the stage (design 2.5, 4.5). In Cinematic mode, the shots
 * of design 5.6 move the camera with {@link StageCamera.follow}. In Free mode, the orbit controls
 * move it with {@link StageCamera.update}, from the camera of the last frame.
 */
export class StageCamera {
  readonly camera: PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #stageSide: number;
  #width = 1;
  #height = 1;
  /** True after the user or a shot moves the view. Then a resize keeps the view. */
  #moved = false;
  /** True when the last frame came from a shot. */
  #following = false;
  readonly #reducedMotion: boolean;
  #glide: TargetGlide | null = null;
  /** The parts of the page over the canvas in the last frame, as the frame shows them now. */
  #cover: FrameCover = { right: 0, lift: 0 };
  /** The time of the last call of {@link StageCamera.frameTo}, or `null` before the first. */
  #frameMs: number | null = null;
  #frame: ViewFrame = { scale: 1, x: 0.5, y: 0.5 };
  /**
   * The share of the fit of a close shot (design 5.6): 1 in a close shot, 0 in a wide shot. After
   * a close shot, Free mode takes it to 0 in the move of the orbit target.
   */
  #fit = 0;
  /** The share of the fit at the start of the move to Free mode, and its start time. */
  #fitGlide: { readonly from: number; readonly startMs: number } | null = null;

  /**
   * Creates the camera and its orbit controls.
   *
   * @param canvas The element that gets the pointer events, or `null` with no events (a test).
   * @param stageSide The stage side `S`, in meters.
   * @param reducedMotion True if the user prefers reduced motion. Then the controls have no
   *   inertia (design 2.5).
   */
  constructor(canvas: HTMLElement | null, stageSide: number, reducedMotion: boolean) {
    this.#stageSide = stageSide;
    this.#reducedMotion = reducedMotion;
    this.camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR, farPlane(1, stageSide));
    const controls = new OrbitControls(this.camera, canvas);
    // Design 2.5: the controls rotate and zoom around the target of the last shot.
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion;
    // The polar angle of three.js counts from the vertical, so it is 90° less the elevation.
    controls.minPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[1];
    controls.maxPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[0];
    controls.minDistance = MIN_DISTANCE;
    controls.addEventListener('start', () => {
      this.#moved = true;
    });
    this.#controls = controls;
  }

  /**
   * Sets the size of the viewport. Before the view moves, the camera takes the default view of
   * the new size.
   *
   * @param width The width of the canvas, in CSS pixels.
   * @param height The height of the canvas, in CSS pixels.
   */
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.camera.aspect = width / height;
    this.#applyFrame();
    const { distance } = defaultView(this.#stageSide, width, height);
    this.#controls.maxDistance = MAX_DISTANCE_FACTOR * distance;
    if (this.#moved) {
      this.camera.updateProjectionMatrix();
    } else {
      this.reset();
    }
  }

  /**
   * Moves the frame to the free area of the page (design 2.8, 4.5): above the bar, left of the
   * open drawer of a wide window, and above the sheet of a phone. The canvas fills the window,
   * and the camera also renders the area under the bar and the drawer. The frame glides to a new
   * place in about 200 ms, at once with reduced motion and at the first call.
   *
   * @param cover The parts of the page over the canvas.
   * @param nowMs The time of the frame, in milliseconds.
   */
  frameTo(cover: FrameCover, nowMs: number): void {
    const dtMs = this.#frameMs === null || this.#reducedMotion ? Infinity : nowMs - this.#frameMs;
    this.#frameMs = nowMs;
    this.#cover = {
      right: glideTo(this.#cover.right, cover.right, dtMs, FRAME_GLIDE_MS),
      lift: glideTo(this.#cover.lift, cover.lift, dtMs, FRAME_GLIDE_MS),
    };
    this.#applyFrame();
    this.camera.updateProjectionMatrix();
  }

  /** The frame of the camera on the canvas, in CSS pixels. */
  get frame(): ViewFrame {
    return this.#frame;
  }

  /** The width of the view divided by its height. */
  get aspect(): number {
    return this.#width / this.#height;
  }

  /** The point that the camera looks at, and that the orbit controls turn around. */
  get target(): Vec3 {
    const { x, y, z } = this.#controls.target;
    return [x, y, z];
  }

  /** Returns to the default view with the field of view of 4.5 ("Reset view", design 2.5). */
  reset(): void {
    const view = defaultView(this.#stageSide, this.#width, this.#height);
    this.camera.position.set(...view.position);
    this.camera.fov = FIELD_OF_VIEW;
    this.#controls.target.set(...view.target);
    this.#controls.update();
    this.#moved = false;
    this.#following = false;
    this.#glide = null;
    this.#fit = 0;
    this.#fitGlide = null;
    this.#applyFrame();
    this.#updateFar();
  }

  /**
   * Shows the camera of a shot (Cinematic mode, design 5.6). It also moves the target of the
   * orbit controls, so that a change to Free mode continues from this camera with no jump.
   *
   * @param pose The camera from `cameraAt()`.
   */
  follow(pose: CameraPose): void {
    this.camera.position.set(...pose.position);
    this.#controls.target.set(...pose.target);
    this.camera.lookAt(this.#controls.target);
    this.camera.fov = pose.fov;
    this.#moved = true;
    this.#following = true;
    this.#glide = null;
    // A cut changes the fit at once, and a blend joins two close shots.
    this.#fit = pose.close ? 1 : 0;
    this.#fitGlide = null;
    this.#applyFrame();
    this.#updateFar();
  }

  /**
   * Applies the inertia of the controls (Free mode), and keeps the far plane behind the stage.
   * At the first frame after a close shot, the orbit target starts to move to the stage center
   * in 0.4 s, at once with reduced motion. The camera turns to the new target, and moves out
   * from the stage center to at least 0.6 of the default distance, so a drag turns the view
   * around the stage (design 2.5).
   *
   * @param nowMs The time of the frame, in milliseconds.
   */
  update(nowMs = performance.now()): void {
    const target = this.#controls.target;
    if (this.#following) {
      this.#following = false;
      const center = new Vector3(...defaultView(this.#stageSide, 1, 1).target);
      if (target.distanceTo(center) >= FREE_TARGET_GLIDE.minDistance) {
        const { distance } = defaultView(this.#stageSide, this.#width, this.#height);
        this.#glide = {
          from: target.clone(),
          startMs: nowMs,
          position: this.camera.position.clone(),
          outDistance: Math.max(
            this.camera.position.distanceTo(center),
            FREE_TARGET_GLIDE.outShare * distance,
          ),
        };
      }
    }
    if (this.#glide) {
      const center = defaultView(this.#stageSide, 1, 1).target;
      const t = this.#reducedMotion
        ? 1
        : Math.min(1, Math.max(0, (nowMs - this.#glide.startMs) / FREE_TARGET_GLIDE.durationMs));
      const u = t * t * (3 - 2 * t);
      const { from, position, outDistance } = this.#glide;
      target.set(
        from.x + (center[0] - from.x) * u,
        from.y + (center[1] - from.y) * u,
        from.z + (center[2] - from.z) * u,
      );
      // The camera moves out on the ray from the stage center through its start point.
      const ray = position.clone().sub(new Vector3(...center));
      const start = ray.length();
      ray.multiplyScalar((start + (outDistance - start) * u) / start);
      this.camera.position.set(center[0] + ray.x, center[1] + ray.y, center[2] + ray.z);
      if (t >= 1) {
        this.#glide = null;
      }
    }
    this.#glideFit(nowMs);
    this.#controls.update();
    this.#updateFar();
  }

  /**
   * Takes the fit of a close shot to 0 in Free mode, with the move of the orbit target: in 0.4 s
   * with a smoothstep, at once with reduced motion. Thus the change to Free mode does not jump.
   *
   * @param nowMs The time of the frame, in milliseconds.
   */
  #glideFit(nowMs: number): void {
    if (this.#fit <= 0) {
      return;
    }
    this.#fitGlide ??= { from: this.#fit, startMs: nowMs };
    const { from, startMs } = this.#fitGlide;
    const t = this.#reducedMotion
      ? 1
      : Math.min(1, Math.max(0, (nowMs - startMs) / FREE_TARGET_GLIDE.durationMs));
    this.#fit = from * (1 - t * t * (3 - 2 * t));
    if (t >= 1) {
      this.#fit = 0;
      this.#fitGlide = null;
    }
    this.#applyFrame();
  }

  /** Removes the event listeners of the orbit controls from the canvas. */
  dispose(): void {
    if (this.#controls.domElement) {
      this.#controls.dispose();
    }
  }

  /** Sets the view offset of the frame. The caller updates the projection matrix. */
  #applyFrame(): void {
    this.#frame = viewFrame(this.#width, this.#height, this.#cover, this.#fit);
    this.camera.setViewOffset(...viewOffset(this.#width, this.#height, this.#frame));
  }

  #updateFar(): void {
    const distance = this.camera.position.distanceTo(this.#controls.target);
    this.camera.far = farPlane(distance, this.#stageSide);
    this.camera.updateProjectionMatrix();
  }
}

import './views.css';

import { Box3, DirectionalLight, Group, HemisphereLight, OrthographicCamera, Scene } from 'three';
import type { MeshStandardMaterial } from 'three';

import { DEG, IDENTITY, invert, length, multiply, rotationBetween, sub } from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { buildMusicStand, buildSupport } from '../models/props.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { PODIUM_SIZE, buildPodium } from '../models/stage.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { solveTwoBone } from '../pose/ik.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createMaterials } from '../scene/geometry.ts';
import { FILL_COLORS, SPOT_COLOR, SPOT_ILLUMINANCE } from '../scene/lights.ts';
import {
  applyPose,
  createPlayerGeometry,
  createPlayerMesh,
  createStaticMesh,
  staticPose,
} from '../scene/player.ts';
import { createRenderer } from '../scene/renderer.ts';
import { VIEWS_PAGE_SIZE, VIEW_ELEVATION_DEG, VIEW_ROWS, viewTurn } from './views.ts';
import type { ViewGroup, ViewSide } from './views.ts';

/** The distance of a music stand in front of a wind player, in meters (design 4.5). */
const STAND_DISTANCE = 0.65;

/** The views of each group, in the order of {@link ViewGroup.centers}. */
const VIEWS: readonly ViewSide[] = ['front', 'side', 'back'];

function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) {
    throw new Error(`The views page has no element "${selector}".`);
  }
  return found;
}

/**
 * Calculates a pose that puts each palm on the grip of the instrument, for a player with no
 * static playing pose. The hands keep their bind rotation, and the elbows point down and out.
 *
 * @param model The player model.
 * @returns The pose, or `null` if the instrument has no grip for a palm.
 */
function gripPose(model: PlayerModel): AnimalPose | null {
  const { grips } = model.instrument;
  if (!grips.palmL && !grips.palmR) {
    return null;
  }
  const at = (name: BoneName): Vec3 => model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  const world = new Map<BoneName, Quat>();
  for (const [side, grip, palm, out] of [
    ['L', grips.palmL, model.body.palmL, -1],
    ['R', grips.palmR, model.body.palmR, 1],
  ] as const) {
    if (!grip) {
      continue;
    }
    const shoulder = at(`upperArm${side}`);
    const elbow = at(`forearm${side}`);
    const wrist = at(`hand${side}`);
    const target = sub(placePoint(model.pieces, grip), sub(palm, wrist));
    const joints = solveTwoBone(
      shoulder,
      target,
      length(sub(elbow, shoulder)),
      length(sub(wrist, elbow)),
      [out, -1, 0.3],
    );
    const upper = rotationBetween(sub(elbow, shoulder), sub(joints.elbow, shoulder));
    const lower = rotationBetween(sub(wrist, elbow), sub(joints.wrist, joints.elbow));
    world.set(`upperArm${side}`, upper);
    world.set(`forearm${side}`, lower);
    world.set(`hand${side}`, IDENTITY);
  }
  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worldOf: Quat[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = model.skeleton.parents[i] ?? -1;
    const parentWorld = parent >= 0 ? (worldOf[parent] ?? IDENTITY) : IDENTITY;
    const target = world.get(name);
    const turn = target ? multiply(invert(parentWorld), target) : IDENTITY;
    worldOf.push(target ?? parentWorld);
    rotations.set(turn, i * 4);
  }
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}

/**
 * Builds one view of a group: the player in its static pose, with its seat and its props.
 *
 * @param group The model and its props.
 * @param model The player model.
 * @param pose The pose of the player, or `null` for the bind pose.
 * @param materials The matte and the metal material.
 * @returns The view in the axes of the model, in meters.
 */
function buildView(
  group: ViewGroup,
  model: PlayerModel,
  pose: AnimalPose | null,
  materials: readonly MeshStandardMaterial[],
): Group {
  const view = new Group();
  const player = createPlayerMesh(model, createPlayerGeometry(model), materials);
  if (pose) {
    applyPose(player, pose);
  }
  view.add(player);
  const seat = buildSupport(model.support);
  if (seat) {
    view.add(createStaticMesh(seat, materials));
  }
  if (group.stand) {
    const stand = createStaticMesh(buildMusicStand(), materials);
    stand.position.z = -STAND_DISTANCE;
    view.add(stand);
  }
  if (group.podium) {
    view.add(createStaticMesh(buildPodium(), materials));
    player.position.y = PODIUM_SIZE[1];
  }
  return view;
}

const canvas = element('#views', HTMLCanvasElement);
const labels = element('#labels', HTMLDivElement);
canvas.style.width = `${VIEWS_PAGE_SIZE}px`;
canvas.style.height = `${VIEWS_PAGE_SIZE}px`;

const renderer = createRenderer(canvas, 'high', window.devicePixelRatio);
renderer.setSize(VIEWS_PAGE_SIZE, VIEWS_PAGE_SIZE, false);
const scene = new Scene();
const materials = createMaterials();

// One world unit is one CSS pixel of the page, and y points up, so a page row is at y = -top.
for (const row of VIEW_ROWS) {
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = row.title;
  title.style.transform = `translate(25px, ${row.titleTop}px)`;
  labels.append(title);
  for (const group of row.groups) {
    const model = buildPlayer(group.species, group.instrument);
    const pose = staticPose(model) ?? gripPose(model);
    let pixelsPerMeter = 0;
    for (const [i, view] of VIEWS.entries()) {
      const object = buildView(group, model, pose, materials);
      object.rotation.y = viewTurn(view);
      object.updateMatrixWorld(true);
      const box = new Box3().setFromObject(object, true);
      if (i === 0) {
        // Each group fills the height of its row, as in the reference image.
        pixelsPerMeter = (row.floor - row.top) / (box.max.y - box.min.y);
      }
      const center = group.centers[i] ?? 0;
      object.scale.setScalar(pixelsPerMeter);
      object.position.set(
        center - pixelsPerMeter * (box.min.x + box.max.x) * 0.5,
        -row.floor - pixelsPerMeter * box.min.y,
        0,
      );
      scene.add(object);
      const label = document.createElement('span');
      label.textContent = view[0]?.toUpperCase() + view.slice(1);
      label.style.transform = `translate(${center}px, ${row.labelTop}px) translate(-50%, 0)`;
      labels.append(label);
    }
  }
}

// The light of the stage center: the spotlight color and illuminance from the front, above, and
// a little to the left, as in the reference image, and the fill light of the stage (design 4.5).
const key = new DirectionalLight(SPOT_COLOR, SPOT_ILLUMINANCE);
key.position.set(VIEWS_PAGE_SIZE / 2 - 600, -VIEWS_PAGE_SIZE / 2 + 1400, 1200);
key.target.position.set(VIEWS_PAGE_SIZE / 2, -VIEWS_PAGE_SIZE / 2, 0);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.radius = 1;
key.shadow.camera.left = -800;
key.shadow.camera.right = 800;
key.shadow.camera.top = 800;
key.shadow.camera.bottom = -800;
key.shadow.camera.near = 100;
key.shadow.camera.far = 4000;
key.shadow.bias = -0.0005;
key.shadow.normalBias = 1;
scene.add(key, key.target);
scene.add(new HemisphereLight(FILL_COLORS.sky, FILL_COLORS.ground, 12));

// An orthographic camera that looks down at the elevation of the reference image. The frustum
// height is the page size times the cosine of the elevation, so that a point at z = 0 keeps its
// place on the page.
const elevation = VIEW_ELEVATION_DEG * DEG;
const half = VIEWS_PAGE_SIZE / 2;
const camera = new OrthographicCamera(
  -half,
  half,
  half * Math.cos(elevation),
  -half * Math.cos(elevation),
  1,
  10_000,
);
camera.position.set(half, -half + 3000 * Math.sin(elevation), 3000 * Math.cos(elevation));
camera.lookAt(half, -half, 0);

function frame(): void {
  renderer.render(scene, camera);
  // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute.
  canvas.dataset['ready'] = 'views';
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

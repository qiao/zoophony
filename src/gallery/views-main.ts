import './views.css';

import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
} from 'three';
import type { MeshStandardMaterial } from 'three';

import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { buildMusicStand, buildSupport } from '../models/props.ts';
import { PODIUM_SIZE, buildPodium } from '../models/stage.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createMaterials } from '../scene/geometry.ts';
import {
  applyPose,
  createPlayerGeometry,
  createPlayerMesh,
  createStaticMesh,
} from '../scene/player.ts';
import { createRenderer } from '../scene/renderer.ts';
import { demoUrl } from '../app/demos.ts';
import { fetchOk } from '../audio/fetch-ok.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { buildScore } from '../score/score.ts';
import { conductorPose, gripPose, playingPoses } from './view-poses.ts';
import { VIEWS_PAGE_SIZE, VIEW_ELEVATION_DEG, VIEW_LIGHT, VIEW_ROWS, viewTurn } from './views.ts';
import type { ViewGroup, ViewSide } from './views.ts';

/**
 * The music stand of a wind player on the views page: its distance in front of the seat, and the
 * scale of its height. In `animals.webp`, the desk is low, under the instrument, so that it does
 * not hide the face, and the front view shows it in front of the belly. At 0.45 of its height, the
 * desk was at the knees.
 */
const LOW_STAND = { distance: 0.7, height: 0.6 } as const;

/**
 * The move of the podium to the left of the conductor on the views page, in meters. The podium
 * turns so that its stand is at the left side of the bear, as in `animals.webp`. The stage keeps
 * the stand of design 4.5 in front of the bear.
 */
const PODIUM_SHIFT = 0.25;

/** The demo that gives the playing poses of the bowed strings. */
const POSE_DEMO = 'beethoven-5';

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
    stand.position.z = -LOW_STAND.distance;
    stand.scale.y = LOW_STAND.height;
    view.add(stand);
  }
  if (group.podium) {
    const podium = createStaticMesh(buildPodium(), materials);
    podium.rotation.y = Math.PI / 2;
    podium.position.x = -PODIUM_SHIFT;
    view.add(podium);
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
// The neutral tone mapping keeps the hue of the bright studio colors. ACES Filmic moved the
// orange of the fox to yellow.
renderer.toneMapping = NeutralToneMapping;
const scene = new Scene();
const materials = createMaterials();

/**
 * Gives the pose of a player on the views page: the pose of step 5 for a bowed string player, the
 * raised baton for the conductor, and the grips of the hands for a wind player.
 *
 * @param group The species and the instrument.
 * @param model The player model.
 * @param played The playing poses of the demo.
 * @returns The pose, or `null` for the bind pose.
 */
function viewPose(
  group: ViewGroup,
  model: PlayerModel,
  played: ReadonlyMap<string, AnimalPose>,
): AnimalPose | null {
  if (group.instrument === 'baton') {
    return conductorPose(model);
  }
  return played.get(`${group.species} ${group.instrument}`) ?? gripPose(model);
}

const response = await fetchOk(demoUrl(POSE_DEMO, import.meta.env.BASE_URL));
const result = buildScore(new Uint8Array(await response.arrayBuffer()), 'auto');
if (!result.ok) {
  throw new Error(`The demo "${POSE_DEMO}" is not valid: ${result.error}.`);
}
const played = playingPoses(result.score, layoutScene(result.score));

// One world unit is one CSS pixel of the page, and y points up, so a page row is at y = -top.
for (const row of VIEW_ROWS) {
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = row.title;
  title.style.transform = `translate(25px, ${row.titleTop}px)`;
  labels.append(title);
  for (const group of row.groups) {
    const model = buildPlayer(group.species, group.instrument);
    const pose = viewPose(group, model, played);
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

// The studio light of the reference image: a bright key light from the left, above, and the
// front, a soft fill light, and a rim light from behind. The stage keeps its own light.
const key = new DirectionalLight(VIEW_LIGHT.keyColor, VIEW_LIGHT.key);
key.position.set(VIEWS_PAGE_SIZE / 2 - 1100, -VIEWS_PAGE_SIZE / 2 + 1300, 1000);
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
scene.add(new HemisphereLight(VIEW_LIGHT.skyColor, VIEW_LIGHT.groundColor, VIEW_LIGHT.fill));
const rim = new DirectionalLight(VIEW_LIGHT.keyColor, VIEW_LIGHT.rim);
rim.position.set(VIEWS_PAGE_SIZE / 2 + 800, -VIEWS_PAGE_SIZE / 2 + 900, -1500);
rim.target.position.set(VIEWS_PAGE_SIZE / 2, -VIEWS_PAGE_SIZE / 2, 0);
scene.add(rim, rim.target);

// An orthographic camera that looks down at the elevation of the reference image. The frustum
// height is the page size times the cosine of the elevation, so that a point at z = 0 keeps its
// place on the page.
const elevation = VIEW_ELEVATION_DEG * MathUtils.DEG2RAD;
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

import './style.css';

import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SpotLight,
  Vector3,
} from 'three';
import type { SkinnedMesh } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Bounds } from '../models/bounds.ts';
import { SCENE_COLORS } from '../models/colors.ts';
import { DEG } from '../models/math.ts';
import { MeshBuilder } from '../models/mesh.ts';
import { buildPlayer } from '../models/player.ts';
import { buildSupport } from '../models/props.ts';
import { BONE_NAMES } from '../models/rig.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createMaterials } from '../scene/geometry.ts';
import { createLights } from '../scene/lights.ts';
import {
  applyPose,
  createPlayerGeometry,
  createPlayerMesh,
  createStaticMesh,
  staticPose,
} from '../scene/player.ts';
import { createRenderer } from '../scene/renderer.ts';
import { boundsOf, gridPlaces, instrumentItems, speciesItems } from './items.ts';
import type { GalleryItem } from './items.ts';
import { DEFAULT_TEST_NOTES, keyName, notesAt, parseTestNotes } from './notes.ts';

/** The two pages of the gallery (design 7.1). */
type GalleryPage = 'species' | 'instruments';

/** The number of models in a row on each page. */
const COLUMNS = { species: 8, instruments: 6 } as const satisfies Readonly<
  Record<GalleryPage, number>
>;

/** The blur radius of the shadows in the gallery, in texels. */
const GALLERY_SHADOW_RADIUS = 1;

/** The smallest free space between two models, in meters. */
const GAP = 0.8;

/**
 * The depth of floor in front of a row that its labels cover, in meters. The labels of two lines
 * touched the heads of the next row (review of step 4, P4).
 */
const LABEL_DEPTH = 0.5;

/** The angle of the camera above the floor. The camera looks at the models from the front. */
const ELEVATION = 35 * DEG;

/**
 * Gives the turn of a model around y. Each model faces the camera, except the pianist. It faces
 * +x, as on the stage, so that the camera sees it beside the piano and the open lid.
 */
function facingOf(item: GalleryItem): number {
  return item.instrument === 'piano' ? -Math.PI / 2 : Math.PI;
}

/** One model of the gallery in the scene. */
interface GalleryModel {
  readonly item: GalleryItem;
  /** The model in its own axes: it faces -z, and the floor is at y = 0. */
  readonly object: Group;
  readonly bounds: Bounds;
  /** The skinned mesh of a player, or `null` for an instrument alone. */
  readonly player: SkinnedMesh | null;
  /** The playing pose of the player, or `null` if it has none before step 5. */
  readonly playing: AnimalPose | null;
}

/** The bind pose: no rotation on any bone (design 4.7). */
const BIND_POSE: AnimalPose = {
  rotations: new Float32Array(BONE_NAMES.flatMap(() => [0, 0, 0, 1])),
  rootOffset: [0, 0, 0],
  slideOffset: [0, 0, 0],
  blink: 0,
};

function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) {
    throw new Error(`The gallery page has no element "${selector}".`);
  }
  return found;
}

/**
 * Builds a species with its instrument, on its seat, in the bind pose.
 *
 * @param item The species and the instrument.
 * @param materials The matte and the metal material.
 * @returns The model.
 */
function buildSpeciesModel(
  item: GalleryItem,
  materials: readonly MeshStandardMaterial[],
): GalleryModel {
  const model = buildPlayer(item.species, item.instrument);
  const seat = buildSupport(model.support);
  const player = createPlayerMesh(model, createPlayerGeometry(model), materials);
  const object = new Group();
  object.add(player);
  if (seat) {
    object.add(createStaticMesh(seat, materials));
  }
  const bounds = boundsOf(seat ? [model.mesh, seat] : [model.mesh]);
  return { item, object, bounds, player, playing: staticPose(model) };
}

/**
 * Builds an instrument alone. Its pieces keep the places that they have in the hands of the
 * player, and the instrument rests on the floor.
 *
 * @param item The instrument and the species that holds it.
 * @param materials The matte and the metal material.
 * @returns The model.
 */
function buildInstrumentModel(
  item: GalleryItem,
  materials: readonly MeshStandardMaterial[],
): GalleryModel {
  const builder = new MeshBuilder();
  for (const { piece, at } of buildPlayer(item.species, item.instrument).pieces) {
    for (const part of piece.parts) {
      builder.add(part.corners, { color: part.color, group: part.group, at });
    }
  }
  const data = builder.build();
  const bounds = boundsOf([data]);
  const mesh = createStaticMesh(data, materials);
  mesh.position.y = -bounds.min[1];
  const object = new Group();
  object.add(mesh);
  return { item, object, bounds, player: null, playing: null };
}

const canvas = element('#gallery', HTMLCanvasElement);
const labels = element('#labels', HTMLDivElement);
const time = element('#time', HTMLInputElement);
const timeValue = element('#time-value', HTMLOutputElement);
const notesInput = element('#notes', HTMLTextAreaElement);
const status = element('#status', HTMLParagraphElement);

const page: GalleryPage =
  new URLSearchParams(window.location.search).get('page') === 'instruments'
    ? 'instruments'
    : 'species';
element(`#page-${page}`, HTMLAnchorElement).setAttribute('aria-current', 'page');

const renderer = createRenderer(canvas, 'high', window.devicePixelRatio);
const scene = new Scene();
const materials = createMaterials();
const items = page === 'species' ? speciesItems() : instrumentItems();
const models = items.map((item) =>
  page === 'species' ? buildSpeciesModel(item, materials) : buildInstrumentModel(item, materials),
);

const sizes = models.map(({ item, bounds }) => {
  const across = bounds.max[0] - bounds.min[0];
  const along = bounds.max[2] - bounds.min[2];
  // A turn of 90° swaps the width and the depth of the box.
  const turned = Math.abs(Math.sin(facingOf(item))) > 0.5;
  return {
    width: turned ? along : across,
    depth: turned ? across : along,
    height: bounds.max[1] - bounds.min[1],
  };
});
const places = gridPlaces(sizes, COLUMNS[page], GAP, 1 / Math.tan(ELEVATION), LABEL_DEPTH);
const labelAnchors: Vector3[] = [];
for (const [i, model] of models.entries()) {
  const [x, z] = places[i] ?? [0, 0];
  const { min, max } = model.bounds;
  const facing = facingOf(model.item);
  // The turn around y moves the center (cx, cz) of the box to
  // (cx cos + cz sin, -cx sin + cz cos). The model moves back by that amount.
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  model.object.position.set(x - (cx * cos + cz * sin), 0, z - (-cx * sin + cz * cos));
  model.object.rotation.y = facing;
  scene.add(model.object);
  labelAnchors.push(new Vector3(x, 0, z + (sizes[i]?.depth ?? 0) / 2 + 0.15));
  const label = document.createElement('span');
  label.textContent = model.item.label;
  labels.append(label);
}

const extentX = Math.max(...places.map(([x], i) => Math.abs(x) + (sizes[i]?.width ?? 0) / 2));
const extentZ = Math.max(...places.map(([, z], i) => Math.abs(z) + (sizes[i]?.depth ?? 0) / 2));
const floorSide = 2 * Math.max(extentX, extentZ) + 2;
const floor = new Mesh(
  new PlaneGeometry(floorSide, floorSide),
  new MeshStandardMaterial({
    color: new Color().setRGB(...SCENE_COLORS.stageTop),
    roughness: 0.85,
    metalness: 0,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const lights = createLights(floorSide, 'high');
// The gallery shows the models, so it has no visible beam.
lights.remove(...lights.children.filter((child) => child instanceof Mesh));
scene.add(lights);
const spot = lights.children.find((child) => child instanceof SpotLight);
if (spot) {
  // The radius 3 of the high tier shows the noise of PCFShadowMap as a fine grid on each lit face
  // in a close view. The radius 1 halves it (review of step 3, F11).
  spot.shadow.radius = GALLERY_SHADOW_RADIUS;
}

const camera = new PerspectiveCamera(30, 1, 0.1, 10 * floorSide);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.6, 0);

/** The corners of the box around all models, for the camera fit. */
const corners = [-1, 1].flatMap((sx) =>
  [0, 2].flatMap((y) => [-1, 1].map((sz) => new Vector3(sx * extentX, y, sz * extentZ))),
);

/**
 * Places the camera in front of the models, at the smallest distance that shows the box around
 * all of them with a margin.
 */
function frameModels(): void {
  const fits = (distance: number): boolean => {
    camera.position.set(0, 0.6 + distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION));
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    return corners.every((corner) => {
      const p = corner.clone().project(camera);
      return Math.abs(p.x) <= 0.95 && Math.abs(p.y) <= 0.9;
    });
  };
  let distance = 1;
  while (!fits(distance)) {
    distance += 0.1;
  }
  controls.update();
}

function resize(): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  frameModels();
}

/**
 * Shows the time and the notes that sound at it. Before step 5, a player with a playing pose
 * shows it while a note sounds, and the bind pose else.
 */
function update(): void {
  const result = parseTestNotes(notesInput.value);
  if (!result.ok) {
    status.textContent = `Line ${result.line} is not valid.`;
    return;
  }
  const end = Math.max(0, ...result.notes.map((note) => note.start + note.length));
  time.max = String(Math.max(4, Math.ceil(end + 1)));
  const at = Number(time.value);
  timeValue.textContent = `${at.toFixed(2)} s`;
  const sounding = notesAt(result.notes, at);
  status.textContent =
    sounding.length > 0
      ? `Sounding: ${sounding.map((note) => keyName(note.key)).join(', ')}`
      : 'No note sounds.';
  for (const model of models) {
    if (model.player) {
      applyPose(model.player, sounding.length > 0 && model.playing ? model.playing : BIND_POSE);
    }
  }
}

notesInput.value = DEFAULT_TEST_NOTES;
time.addEventListener('input', update);
notesInput.addEventListener('input', update);
window.addEventListener('resize', resize);
resize();
update();

const projected = new Vector3();

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  for (const [i, label] of [...labels.children].entries()) {
    const anchor = labelAnchors[i];
    if (!(label instanceof HTMLElement) || !anchor) {
      continue;
    }
    projected.copy(anchor).project(camera);
    const x = ((projected.x + 1) / 2) * width;
    const y = ((1 - projected.y) / 2) * height;
    label.style.transform = `translate(${x}px, ${y}px) translate(-50%, 0)`;
  }
  // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute.
  canvas.dataset['ready'] = page;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

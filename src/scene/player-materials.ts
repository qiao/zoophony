import { ImageLoader, SRGBColorSpace, Texture } from 'three';
import type { MeshStandardMaterial } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { createSkinMaterial } from './geometry.ts';

/** Loads the image of a skin texture from its URL. */
export type SkinLoader = (url: string) => Promise<Texture['image']>;

/** Loads an image with three.js, in the page. */
const loadImage: SkinLoader = (url) => new ImageLoader().loadAsync(url);

/**
 * The materials of the players (design 4.4, 4.5): the shared material of `createMaterials()`, and
 * one skin material for each skin texture of a rigged body. All players of one species share its
 * skin material. A skin material stays hidden until its texture loads, so that a body never shows
 * the black of a texture with no image.
 */
export class PlayerMaterials {
  /** The shared material of the players with no skin and of the props. */
  readonly #base: readonly [MeshStandardMaterial];
  /** The skin material of each skin URL. */
  readonly #skins = new Map<string, MeshStandardMaterial>();
  /** The load of each skin texture. Each one resolves, also when its load fails. */
  readonly #loads: Promise<void>[] = [];
  /** The loader of the skin images. */
  readonly #load: SkinLoader;

  /**
   * Creates the materials, and starts the load of some skins, so that they are ready for the
   * first frame.
   *
   * @param base The material of `createMaterials()`.
   * @param skins The URLs of the skins to load now.
   * @param load The loader of the skin images. A test gives one with no network.
   */
  constructor(
    base: readonly [MeshStandardMaterial],
    skins: readonly string[] = [],
    load: SkinLoader = loadImage,
  ) {
    this.#base = base;
    this.#load = load;
    for (const skin of skins) {
      this.#skin(skin);
    }
  }

  /**
   * Gives the materials of a player: its skin material, or the shared material for a body with no
   * skin.
   *
   * @param model The player model.
   * @returns The materials, for one geometry group.
   */
  of(model: PlayerModel): readonly MeshStandardMaterial[] {
    return model.skin ? [this.#skin(model.skin)] : this.#base;
  }

  /** The shared material of the players with no skin and of the props. */
  get base(): readonly [MeshStandardMaterial] {
    return this.#base;
  }

  /** Each material: the shared material, then the skin materials. A new layout keeps them. */
  get all(): readonly MeshStandardMaterial[] {
    return [...this.#base, ...this.#skins.values()];
  }

  /** A promise that resolves when each skin that the materials know has loaded or failed. */
  get ready(): Promise<void> {
    return Promise.all(this.#loads).then(() => undefined);
  }

  /** Frees the skin materials and their textures. The shared material stays. */
  dispose(): void {
    for (const material of this.#skins.values()) {
      material.map?.dispose();
      material.dispose();
    }
    this.#skins.clear();
  }

  /**
   * Gives the skin material of a skin URL, and creates it on the first call.
   *
   * @param url The URL of the skin texture.
   * @returns The material.
   */
  #skin(url: string): MeshStandardMaterial {
    const known = this.#skins.get(url);
    if (known) {
      return known;
    }

    const [base] = this.#base;
    const texture = new Texture();
    texture.colorSpace = SRGBColorSpace;
    const material = createSkinMaterial(base, texture);
    material.visible = false;
    this.#skins.set(url, material);
    this.#loads.push(
      this.#load(url).then(
        (image) => {
          texture.image = image;
          texture.needsUpdate = true;
          material.visible = true;
        },
        () => {
          // A failed load shows the body in its vertex colors, with no map.
          console.error(`The skin ${url} did not load.`);
          material.map = null;
          material.needsUpdate = true;
          material.visible = true;
        },
      ),
    );
    return material;
  }
}

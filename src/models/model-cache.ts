import { buildPlayer } from './player.ts';
import type { PlayerModel } from './player.ts';
import type { SpeciesId } from './species.ts';
import type { KettleCount } from './instruments/percussion.ts';
import type { InstrumentId } from './instruments/types.ts';

/**
 * The player models of one score, by species, instrument, and kettle count. The layout, the pose
 * plan, and the scene share one cache, so that each kind of player builds its model one time for
 * each score (audit 2026-10-05-pose-scene, finding 8). `buildPlayer()` is pure, so a cached model
 * is equal to a new one.
 */
export class ModelCache {
  readonly #models = new Map<string, PlayerModel>();

  /**
   * Gives the model of a kind of player, and builds it on the first call for that kind.
   *
   * @param species The species of the player.
   * @param instrument The instrument of the player.
   * @param kettles The number of kettles of the timpani. The other instruments ignore it.
   * @returns The model. Each later call with the same kind gives the same object.
   */
  get(species: SpeciesId, instrument: InstrumentId, kettles: KettleCount = 4): PlayerModel {
    const key = `${species} ${instrument} ${kettles}`;
    let model = this.#models.get(key);
    if (!model) {
      model = buildPlayer(species, instrument, kettles);
      this.#models.set(key, model);
    }
    return model;
  }
}

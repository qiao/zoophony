import { INSTRUMENT_SUPPORTS, buildPlayer } from './player.ts';
import type { PlayerModel } from './player.ts';
import type { Support } from './props.ts';
import type { SpeciesId } from './species.ts';
import type { KettleCount } from './instruments/percussion.ts';
import type { InstrumentId } from './instruments/types.ts';

/**
 * The player models of one score, by species, instrument, kettle count, and support. The layout,
 * the pose plan, and the scene share one cache, so that each kind of player builds its model one
 * time for each score. `buildPlayer()` is pure, so a cached model is equal to a new one.
 */
export class ModelCache {
  readonly #models = new Map<string, PlayerModel>();

  /**
   * Gives the model of a kind of player, and builds it on the first call for that kind.
   *
   * @param species The species of the player.
   * @param instrument The instrument of the player.
   * @param kettles The number of kettles of the timpani. The other instruments ignore it.
   * @param support The support of the player: the support of the instrument by default, or
   *   `stand` for a soloist who stands (design 4.5).
   * @returns The model. Each later call with the same kind gives the same object.
   */
  get(
    species: SpeciesId,
    instrument: InstrumentId,
    kettles: KettleCount = 4,
    support: Support = INSTRUMENT_SUPPORTS[instrument],
  ): PlayerModel {
    const key = `${species} ${instrument} ${kettles} ${support}`;
    let model = this.#models.get(key);
    if (!model) {
      model = buildPlayer(species, instrument, kettles, support);
      this.#models.set(key, model);
    }
    return model;
  }
}

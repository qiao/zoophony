s{      const transport = this\.#state\.transport;\n      const \{ plan, audibility, poses \} = piece;}{      // SCRATCH: a frozen song time for the frame strips of the beat-fold round.
      const frozen = (window as unknown as { frozenSong?: number }).frozenSong;
      if (frozen !== undefined) {
        this.#songTime = frozen;
      }
      const transport =
        frozen === undefined
          ? this.#state.transport
          : { playing: true, changedAtWall: wallTime - 100, before: null, startSec: 0, holdSec: 3, leadSec: 0 };
      const { plan, audibility, poses } = piece;};

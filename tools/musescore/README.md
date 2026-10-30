# MuseScore pipeline

These scripts make the demo files of the OpenScore scores in `demos/src/`. `demos/README.md`
gives the commands and the expected result of each file. The scripts use only the Python 3
standard library.

Run each script with `python3 -I`, because the pipeline reads downloaded scores. With `-I`, a
file in the current folder cannot replace a module of Python. Then `sys.path` does not hold the
folder of the script. Thus `cut_midi.py`, `remap_midi.py`, and `validate.py` add their folder to
`sys.path` before they import the other scripts.

- With no `--groups` option, `remap_score.py`, `remap_midi.py`, and `validate.py` use the group
  map of the Boulanger score: `GROUPS` and `EXPECTED_SHORT` in `remap_score.py`.
- `--groups FILE` reads the group map of another score from a JSON file. The key `short` gives
  the short name of each part in score order, and the key `groups` gives the rows of `GROUPS`.
  The files are in `demos/groups/`.
- A `Channel` element with no `midiPort` and no `midiChannel` gets both elements. MuseScore makes
  this mapping at load time for such a score, and `remap_score.py` must set it.
- `cut_midi.py` cuts a tick range out of a result of `remap_midi.py`, for a demo that is an
  excerpt of a movement. The excerpt starts with the tempo, the programs, and the controllers
  that apply at its start tick. With more than one pair of ticks, it puts the ranges one after
  the other. Each later range starts with its own state at the join. With one range, the result
  is the same as before this option.

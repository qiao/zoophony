"""Sets the option A skeleton of the rabbit in a scratch tree, and wires its sculpt in.

python3 patch_species.py <tree> [--sculpt]
"""

import sys

tree = sys.argv[1]
sculpt = '--sculpt' in sys.argv
path = f'{tree}/src/models/species.ts'
s = open(path).read()
old = "    form: { brow: 0.02, belly: 1.14, facets: 'leporine' },\n  },\n  /** Red-orange fox"
proportions = """    proportions: {
      headHeight: 0.293,
      headCenter: 2.1,
      shoulderHeight: 1.41,
      shoulderSpread: 0.53,
      upperArm: 0.91,
      forearm: 0.84,
      hipSpread: 0.43,
      seatedKnee: { forward: 1.3, height: 0.22 },
      torsoDepth: 0.67,
    },
"""
if 'headHeight: 0.293' not in s:
    assert old in s
    s = s.replace(old, "    form: { brow: 0.02, belly: 1.14, facets: 'leporine' },\n" + proportions
                  + "  },\n  /** Red-orange fox")
if sculpt and "from './sculpts/rabbit.ts'" not in s:
    s = s.replace("import { WOLF_SCULPT } from './sculpts/wolf.ts';",
                  "import { WOLF_SCULPT } from './sculpts/wolf.ts';\n"
                  "import { RABBIT_SCULPT } from './sculpts/rabbit.ts';")
if sculpt and 'sculpt: RABBIT_SCULPT' not in s:
    s = s.replace("      torsoDepth: 0.67,\n    },\n", "      torsoDepth: 0.67,\n    },\n"
                  "    sculpt: RABBIT_SCULPT,\n", 1)
if not sculpt:
    s = s.replace("    sculpt: RABBIT_SCULPT,\n", '')
    s = s.replace("import { RABBIT_SCULPT } from './sculpts/rabbit.ts';\n", '')
open(path, 'w').write(s)
print('patched', 'with sculpt' if sculpt else 'skeleton only')

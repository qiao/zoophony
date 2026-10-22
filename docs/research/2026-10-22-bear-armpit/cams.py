"""Prints the --camera options of close-views play that aim at the conductor of a podium at
z, at the azimuths of the arguments (0 front, 90 right side, 180 back)."""
import json, math, sys
z = float(sys.argv[1]); d = float(sys.argv[2])
for a in sys.argv[3:]:
    r = math.radians(float(a))
    pos = [round(d * math.sin(r), 3), 1.6, round(z - d * math.cos(r), 3)]
    print('--camera', "'" + json.dumps({'position': pos, 'target': [0, 1.25, z], 'fov': 30}, separators=(',', ':')) + "'", end=' ')

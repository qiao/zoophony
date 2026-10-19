# Splits a mean turn of `pnpm raise-fit` (studio axes, x y z w) into a twist around the bind
# direction of its bone and the swing of the bone. Usage:
#   python3 docs/research/2026-10-19-hippo-arms/twist.py <x> <y> <z> <w> <dx> <dy> <dz>
# The bind direction is `studio.bindArms` of tools/mesh-rigs/hippo.json, with x mirrored for the
# right arm.
import math
import sys

x, y, z, w, dx, dy, dz = (float(a) for a in sys.argv[1:8])
n = math.sqrt(dx * dx + dy * dy + dz * dz)
dx, dy, dz = dx / n, dy / n, dz / n
along = x * dx + y * dy + z * dz
twist = math.degrees(2 * math.atan2(abs(along), abs(w))) * (1 if along * w >= 0 else -1)
swing = math.degrees(2 * math.acos(min(1.0, math.sqrt(along * along + w * w))))
total = math.degrees(2 * math.acos(min(1.0, abs(w))))
print(f'turn {total:.1f} deg: twist {twist:.1f} deg around the bind direction, swing {swing:.1f} deg')

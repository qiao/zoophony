"""Splits each round into sub-phases and sums the time, the calls, the builds, and the images."""
import json, datetime
import os

# The folder of the files between the steps (events.json and the calls files).
WORK = os.environ.get('RETRO_WORK', '.')
calls = json.load(open(os.path.join(WORK, 'calls_topics.json')))
T = lambda s: datetime.datetime.fromisoformat('2026-10-1' + s + '+00:00').timestamp()
PH = [
 ('R1a study the reference: masks, crops, row runs', '1T23:39:20', '1T23:51:16'),
 ('R1b body distance field + silhouette fit', '1T23:51:16', '2T00:00:30'),
 ('R1c Blender mesh build (surface nets + decimate)', '2T00:00:30', '2T00:02:03'),
 ('R1d viewer, compare, frames pages, shoot tool', '2T00:02:03', '2T00:06:22'),
 ('R1e details, paint, rig, IK solver, motions, export', '2T00:06:22', '2T00:14:33'),
 ('R1f first full build, compare, face, clips, commit', '2T00:14:33', '2T00:21:34'),
 ('R1g look tuning: light, belly, decimation, palette, beat', '2T00:21:34', '2T00:39:32'),
 ('R1h viewer shot, close-ups, README, commit', '2T00:39:32', '2T00:46:40'),
 ('R2a contact check + pose fixes', '2T01:06:59', '2T01:18:50'),
 ('R2b face crops + fur color match', '2T01:18:50', '2T01:21:18'),
 ('R2c topology measure + QuadriFlow + facet tuning', '2T01:21:18', '2T01:32:08'),
 ('R2d snout and face on the new mesh', '2T01:32:08', '2T01:37:47'),
 ('R2e rig recheck, facet measure, armpit, feet, seed', '2T01:37:47', '2T01:45:58'),
 ('R2f full build, bow fix, README, commits', '2T01:45:58', '2T01:53:10'),
 ('R3a look at gaps + head and snout from the side profile', '2T03:05:45', '2T03:11:16'),
 ('R3b organic facets + light contrast', '2T03:11:16', '2T03:16:32'),
 ('R3c face, neck, occlusion-bake fix', '2T03:16:32', '2T03:19:50'),
 ('R3d dark folds: correctives, fold check, weights, twist', '2T03:19:50', '2T04:12:20'),
 ('R3e contrast recheck + seed search', '2T04:12:20', '2T04:25:30'),
 ('R3f final review, README, commits', '2T04:25:30', '2T04:30:50'),
 ('R4 baseline, eye and ear measure, head loft (stopped)', '2T04:48:47', '2T05:00:14'),
]
def union(iv):
    iv = sorted(iv); tot = 0; cur = None
    for a, b in iv:
        if cur is None or a > cur[1]:
            if cur: tot += cur[1] - cur[0]
            cur = [a, b]
        else: cur[1] = max(cur[1], b)
    if cur: tot += cur[1] - cur[0]
    return tot
print(f"{'phase':58s} {'wall':>5s} {'tool':>5s} {'calls':>5s} {'blend':>5s} {'shoot':>5s} {'imgs':>4s}")
rows = []
for name, a, b in PH:
    a, b = T(a), T(b)
    cs = [c for c in calls if a <= c['start'] < b]
    tool = union([(c['start'], min(c['end'], b)) for c in cs])
    bl = sum(1 for c in cs if 'blender' in c['tags']); sh = sum(1 for c in cs if 'render_shoot' in c['tags'])
    im = sum(c['imgs'] for c in cs)
    rows.append((name, (b-a)/60, tool/60, len(cs), bl, sh, im))
    print(f"{name:58s} {(b-a)/60:5.1f} {tool/60:5.1f} {len(cs):5d} {bl:5d} {sh:5d} {im:4d}")
json.dump(rows, open(os.path.join(WORK, 'phases.json'), 'w'))

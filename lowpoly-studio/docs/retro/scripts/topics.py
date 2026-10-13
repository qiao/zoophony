"""Groups the calls by topic and sums the model and tool time of each topic."""
import json, re, collections
import os

# The folder of the files between the steps (events.json and the calls files).
WORK = os.environ.get('RETRO_WORK', '.')
calls = json.load(open(os.path.join(WORK, 'calls_tagged.json')))
TOPICS = [
    ('docs_git', r'readme|commit|git state|prose|claims'),
    ('infra', r'install|installed tools|playwright|vite config|package|numpy|python binary|action api|exporter|worktree|leftover|servers|processes|stop the'),
    ('contact_fold_check', r'contact|turned|fold check|folded|catches|two-level|dominant bone|face check|inward faces'),
    ('rig_weights', r'weight|twist|clavicle|crotch|armpit|corrective|shape key|morph|wrist|elbow|bone|ik code|solver|rig'),
    ('motion_clips', r'beat|pattern|baton|bow|cue|crescendo|cutoff|gesture|pose|clip|ictus|rebound|performance|motion|hush|nod|sway|frames at'),
    ('topology_remesh', r'quadriflow|remesh|wire|facet|jitter|organic|seed|quad|topolog|collapse|flip|slivers|regularity|offset'),
    ('decimation', r'decimat|flipped faces|face detail|face protection|validity'),
    ('face_head_ears', r'face|muzzle|snout|eye|nose|mouth|ear|head|dome|brow|nape|neck|cheek|iris|claw'),
    ('color_light', r'light|albedo|color|hue|saturation|contrast|luminance|palette|shadow|occlusion|dark|ground bounce|underside|belly patch|fur'),
    ('body_fit', r'fit|trunk|loft|shoulder|forearms forward|buttocks|tail|paw|feet|foot|belly|silhouette|field|profile|rows|iou|overlay'),
    ('reference_measure', r'mask|reference|sheet|histogram|sample|crop|runs'),
    ('viewer_tools', r'viewer|compare tool|compare page|frames page|shoot|render|screenshot|build script|one-command'),
]
FILE_TOPICS = {'sdf.py': 'body_fit', 'body.py': 'body_fit', 'views.py': 'body_fit', 'fit.py': 'body_fit', 'measure.py': 'reference_measure',
               'mesh.py': 'decimation', 'build.py': 'viewer_tools', 'scene.js': 'viewer_tools', 'main.js': 'viewer_tools', 'index.html': 'viewer_tools',
               'vite.config.js': 'viewer_tools', 'compare.js': 'viewer_tools', 'frames.js': 'viewer_tools', 'shoot.mjs': 'viewer_tools',
               'details.py': 'face_head_ears', 'paint.py': 'color_light', 'rig.py': 'rig_weights', 'pose.py': 'motion_clips', 'motion.py': 'motion_clips',
               'anim.py': 'motion_clips', 'pattern.py': 'motion_clips', 'contacts.py': 'contact_fold_check', 'topology.py': 'topology_remesh',
               'retopo.py': 'topology_remesh', 'facets.py': 'topology_remesh', 'organic.py': 'topology_remesh', 'corrective.py': 'rig_weights',
               'ears.py': 'face_head_ears', 'README.md': 'docs_git'}

def topic(c):
    f = c['file'].rsplit('/', 1)[-1]
    if c['name'] == 'Write' and f in FILE_TOPICS:
        return FILE_TOPICS[f]
    s = (c['desc'] + ' ' + (f if c['name'] == 'Read' else '')).lower()
    if c['name'] == 'Read' and c['imgs']:
        s = f.lower()
        for k, rx in [('face_head_ears', r'face|eye|ear|head|mouth|feet|paw'), ('topology_remesh', r'wire|facet|qf'), ('motion_clips', r'beat|bow|cue|cresc|hush|cutoff|nod|sway|ready|pattern|perf|mix|viewer'),
                      ('rig_weights', r'deform|dbg|elbow'), ('body_fit', r'overlay|c_|tqback|ov\.|renders|fs\.'), ('reference_measure', r'allmask|front_|side|back|tq|bear-views|ref_')]:
            if re.search(rx, s):
                return k
        return 'other'
    for k, rx in TOPICS:
        if re.search(rx, s):
            return k
    return 'other'

starts = sorted(set(c['start'] for c in calls))
prev_end = {}
last_end = None
for s in starts:
    batch = [c for c in calls if c['start'] == s]
    for c in batch:
        g = (s - last_end) if last_end else 0
        c['gap_before'] = g if 0 <= g <= 900 else 0
    last_end = max(c['end'] for c in batch)
    # parallel calls share one gap: give it to the first call only
    for c in batch[1:]:
        c['gap_before'] = 0

agg = collections.defaultdict(lambda: {'n': 0, 'tool': 0.0, 'model': 0.0, 'imgs': 0, 'rounds': collections.Counter()})
for c in calls:
    c['topic'] = topic(c)
    a = agg[c['topic']]
    a['n'] += 1; a['tool'] += c['dur']; a['model'] += c['gap_before']; a['imgs'] += c['imgs']; a['rounds'][c['round'][:2]] += 1
tot = sum(a['tool'] + a['model'] for a in agg.values())
print(f"{'topic':20s} {'calls':>5s} {'imgs':>4s} {'tool min':>8s} {'model min':>9s} {'total':>6s} {'share':>5s}  rounds")
for k, a in sorted(agg.items(), key=lambda x: -(x[1]['tool'] + x[1]['model'])):
    t = a['tool'] + a['model']
    print(f"{k:20s} {a['n']:5d} {a['imgs']:4d} {a['tool']/60:8.1f} {a['model']/60:9.1f} {t/60:6.1f} {100*t/tot:4.0f}%  {dict(a['rounds'])}")
print('total min', round(tot/60, 1))
for c in calls:
    if c['topic'] == 'other':
        print('  other:', c['name'], c['desc'][:70], c['file'][-40:])
json.dump(calls, open(os.path.join(WORK, 'calls_topics.json'), 'w'))

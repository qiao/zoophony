# For pit_probe.py --after: renders the copy near CENTER (units) with the wireframe (look() of
# cat_arms.py) from the azimuths of VIEWS_AZ (positive: the left side of the animal), and dumps the
# camera and the vertices near the center with their codes, for scratch/flap_labels.py.
import json as _json
ca.VIEWS = out_dir
center = tuple(float(v) for v in os.environ.get('CENTER', '0.085,0.6,0.11').split(','))
scale = float(os.environ.get('SCALE', 0.06))
views = []
for spec in os.environ.get('VIEWS_AZ', '72:28,110:28,35:10').split(','):
    az, el = (float(x) for x in spec.split(':'))
    views.append(('a%d-e%d' % (az, el), az, el))
name = os.environ.get('NAME', 'flap')
import inspect as _inspect
_src = _inspect.getsource(ca.look).replace("'TEXTURE'", "'SINGLE'")
if os.environ.get('NOWIRE'):
    _src = _src.replace("scene.collection.objects.link(w)", "pass")
exec(_src, ca.__dict__)
ca.look(s, name, center=center, scale=scale, views=views)
target = s.fr.point(center)
dump = {'H': H, 'scale': s.units(scale), 'target': list(target), 'views': views, 'verts': {}}
for p in bm.verts:
    if (p.co - target).length < scale * H:
        dump['verts'][p.index] = [list(p.co), p[part], p[ring] if ring else -1, p[spoke] if spoke else -1, p[flat] if flat else -1]
with open(os.path.join(out_dir, name + '.json'), 'w') as fh:
    _json.dump(dump, fh)

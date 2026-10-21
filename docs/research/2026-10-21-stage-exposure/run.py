"""Renders look variants on one dev server: the look lab frames (1440 x 900: orchestra, default,
violins) and the wide frames of the user (2022 x 1076: default, back rows). Usage:
run.py <variants.json> <out dir> <port>. It stops the server by its PID."""
import json, os, subprocess, sys, time, urllib.parse, urllib.request
root = '/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/stage-exposure'
variants = json.load(open(sys.argv[1])); out = os.path.abspath(sys.argv[2]); port = sys.argv[3]
os.makedirs(out, exist_ok=True)
log = open(f'{out}/dev-server.log', 'w')
server = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'], cwd=root, stdout=log, stderr=log)
print('dev server PID', server.pid, flush=True)
site = f'http://127.0.0.1:{port}/'
try:
    for _ in range(150):
        try:
            urllib.request.urlopen(site, timeout=1); break
        except Exception:
            time.sleep(0.2)
    for name, look in variants.items():
        look = dict(look); solo = look.pop('solo', None)
        q = {}
        if look: q['look'] = json.dumps(look)
        if solo: q['solo'] = solo
        url = site + ('?' + urllib.parse.urlencode(q) if q else '')
        t = time.time()
        if os.environ.get('SKIP_LAB') != '1':
            r1 = subprocess.run(['node', 'tools/look-lab.ts', f'{out}/{name}', '--url', url], cwd=root, stdout=open(f'{out}/{name}.log', 'w'), stderr=subprocess.STDOUT).returncode
        else:
            r1 = 0
        env = dict(os.environ, PLAY_W='2022', PLAY_H='1076')
        cams = os.environ.get('WIDE_CAMS', 'default,0:-10:9').split(',')
        args = []
        for c in cams: args += ['--camera', c.replace(':', ',')]
        r2 = subprocess.run(['node', 'tools/close-views.ts', 'play', f'{out}/{name}/wide', '--time', '33.5', *args, '--url', url], cwd=root, env=env, stdout=open(f'{out}/{name}-wide.log', 'w'), stderr=subprocess.STDOUT).returncode
        print(f'{name}: lab {r1} wide {r2} in {time.time() - t:.0f} s', flush=True)
finally:
    server.terminate(); server.wait(10); print('dev server stopped', server.pid)

"""Prints the failed tests of a vitest JSON report, and the new ones against a base report.

python3 failures.py <report.json> [<base.json>]
"""

import json
import sys


def failed(path):
    data = json.load(open(path))
    out = {}
    for f in data['testResults']:
        for t in f['assertionResults']:
            if t['status'] == 'failed':
                name = f['name'].split('/p1/')[-1] + ' | ' + t['fullName']
                out[name] = (t.get('failureMessages') or [''])[0].split('\n')[0][:300]
    return data['numTotalTests'], out


total, now = failed(sys.argv[1])
print('total', total, 'failed', len(now))
base = failed(sys.argv[2])[1] if len(sys.argv) > 2 else {}
for name, message in now.items():
    mark = '   ' if name in base else 'NEW'
    print(mark, name[:170])
    if mark == 'NEW':
        print('      ', message)

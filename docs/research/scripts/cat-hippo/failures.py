"""Prints the failed tests of a Vitest JSON report: the count, and each test with its first line.

Usage: failures.py <report.json>
"""
import collections
import json
import sys

data = json.load(open(sys.argv[1]))
print(data['numFailedTests'], 'of', data['numTotalTests'])
counts = collections.Counter()
for result in data['testResults']:
    for test in result['assertionResults']:
        if test['status'] == 'failed':
            name = result['name'].split('/src/')[-1]
            counts[name] += 1
            message = test['failureMessages'][0].split('\n')[0] if test['failureMessages'] else ''
            print('-', name, '|', test['fullName'][:140])
            print('    ', message[:260])
for name, count in counts.most_common():
    print(count, name)

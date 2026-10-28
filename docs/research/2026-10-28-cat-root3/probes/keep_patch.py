import json as _j
ca.CAT['pit'] = dict(ca.CAT['pit'], **_j.loads(os.environ.get('PIT', '{}')))
if os.environ.get('ENDS'):
    ca.CAT['ends'] = _j.loads(os.environ['ENDS'])

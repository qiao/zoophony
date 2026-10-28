import json as _j
ca.CAT['ends'] = _j.loads(os.environ.get('ENDS', '{"reach": 0.01, "rounds": 4}'))

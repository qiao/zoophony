# A patch for the probes: sets keys of ca.CAT['wall'] from WALL_SET, such as "deep=0.004,rounds=10".
import os as _os
for _kv in filter(None, _os.environ.get('WALL_SET', '').split(',')):
    _k, _v = _kv.split('=')
    ca.CAT['wall'][_k] = type(ca.CAT['wall'][_k])(float(_v)) if _k in ca.CAT['wall'] else float(_v)

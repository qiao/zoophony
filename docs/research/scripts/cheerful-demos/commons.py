import json, sys, urllib.parse, urllib.request

def get(params):
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(u, headers={'User-Agent': 'zoophony-research/0.1'})
    return json.load(urllib.request.urlopen(req))

for q in sys.argv[1:]:
    r = get({'action': 'query', 'list': 'search', 'srsearch': q + ' filemime:audio/midi', 'srnamespace': 6, 'srlimit': 20, 'format': 'json'})
    hits = r['query']['search']
    titles = [h['title'] for h in hits]
    print('##', q, len(titles))
    if not titles:
        continue
    info = get({'action': 'query', 'titles': '|'.join(titles), 'prop': 'imageinfo', 'iiprop': 'size|extmetadata|url', 'format': 'json'})
    for p in info['query']['pages'].values():
        ii = (p.get('imageinfo') or [{}])[0]
        md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '?')
        print(' ', p['title'], ii.get('size'), lic)

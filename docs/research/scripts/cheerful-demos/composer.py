import re, html, sys, urllib.request

def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8', 'replace')

SKIP = ['for piano', 'for organ', 'for guitar', 'voice and piano', 'for harpsichord', 'for flute and piano', 'for violin and piano', 'for lute']

for comp in sys.argv[1:]:
    print('##', comp)
    start = 0
    while True:
        u = f'https://www.mutopiaproject.org/cgibin/make-table.cgi?startat={start}&searchingfor=&Composer={comp}&Instrument=&Style=&collection=&id=&solo=&recent=&timelength=&timeunit=&lilyversion=&preview='
        s = fetch(u)
        blocks = re.split(r'(?=<table class="table-bordered result-table")', s)
        n = 0
        for b in blocks[1:]:
            t = html.unescape(re.sub(r'<[^>]+>', '\n', b))
            lines = [l.strip() for l in t.split('\n') if l.strip()]
            pid = re.search(r'piece-info\.cgi\?id=(\d+)', b)
            lic = [l for l in lines if 'Public Domain' in l or 'Creative Commons' in l]
            head = ' / '.join(lines[:4])
            n += 1
            if any(k in head.lower() for k in SKIP):
                continue
            print(pid.group(1) if pid else None, head[:130], '|', (lic or ['?'])[0][:30])
        if 'Next 10' not in s or n == 0:
            break
        start += 10

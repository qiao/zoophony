import re, html, sys, urllib.request, json
def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf-8','replace')
inst = sys.argv[1]
out=[]
start=0
while True:
    u=f'https://www.mutopiaproject.org/cgibin/make-table.cgi?startat={start}&searchingfor=&Composer=&Instrument={inst}&Style=&collection=&id=&solo=&recent=&timelength=&timeunit=&lilyversion=&preview='
    s=fetch(u)
    # split by piece-info
    blocks=re.split(r'(?=<table class="table-bordered result-table")', s)
    n=0
    for b in blocks[1:]:
        t=html.unescape(re.sub(r'<[^>]+>','\n',b))
        lines=[l.strip() for l in t.split('\n') if l.strip()]
        pid=re.search(r'piece-info\.cgi\?id=(\d+)',b)
        mids=re.findall(r'href="([^"]+(?:\.mid|-mids\.zip))"',b)
        lic=[l for l in lines if 'Public Domain' in l or 'Creative Commons' in l]
        out.append({'id':pid.group(1) if pid else None,'head':lines[:5],'license':lic,'mid':mids})
        n+=1
    if 'Next 10' not in s or n==0: break
    start+=10
for o in out:
    print(json.dumps(o))

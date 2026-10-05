import re, html, sys, urllib.request
def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf-8','replace')
for pid in sys.argv[1:]:
    u=f'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={pid}'
    s=fetch(u)
    s=re.sub(r'<script.*?</script>','',s,flags=re.S)
    m=re.search(r'(<h2.*?)Disclaimer',s,re.S)
    body=m.group(1) if m else s
    links=re.findall(r'href="([^"]+)"',body)
    t=html.unescape(re.sub(r'<[^>]+>','\n',body))
    lines=[l.strip() for l in t.split('\n') if l.strip()]
    print('=== id',pid,u)
    print(' | '.join(lines[:60]))
    print('LINKS:',[l for l in links if 'mid' in l or 'legal' in l or 'creativecommons' in l])

import re,sys
lines=open(sys.argv[1]).read().split('\n')
rows=[]
for i in range(0,len(lines)-1,2):
    head,body=lines[i],lines[i+1]
    if not body.startswith('  stop'): continue
    def get(k):
        m=re.search(re.escape(k)+r' ([\d.]+)/(\d+)%',body)
        return (float(m[1]),int(m[2])) if m else (0,0)
    v={}
    for m in re.finditer(r'(play|move) (\w+)>(\w+) ([\d.]+)/(\d+)%',body):
        lim=2.0 if m[2]=='instrument' else 1.5
        v[f'{m[1][0]} {m[2]}>{m[3]}']=(float(m[4]),int(m[5]),lim)
    score=sum(max(0,d-l)*p for d,p,l in v.values())
    bow=re.search(r'bow ([\d.]+)-([\d.]+)',body); stop=re.search(r'stop (\S+)',body)
    lab=re.sub(r'contrabass@hippo\.','',head); lab=re.sub(r'playTurn=\[[^\]]*\];|reachL=35deg;|stringTurn=6deg;','',lab)
    rows.append((score, float(bow[2])-float(bow[1]), lab[:110], stop[1], bow[1]+'-'+bow[2], {k:f'{d}/{p}' for k,(d,p,l) in v.items() if d>l}))
for r in sorted([r for r in rows if r[1]>=float(sys.argv[3] if len(sys.argv)>3 else 0.17)])[:int(sys.argv[2]) if len(sys.argv)>2 else 12]: print(round(r[0],1), r[2], r[3], r[4], r[5])

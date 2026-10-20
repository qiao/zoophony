// Prints the variants of a grip.ts output, with IN for each variant in the real range.
const t=require("fs").readFileSync(process.argv[2],"utf8").split("== ").slice(2);
for(const b of t){const name=b.split("\n")[0].replace(/timpani.offset.*/,"").replace(/timpani.across=/,"");
const g=(re)=>[...b.matchAll(re)].map(m=>m.slice(1).map(Number));
const s=g(/strikes (\d+)\/(\d+)/g), pr=g(/rest (\d+)° \(tw/g), ps=g(/paw strike (\d+)°/g), ms=g(/mallet strike (-?\d+)° pitch, (-?\d+)° out; rest (-?\d+)° pitch, (-?\d+)° out/g);
const ok = ms.every(m=>m[2]>=0 && m[0]<=-10 && m[0]>=-25 && -m[3]>=10 && -m[3]<=45 && m[1]<=0) && s.every(x=>x[0]===x[1]);
console.log((ok?"IN ":"   ")+name.padEnd(70), "paw rest", pr.map(x=>x[0]).join("/"), "strike", ps.map(x=>x[0]).join("/"), "| strike pitch,out rest pitch,out", ms.map(m=>m.join(",")).join("  "), s.map(x=>x[0]).join("/"))}

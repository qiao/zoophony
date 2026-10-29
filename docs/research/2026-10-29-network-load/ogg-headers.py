"""Counts the Vorbis setup headers in an SF3 file.

    python3 -I docs/research/2026-10-29-network-load/ogg-headers.py public/sf/0/60.sf3

Each sample of an SF3 file is its own Ogg Vorbis stream. The script reads the Ogg pages of the
file, starts a new stream at each page with the flag "beginning of stream" (two samples can
share a serial number), joins the packets of each stream, and sums the three header packets (identification,
comment, setup) and the setup packet alone. It prints the stream count, the sums, and their share
of the file size.
"""

import sys

data = open(sys.argv[1], "rb").read()
streams = []
pos = data.find(b"OggS")
while 0 <= pos < len(data):
    if data[pos:pos + 4] != b"OggS":
        pos = data.find(b"OggS", pos + 1)
        continue
    if data[pos + 5] & 0x02 or not streams:
        streams.append({"packets": [], "open": b""})
    count = data[pos + 26]
    lacing = data[pos + 27:pos + 27 + count]
    body = pos + 27 + count
    stream = streams[-1]
    offset = body
    for size in lacing:
        stream["open"] += data[offset:offset + size]
        offset += size
        if size < 255:
            stream["packets"].append(len(stream["open"]))
            stream["open"] = b""
    pos = offset

headers = sum(sum(s["packets"][:3]) for s in streams)
setup = sum(s["packets"][2] for s in streams if len(s["packets"]) > 2)
total = len(data)
print(f"{sys.argv[1]}: {len(streams)} streams, {total:,} B")
print(f"three header packets: {headers:,} B ({100 * headers / total:.1f}%)")
print(f"setup packets: {setup:,} B ({100 * setup / total:.1f}%), {setup / len(streams):,.0f} B each")

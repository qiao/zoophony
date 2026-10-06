"""Reads one member of the remote Zenodo zip with HTTP range requests, and writes it to a file.
Usage: fetch_member.py <name filter> <out>"""
import hashlib
import io
import sys
import urllib.request
import zipfile

URL = 'https://zenodo.org/records/2641166/files/360-BRIR-FOAIR-database.zip?download=1'


class HttpFile(io.RawIOBase):
    def __init__(self, url):
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as r:
            self.url = r.geturl()
            self.size = int(r.headers['Content-Length'])
        self.pos = 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0:
            return 0
        req = urllib.request.Request(self.url, headers={'Range': f'bytes={self.pos}-{self.pos + n - 1}'})
        with urllib.request.urlopen(req) as r:
            data = r.read()
        b[: len(data)] = data
        self.pos += len(data)
        return len(data)


f = io.BufferedReader(HttpFile(URL), buffer_size=1 << 20)
z = zipfile.ZipFile(f)
names = [n for n in z.namelist() if sys.argv[1] in n]
print('\n'.join(names))
if len(sys.argv) > 2 and len(names) == 1:
    data = z.read(names[0])
    open(sys.argv[2], 'wb').write(data)
    print(len(data), hashlib.sha256(data).hexdigest())

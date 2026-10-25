from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
root=Path(__file__).resolve().parent
os.chdir(root)
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self):
  name=self.path.lstrip('/')
  if name not in ['camera-a.webm','camera-b.webm']:
   self.send_error(400);return
  data=self.rfile.read(int(self.headers['Content-Length']))
  (root/name).write_bytes(data)
  self.send_response(200);self.end_headers();self.wfile.write(b'ok')
ThreadingHTTPServer(('127.0.0.1',4302),Handler).serve_forever()

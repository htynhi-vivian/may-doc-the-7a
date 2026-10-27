# Máy chủ giả (Auth REST + Realtime Database REST) để kiểm thử các lời gọi của ESP32-CAM / kiem_tra_firebase.py
import json, re, time, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
DB = {}; TOKENS = {}; KEY = "AIzaKhoaThu"; N = [0]
def ts(v): return int(time.time()*1000) if v == {".sv": "timestamp"} else ({k: ts(x) for k, x in v.items()} if isinstance(v, dict) else v)
def get(p):
    o = DB
    for k in p:
        if not isinstance(o, dict) or k not in o: return None
        o = o[k]
    return o
def put(p, v):
    o = DB
    for k in p[:-1]: o = o.setdefault(k, {})
    o[p[-1]] = v
ID = re.compile(r"^[a-z0-9_-]{1,20}$")
def allowed(p, v):   # mô phỏng database.rules.json
    if len(p) < 2 or p[0] not in ("may", "nhat_ky") or not ID.match(p[1]): return False
    if p[0] == "may":
        if len(p) != 3 or p[2] not in ("hien_tai", "trang_thai"): return False
        if p[2] == "hien_tai": return isinstance(v, dict) and v.get("loai") in ("ket_qua", "lap_ghep", "loi", "cho")
        return isinstance(v, dict) and "online" in v and "luc" in v
    return isinstance(v, dict) and v.get("loai") == "ket_qua" and isinstance(v.get("cong_thuc"), str) and len(v["cong_thuc"]) <= 40
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self): n = int(self.headers.get("Content-Length") or 0); return self.rfile.read(n).decode()
    def handle_all(self, m):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == "/v1/accounts:signUp":
            if q.get("key", [""])[0] != KEY: return self.send(400, {"error": {"message": "API key not valid"}})
            N[0] += 1; t = f"tok{N[0]}"; TOKENS[t] = time.time() + 3600
            return self.send(200, {"idToken": t, "refreshToken": f"rt{N[0]}", "expiresIn": "3600", "localId": f"u{N[0]}"})
        if u.path == "/v1/token":
            f = parse_qs(self.body()); t = f"tok{N[0]}x"; TOKENS[t] = time.time() + 3600
            return self.send(200, {"id_token": t, "refresh_token": f.get("refresh_token", [""])[0], "expires_in": "3600"})
        if not u.path.endswith(".json"): return self.send(404, {"error": "404"})
        p = [x for x in u.path[:-5].split("/") if x]
        if m == "GET": return self.send(200, get(p))
        if q.get("auth", [""])[0] not in TOKENS: return self.send(401, {"error": "Permission denied"})
        v = ts(json.loads(self.body()))
        if m == "POST":
            k = f"-K{time.time_ns()}"; full = p + [k]
            if not allowed(full, v): return self.send(403, {"error": "Permission denied"})
            put(full, v); return self.send(200, {"name": k})
        if not allowed(p, v): return self.send(403, {"error": "Permission denied"})
        put(p, v); return self.send(200, v)
    def do_GET(self): self.handle_all("GET")
    def do_PUT(self): self.handle_all("PUT")
    def do_POST(self): self.handle_all("POST")
if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8790), H).serve_forever()

#!/usr/bin/env python3
"""
KIỂM TRA FIREBASE TRƯỚC KHI NẠP ESP32-CAM
Chạy trên máy tính (Python 3, không cần cài thêm gì). Chương trình làm ĐÚNG các bước như ESP32-CAM:
  1. Đăng nhập ẩn danh (Anonymous) bằng Web API Key
  2. Ghi trạng thái "đang trực tuyến" vào /may/<máy>/trang_thai
  3. Ghi một kết quả quét thẻ H2O vào /may/<máy>/hien_tai và thêm vào /nhat_ky/<máy>
Mở trang web cùng lúc: nếu thấy máy hiện lên với H2O là Firebase đã cài đúng.

Cách chạy:
  python kiem_tra_firebase.py --api-key AIza... --db-url https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app --may thu-pc
"""
import argparse, json, re, sys, urllib.request, urllib.error

def goi(url, phuong_thuc="GET", du_lieu=None, kieu="application/json"):
    than = None
    if du_lieu is not None:
        than = (json.dumps(du_lieu) if kieu == "application/json" else du_lieu).encode()
    yc = urllib.request.Request(url, data=than, method=phuong_thuc, headers={"Content-Type": kieu})
    try:
        with urllib.request.urlopen(yc, timeout=15) as tl:
            return tl.status, json.loads(tl.read().decode() or "null")
    except urllib.error.HTTPError as e:
        noi_dung = e.read().decode(errors="replace")
        try: noi_dung = json.loads(noi_dung)
        except ValueError: pass
        return e.code, noi_dung

def main():
    ap = argparse.ArgumentParser(description="Kiểm tra cài đặt Firebase cho máy đọc thẻ ESP32-CAM")
    ap.add_argument("--api-key", required=True, help="Web API Key (Project settings > General)")
    ap.add_argument("--db-url", required=True, help="Địa chỉ Realtime Database, không có dấu / ở cuối")
    ap.add_argument("--may", default="thu-pc", help="tên máy thử (chữ thường không dấu, số, - _)")
    ap.add_argument("--auth-url", default="https://identitytoolkit.googleapis.com", help=argparse.SUPPRESS)
    a = ap.parse_args()
    db = a.db_url.rstrip("/")
    if not re.fullmatch(r"[a-z0-9_-]{1,20}", a.may):
        print("Tên máy chỉ gồm chữ thường không dấu, số, dấu - hoặc _ (tối đa 20 ký tự). Ví dụ: may7a"); sys.exit(2)
    ok = True

    print("1. Đăng nhập ẩn danh ...", end=" ")
    ma, tl = goi(f"{a.auth_url}/v1/accounts:signUp?key={a.api_key}", "POST", {"returnSecureToken": True})
    if ma != 200:
        loi = json.dumps(tl, ensure_ascii=False)
        print(f"LỖI {ma}: {loi[:200]}")
        if "API_KEY_INVALID" in loi or "API key not valid" in loi: print("   → Web API Key sai. Chép lại trong Project settings > General.")
        if "ADMIN_ONLY_OPERATION" in loi or "OPERATION_NOT_ALLOWED" in loi: print("   → Chưa bật Anonymous: Build > Authentication > Sign-in method > Anonymous > Enable.")
        sys.exit(1)
    token = tl["idToken"]; print("được")

    print("2. Ghi trạng thái trực tuyến ...", end=" ")
    ma, tl = goi(f"{db}/may/{a.may}/trang_thai.json?auth={token}", "PUT",
                 {"online": True, "ip": "may-tinh", "rssi": 0, "phien_ban": "kiem-tra-pc", "luc": {".sv": "timestamp"}})
    if ma != 200:
        ok = False; print(f"LỖI {ma}: {tl}")
        if ma in (401, 403): print("   → Quy tắc (rules) chưa đúng: dán database.rules.json vào Realtime Database > Rules > Publish.")
        if ma == 404: print("   → Địa chỉ Realtime Database sai, hoặc chưa tạo Realtime Database.")
    else: print("được")

    ket_qua = {"loai": "ket_qua", "ma": "CT:H2O|Nuoc", "cong_thuc": "H2O", "ten": "Nuoc", "nguyen_tu": 3, "nguyen_to": 2,
               "hat": "PHAN TU", "ket_luan": "HOP CHAT", "man4": "Lien ket: CONG HOA TRI", "phan_loai": "cht",
               "klpt": 18.0, "dem": 1, "luc": {".sv": "timestamp"}}
    print("3. Ghi kết quả H2O ...", end=" ")
    ma1, tl1 = goi(f"{db}/may/{a.may}/hien_tai.json?auth={token}", "PUT", ket_qua)
    ma2, tl2 = goi(f"{db}/nhat_ky/{a.may}.json?auth={token}", "POST", ket_qua)
    if ma1 == 200 and ma2 == 200: print("được")
    else: ok = False; print(f"LỖI hien_tai {ma1} {tl1} · nhat_ky {ma2} {tl2}")

    print("4. Đọc lại (như trang web) ...", end=" ")
    ma, tl = goi(f"{db}/may/{a.may}/hien_tai.json")
    if ma == 200 and tl and tl.get("cong_thuc") == "H2O": print(f"được, máy chủ ghi thời gian {tl.get('luc')}")
    else: ok = False; print(f"LỖI {ma}: {tl}")

    print("\nKẾT QUẢ:", "Firebase đã sẵn sàng. Mở trang web, chọn máy '%s' sẽ thấy H2O." % a.may if ok else "còn lỗi, xem hướng dẫn mục Xử lý sự cố.")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()

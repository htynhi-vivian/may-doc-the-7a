# Bản TỰ ĐỘNG: GM65 quét liên tục + đèn LED RGB, không nút — vẽ Hình 1 (khối) và Hình 2 (nối dây)
F = "font-family='Segoe UI, Arial, sans-serif'"
def t(x, y, s, size=14, fill="#2b2d42", w="normal", anchor="start"):
    return f"<text x='{x}' y='{y}' {F} font-size='{size}' font-weight='{w}' fill='{fill}' text-anchor='{anchor}'>{s}</text>"
def box(x, y, w, h, fill, stroke="#1f2937", r=10, sw=2):
    return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{r}' fill='{fill}' stroke='{stroke}' stroke-width='{sw}'/>"
def wire(pts, c, w=4):
    return f"<polyline points='{' '.join(f'{x},{y}' for x, y in pts)}' fill='none' stroke='{c}' stroke-width='{w}' stroke-linejoin='round' stroke-linecap='round'/>"
def pin(x, y, label, side, c="#111827", lc="#2b2d42"):
    s = f"<circle cx='{x}' cy='{y}' r='5' fill='#fff' stroke='{c}' stroke-width='2'/>"
    if side == "top": s += t(x, y + 20, label, 12, lc, "bold", "middle")
    if side == "bottom": s += t(x, y - 11, label, 12, lc, "bold", "middle")
    if side == "left": s += t(x + 10, y + 4, label, 12, lc, "bold")
    if side == "right": s += t(x - 10, y + 4, label, 12, lc, "bold", "end")
    return s
def dot(x, y, c): return f"<circle cx='{x}' cy='{y}' r='6' fill='{c}'/>"
def lab(x, y, s, c): return f"<text x='{x}' y='{y}' {F} font-size='12' font-weight='bold' fill='{c}' stroke='#fff' stroke-width='4' paint-order='stroke'>{s}</text>"
RED, BLK, ORG = "#e03131", "#212529", "#f08c00"
C = {"tx": "#2f9e44", "rx": "#e9b500", "sda": "#1c7ed6", "scl": "#9c36b5", "g16": "#0ca678", "g4": "#8d5524", "led": "#e64980"}

W, H = 1600, 1150
parts, W_, dots, labels = [], [], [], []
RAIL5, RAILG = 880, 922
parts.append(box(20, RAIL5 - 18, W - 40, 72, "#f1f3f5", "#adb5bd", 8, 1.5))
parts.append(f"<line x1='40' y1='{RAIL5}' x2='{W-40}' y2='{RAIL5}' stroke='{RED}' stroke-width='6'/><line x1='40' y1='{RAILG}' x2='{W-40}' y2='{RAILG}' stroke='{BLK}' stroke-width='6'/>")
parts.append(t(30, RAIL5 - 24, "THANH NGUỒN BREADBOARD 400 LỖ", 12, "#495057", "bold"))
parts.append(t(W - 46, RAIL5 - 6, "+5 V", 14, RED, "bold", "end")); parts.append(t(W - 46, RAILG + 22, "GND", 14, BLK, "bold", "end"))
# Uno
ux, uy, uw, uh = 540, 400, 520, 230
parts.append(box(ux, uy, uw, uh, "#0b7285", "#0b4f5c")); parts.append(t(ux + uw/2, uy + 112, "ARDUINO UNO", 26, "#fff", "bold", "middle"))
parts.append(t(ux + uw/2, uy + 140, "bộ não: đọc GM65 · suy luận · LCD · đèn · tự gửi kết quả", 14, "#c5f6fa", anchor="middle"))
U = {"D10": ux + 70, "D9": ux + 110, "D8": ux + 150, "D7": ux + 215, "D1": ux + 450}
for k, x in U.items(): parts.append(pin(x, uy, k, "top", "#fff", "#fff"))
parts.append(t(U["D1"], uy + 36, "(TX)", 11, "#c5f6fa", anchor="middle"))
UB = {"5V": ux + 60, "GND": ux + 105, "A4": ux + 380, "A5": ux + 425}
for k, x in UB.items(): parts.append(pin(x, uy + uh, k, "bottom", "#fff", "#fff"))
# Đèn LED RGB
lx, ly = 330, 170
parts.append(box(lx, ly, 190, 100, "#fff0f6")); parts.append(f"<circle cx='{lx+95}' cy='{ly+40}' r='20' fill='#74c0fc' stroke='#1971c2' stroke-width='3'/>")
parts.append(t(lx + 95, ly - 10, "ĐÈN LED RGB (WS2812B)", 13, w="bold", anchor="middle"))
L_ = {"5V": lx + 40, "GND": lx + 80, "DI": lx + 160}
for k, x in L_.items(): parts.append(pin(x, ly + 100, k, "bottom"))
# GM65 (ngay trên D8/D9)
gx, gy, gw, gh = 600, 120, 220, 140
parts.append(box(gx, gy, gw, gh, "#ebfbee")); parts.append(t(gx + gw/2 + 20, gy + 30, "GM65", 20, w="bold", anchor="middle")); parts.append(t(gx + gw/2 + 20, gy + 50, "tự quét liên tục", 12, "#2b8a3e", "bold", "middle"))
parts.append(f"<rect x='{gx+100}' y='{gy+64}' width='80' height='26' rx='5' fill='#343a40'/>"); parts.append(f"<circle cx='{gx+140}' cy='{gy+77}' r='8' fill='#e03131' opacity='0.85'/>")
G = {"TX": U["D8"], "RX": U["D9"]}
for k, x in G.items(): parts.append(pin(x, gy + gh, k, "bottom"))
parts.append(pin(gx, gy + 30, "5V", "left")); parts.append(pin(gx, gy + 60, "GND", "left"))
# Mạch chuyển mức (HV bên trái, LV bên phải)
sx, sy, sw, sh = 1130, 240, 190, 170
parts.append(box(sx, sy, sw, sh, "#fff4e6")); parts.append(t(sx + sw/2, sy + 22, "MẠCH CHUYỂN MỨC", 13, w="bold", anchor="middle")); parts.append(t(sx + sw/2, sy + 40, "5 V ↔ 3,3 V", 12, "#495057", anchor="middle"))
Y = {"1": 290, "2": 320, "P": 350, "G": 380}
parts.append(pin(sx, Y["1"], "HV1", "left")); parts.append(pin(sx, Y["2"], "HV2", "left"))
parts.append(pin(sx + sw, Y["1"], "LV1", "right")); parts.append(pin(sx + sw, Y["2"], "LV2", "right")); parts.append(pin(sx + sw, Y["P"], "LV", "right")); parts.append(pin(sx + sw, Y["G"], "GND", "right"))
parts.append(pin(sx + 40, sy + sh, "GND", "bottom")); parts.append(pin(sx + 100, sy + sh, "HV", "bottom"))
# ESP32
ex, ey, ew, eh = 1400, 130, 170, 300
parts.append(box(ex, ey, ew, eh, "#e7f5ff")); parts.append(t(ex + ew/2, ey + 28, "ESP32", 18, w="bold", anchor="middle")); parts.append(t(ex + ew/2, ey + 48, "NodeMCU-32S", 13, "#495057", anchor="middle")); parts.append(t(ex + ew/2, ey + 70, "cầu nối Internet", 12, "#1971c2", anchor="middle"))
parts.append(pin(ex, Y["1"], "GPIO4", "left")); parts.append(pin(ex, Y["2"], "GPIO16", "left")); parts.append(pin(ex, Y["P"], "3V3", "left")); parts.append(pin(ex, Y["G"], "GND", "left"))
parts.append(pin(ex + 50, ey + eh, "5V", "bottom")); parts.append(pin(ex + 110, ey + eh, "GND", "bottom"))
# LCD (dưới Uno, chân ở cạnh trên)
cx_, cy_, cw, ch = 760, 700, 320, 130
parts.append(box(cx_, cy_, cw, ch, "#e6fcf5")); parts.append(f"<rect x='{cx_+40}' y='{cy_+40}' width='{cw-80}' height='60' rx='4' fill='#2f6b2f' stroke='#1b1d2b' stroke-width='3'/>")
parts.append(t(cx_ + 52, cy_ + 66, "H₂O", 16, "#d9ffd0", "bold")); parts.append(t(cx_ + 52, cy_ + 90, "Nuoc", 14, "#d9ffd0")); parts.append(t(cx_ + cw/2, cy_ + 120, "LCD 1602 + mạch I2C", 13, w="bold", anchor="middle"))
LC = {"GND": UB["A4"] - 90, "VCC": UB["A4"] - 45, "SDA": UB["A4"], "SCL": UB["A5"]}
for k, x in LC.items(): parts.append(pin(x, cy_, k, "top"))
# Pin + LM2596
px, py = 60, 990
parts.append(box(px, py, 120, 110, "#f8f9fa")); parts.append(t(px + 60, py + 20, "HỘP PIN 2×18650", 12, w="bold", anchor="middle"))
for i in range(2): parts.append(f"<rect x='{px+14}' y='{py+32+i*36}' width='92' height='28' rx='13' fill='#5c940d' stroke='#2b8a3e'/>" + t(px + 60, py + 51 + i*36, "3,7 V", 12, "#fff", "bold", "middle"))
mx, my = 260, 990
parts.append(box(mx, my, 150, 115, "#fff9db")); parts.append(t(mx + 75, my + 40, "LM2596", 14, w="bold", anchor="middle"))
parts.append(f"<rect x='{mx+40}' y='{my+50}' width='70' height='30' rx='4' fill='#212529'/>" + t(mx + 75, my + 72, "5.00", 18, "#ff6b6b", "bold", "middle")); parts.append(t(mx + 75, my + 135, "giảm áp 7,4 → 5,0 V", 12, "#495057", anchor="middle"))
parts.append(pin(mx, my + 30, "IN+", "left")); parts.append(pin(mx, my + 92, "IN−", "left")); parts.append(pin(mx + 50, my, "OUT+", "top")); parts.append(pin(mx + 110, my, "OUT−", "top"))

# ---- dây ----
W_.append(wire([(px + 120, py + 40), (mx, my + 30)], RED)); W_.append(wire([(px + 120, py + 92), (mx, my + 92)], BLK))
labels += [lab(px + 126, py + 30, "đỏ (+)", RED), lab(px + 126, py + 108, "đen (−)", BLK)]
W_.append(wire([(mx + 50, my), (mx + 50, RAIL5)], RED)); W_.append(wire([(mx + 110, my), (mx + 110, RAILG)], BLK)); dots += [(mx + 50, RAIL5, RED), (mx + 110, RAILG, BLK)]
# GM65: tín hiệu thẳng xuống D8/D9; nguồn đi lên-trái rồi xuống mép trái
W_.append(wire([(G["TX"], gy + gh), (U["D8"], uy)], C["tx"])); W_.append(wire([(G["RX"], gy + gh), (U["D9"], uy)], C["rx"]))
labels += [lab(U["D8"] + 7, 376, "TX→D8", C["tx"]), lab(U["D9"] - 112, 376, "RX→D9", "#b08900")]
W_.append(wire([(gx, gy + 30), (gx - 20, gy + 30), (gx - 20, 100), (32, 100), (32, RAIL5)], RED)); dots.append((32, RAIL5, RED))
W_.append(wire([(gx, gy + 60), (gx - 36, gy + 60), (gx - 36, 86), (50, 86), (50, RAILG)], BLK)); dots.append((50, RAILG, BLK))
# Đèn
W_.append(wire([(L_["5V"], ly + 100), (L_["5V"], RAIL5)], RED)); W_.append(wire([(L_["GND"], ly + 100), (L_["GND"], RAILG)], BLK)); dots += [(L_["5V"], RAIL5, RED), (L_["GND"], RAILG, BLK)]
W_.append(wire([(L_["DI"], ly + 100), (L_["DI"], 330), (U["D10"], 330), (U["D10"], uy)], C["led"])); labels.append(lab(L_["DI"] + 8, 324, "DI → D10", C["led"]))
# Chuyển mức <-> Uno
W_.append(wire([(sx, Y["1"]), (U["D7"], Y["1"]), (U["D7"], uy)], C["g4"])); labels.append(lab(U["D7"] + 120, Y["1"] - 7, "báo mạng: GPIO4 → D7", C["g4"]))
W_.append(wire([(sx, Y["2"]), (U["D1"], Y["2"]), (U["D1"], uy)], C["g16"])); labels.append(lab(U["D1"] - 196, Y["2"] + 4, "kết quả: D1 (TX) → GPIO16", C["g16"]))
# Chuyển mức <-> ESP32
W_.append(wire([(sx + sw, Y["1"]), (ex, Y["1"])], C["g4"])); W_.append(wire([(sx + sw, Y["2"]), (ex, Y["2"])], C["g16"]))
W_.append(wire([(sx + sw, Y["P"]), (ex, Y["P"])], ORG)); W_.append(wire([(sx + sw, Y["G"]), (ex, Y["G"])], BLK))
W_.append(wire([(sx + 40, sy + sh), (sx + 40, RAILG)], BLK)); W_.append(wire([(sx + 100, sy + sh), (sx + 100, RAIL5)], RED)); dots += [(sx + 40, RAILG, BLK), (sx + 100, RAIL5, RED)]
W_.append(wire([(ex + 50, ey + eh), (ex + 50, RAIL5)], RED)); W_.append(wire([(ex + 110, ey + eh), (ex + 110, RAILG)], BLK)); dots += [(ex + 50, RAIL5, RED), (ex + 110, RAILG, BLK)]
# Uno nguồn
W_.append(wire([(UB["5V"], uy + uh), (UB["5V"], RAIL5)], RED)); W_.append(wire([(UB["GND"], uy + uh), (UB["GND"], RAILG)], BLK)); dots += [(UB["5V"], RAIL5, RED), (UB["GND"], RAILG, BLK)]
# LCD
W_.append(wire([(UB["A4"], uy + uh), (LC["SDA"], cy_)], C["sda"])); W_.append(wire([(UB["A5"], uy + uh), (LC["SCL"], cy_)], C["scl"]))
labels += [lab(UB["A4"] - 34, 672, "SDA", C["sda"]), lab(UB["A5"] + 8, 672, "SCL", C["scl"])]
W_.append(wire([(LC["VCC"], cy_), (LC["VCC"], 668), (cx_ - 40, 668), (cx_ - 40, RAIL5)], RED)); W_.append(wire([(LC["GND"], cy_), (LC["GND"], 684), (cx_ - 20, 684), (cx_ - 20, RAILG)], BLK))
dots += [(cx_ - 40, RAIL5, RED), (cx_ - 20, RAILG, BLK)]
note = box(560, 985, 600, 128, "#fff5f5", "#e03131", 10, 2) + t(576, 1011, "⚠ AN TOÀN ĐIỆN", 14, "#c92a2a", "bold") + \
       t(576, 1035, "1. Chỉnh LM2596 ra đúng 5,0 V TRƯỚC khi nối thanh nguồn.", 13, "#c92a2a") + \
       t(576, 1057, "2. ESP32 chỉ chịu 3,3 V: luôn đi qua mạch chuyển mức.", 13, "#c92a2a") + \
       t(576, 1079, "3. Cắm USB để nạp code cho Uno: tháo 1 viên pin ra.", 13, "#c92a2a")
legend = box(1200, 985, 370, 128, "#f8f9fa", "#adb5bd", 10, 1.5) + t(1216, 1011, "ĐÈN LED RGB BÁO TRẠNG THÁI", 13, w="bold") + \
       "".join(f"<circle cx='1228' cy='{1032+i*24}' r='8' fill='{c}'/>" + t(1244, 1037 + i*24, s, 13) for i, (c, s) in enumerate([("#1c7ed6", "xanh dương: chưa quét (chờ thẻ)"), ("#fab005", "vàng: đã quét (đang xử lý / lắp ghép)"), ("#2f9e44", "xanh lá: quét xong, đã gửi lên web"), ("#e03131", "đỏ: thẻ lỗi (3 giây)")]))
svg = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>", f"<rect width='{W}' height='{H}' fill='#fff'/>",
       t(W/2, 34, "HÌNH 2 · SƠ ĐỒ NỐI DÂY — BẢN TỰ ĐỘNG (Arduino Uno + GM65 + đèn LED RGB + ESP32)", 20, w="bold", anchor="middle"),
       t(W/2, 58, "Đỏ = 5 V · Đen = GND · Cam = 3,3 V · Mỗi dây tín hiệu một màu · Chấm tròn = điểm nối trên thanh nguồn breadboard", 13, "#495057", anchor="middle")]
svg += W_ + parts + [dot(x, y, c) for x, y, c in dots] + labels + [note, legend, "</svg>"]
open("h2_so_do_noi_day.svg", "w").write("\n".join(svg))

# ================= HÌNH 1 =================
W, H = 1420, 560
k = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>", f"<rect width='{W}' height='{H}' fill='#ffffff'/>",
     "<defs><marker id='m' markerUnits='userSpaceOnUse' markerWidth='16' markerHeight='16' refX='14' refY='8' orient='auto'><path d='M0,0 L16,8 L0,16 z' fill='#495057'/></marker></defs>"]
k.append(t(W/2, 36, "HÌNH 1 · SƠ ĐỒ KHỐI — BẢN TỰ ĐỘNG: ĐƯA THẺ VÀO LÀ CÓ KẾT QUẢ TRÊN WEB", 20, w="bold", anchor="middle"))
def blk(x, y, w, h, fill, title, sub, tc="#2b2d42"):
    return box(x, y, w, h, fill, "#495057", 14, 2) + t(x + w/2, y + h/2 - 4, title, 18, tc, "bold", "middle") + "".join(t(x + w/2, y + h/2 + 20 + i*18, l, 12, tc if tc != "#2b2d42" else "#495057", anchor="middle") for i, l in enumerate(sub))
def arr(x1, y1, x2, y2, lbl="", dy=-10):
    return f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='#495057' stroke-width='3' marker-end='url(#m)'/>" + (t((x1+x2)/2, (y1+y2)/2 + dy, lbl, 12, "#495057", "bold", "middle") if lbl else "")
k.append(blk(40, 110, 150, 90, "#f8f9fa", "THẺ QR", ["CT:H2O|Nuoc", "NT:H · LENH:XONG"]))
k.append(blk(260, 110, 190, 90, "#ebfbee", "GM65", ["tự quét liên tục", "(không suy luận)"]))
k.append(blk(540, 90, 300, 260, "#0b7285", "ARDUINO UNO", ["① đếm nguyên tử, nguyên tố", "② đơn chất / hợp chất", "③ ion / cộng hóa trị", "④ khối lượng phân tử", "→ MỌI KẾT LUẬN Ở ĐÂY"], "#ffffff"))
k.append(blk(560, 420, 260, 90, "#e6fcf5", "LCD 1602", ["5 màn kết quả", "ngay trên máy"]))
k.append(blk(260, 260, 190, 100, "#fff0f6", "ĐÈN LED RGB", ["xanh dương · vàng", "xanh lá · đỏ (lỗi)"]))
k.append(blk(930, 110, 200, 110, "#e7f5ff", "ESP32", ["người đưa thư", "(không suy luận)"]))
k.append(blk(1190, 110, 190, 110, "#fff4e6", "FIREBASE", ["Realtime Database", "trên Internet"]))
k.append(blk(1150, 300, 230, 150, "#f3f0ff", "TRANG WEB", ["máy chiếu · điện thoại", "lý thuyết + hình 3D", "xem cả lớp"]))
k.append(arr(190, 155, 258, 155, "ánh sáng")); k.append(arr(450, 155, 538, 155, "mã thẻ (UART)"))
k.append(arr(538, 310, 452, 310, "D10", -10)); k.append(arr(690, 350, 690, 418, "I2C", 0))
k.append(arr(840, 165, 928, 165, "tự gửi kết quả")); k.append(arr(1130, 165, 1188, 165, "WiFi")); k.append(arr(1285, 220, 1285, 298, "tức thì", 0))
k.append(box(40, 400, 460, 120, "#fff9db", "#f08c00", 12, 2))
k.append(t(60, 428, "Không cần bấm nút: đưa thẻ vào, giữ yên 1 giây.", 14, "#7a4a00", "bold"))
k.append(t(60, 452, "Thẻ để yên không bị tính hai lần; muốn quét lại cùng thẻ", 13, "#7a4a00"))
k.append(t(60, 474, "thì đưa thẻ ra khỏi vùng đọc hơn 1,5 giây.", 13, "#7a4a00"))
k.append(t(60, 500, "Nguồn: 2 pin 18650 → LM2596 (5,0 V) cấp chung cho cả máy.", 13, "#7a4a00"))
k.append("</svg>")
open("h1_so_do_khoi.svg", "w").write("\n".join(k))
print("ok")

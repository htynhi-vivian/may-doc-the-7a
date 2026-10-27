L=["3V3","EN","SVP","SVN","P34","P35","P32","P33","P25","P26","P27","P14","P12","GND","P13","SD2","SD3","CMD","5V"]
R=["GND","P23","P22","TX","RX","P21","GND","P19","P18","P5","P17","P16","P4","P0","P2","P15","SD1","SD0","CLK"]
X0,X1=600,860; Y0=250; DY=31
def py(i): return Y0+i*DY
o=[]
a=o.append
a('<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>body{margin:0}#canvas{width:1600px;height:1150px;background:#fbfaf6}text{font-family:Arial,Helvetica,sans-serif}</style></head><body><div id="canvas"><svg width="1600" height="1150" viewBox="0 0 1600 1150">')
a('<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity=".25"/></filter></defs>')
a('<text x="800" y="50" text-anchor="middle" font-size="34" font-weight="bold" fill="#1e293b">Nối dây ESP32 NodeMCU-32S (Ai-Thinker, 38 chân)</text>')
a('<text x="800" y="86" text-anchor="middle" font-size="20" fill="#475569">Máy đọc thẻ phân tử, bản tự động · dùng 6 chân (tô màu) · nhìn từ mặt có chip, ăng-ten ở trên · tên chân = CHỮ IN trên mạch</text>')
# board
a(f'<g filter="url(#sh)"><rect x="{X0-20}" y="130" width="{X1-X0+40}" height="{py(18)-130+90}" rx="12" fill="#1f2937"/></g>')
a(f'<rect x="{X0+40}" y="140" width="{X1-X0-80}" height="60" rx="4" fill="#0f172a" stroke="#475569"/>')
a(f'<path d="M{X0+55} 185 h20 v-30 h20 v30 h20 v-30 h20 v30 h20 v-30 h20 v30 h20 v-30 h20 v30" stroke="#eab308" stroke-width="3" fill="none"/>')
a(f'<text x="{(X0+X1)//2}" y="222" text-anchor="middle" font-size="14" fill="#94a3b8">ăng-ten</text>')
a(f'<rect x="{X0+85}" y="300" width="{X1-X0-170}" height="170" rx="6" fill="#9ca3af"/>')
a(f'<text x="{(X0+X1)//2}" y="380" text-anchor="middle" font-size="18" font-weight="bold" fill="#111">ESP-32S</text><text x="{(X0+X1)//2}" y="405" text-anchor="middle" font-size="13" fill="#111">Ai-Thinker</text>')
a(f'<rect x="{X0+85}" y="530" width="{X1-X0-170}" height="50" rx="4" fill="#111827"/><text x="{(X0+X1)//2}" y="561" text-anchor="middle" font-size="15" fill="#9ca3af">CH340</text>')
# buttons and LED
yb=py(18)+20
a(f'<rect x="{X0+20}" y="{yb}" width="40" height="30" rx="4" fill="#e5e7eb"/><text x="{X0+40}" y="{yb+52}" text-anchor="middle" font-size="14" fill="#cbd5e1">EN</text>')
a(f'<rect x="{X1-60}" y="{yb}" width="40" height="30" rx="4" fill="#e5e7eb"/><text x="{X1-40}" y="{yb+52}" text-anchor="middle" font-size="14" fill="#cbd5e1">BOOT</text>')
a(f'<rect x="{(X0+X1)//2-35}" y="{yb+25}" width="70" height="40" rx="4" fill="#d1d5db"/>')
a(f'<text x="{(X0+X1)//2}" y="{yb+52}" text-anchor="middle" font-size="13" fill="#334155">micro USB</text>')
a(f'<circle cx="{X1-95}" cy="620" r="9" fill="#3b82f6"/><text x="{X1-110}" y="626" text-anchor="end" font-size="14" fill="#cbd5e1">LED (P2)</text>')
used={("L",0):"#f97316",("L",13):"#111",("L",18):"#dc2626",("R",0):"#111",("R",11):"#9333ea",("R",12):"#16a34a"}
for i,n in enumerate(L):
    c=used.get(("L",i)); y=py(i)
    a(f'<circle cx="{X0}" cy="{y}" r="9" fill="{"#fcd34d" if c else "#6b7280"}"/>')
    a(f'<text x="{X0+18}" y="{y+6}" font-size="{17 if c else 15}" font-weight="{"bold" if c else "normal"}" fill="{"#fff" if c else "#9ca3af"}">{n}</text>')
for i,n in enumerate(R):
    c=used.get(("R",i)); y=py(i)
    a(f'<circle cx="{X1}" cy="{y}" r="9" fill="{"#fcd34d" if c else "#6b7280"}"/>')
    a(f'<text x="{X1-18}" y="{y+6}" text-anchor="end" font-size="{17 if c else 15}" font-weight="{"bold" if c else "normal"}" fill="{"#fff" if c else "#9ca3af"}">{n}</text>')
# Right: level shifter LV side
SX=1180; 
a(f'<g filter="url(#sh)"><rect x="{SX}" y="230" width="300" height="300" rx="10" fill="#1d4ed8"/></g>')
a(f'<text x="{SX+150}" y="210" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e293b">Mạch chuyển mức (phía LV)</text>')
SP={"GND":py(0),"LV1":py(12)-0,"LV2":py(11),"LV":290}
# fixed rows on shifter
rows=[("GND",270),("LV",330),("LV2",400),("LV1",470)]
for n,y in rows:
    a(f'<circle cx="{SX+20}" cy="{y}" r="10" fill="#fcd34d"/><text x="{SX+40}" y="{y+7}" font-size="20" font-weight="bold" fill="#fff">{n}</text>')
a(f'<text x="{SX+150}" y="560" text-anchor="middle" font-size="16" fill="#475569">hàng LV thật: LV1 · LV2 · LV · GND (xem Hình 4)</text>')
W='fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"'
# 3V3 (left top) -> LV : route up over top
a(f'<path d="M{X0} {py(0)} H{X0-60} V110 H1100 V330 H{SX+20}" stroke="#f97316" {W}/>')
# GND right top -> shifter GND
a(f'<path d="M{X1} {py(0)} H1060 V270 H{SX+20}" stroke="#111" {W}/>')
# GPIO16 -> LV2
a(f'<path d="M{X1} {py(11)} H1020 V400 H{SX+20}" stroke="#9333ea" {W}/>')
# GPIO4 -> LV1
a(f'<path d="M{X1} {py(12)} H1040 V470 H{SX+20}" stroke="#16a34a" {W}/>')
# Left: breadboard rail
BX=110
a(f'<g filter="url(#sh)"><rect x="{BX}" y="640" width="300" height="200" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/></g>')
a(f'<line x1="{BX+20}" y1="780" x2="{BX+280}" y2="780" stroke="#dc2626" stroke-width="6"/><text x="{BX+150}" y="815" text-anchor="middle" font-size="18" font-weight="bold" fill="#dc2626">+ 5 V</text>')
a(f'<line x1="{BX+20}" y1="700" x2="{BX+280}" y2="700" stroke="#1e3a8a" stroke-width="6"/><text x="{BX+150}" y="688" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e3a8a">− GND</text>')
a(f'<text x="{BX+150}" y="625" text-anchor="middle" font-size="18" font-weight="bold" fill="#334155">Thanh nguồn breadboard</text><text x="{BX+150}" y="870" text-anchor="middle" font-size="16" fill="#475569">(từ LM2596 chỉnh 5,0 V)</text>')
a(f'<circle cx="{BX+260}" cy="780" r="7" fill="#7f1d1d"/><circle cx="{BX+260}" cy="700" r="7" fill="#1e293b"/>')
a(f'<path d="M{X0} {py(18)} H{BX+260} V780" stroke="#dc2626" {W}/>')
a(f'<path d="M{X0} {py(13)} H{BX+260} V700" stroke="#111" {W}/>')
# labels on wires
a(f'<text x="1100" y="{py(11)+6}" font-size="16" fill="#9333ea">← nhận kết quả từ Uno</text>')
a(f'<text x="1100" y="{py(12)+30}" font-size="16" fill="#16a34a">báo đã nối Internet →</text>')
a(f'<text x="{X0-70}" y="{py(0)-12}" font-size="16" fill="#f97316" text-anchor="end">3,3 V cho phía LV</text>')
# table
T=960
a(f'<g transform="translate(60,{T})"><rect width="1480" height="170" rx="10" fill="#fff" stroke="#cbd5e1"/>')
hdr=[(20,"Màu"),(120,"Chân ESP32"),(450,"Nối đến"),(870,"Việc của dây")]
for x,t in hdr: a(f'<text x="{x}" y="32" font-size="19" font-weight="bold" fill="#1e293b">{t}</text>')
rowsT=[("#dc2626","5V (hàng trái, cuối)","thanh + 5 V","nguồn cho ESP32 (từ pin qua LM2596)"),
("#111","GND (trái) / GND (phải, đầu)","thanh − GND / GND mạch chuyển mức","mass chung, bắt buộc"),
("#f97316","3V3 (hàng trái, đầu)","LV của mạch chuyển mức","đặt mức 3,3 V cho mạch chuyển mức"),
("#9333ea","P16 (= GPIO16, RX2)","LV2 (→ HV2 → Uno D1)","nhận kết quả quét từ Uno"),
("#16a34a","P4 (= GPIO4)","LV1 (→ HV1 → Uno D7)","kéo THẤP khi đã nối Firebase")]
for k,(c,p,d,v) in enumerate(rowsT):
    y=58+k*24
    a(f'<rect x="20" y="{y-12}" width="60" height="10" fill="{c}"/><text x="120" y="{y}" font-size="17">{p}</text><text x="450" y="{y}" font-size="17">{d}</text><text x="870" y="{y}" font-size="17">{v}</text>')
a('</g>')
a(f'<text x="800" y="{T-14}" text-anchor="middle" font-size="16" fill="#9a3412">Chữ in P16 = GPIO16, P4 = GPIO4. Mạch rộng 25,4 mm, cắm breadboard 400 lỗ chỉ còn 1 hàng lỗ mỗi bên: nên nối bằng dây cái–đực / cái–cái. Cổng micro USB chỉ dùng để nạp code (tắt công tắc pin khi cắm).</text>')
a('</svg></div></body></html>')
open("esp32.html","w").write("\n".join(o))

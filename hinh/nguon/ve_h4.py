XS=[560,656,752,848,944,1040]
HV=["HV1","HV2","HV","GND","HV3","HV4"]; LV=["LV1","LV2","LV","GND","LV3","LV4"]
UP=[("#16a34a","D7"),("#9333ea","D1 (TX)"),("#dc2626",None),("#111",None),None,None]
DN=[("#16a34a","GPIO4"),("#9333ea","GPIO16 (RX2)"),("#f97316","3V3"),("#111","GND"),None,None]
BY0,BY1=470,690
o=[];a=o.append
a('<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>body{margin:0}#canvas{width:1600px;height:1180px;background:#fbfaf6}text{font-family:Arial,Helvetica,sans-serif}</style></head><body><div id="canvas"><svg width="1600" height="1180" viewBox="0 0 1600 1180">')
a('<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity=".25"/></filter><linearGradient id="pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9363e"/><stop offset="1" stop-color="#a61e24"/></linearGradient></defs>')
a('<text x="800" y="50" text-anchor="middle" font-size="34" font-weight="bold" fill="#1e293b">Nối dây mạch chuyển mức 4 kênh 3,3 V ↔ 5 V (Hshop)</text>')
a('<text x="800" y="86" text-anchor="middle" font-size="20" fill="#475569">Mạch có 2 hàng × 6 chân: hàng HV (5 V) ở một cạnh, hàng LV (3,3 V) ở cạnh đối diện; LV1 nằm đối diện HV1</text>')
W='fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'
# Uno block (top)
a('<g filter="url(#sh)"><rect x="420" y="130" width="420" height="150" rx="12" fill="#0e7490"/></g>')
a('<text x="440" y="165" font-size="24" font-weight="bold" fill="#fff">Arduino Uno (5 V)</text>')
# breadboard rails (top right)
a('<g filter="url(#sh)"><rect x="930" y="140" width="460" height="150" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/></g>')
a('<text x="1160" y="128" text-anchor="middle" font-size="18" font-weight="bold" fill="#334155">Thanh nguồn breadboard (từ LM2596 5,0 V)</text>')
a('<line x1="950" y1="190" x2="1370" y2="190" stroke="#dc2626" stroke-width="7"/><text x="1300" y="180" font-size="18" font-weight="bold" fill="#dc2626">+ 5 V</text>')
a('<line x1="950" y1="250" x2="1370" y2="250" stroke="#1e3a8a" stroke-width="7"/><text x="1300" y="278" font-size="18" font-weight="bold" fill="#1e3a8a">− GND</text>')
# ESP block bottom
a('<g filter="url(#sh)"><rect x="420" y="880" width="560" height="150" rx="12" fill="#1f2937"/></g>')
a('<text x="440" y="1015" font-size="24" font-weight="bold" fill="#fff">ESP32 NodeMCU-32S (3,3 V)</text>')
# wires up
a(f'<path d="M{XS[0]} {BY0} V280" stroke="#16a34a" {W}/>')
a(f'<path d="M{XS[1]} {BY0} V280" stroke="#9333ea" {W}/>')
a(f'<path d="M{XS[2]} {BY0} V400 H1000 V190" stroke="#dc2626" {W}/>')
a(f'<path d="M{XS[3]} {BY0} V430 H1080 V250" stroke="#111" {W}/>')
a('<circle cx="1000" cy="190" r="8" fill="#7f1d1d"/><circle cx="1080" cy="250" r="8" fill="#1e293b"/>')
# wires down
for i in range(4):
    c=DN[i][0]; a(f'<path d="M{XS[i]} {BY1} V880" stroke="{c}" {W}/>')
# Uno pins
for i in range(2):
    a(f'<circle cx="{XS[i]}" cy="280" r="11" fill="#e5c07b" stroke="#7a5b10" stroke-width="2"/><text x="{XS[i]}" y="258" text-anchor="middle" font-size="21" font-weight="bold" fill="#fff">{UP[i][1]}</text>')
for i in range(4):
    a(f'<circle cx="{XS[i]}" cy="880" r="11" fill="#e5c07b" stroke="#7a5b10" stroke-width="2"/><text x="{XS[i]}" y="{915 if i!=1 else 940}" text-anchor="middle" font-size="19" font-weight="bold" fill="#fff">{DN[i][1]}</text>')
# board
a(f'<g filter="url(#sh)"><rect x="500" y="{BY0-20}" width="600" height="{BY1-BY0+40}" rx="12" fill="url(#pcb)" stroke="#6b1015" stroke-width="2"/></g>')
for x in (XS[0],XS[1],XS[4],XS[5]):
    a(f'<rect x="{x-22}" y="555" width="44" height="30" rx="3" fill="#1b1b1b"/>')
    for dx in (-40,28):
        a(f'<rect x="{x+dx}" y="565" width="12" height="10" fill="#8a8f98"/>')
a(f'<text x="800" y="568" text-anchor="middle" font-size="14" fill="#ffd8d8">4 MOSFET</text><text x="800" y="588" text-anchor="middle" font-size="14" fill="#ffd8d8">+ 8 điện trở</text>')
for i,x in enumerate(XS):
    on = UP[i] is not None
    a(f'<circle cx="{x}" cy="{BY0}" r="12" fill="{"#e0b437" if on else "#c9a227"}" stroke="#7a5b10" stroke-width="2"/>')
    a(f'<text x="{x}" y="{BY0+38}" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff">{HV[i]}</text>')
    a(f'<circle cx="{x}" cy="{BY1}" r="12" fill="{"#e0b437" if on else "#c9a227"}" stroke="#7a5b10" stroke-width="2"/>')
    a(f'<text x="{x}" y="{BY1-22}" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff">{LV[i]}</text>')
a(f'<text x="1125" y="{BY0+8}" font-size="18" font-weight="bold" fill="#b91c1c">← hàng HV: phía 5 V (Uno)</text>')
a(f'<text x="1125" y="{BY1+8}" font-size="18" font-weight="bold" fill="#1d4ed8">← hàng LV: phía 3,3 V (ESP32)</text>')
a(f'<text x="1125" y="{(BY0+BY1)//2+6}" font-size="16" fill="#64748b">HV3, HV4, LV3, LV4: bỏ trống</text>')
# direction labels
a('<text x="545" y="380" text-anchor="end" font-size="16" fill="#16a34a">↑ báo đã nối Internet</text>')
a('<text x="672" y="350" font-size="16" fill="#9333ea">↓ kết quả quét</text>')
a('<text x="545" y="790" text-anchor="end" font-size="16" fill="#16a34a">↑</text><text x="672" y="790" font-size="16" fill="#9333ea">↓</text>')
# table
T=1060
a(f'<g transform="translate(60,{T})"><rect width="1480" height="110" rx="10" fill="#fff" stroke="#cbd5e1"/>')
a('<text x="20" y="30" font-size="18" font-weight="bold" fill="#1e293b">Hàng HV (5 V):</text><text x="200" y="30" font-size="18">HV1 → Uno D7 · HV2 ← Uno D1 (TX) · HV → thanh + 5 V · GND → thanh GND</text>')
a('<text x="20" y="62" font-size="18" font-weight="bold" fill="#1e293b">Hàng LV (3,3 V):</text><text x="200" y="62" font-size="18">LV1 ← ESP32 GPIO4 · LV2 → ESP32 GPIO16 (RX2) · LV ← ESP32 3V3 · GND → ESP32 GND</text>')
a('<text x="20" y="94" font-size="16" fill="#9a3412">Mạch thật có thể in chữ theo thứ tự khác hình: luôn dò theo CHỮ IN cạnh từng chân. Kênh 1 = cặp LV1–HV1, kênh 2 = cặp LV2–HV2 (luôn đối diện nhau).</text>')
a('</g></svg></div></body></html>')
open('chuyen_muc.html','w').write("\n".join(o))

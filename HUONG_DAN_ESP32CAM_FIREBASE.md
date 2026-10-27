# Máy đọc thẻ phân tử ESP32-CAM + trang web Firebase

KHTN 7 · Bài 5 (Phân tử, đơn chất, hợp chất) · Bài 6 (Liên kết hóa học)

Phiên bản 1.0 · 24/10/2026

## 1. Máy làm được gì

- **Không cần máy tính hay webcam.** Camera trên mạch ESP32-CAM tự chụp và giải mã thẻ QR ngay trên mạch, bằng thư viện quirc.
- **Máy tự kết luận** theo đúng quy tắc của bản Arduino Uno:
  - đếm số nguyên tử và số nguyên tố;
  - xác định hạt tạo nên chất;
  - kết luận đơn chất / hợp chất, loại liên kết;
  - tính khối lượng phân tử.
- **Màn LCD 1602 (không bắt buộc)** hiện 5 màn giống bản Uno.
- **Gửi kết quả qua WiFi lên Firebase.** Trang web trên Firebase Hosting nhận kết quả sau khoảng 1–2 giây, hiện bài lý thuyết với hình 3D xoay được, như trang camera trước đây.
- **Xem nhiều nhóm cùng lúc.** Mỗi nhóm một máy; giáo viên bấm **Cả lớp** để xem kết quả mới nhất của mọi nhóm trên máy chiếu.
- **Máy không gửi hình ảnh.** Lên Internet chỉ có nội dung thẻ và kết quả.

```
 Thẻ QR ──► [ESP32-CAM: camera → giải mã QR → suy luận → LCD]
                         │ WiFi (HTTPS)
                         ▼
              Firebase Realtime Database
              /may/<máy>/hien_tai, /may/<máy>/trang_thai, /nhat_ky/<máy>
                         │ (tức thì)
                         ▼
     Trang web Firebase Hosting (máy chiếu, máy tính, điện thoại)
```

## 2. Gói bàn giao gồm những gì

| Thư mục / tệp | Dùng để |
|---|---|
| `may_doc_the_esp32cam/` | Chương trình nạp vào ESP32-CAM. Chỉ sửa tệp `cau_hinh.h`. |
| `firebase_web/public/` | Trang web: `index.html`, `app.js`, `theory.js`, `render.js`, `firebase_sdk.js`, `cau_hinh_firebase.js`. |
| `firebase_web/firebase.json`, `database.rules.json`, `.firebaserc` | Cấu hình để đăng trang và quy tắc dữ liệu lên Firebase. |
| `firebase_web/cong_cu/kiem_tra_firebase.py` | Kiểm tra Firebase từ máy tính, trước khi có mạch. |
| `firebase_web/kiem_thu/` | Các bài kiểm thử đã chạy (cho người bảo trì). |

## 3. Linh kiện cho mỗi nhóm

| Linh kiện | SL | Ghi chú |
|---|---|---|
| ESP32-CAM AI Thinker (camera OV2640, có PSRAM 4 MB) | 1 | Loại phổ biến nhất. Chọn loại có kèm camera. |
| Đế nạp ESP32-CAM-MB (cổng micro-USB, chip CH340) | 1 | Cắm chồng lên ESP32-CAM để nạp và cấp điện. |
| Cáp USB **truyền dữ liệu** | 1 | Cáp chỉ sạc sẽ không nạp được. |
| Màn hình LCD 1602 có mạch I2C (PCF8574) | 1 | Không bắt buộc. Không có LCD thì xem kết quả trên web. |
| Mạch chuyển mức logic I2C 3,3 V ↔ 5 V (2 kênh trở lên) | 1 | Chỉ cần khi gắn LCD (xem mục 4). |
| Dây cắm đực–cái | 6–8 | |
| Nguồn 5 V – 2 A (cốc sạc điện thoại tốt) | 1 | Cổng USB máy tính yếu dễ làm ESP32-CAM khởi động lại. |

## 4. Lắp mạch

**Không gắn LCD:** chỉ cần cắm ESP32-CAM lên đế ESP32-CAM-MB (camera quay ra ngoài, đúng chiều chân), rồi cắm cáp USB.

**Có LCD:** LCD nối vào hai chân GPIO 14 và GPIO 15 của ESP32-CAM. Hai chân này vốn dùng cho thẻ nhớ, nhưng máy không dùng thẻ nhớ nên **không cắm thẻ nhớ vào khe**.

| LCD (mạch I2C) | Mạch chuyển mức | ESP32-CAM |
|---|---|---|
| VCC | HV và nguồn 5 V | chân **5V** |
| GND | GND | chân **GND** |
| SDA | HV1 ↔ LV1 | **GPIO 15** |
| SCL | HV2 ↔ LV2 | **GPIO 14** |
| | LV | chân **3V3** |

Cần mạch chuyển mức vì mạch I2C của LCD kéo đường tín hiệu lên 5 V, trong khi chân ESP32 chỉ chịu 3,3 V. Nhiều người nối thẳng vẫn chạy, nhưng làm vậy về lâu dài có hại cho ESP32.

Đèn flash trắng (GPIO 4) mặc định **tắt**. Phòng tối thì bật nhẹ bằng `DEN_FLASH` trong `cau_hinh.h`. Mỗi lần đọc được thẻ, đèn đỏ nhỏ ở mặt sau mạch nháy một lần.

## 5. Tạo dự án Firebase (giáo viên làm một lần cho cả lớp)

Firebase là dịch vụ miễn phí của Google. Gói Spark (miễn phí) có Realtime Database và Hosting, đủ cho một lớp. Giao diện console có thể đổi chút ít theo thời gian; tên các mục dưới đây là tên tiếng Anh trong console.

1. **Tạo dự án.**
   - Vào https://console.firebase.google.com, đăng nhập Gmail.
   - Chọn **Create a project**, đặt tên (ví dụ `may-doc-the-7a`).
   - Có thể tắt Google Analytics.
2. **Bật đăng nhập ẩn danh.**
   - Vào **Build > Authentication > Get started > Sign-in method**.
   - Chọn **Anonymous**, bật **Enable**, bấm **Save**.
   - Mỗi máy ESP32-CAM tự đăng nhập ẩn danh để được phép ghi dữ liệu.
3. **Tạo Realtime Database.**
   - Vào **Build > Realtime Database > Create Database**.
   - Chọn vị trí **Singapore (asia-southeast1)**, chọn **locked mode**.
   - Chép **địa chỉ cơ sở dữ liệu** ở đầu thẻ **Data**, dạng `https://may-doc-the-7a-default-rtdb.asia-southeast1.firebasedatabase.app`.
4. **Đăng quy tắc dữ liệu.**
   - Mở thẻ **Rules**, xóa hết, dán toàn bộ nội dung tệp `firebase_web/database.rules.json`, bấm **Publish**.
   - Có thể bỏ qua bước này nếu đăng bằng lệnh `firebase deploy` ở mục 7, vì lệnh đó cũng đăng quy tắc.
5. **Lấy cấu hình trang web.**
   - Vào **Project settings** (bánh răng) **> General > Your apps**, bấm biểu tượng **</>** (Web), đặt tên, bấm **Register app**.
   - Chép khối `firebaseConfig` (apiKey, authDomain, databaseURL, projectId, appId) vào tệp `firebase_web/public/cau_hinh_firebase.js`.
   - Nếu khối đó thiếu `databaseURL`, tự thêm địa chỉ ở bước 3.
   - **Web API Key** (dòng `apiKey`) cũng là khóa sẽ điền cho ESP32-CAM.

**Kiểm tra ngay, chưa cần mạch.** Máy tính có Python 3 thì chạy:

```
python kiem_tra_firebase.py --api-key AIza...khoa... --db-url https://may-doc-the-7a-default-rtdb.asia-southeast1.firebasedatabase.app --may thu-pc
```

Chương trình làm đúng các bước như ESP32-CAM: đăng nhập ẩn danh, ghi trạng thái, ghi một kết quả H₂O, đọc lại. Bước nào lỗi thì chương trình báo lý do (khóa sai, chưa bật Anonymous, chưa đăng quy tắc, sai địa chỉ).

## 6. Nạp chương trình vào ESP32-CAM

1. **Thêm bo ESP32 vào Arduino IDE 2.x.**
   - Vào **File > Preferences > Additional boards manager URLs**, dán:
     `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
   - Vào **Tools > Board > Boards Manager**, tìm **esp32** (của Espressif Systems), bấm **Install**. Đã thử với phiên bản 3.3.12.
2. **Cài thư viện LCD** (chỉ khi gắn LCD): **Library Manager**, tìm **LiquidCrystal I2C** (Frank de Brabander), bấm **Install**. Khi biên dịch có dòng cảnh báo “may not be compatible”, bỏ qua được.
3. **Mở chương trình.** Mở tệp `may_doc_the_esp32cam/may_doc_the_esp32cam.ino`. Giữ nguyên cả thư mục, kể cả thư mục con `src/quirc`.
4. **Sửa `cau_hinh.h`** (mỗi máy một bản):
   - `WIFI_TEN`, `WIFI_MAT_KHAU`: WiFi **2,4 GHz** của phòng học. ESP32 không dùng được WiFi 5 GHz. WiFi phải đăng nhập qua trang web (kiểu khách sạn) cũng không dùng được.
   - `FIREBASE_API_KEY`: Web API Key ở mục 5.
   - `FIREBASE_DB_URL`: địa chỉ Realtime Database, **không có dấu / ở cuối**.
   - `MAY_ID`: tên máy, **mỗi nhóm một tên khác nhau**, ví dụ `nhom1`, `nhom2`. Chỉ dùng chữ thường không dấu, số, dấu - hoặc _.
   - `CO_LCD`: `1` nếu có LCD, `0` nếu không.
5. **Chọn bo và cổng.**
   - **Tools > Board > esp32 > AI Thinker ESP32-CAM**. PSRAM của bo này đã bật sẵn.
   - **Tools > Port**: chọn cổng COM của đế MB. Không thấy cổng thì cài driver CH340.
6. **Nạp.**
   - Bấm **Upload**.
   - Nếu báo `Failed to connect to ESP32`: giữ nút **IO0** trên đế MB, bấm rồi thả **RST**, thả **IO0**, bấm Upload lại.
   - Nạp xong, bấm **RST** một lần để chạy.
7. **Mở Serial Monitor (115200 baud) để theo dõi.** Máy báo lần lượt:
   - `[WiFi] Da ket noi, IP ...`
   - `[Firebase] Da dang nhap an danh`
   - `[Firebase] Da gui trang_thai`

   LCD hiện **QUET THE QR / Da noi Internet**.

**Thử không cần thẻ.** Gõ vào Serial Monitor `CT:H2O|Nuoc` rồi Enter. Máy xử lý như vừa quét thẻ và gửi kết quả lên web.

## 7. Đăng trang web lên Firebase Hosting

Cần Node.js (bản LTS) trên máy tính của giáo viên. Trong cửa sổ lệnh, đứng ở thư mục `firebase_web`:

```
npm install -g firebase-tools
firebase login
firebase use --add            (chọn dự án vừa tạo; hoặc sửa tên dự án trong tệp .firebaserc)
firebase deploy
```

Lệnh `firebase deploy` đăng cả trang web và quy tắc dữ liệu. Xong sẽ có địa chỉ dạng `https://may-doc-the-7a.web.app`. Mở địa chỉ này trên máy chiếu hoặc điện thoại.

- Thêm `?may=nhom1` vào cuối địa chỉ để mở thẳng máy của nhóm 1.
- Thêm `?xem=lop` để mở thẳng chế độ Cả lớp.

**Chế độ thử (không cần Firebase).** Khi `cau_hinh_firebase.js` chưa được điền, mở `public/index.html` vẫn chạy được. Dùng mục **Máy giả lập** để thử giao diện. Dữ liệu chỉ nằm trong trình duyệt đó, đồng bộ giữa các tab.

**Sửa SDK (chỉ người bảo trì).** Tệp `firebase_sdk.js` là Firebase SDK 13.1 đã gói sẵn, nên trang không phụ thuộc CDN. Muốn gói lại: chạy `npm install`, rồi `npm run build`.

## 8. Dùng trong lớp

1. **Bật máy, đợi lên mạng.** Cắm nguồn cho các máy và đợi khoảng 10 giây đến khi LCD hiện **Da noi Internet**. Trên web, máy hiện **trực tuyến**.
2. **Quét thẻ.**
   - Đưa thẻ trước camera, cách khoảng **10–20 cm**, thẻ **thẳng, phẳng, giữ yên khoảng 1 giây**.
   - Mã QR nên chiếm khoảng 1/4 đến 1/2 chiều ngang khung hình.
   - Đọc được thẻ thì đèn đỏ sau mạch nháy một lần; LCD và trang web cập nhật.
3. **Thẻ nguyên tử.**
   - Quét lần lượt từng thẻ.
   - Hai thẻ giống nhau liên tiếp: đưa thẻ đầu ra khỏi khung **hơn 1,5 giây** rồi mới đưa thẻ sau, vì máy bỏ qua một thẻ còn nằm trong khung.
   - Quét xong thì quét thẻ **XONG**. Thẻ **XÓA** để làm lại.
4. **Giáo viên xem cả lớp.**
   - Bấm **Cả lớp** để thấy kết quả mới nhất của mọi nhóm. Ô nào vừa có kết quả mới thì viền vàng nháy.
   - Bấm vào một ô để chiếu bài lý thuyết của nhóm đó.
5. **Xóa nhật ký.** Đầu tiết mới, mở mục Máy giả lập và bấm **Xóa nhật ký máy đang xem**.

Câu hỏi gợi mở: với thẻ NH₄Cl, máy kết luận “hợp chất cộng hóa trị” nhưng thực tế là hợp chất ion. Trang sẽ hiện khung **Máy sai ở đây!**. Đây là cơ hội để học sinh thấy quy tắc của máy chỉ gần đúng.

## 9. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| LCD: **LOI CAMERA** | Cáp camera chưa cắm chặt: mở nắp khe, cắm lại cáp, đóng nắp. Kiểm tra đã chọn bo **AI Thinker ESP32-CAM**. |
| LCD: **LOI: khong PSRAM** | Bo không phải AI Thinker, hoặc chọn sai bo trong Tools > Board. |
| LCD: **LOI: ten may sai** | `MAY_ID` có chữ hoa, dấu cách hoặc dấu tiếng Việt. |
| Máy khởi động lại liên tục, Serial báo **Brownout** | Nguồn yếu: dùng cốc sạc 5 V – 2 A, cáp ngắn tốt. |
| Không quét được, hoặc quét rất chậm | Đưa thẻ gần hơn, giữ thẳng, đủ sáng. Bật `DEN_FLASH` 10–30 khi phòng tối. Nếu ảnh mờ, xoay nhẹ ống kính để chỉnh nét: ống kính OV2640 thường được chỉnh nét cho khoảng xa, có loại dán keo, xoay cẩn thận. In thẻ to hơn cũng giúp. |
| Serial: `[WiFi] Dang ket noi...` mãi | Sai tên hoặc mật khẩu, WiFi 5 GHz, hoặc WiFi cần đăng nhập web. Thử phát WiFi 2,4 GHz từ điện thoại. |
| Serial: `Dang nhap an danh loi 400` | Web API Key sai, hoặc chưa bật **Anonymous** (mục 5, bước 2). |
| Serial: `Gui ... loi 401/403` | Chưa đăng quy tắc dữ liệu, hoặc `MAY_ID` sai quy cách. |
| Serial: `Gui ... loi 404` hoặc `-1` | Sai `FIREBASE_DB_URL` (thừa dấu / cuối, sai vùng), hoặc mất Internet. |
| Web: **Bị từ chối: chưa đăng quy tắc** | Đăng `database.rules.json` (mục 5, bước 4, hoặc `firebase deploy`). |
| Web: máy hiện **ngoại tuyến** | Máy gửi trạng thái 30 giây/lần; quá 75 giây không nhận được thì web coi là ngoại tuyến. Kiểm tra nguồn và WiFi của máy. |
| Web: **Chế độ thử** dù đã có Firebase | Chưa sửa `cau_hinh_firebase.js` (apiKey vẫn là `DAN_VAO_DAY`), hoặc chưa `firebase deploy` lại sau khi sửa. |

**Chọn độ phân giải đọc QR.** Đặt `KHUNG_HINH` trong `cau_hinh.h`:

- `FRAMESIZE_VGA` (mặc định, 640 × 480): đọc được xa hơn, khoảng 10–20 cm.
- `FRAMESIZE_QVGA` (320 × 240): mỗi lần đọc nhanh hơn, nhưng phải đưa thẻ gần (khoảng 8–12 cm).

## 10. An toàn và giới hạn (cần biết)

- **Máy không kiểm tra chứng chỉ HTTPS** (`setInsecure()` trong `mang.cpp`) để đơn giản cho lớp học. Dữ liệu vẫn được mã hóa trên đường truyền, nhưng về lý thuyết có thể bị giả mạo máy chủ trên mạng WiFi không tin cậy. Nội dung chỉ là kết quả quét thẻ, không có thông tin cá nhân.
- **Ai có địa chỉ trang đều xem được kết quả** (`.read: true`). Ghi thì phải đăng nhập ẩn danh. Vì Web API Key nằm trong trang web, người rành kỹ thuật có thể tự ghi dữ liệu giả vào cơ sở dữ liệu của lớp. Quy tắc đã giới hạn đường dẫn và dạng dữ liệu được ghi. Muốn chặt hơn, giáo viên có thể bật App Check hoặc đổi quy tắc chỉ cho phép một số tài khoản.
- **Không ghi thông tin học sinh** (họ tên…) vào tên máy hay thẻ.
- **Mật khẩu WiFi nằm trong chương trình đã nạp.** Không chia sẻ tệp `cau_hinh.h` đã điền.
- **Gói miễn phí Spark** giới hạn khoảng 100 kết nối đồng thời tới Realtime Database. Mỗi máy ESP32-CAM gửi qua REST nên không giữ kết nối thường trực; mỗi trang web đang mở giữ 1 kết nối. Một lớp học dư sức.

## 11. Đã kiểm thử những gì

| Nội dung | Kết quả |
|---|---|
| Biên dịch firmware (arduino-esp32 3.3.12, bo AI Thinker ESP32-CAM), có LCD và không LCD | Thành công, dùng 36 % bộ nhớ chương trình. |
| Suy luận của firmware so với trang web (64 công thức, kể cả công thức lỗi) | 64/64 trùng khớp. |
| Máy giả lập trên web so với firmware (cùng 64 công thức, đủ 9 trường dữ liệu) | 64/64 trùng khớp. |
| Giải mã QR bằng quirc trên ảnh mô phỏng camera (thẻ thật của bộ thẻ, nhiều cỡ, xoay, mờ, tối, nhiễu, lật gương) | Không lần nào đọc sai. Đọc ổn định khi mã QR rộng từ khoảng 100 điểm ảnh trở lên. Vì vậy chọn mặc định VGA và hướng dẫn khoảng cách 10–20 cm. |
| Trang web, chế độ thử, trình duyệt Chromium tự động: quét thẻ, LCD 5 màn, đồng bộ giữa 2 tab, lắp ghép H + H + O → XONG, báo lỗi, NH₄Cl “máy sai”, Cả lớp, xóa nhật ký, màn điện thoại 390 px | 21/21 mục đạt, không lỗi JavaScript. |
| Trang web có cấu hình Firebase: SDK khởi động | Không lỗi. |
| Công cụ `kiem_tra_firebase.py` với máy chủ Firebase giả (cùng quy tắc) | Đạt; báo đúng lỗi khóa sai và tên máy sai. |

**Chưa kiểm thử, cần thầy/cô thử thực tế:**

- Chạy trên mạch ESP32-CAM thật: tốc độ đọc QR ở VGA, khoảng cách đọc thực tế, độ nét ống kính.
- Kết nối tới dự án Firebase thật: môi trường kiểm thử không truy cập được máy chủ Google.

Nên làm theo thứ tự: chạy `kiem_tra_firebase.py` → mở trang web → nạp một máy → gõ `CT:H2O|Nuoc` trong Serial Monitor → quét thẻ thật.

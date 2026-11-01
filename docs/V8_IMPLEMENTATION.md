# V8 — cảnh 2.5D và tích hợp V4, 01/11/2026

Đã triển khai sáu khu vực chạy được với avatar di chuyển và tương tác thật. Đây là bản để duyệt thẩm mỹ; không tuyên bố khớp tuyệt đối ảnh mẫu hoặc đã nghiệm thu điện thoại thật.

## Đã đọc và đối chiếu

Đã đọc START_HERE, gallery, master prompt và tài liệu art/camera, asset, tích hợp, QA trong ZIP V8. Đã mở gallery và prototype qua HTTP, đổi sang phòng ca đoàn và thử điều khiển. [Bản hướng dẫn gốc](v8-reference/START_HERE.md) và [master prompt gốc](v8-reference/CODEX_MASTER_PROMPT.md) là tài liệu tham chiếu của gói bàn giao. Yêu cầu trực tiếp của người dùng về giữ V4, dữ liệu và cổng 5001 được ưu tiên.

Ảnh mẫu có HUD/NPC in sẵn chỉ nằm trong thư mục so sánh. Texture runtime là artwork sạch mới, không dùng ảnh mẫu làm nền nguyên tấm, không phủ màu để giấu nhân vật in trên ảnh.

## Thay đổi

- Kiến trúc, sàn và từng ghế/bàn/piano/tủ/gương/bồn hoa là các phần tử SVG độc lập. Atlas có alpha, sprite có vị trí chân và thứ tự che khuất riêng. Avatar và HUD vẫn dùng hệ V4. Ánh sáng kiến trúc được vẽ vào texture; đây là renderer 2.5D, không phải engine 3D.
- Manifest chung `game_v3/src/scene-layout.js` cấp vị trí đồ vật, footprint, đa giác mặt sàn, lối tiếp cận và ghế cho seed/catalog và client. Server dùng cùng navigation; bước trên lưới và đoạn nối được kiểm tra để tránh cắt qua góc vật cản.
- Pointer được đổi sang tọa độ world sau camera. Lệnh mới thay đường đang đi từ vị trí hiện tại. Giữ WASD/phím mũi tên hoặc dùng nút cảm ứng để di chuyển. Camera chừa chỗ cho HUD và giữ phối cảnh trên desktop/mobile.
- Ghế giữ ID V4, có 24 chỗ riêng, hướng lên cung thánh và lối đứng dậy bên cạnh. NPC cư dân chỉ ngồi, không tụ tập trong lối đi; lease người chơi vẫn do PostgreSQL quản lý.
- Chạm trực tiếp ghế, bồn hoa, piano/giá nhạc, bàn quà hoặc quầy/tủ để dùng tương tác V4. Gương mở tủ đồ sau khi đến gần. Bồn nước tiền sảnh dẫn tới bài học Rửa Tội có sẵn.
- Giữ auth/MFA/RBAC, ví/ledger, inventory, Shop, chat, NPC, nhiệm vụ và database V4. Không đưa Xu, tài khoản hay quest giả từ prototype vào game.
- Migration `007_v8_layered_world.sql` chỉ xuất bản geometry/catalog; không ghi/xóa player state, ví, inventory hoặc tiến độ. ID tùy biến được giữ. Không sửa migration 001–006. Đã sao lưu DB riêng trước khi chạy; backup và thông tin đăng nhập không đưa lên Git.

## Ảnh và so sánh

Mở [gallery đối chiếu](../artifacts/v8/gallery.html) trên máy sau khi clone. Mỗi cảnh có ảnh mẫu, ảnh runtime desktop và mobile. Ma trận đầy đủ có 24 ảnh tại `artifacts/v8/`: 1366×768, 1920×1080, 768×1024, 390×844.

| Khu vực    | Ảnh chạy thật                                                                                    | So với mẫu                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Gian chính | [Desktop](../artifacts/v8/nave-1366x768.jpg), [mobile](../artifacts/v8/nave-390x844.jpg)         | Vòm kem, tranh xanh, ánh vàng, hai dãy ghế rời, cư dân ngồi; tỷ lệ cung thánh/hoa khác ảnh duyệt. |
| Tiền sảnh  | [Desktop](../artifacts/v8/foyer-1366x768.jpg), [mobile](../artifacts/v8/foyer-390x844.jpg)       | Cửa vòm thông gian chính, bồn nước trái và quầy phải; hoa văn cửa/quầy được vẽ lại.               |
| Ca đoàn    | [Desktop](../artifacts/v8/choir-1366x768.jpg), [mobile](../artifacts/v8/choir-390x844.jpg)       | Piano trái, ba giá nhạc, bảng và tủ phải; số ghế và chi tiết sách khác mẫu.                       |
| Vườn       | [Desktop](../artifacts/v8/garden-1366x768.jpg), [mobile](../artifacts/v8/garden-390x844.jpg)     | Vòm hoa, cảnh xa, sàn đá và ba luống tương tác; đường trước rộng hơn đường cong trong mẫu.        |
| Nhà xứ     | [Desktop](../artifacts/v8/office-1366x768.jpg), [mobile](../artifacts/v8/office-390x844.jpg)     | Hai tủ sách, bàn cha xứ, bàn quà; vị trí NPC ở phía trước bàn để trò chuyện và không xuyên bàn.   |
| Trang phục | [Desktop](../artifacts/v8/shoproom-1366x768.jpg), [mobile](../artifacts/v8/shoproom-390x844.jpg) | Tủ quần áo, gương, rèm thử đồ; bàn trưng bày được thay bằng quầy Shop gỗ.                         |

## Kiểm thử

- `npm test`: domain/catalog, 7 nhóm M0, 3 feature gate, 16 browser scenarios, 40 luồng gameplay (11 quest/14 hoạt động/11 NPC), 3 tình huống nhiều tab/lưu lỗi/hủy đường đi.
- `tests/online-browser.cjs`: 24 kiểm tra gồm 11 quest online, lưu tài khoản, Shop, tiếp tục hoạt động, chat và Admin desktop/mobile.
- `tests/online-api.cjs`: 78 kiểm tra PostgreSQL/API/bảo mật. Đã sửa test rollback để phục hồi version bắt đầu của suite, tránh quay về catalog 1 và vô tình bỏ bố cục V8.
- `tests/realtime.cjs`: 79 kiểm tra presence, chat, LIVE, quyền riêng tư và tranh chấp ghế. Public API/WS tiếp tục không có bộ đếm người thật/NPC.
- `tests/world-upgrade.cjs`: cư dân ngồi ghế riêng, nhường ghế thật, camera và ảnh online có cư dân.
- `npm run test:v8`: 6 cảnh × 4 viewport; từng footprint chặn đi; đường tới NPC/hotspot; 5 click đổi hướng, 20 click tường; hướng ghế/đứng dậy; giữ WASD; gương/piano; ví/inventory giữ nguyên qua các cảnh. [Kết quả](../artifacts/v8/results.json).
- Diễn tập chuyển layout V4 → V8 trong transaction rồi rollback; không đổi catalog đang chạy và giữ nội dung nghiệp vụ. Dry run cả hai chiều hợp lệ.
- Kiểm tra riêng giữ nút bằng touchStart/touchEnd thật của Chromium và 5 lệnh chạm nhanh trên tài khoản online: vị trí cuối khớp server, giữ ví/inventory và tồn tại sau reload. Bằng chứng tại `touch-control.json`, `online-input.json`, `rollback-drill.json` trong thư mục ảnh V8.

Số đo rAF headless khoảng 60 FPS, p95 khoảng 16,8 ms trong lượt lấy mẫu ngắn; đây không chứng minh hiệu năng trên thiết bị yếu hoặc phòng đông. CI đã bổ sung suite V8; chưa xác nhận kết quả GitHub Actions của commit mới.

## Còn cần duyệt/kiểm tra

- Chưa khớp từng pixel mẫu V8; cần người dùng duyệt tỷ lệ đồ vật, màu ánh sáng và framing. Avatar giữ rig/trang phục V4 theo yêu cầu, khác các nhân vật vẽ sẵn trong ảnh mẫu.
- Cột/cửa/ảnh thánh là kiến trúc tĩnh. Đồ vật tương tác đã tách rời; chưa có editor kéo thả bản đồ hay vật lý 3D. Footprint dùng hình bao để chừa khoảng an toàn, không bám từng pixel đồ vật.
- Sân, lớp giáo lý, Rửa Tội, Hòa Giải và Noel tiếp tục dùng renderer hiện tại; chưa chuyển năm cảnh đó sang artwork V8.
- Cần kiểm tra Safari/iOS, Android máy yếu, Edge/Windows và chất lượng mạng thật. Bộ ảnh mobile hiện được chụp bằng Chromium với viewport cảm ứng.

## Cập nhật và chạy trên Windows

Dừng server bằng Ctrl+C. Giữ nguyên `.local/` và dữ liệu trình duyệt:

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:backup
npm.cmd run db:migrate
npm.cmd start
```

Mở `http://localhost:5001`, Ctrl+F5. Tài khoản Admin cũ vẫn dùng được; máy mới xem [hướng dẫn cài/Admin](INSTALL_AND_RUN.md). Không cần chạy bootstrap lại để cập nhật giao diện.

Chạy lại kiểm thử V8 sau khi cài Chromium:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:v8
```

Cloud dùng `CHROMIUM_PATH=/usr/bin/chromium npm run test:v8`.

## Rollback riêng bố cục

Dừng Node. Công cụ mặc định chỉ dry run, validate trước khi ghi; cập nhật catalog thành version mới, giữ toàn bộ dữ liệu người chơi và nội dung Shop/quest. Các tọa độ tùy biến không phù hợp sẽ làm validate từ chối thay vì xuất bản dữ liệu sai.

```powershell
npm.cmd run scene:layout -- v4
npm.cmd run scene:layout -- v4 --apply
npm.cmd start
```

Quay lại V8 bằng cùng lệnh với `v8`. Tải lại trang sau khi đổi. Không xóa migration, không down schema, không restore backup cũ đè DB đang có giao dịch mới. Source hiện tại chứa cả renderer cũ và mới để hỗ trợ hai bố cục. Bản demo local không đọc catalog DB; muốn rollback demo local, dùng commit trước V8 trên bản sao source và giữ localStorage.

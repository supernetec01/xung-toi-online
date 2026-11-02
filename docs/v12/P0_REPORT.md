# V12 — bàn giao nhóm P0, 02/11/2026

Tiếp tục trên V4/V8/V9 hiện hành, baseline `a70ca98`; không thay engine hoặc tạo database/ví/Shop thứ hai. Cổng nội bộ **5001**. Đây là bản triển khai P0 để xem và thử; không phải toàn bộ V12 đã nghiệm thu.

## Code đã thực hiện

| Nhóm | Kết quả và file chính |
| --- | --- |
| T00 | Audit source thật, backup/restore drill, 24 ảnh baseline, giữ stable ID và key save. `REPO_AUDIT.md` ghi phần reuse và thiếu. |
| T01 | `scene-contract.js` dùng chung client/server; kiểm spawn, access point, collider, sprite/bench và portal trước publish. Asset preload có cache giới hạn. Overlay sáu chế độ ở `public/admin/scene-debug.js`, chỉ ADMIN/SUPER_ADMIN đã xác thực; production cần bật `FEATURE_SCENE_DEBUG=true`. |
| T02 | `navigation.js`: A* với heap, footprint chân và kiểm tra đoạn chuyển động liên tục với AABB mở rộng. `game.js` thay lệnh đang đi, kiểm tra mỗi frame, hủy callback khi đổi map/catalog. Các map P0 bật footprint mới; scene legacy giữ cấu hình cũ. |
| T03 | `avatar-v10.js`, `avatar-studio.js`, `avatar-v10.css`: một adapter dùng rig V10 cho cả map, NPC, HUD, Shop, LIVE và Admin. Hai giới tính, bốn hướng, năm màu da, kiểu tóc, preview tư thế. Giữ atlas V4 và item ownership; ba màu tóc thêm vào cùng catalog qua migration 011. Appearance version chống ghi đè từ tab cũ. |
| T04 | Giữ ghế V9: tám hàng, 24 chỗ có ID/access point. Avatar ngồi nhìn về cung thánh, nằm giữa lớp sau/trước của ghế; lease trên server quyết định chỗ đã có người. Không thêm ghế/người đã vẽ sẵn vào ảnh kiến trúc. |
| MAP-01–05 | `scene-layout.js`, `scene-art.js`, `assets/v12/`: sân, gian chính, lớp giáo lý, giếng Rửa Tội, góc Hòa Giải có nền kiến trúc/sàn, props riêng, điểm tương tác, NPC và collision. Cổng sân tiếp tục vào tiền sảnh hiện có. |
| Bài học | `lessons.js`, `game.js`, `server/game.cjs`: ba câu hỏi ứng xử, sai được thử lại, lưu tiến độ/snapshot câu hỏi, album khi xong. Dùng state V4; không tự phát thêm Xu. Quiz/nhiệm vụ cũ vẫn hoạt động. Hòa Giải chỉ có thông tin, không nhập chuyện riêng tư; Rửa Tội không cấp bí tích. |
| Lưu trữ | Migration 012 chỉ thay catalog/geometry P0 và thêm bài học. Kiểm catalog trong transaction trước khi commit. CLI `scripts/v12-layout.cjs` có dry-run/apply/rollback bố cục; không ghi player state, inventory hoặc wallet. |

Artwork mới được tạo từ định hướng ảnh duyệt, loại HUD, avatar và đồ nội thất ra khỏi nền. Bàn, ghế, bảng, giếng, bồn hoa và tòa giải tội là thực thể riêng. Năm nền và tám props dùng chung khoảng **1,8 MiB** WebP; ghế nhà thờ vẫn là SVG chỉnh sửa được. Nền kiến trúc và phần sàn được cắt thành hai lớp render từ cùng texture sạch. Phần kiến trúc phía xa không phải một mô hình 3D có thể đi xuyên vào.

## Ảnh thật trước/sau

Ảnh dưới đây chụp game chạy trong Chromium, không phải mockup. Mỗi map sau có thêm bản 1920, 390 và 360 px trong `artifacts/v12/after/`.

Mở [gallery trước/sau](gallery.html) trực tiếp từ repository để đổi giữa desktop và mobile, xem hai ảnh cạnh nhau.

| Khu vực | Trước | Sau |
| --- | --- | --- |
| Sân | [1366](../../artifacts/v12/before/courtyard-1366.jpg) | [1366](../../artifacts/v12/after/courtyard-1366.jpg) · [390](../../artifacts/v12/after/courtyard-390.jpg) |
| Gian chính | [1366](../../artifacts/v12/before/nave-1366.jpg) | [1366](../../artifacts/v12/after/nave-1366.jpg) · [ngồi](../../artifacts/v12/after/nave-seated.jpg) |
| Lớp giáo lý | [1366](../../artifacts/v12/before/classroom-1366.jpg) | [1366](../../artifacts/v12/after/classroom-1366.jpg) · [bài học](../../artifacts/v12/after/classroom-lesson.jpg) |
| Giếng | [1366](../../artifacts/v12/before/baptistry-1366.jpg) | [1366](../../artifacts/v12/after/baptistry-1366.jpg) · [390](../../artifacts/v12/after/baptistry-390.jpg) |
| Hòa Giải | [1366](../../artifacts/v12/before/confession-1366.jpg) | [1366](../../artifacts/v12/after/confession-1366.jpg) · [thông tin](../../artifacts/v12/after/confession-info.jpg) |

[Studio V10](../../artifacts/v12/after/avatar-1366.jpg) · [video animation thật](../../artifacts/v12/after/avatar-motion.webm) · [overlay Admin](../../artifacts/v12/t01-debug-admin.jpg).

## Kiểm thử

- `tests/v12-scenes.cjs`: **21 nhóm đạt**, 20 ảnh / năm map × bốn viewport; kiểm tất cả access point/NPC/solid props, tám hàng ghế và occlusion, cổng vật lý, bài học offline/online, reload và lease hết hạn. 30 lần đổi map online không tích lũy player/props/wall/floor; cả tám vị trí NPC chức năng đi tới và trò chuyện có xác nhận server. Không có pageerror.
- `tests/v12-migration.cjs`: chạy SQL trong transaction, giữ tên nội dung Admin, item, quest và sáu map còn lại; custom anchor nằm trong vật cản bị từ chối; rollback phục hồi publication. Fingerprint account/state/wallet/ledger không đổi.
- T01: **37** contract checks, cùng RBAC năm vai trò/guest và overlay thật. T02: **13** footprint/A*/sweep checks, có tường mỏng 0,01 đơn vị. Audit: bảy ca kiểm ID giữ nguyên baseline lịch sử, chỉ cho phép ba ID tóc đã khai báo trong `config/v12-catalog-additions.json`. T03: Studio, palette, bốn hướng/tư thế, mua trùng, ownership, reload và peer WebSocket.
- Log hồi quy được lưu riêng ở `artifacts/v12/regression-*.txt`; trạng thái cụ thể xem `QA_MATRIX.csv` và `QA_STATUS.md`. Không lấy tài liệu mẫu hay kết quả 7/7 của gói tham khảo làm kết quả test dự án.

Lượt cuối: `npm test`, `test:online`, `test:v8`, `test:v9`, `test:christmas`, các suite V12, `format:check` và `audit:m0` đều đạt. [Danh sách file thay đổi](../../artifacts/v12/changed-files.txt) và [số đo cloud](../../artifacts/v12/performance.json) được giữ riêng.

Database demo gốc đã backup và áp dụng 011/012; [đối chiếu dữ liệu](../../artifacts/v12/demo-data-preservation.json) xác nhận account/session/state/wallet/ledger, item/quest cũ và sáu map ngoài P0 không đổi. Server demo bình thường đã chạy lại cổng 5001; wrapper QC được kiểm là từ chối chạy test trên profile này. Kiểm tra read-only cuối có 16 ca asset MIME/WebP/path isolation; không chạy test có ghi dữ liệu sau khi chuyển khỏi QC.

CI được bổ sung `npm run test:v12` (chỉ dùng database test với `NODE_ENV=test`, như cấu hình CI hoặc wrapper QC trong `qa/README.md`); việc có workflow không xác nhận GitHub Actions đã chạy. Các số FPS headless chỉ mô tả máy cloud; mobile ở đây là viewport/touch giả lập.

## Cập nhật và rollback

Đóng process game đang chạy trước khi cập nhật. Giữ nguyên `.local/`, uploads, volume PostgreSQL, encryption key và operator; không giải nén prototype đè lên project.

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:backup
npm.cmd run db:migrate
npm.cmd start
```

Mở `http://localhost:5001`; tải lại trang để nạp asset/code mới. Admin cũ vẫn đăng nhập như trước. Máy cài mới xem [hướng dẫn cài và tạo Admin](../INSTALL_AND_RUN.md). Không chạy `admin:bootstrap` để thay tài khoản đã có.

Migration 011/012 là additive, không sửa checksum các migration cũ. Nếu có nội dung CMS tùy chỉnh khiến anchor không hợp lệ, migration dừng và rollback transaction; sửa vị trí trong bản draft hoặc xem dry-run trước, không xóa dữ liệu để ép chạy.

Rollback giao diện có thể thực hiện bằng bản publication đã lưu trong Admin, hoặc quay về geometry stock trước V12 trong khi giữ code/schema mới:

```powershell
# Dừng server; xem trước, không ghi dữ liệu
npm.cmd run scene:v12 -- previous
# Áp dụng bố cục stock cũ, giữ item/Xu/quest/tiến độ bài học
npm.cmd run scene:v12 -- previous --apply
npm.cmd start
```

Khôi phục P0: thay `previous` bằng `p0`. CLI giữ nhãn/loại/ID tương tác, nhưng bố cục stock sẽ thay artwork/geometry của năm map; muốn phục hồi chính xác artwork tùy chỉnh cần publication hoặc backup trước nâng cấp. Sau CLI phải khởi động lại server để cache catalog/WS đồng bộ. Không sửa bảng migrations hoặc rollback database cũ đè tiến độ mới.

Rollback theo nhóm: T00 chỉ có tài liệu/ảnh; T01 có thể tắt overlay bằng `FEATURE_SCENE_DEBUG=false`; T02/MAP-01–05 có thể quay lại geometry `previous` bằng CLI trên mà vẫn giữ code mới. T03 và toàn bộ code có dependency với scene contracts/Studio: không revert riêng một file rig hoặc navigation trong khi các scene mới còn bật. Nếu buộc quay về source baseline, trước tiên dùng Admin rollback đúng publication trước V12 và kiểm thử trên bản sao DB, sau đó revert chuỗi commit V12 theo thứ tự ngược dependency. Giữ migrations additive và dữ liệu player/item/lesson; không xóa migration 011/012, encryption key hoặc wallet để khớp code cũ. Cách rollback ưu tiên của đợt bàn giao này là giữ bản code mới và rollback layout/publication.

## Phần còn lại

MAP-06–11 và T20–24 chưa triển khai V12 trong đợt này; chúng vẫn chạy bằng chức năng/đồ họa cũ. Sân/vườn/Noel cùng registry `parish-campus` nhưng **chưa phải một outdoor world liền mạch**; hiện vẫn qua portal. Ghép vùng ngoài trời được giữ trong backlog MAP-08/MAP-11, không xem worldId là đã hoàn thành yêu cầu này.

T25 đang chờ các dependency P1. Vé/checkout/entitlement Noel thật và TikTok thật chưa có; không dùng cờ client hay giả thanh toán. Còn cần chủ dự án duyệt mỹ thuật, thử điện thoại thật, soak dài, đo hiệu năng với tải nhiều người và staging. Xem [lỗi/giới hạn còn lại](BUG_REGISTER.md).

# 02 — ADMIN CONSOLE: THIẾT KẾ CHỨC NĂNG CHI TIẾT

## 1. Đường dẫn & UI

- `/admin` có layout riêng so với game: sidebar trái, header (môi trường STAGING/PROD, người đăng nhập, thông báo, nút xem trước), thanh tìm kiếm, khu vực bảng lọc/sắp xếp/pagination, drawer sửa mục.
- Tablet admin: sidebar thu lại, mobile cho các thao tác xem/phê duyệt cơ bản; chỉnh rig/spritesheet phức tạp khuyến nghị desktop.
- Menu: `Tổng quan` | `Người chơi` | `Chat & Vi phạm` | `NPC & Dân cư` | `Shop & Tủ đồ` | `Nhiệm vụ & Hành động` | `Bản đồ` | `Sự kiện/Noel` | `TikTok LIVE` | `Đóng góp` | `Cấu hình` | `Nhật ký`.
- Search/filter/sort mọi bảng, phân trang server-side, không load toàn bộ game_users; export thống kê chỉ ADMIN và ghi audit.

## 2. Bảng quyền (server phải enforce)

| Quyền | PLAYER | MODERATOR | CONTENT_EDITOR | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| Chơi/Chat bản thân | ✓ | ✓ | ✓ | ✓ | ✓ |
| Xem/sửa chat vi phạm | — | ✓ | — | ✓ | ✓ |
| Mute/ban CHAT | — | ✓ (có giới hạn) | — | ✓ | ✓ |
| Tạo/sửa bản nháp item/quest/NPC | — | — | ✓ | ✓ | ✓ |
| Publish/rollback catalog | — | — | — | ✓ | ✓ |
| Xem số REAL/NPC/LIVE_GUEST hiện diện | — | — | — | ✓ | ✓ |
| Đổi balance game qua compensation form | — | — | — | ✓ (hạn mức) | ✓ |
| Xem danh sách user/quản lý tài khoản | chỉ mình | hạn chế theo báo cáo | — | ✓ | ✓ |
| Tạo/bỏ quyền ADMIN | — | — | — | — | ✓ + MFA |
| Cấu hình QR/verified donation | — | — | — | theo phân quyền finance riêng | ✓ |

Role cấp bằng backend/CLI hoặc SUPER_ADMIN có MFA + xác nhận, tuyệt đối không từ request client. Ẩn menu **không thay thế** kiểm tra quyền ở API/WebSocket/DB. Không cho SUPER_ADMIN cuối cùng tự hạ quyền hoặc xóa tài khoản của chính mình khi còn là admin duy nhất.

## 3. Dashboard nội bộ chỉ ADMIN

- KPI: `realOnlineUnique`, `ambientNpcActive`, `fixedNpcActive`, `liveGuestVisible`, `liveQueueLength`, `chatMessagesPerMin`, `reportsOpen`, `failedActionReceipts`, `FPS sample (anonymous)`.
- Thống kê realtime: số phiên kết nối không bằng số người chơi; unique real user theo TTL heartbeat, nhiều tab tính một người. Có cảnh báo dữ liệu quá cũ.
- Cho ADMIN thấy bảng tách `Người chơi thực` / `NPC nền` / `NPC cố định` / `TikTok khách`, theo scene, cập nhật khoảng 5–15 giây; public API không gửi số lượng nhóm này.
- Public view chỉ cho xem cảnh game + tên nhân vật cần thiết, KHÔNG hiện online count, KHÔNG API ẩn phía frontend chứa count (dù CSS display:none).

## 4. Quản lý user

Danh sách: `ID rút gọn`, nickname, email masked (nếu hợp lệ), thời gian tạo, hoạt động gần nhất, trạng thái, kỷ luật chat, trạng thái tài khoản. Chi tiết: trang phục đang mặc, ví Xu (read-only), lịch sử Xu ledger, inventory, quest đã hoàn thành, session chính, reports và sanctions; không hiển thị mật khẩu/token, không lưu private confession.

Hành động: cảnh báo, mute tạm thời, ban chat 1 giờ/24 giờ/7 ngày, khóa đăng nhập tạm thời nếu có lý do, logout mọi phiên, bỏ mute, yêu cầu xóa dữ liệu theo quy trình; mỗi action có reason, expiry, actor và audit. **Đừng trộn ban chat với khóa toàn bộ gameplay**. Có nút khôi phục và appeal workflow. Ngăn MODERATOR thao tác trên ADMIN/SUPER_ADMIN.

## 5. Shop và tủ đồ — CMS đầy đủ

`Danh sách item` với filter slot (hair/head/top/bottom/shoes/accessory), giới tính tương thích, ngày mở bán, xu giá, trạng thái Draft/Published/Archived, lượt sở hữu (chỉ admin), image thumbnail. Form thêm/sửa:

`itemId stable`, `nameVI`, `nameEN?`, `slot`, `compatibleRig [male/female/unisex]`, `layerAssets per pose/direction`, `thumbnail`, `rarity cosmetics only`, `priceCoins`, `purchaseLimit?`, `startsAt/endsAt`, `stock? (nullable unlimited)`, `eventTag`, `sortOrder`, `isGiftable=false`, `requiresQuest?`, `altText`, `visibility`, `contentVersion`.

Workflow: Tạo nháp → upload png/webp/sprite atlas -> validate asset (kích thước/layer/anchor, MIME magic, malware check, budget) → Preview trên avatar nam & nữ ở 8–12 animation → Save Draft → Publish với `effectiveAt` → cache invalidate → shop clients fetch new version; Rollback bất biến.

Điều kiện: giá từ server, preview KHÔNG trừ Xu; mua dùng transaction `wallet + ledger + inventory`, chống mua trùng 2 tab; item đã mua không bị xóa khỏi inventory khi admin Archive (archive ngừng bán, không tước quyền đã có); item delete chỉ soft-delete. Giá đổi chỉ cho giao dịch mới, receipt dùng giá snapshot. Admin có chức năng `gift item` ghi ledger/audit nếu cần, không tự trừ Xu qua frontend.

## 6. Quản lý nội dung gameplay

- **NPC**: tên, type FIXED/AMBIENT, scene, lịch, điểm đi, animation, outfit mặc định, câu thoại (không giả chat); với FIXED phải có interaction fallback.
- **Quests/Actions**: tiêu đề, hotspot, rewardCoins, animation pose, cooldownSeconds 60–600, prerequisite, reset daily/weekly, daily cap, preview và publish. Bắt buộc validate graph không cycle, target tồn tại, reward không âm, idempotency.
- **Scenes**: đồ đạc, spawn anchors, blocked cells/navmesh, ghế, camera, collision; editor map nên làm phase sau, giai đoạn đầu chỉ điều chỉnh điểm an toàn có kiểm soát.
- **Event Noel**: banner, scene decorations, project goals, milestones 25/50/75/100, lịch Asia/Ho_Chi_Minh, preview và rollback.
- **Config**: cooldown, active action, chat enabled, NPC target density, max guests, flags LIVE/QR, maintenance message; config quan trọng cần confirmation & audit, không thay đổi tiền thưởng đã ghi ledger.

## 7. Quản lý chat và LIVE từ admin

Chat dashboard: live feed có filter `published/blocked/hidden`, user reports, rule triggered, mute/ban button, preview context giới hạn, quyền ẩn từng tin, appeal. LIVE: mock mode, provider status, select one event keyword at a time, max avatars visible, queue cap, cooldown, kill switch, approve overlay, preview safe areas, snapshot. **Chỉ admin xem số thật**; MODERATOR có thể xem tin vi phạm và nguồn nick người gửi phục vụ công việc, không xem dashboard counts.

## 8. Mẫu use cases nghiệm thu admin

A1. Admin thêm áo `top_noel_02` giá 250 Xu, lưu bản nháp: public chưa thấy. Publish: public có trong Shop, purchase một lần. Archive: người mua trước còn mặc được.
A2. Content Editor sửa giá và bấm Publish: 403. Admin publish có audit old/new version.
A3. Admin ban chat user 24h: websocket ngắt quyền gửi tức thời, game di chuyển vẫn hoạt động; hết hạn cho chat lại; tin cũ theo chính sách hiển thị/ẩn.
A4. Admin xem realOnline=3, ambientNPC=13; player thường không thể GET endpoint ấy dù gọi trực tiếp.
A5. Admin hạ density NPC: không despawn NPC giao quest, NPC đang cùng player tương tác, NPC đang ngồi ghế không giải phóng trùng ghế.
A6. Đồng thời hai admin sửa một món đồ: optimistic lock `contentVersion`; ai commit thứ hai nhận 409 kèm phiên bản mới, không ghi đè im lặng.

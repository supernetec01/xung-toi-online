# COPY/PASTE VÀO CODEX — TRIỂN KHAI V4

Bạn là Lead Full-stack Game Engineer + Tech Lead + Security Engineer + UX/UI Engineer + QA. Hãy triển khai V4 **trên repository hiện tại đã được Codex làm**, không copy ghi đè phiên bản V3 trong tài liệu tham khảo. **Đầu tiên đọc `START_HERE.md` và toàn bộ `docs/00..11` và `tasks.json` của bộ V4.**

## Lệnh mở đầu bắt buộc

1. Kiểm tra repo thực tế: `git status`, branch, packages, dev scripts, tests, cấu trúc thư mục, DB migrations và lưu state; xác định những thứ đã chạy, mock và chưa có.
2. Tạo `IMPLEMENTATION_AUDIT.md`, `MIGRATION_PLAN.md`, `KNOWN_ISSUES.md`; đối chiếu từng chức năng V4 với code hiện tại, không tự nhận rằng nó đã có.
3. Chạy unit/build/e2e hiện tại và chụp screenshot game desktop (1366×768) + mobile (390×844) để làm baseline. Backup DB staging trước khi migration.
4. Tạo `IMPLEMENTATION_PLAN.md` chia nhỏ PR/milestone M0..M6, ưu tiên làm ổn một vòng chơi multiplayer + admin + chat trước TikTok LIVE production.
5. Triển khai module có test, cập nhật tài liệu và evidence mỗi milestone. Thao tác phải idempotent, bảo mật theo role, không phá gameplay hiện hữu.

## Bắt buộc chức năng

**Admin:** `/admin` auth + RBAC; chỉ ADMIN/SUPER_ADMIN xem số người chơi THẬT vs NPC AMBIENT vs NPC FIXED vs LIVE GUEST, theo scene. Admin có CRUD bản nháp/publish/rollback Shop + tủ đồ nam nữ + item atlas, NPC, quest, action/cooldown, event Noel; quản lý user (mutes, bans, revoke session, wallet ledger read-only), chat moderation, LIVE Studio, audit logs. Content Editor chỉ edit draft; Moderator chỉ kiểm duyệt. Role không được tự nâng.

**Chat:** global + scene, mặc định tab đóng, server WS, text only escaped, rate limit, filter chửi bậy/spam/harassment/PII, report, mute/ban chat có expiry và appeal. Banned-chat user vẫn di chuyển, làm nhiệm vụ, mua áo trừ khi account riêng bị khóa. Không làm chat bot giả là người chơi; NPC chỉ thoại scripted trong world bubbles ghi "Cư dân".

**Population:** FIXED_NPC quest không biến mất. AMBIENT_NPC mô phỏng người đi lễ/cư dân, tự giảm khi real player vào theo visual cap, despawn tự nhiên. Presence heartbeat/TTL, 1 user nhiều tab chỉ 1 avatar. Không hiển thị chỉ số người thật/NPC cho public; public WS, REST cũng không chứa aggregates. Không nói sai rằng NPC là người chơi thật.

**Game:** 2D hoạt hình giả chiều sâu, toàn màn hình, HUD tối giản, popup đóng mặc định; avatar nam nữ đổi nhiều slot, Shop preview không trừ tiền; 14 hành động cooldown 1–10 phút ngay bên trong nút, Xu và quest server authoritative/idempotent, không Level. Giữ bối cảnh Công giáo trang nghiêm, không game hóa bí tích/ân xá.

**TikTok LIVE:** đầu tiên làm MOCK provider, Studio Admin, event queue, keyword, guest tạm xuất hiện với tên TikTok và MỘT animation rồi rời cảnh, không account/coin/chat/shop. Có cap, rate limit, moderation, camera 9:16; chỉ sau khi kiểm chứng quyền tích hợp và điều kiện TikTok mới dùng adapter thực tế. LIVE không được làm sập game core khi connector mất kết nối.

**Tiền thật:** mã QR thật đóng mặc định, không tự xác nhận thanh toán, chỉ đăng tên người ủng hộ khi xác minh + opt-in + duyệt, không gộp vào Xu hoặc công phúc.

## Giai đoạn thực thi

M0 audit & freeze baseline -> M1 admin RBAC/users -> M2 wardrobe/CMS -> M3 realtime chat + moderation -> M4 presence + ambient NPC -> M5 mock TikTok LIVE -> M6 Noel/polish/security/deploy. Có thể điều chỉnh phụ thuộc theo code thực tế nhưng phải giải thích, không để tính năng không an toàn chạy production.

## Test và báo cáo bắt buộc mỗi giai đoạn

- CI lint, unit, integration, E2E desktop/mobile, negative security tests, demo video hoặc screenshots.
- Phải thử: player 403 admin stats, moderator 403 stats; mute chat vẫn chơi được; 2 tab mua item chỉ debit 1 lần; 0→20 người thật không xóa fixed NPC; 100 LIVE mock comments không gây crash; username TikTok XSS escaped; refresh không reset cooldown.
- Với ticket hoàn thành, nêu `Changed Files`, `Tests Run + Results`, `Screenshots`, `Remaining Risks`, `Rollback Steps`, và cập nhật `tasks.json`/checklist. Nếu không chạy test được, nêu blocker, **không đánh dấu Done**.
- **Không cam kết game tuyệt đối không bug**, chỉ công bố các test đã chạy và hạn chế còn tồn tại.

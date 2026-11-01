# GIÁO XỨ AN HÒA — V4 ADMIN + CHAT + CƯ DÂN NỀN + TIKTOK LIVE

**Ngày đặc tả:** 01/11/2026. **Loại tài liệu:** kế hoạch và hợp đồng chức năng để Codex triển khai; không phải bằng chứng chức năng đã viết xong.

## PHẢI ĐỌC TRƯỚC

1. `CODEX_MASTER_PROMPT.md` — prompt copy/paste vào Codex.
2. `docs/00_SCOPE_RULES.md` — phạm vi, ràng buộc và những điều KHÔNG được làm.
3. `docs/01_GAMEPLAY_AND_WORLD.md` — thế giới, người chơi, nhiệm vụ, công trình.
4. `docs/02_ADMIN_CONSOLE.md` — giao diện quản trị CRUD, role và audit.
5. `docs/03_SHOP_AVATAR_ASSETS.md` — cấu trúc tủ đồ, rig nam/nữ, asset và quy trình publish.
6. `docs/04_CHAT_AND_MODERATION.md` — chat realtime và chặn nói tục.
7. `docs/05_NPC_POPULATION_PRESENCE.md` — cư dân nền thay dần bằng người chơi thật.
8. `docs/06_TIKTOK_LIVE_GUEST.md` — bình luận LIVE tạo nhân vật khách chỉ làm một hành động.
9. `docs/07_ARCHITECTURE_DATABASE.md` — backend, database, transactional integrity.
10. `docs/08_API_WEBSOCKET_CONTRACTS.md` — endpoints, payload, event names.
11. `docs/09_UI_SCENE_ADMIN_WIREFRAMES.md` — bố cục game và Admin web/mobile.
12. `docs/10_QA_SECURITY_BUG_MATRIX.md` — bug, test, security và load test.
13. `docs/11_MILESTONE_TASKS.md` và `tasks.json` — backlog có phụ thuộc và điều kiện nghiệm thu.

## QUAN TRỌNG VỀ SOURCE HIỆN TẠI

- Người dùng nói **Codex đã triển khai game**. Repo/commit mới nhất chưa được cung cấp trong yêu cầu này. **KHÔNG được copy đè các file V3 vào bản Codex hiện hành.** Yêu cầu Codex trước tiên khảo sát repo thực tế và lập mapping giữa source hiện tại với bản đặc tả này.
- `references/BASELINE_V3_REFERENCE_ONLY.zip` là bộ bàn giao V3 cũ gồm mã demo, ảnh UI, gameplay và SQL tham khảo, **không phải bản V4 production**.
- Chỉ tạo migration cộng thêm; không chạy schema V3 cũ đè lên DB có dữ liệu; không tự đổi primary key/ID đã dùng trong bản đang chạy.
- Phần Chat, NPC động, LIVE, Admin được mô tả **để triển khai**, chưa xác nhận tồn tại trong code hiện tại.

## YÊU CẦU BẤT BIẾN

- 2D có chiều sâu, toàn màn hình, mobile mượt; cảnh nhà thờ Công giáo tôn nghiêm; chức năng ban đầu ẩn, chỉ 1 popup chính tại một thời điểm.
- Game **không có Level**; kiếm Xu bằng hoạt động ngắn, nhiệm vụ và công việc cộng đồng, cooldown server 1–10 phút hiện ngay nút.
- NPC chức năng (cha xứ, giáo lý viên, người giao nhiệm vụ...) không mất khi người chơi đến. NPC cư dân nền mới thay thế dần bằng người chơi thật.
- Có thể không hiển thị số người chơi trực tuyến công khai; chỉ **ADMIN/SUPER_ADMIN** được xem thống kê real/NPC/guest trên endpoint bảo mật. NPC phải được thể hiện trung thực là cư dân mô phỏng, không giả danh tài khoản thật hoặc tự tạo tin nhắn giả là của người chơi.
- Chat chỉ cho tài khoản đăng nhập; chặn/mute chat theo chế tài; admin có quản lý user, nội dung, Shop, tủ đồ, NPC, quest, timer, sự kiện và LIVE.
- TikTok khách bình luận xuất hiện dạng **guest actor tạm thời**, không nhận Xu/đồ/ví/đăng nhập và chỉ được một animation đã khai báo; connector thật phụ thuộc quyền tích hợp và nguồn sự kiện được phép.
- Tiền ảo và tiền thật tách rời; ủng hộ QR/tên công khai mặc định OFF, có xác minh, đồng ý công khai và phê duyệt.

## KẾT QUẢ ĐẦU RA CODEX PHẢI CÓ

`IMPLEMENTATION_AUDIT.md`, `MIGRATION_PLAN.md`, `KNOWN_ISSUES.md`, code có test, ảnh desktop/mobile, báo cáo đo FPS/latency, log test, file `.env.example` không chứa secrets, README chạy local/staging/deploy và rollback.

## MINH CHỨNG KIỂM THỬ BẢN THAM KHẢO (KHÔNG PHẢI CODEX REPO HIỆN TẠI)

Đã chạy `npm run verify` trên `references/BASELINE_V3_REFERENCE_ONLY.zip` (bản source `game_v3` đã có trong thư mục V3 bàn giao cũ): PASS syntax và content validation (11 scene, 11 NPC, 11 quest, 21 item, 14 actions). **Chưa chạy test code V4** hoặc repository Codex hiện tại; tất cả checklist `tasks.json` vẫn ở trạng thái TODO.

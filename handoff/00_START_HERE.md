# BẮT ĐẦU Ở ĐÂY — Giao Xứ An Hòa V3 → Website Game 2D

**Ngày chốt yêu cầu:** 01/11/2026. **Ngôn ngữ:** Tiếng Việt. **Phạm vi:** game 2D giáo xứ hư cấu cho desktop/mobile, toàn màn hình, ít lag, tương tác NPC, nhiệm vụ ngắn, xu game, trang phục nam/nữ, các hành động có cooldown, sự kiện Noel, bảng tri ân có kiểm duyệt.

## Quy tắc ưu tiên và nguồn tài liệu

1. **Yêu cầu người dùng mới nhất** + `handoff/01_ACCEPTANCE_CHECKLIST.md` là yêu cầu sản phẩm ưu tiên.
2. `handoff/02_GAMEPLAY_NPC_QUESTS.md`, `03_UI_SCENES_AVATAR.md`, `04_ARCHITECTURE_API_DB.md`, `05_TEST_RISK_REGISTER.md`, `06_DONATIONS_PRIVACY.md` mô tả đích cần triển khai.
3. `game_v3/src/data.js` và `game_v3/src/activities.js` là **source of truth cho IDs và nội dung demo hiện tại**. `handoff/CONTENT_CATALOG_SNAPSHOT.json` chỉ là ảnh chụp để tra cứu; không chỉnh độc lập.
4. `game_v3/src/{art,game}.js`, `src/style.css`, `index.html`, `Giao_Xu_An_Hoa_Choi_Thu_V3.html` là **prototype tham khảo có tương tác**; không coi là kiến trúc production.
5. `game_v3/docs/CODEX_V3_IMPLEMENTATION.md`, `docs/schema_v3.sql`, `docs/CODEX_PROMPT_V3.md` là tài liệu cũ được bảo tồn. Nếu xung đột, dùng các tài liệu `handoff/` mới và ghi quyết định vào ADR.

## Cách chạy ngay

```bash
cd game_v3
npm run verify
# sau đó chạy một server static tùy ý, ví dụ:
python -m http.server 8080
# mở http://localhost:8080
```

Hoặc mở file `game_v3/Giao_Xu_An_Hoa_Choi_Thu_V3.html` để thử offline. **Đây chỉ là game demo**: không có đăng nhập server, chống gian lận, ngân hàng thật, QR thật hay multiplayer.

## Thành phần dự án

- `game_v3/`: toàn bộ mã nguồn V3 và hình reference được giữ lại; kiểm thử catalog đã được sửa để dùng dữ liệu hiện tại thay vì đường dẫn JSON sai.
- `handoff/01_ACCEPTANCE_CHECKLIST.md`: danh sách theo phase, checkbox có tiêu chí nghiệm thu.
- `handoff/02_GAMEPLAY_NPC_QUESTS.md`: luồng chơi, NPC, nhiệm vụ, cooldown & Xu, hội thoại, animation.
- `handoff/03_UI_SCENES_AVATAR.md`: scene-by-scene, HUD, tabs, mobile, avatar tách bộ phận, phối cảnh & perf.
- `handoff/04_ARCHITECTURE_API_DB.md`: quy tắc transaction, bảng, API, migration, event, bảo mật.
- `handoff/05_TEST_RISK_REGISTER.md`: lỗi dự đoán, lỗi đã phát hiện, test case và chống regression.
- `handoff/06_DONATIONS_PRIVACY.md`: Xu ảo khác tiền thật; QR, xác nhận giao dịch, admin, opt-in tên.
- `handoff/07_CODEX_MASTER_PROMPT.md`: prompt giao nguyên văn cho Codex.
- `handoff/CONTENT_CATALOG_SNAPSHOT.json`: snapshot tự động của 11 scene, 11 NPC, 11 quest, 21 item, 14 activity.
- `handoff/FILE_INVENTORY.md`: danh sách tệp quan trọng, hash, kiểm tra nguồn.

## Quyết định thiết kế đã chốt

- **Không Level**; giữ Xu làm tiền thưởng game. Không đổi tài nguyên game ra VND.
- 2D hoạt hình có chiều sâu theo ảnh nhà thờ được gửi; vẽ layer/sprite có hitbox, không dán nguyên ảnh chụp vào khung chơi.
- Toàn màn hình cảnh; HUD tối thiểu; bản đồ, nhiệm vụ, Shop, avatar, đóng góp mở bằng **một** modal/bottom-sheet tại một thời điểm.
- Một khu vực chứa NPC, hotspot, đường đi; thao tác: bấm → tiến đến → animation → server xác nhận → hiện phần thưởng và timer nút.
- Các hoạt động lặp lại hồi độc lập **60–600 giây**, hiển thị `⏳ mm:ss` trong nút; server quyết định Xu/cooldown ở bản online.
- Nam/nữ chọn avatar, các bộ phận đổi trang phục không lệch layer; phần thân, tay, chân có tư thế riêng.
- Lễ nghi là nội dung giáo dục/tôn trọng; không biến xưng tội/rửa tội, rước lễ, ân xá hoặc ơn thiêng thành vật phẩm có thể mua hay cày điểm.
- Tiền thật tự nguyện nếu bật sau này phải nêu rõ thụ hưởng là nhà phát triển game hay giáo xứ thật (cần ủy quyền), không mô tả gây hiểu nhầm.

## Definition of Done rút gọn

Người mới tạo nhân vật → gặp Lucia → nhận quest → đi giữa các cảnh → thao tác 14 hành động → thấy cooldown → hoàn thành nhiệm vụ và nhận đúng Xu một lần → mua & thay trang phục → tải lại không mất dữ liệu → UI vừa mobile 360px → test tự động và thủ công đạt; bản online phải có auth/server ledger + kiểm tra chống phát thưởng trùng trước public launch.

## Tài liệu lịch sử và kiểm chứng

- `references/legacy_v2_docs/`, `references/legacy_v1_docs/` là **bản tham khảo** từ những giai đoạn trước, không là source of truth.
- `handoff/08_CODEX_TASK_BOARD.json` chứa 16 task JSON có thứ tự/phụ thuộc để Codex chia work packages.
- `handoff/09_VERIFICATION_REPORT.md` ghi rõ test nào PASS và test nào chưa chạy được.

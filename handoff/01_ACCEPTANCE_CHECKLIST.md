# CHECKLIST CODEx — CÓ THỨ TỰ, CÓ ĐIỀU KIỆN NGHIỆM THU

Ký hiệu: `[ ]` chưa làm, `[x]` đã xác minh tại bản bàn giao, `[!]` nguy cơ đang tồn tại. **Không đánh dấu hoàn tất nếu mới viết code mà chưa chạy thử.** Mỗi PR/commit phải gắn checklist + ảnh/video desktop/mobile + test log.

## P0 — Nhận dự án, dọn lỗi hiện hữu (không đổi UI khi chưa khóa baseline)
- [x] Có prototype V3 và tài liệu gốc trong `game_v3/`.
- [x] Sửa script `tests/validate_content.cjs` trong gói bàn giao: nay đọc `src/data.js` + `src/activities.js`, không còn tham chiếu `docs/content.json` đã mất.
- [ ] Codex chạy `npm run verify` và lưu test log; xác nhận game render, không có uncaught exception trên Desktop Chrome, Edge, Safari iOS/Android Chrome (tùy thiết bị thử).
- [ ] So ảnh `assets/reference_church_photo.png` và `assets/reference_approved_ui.png`; chốt bản mô tả thiết kế nhất quán trên web/mobile.
- [ ] Xác định một source of truth cho data (JS/JSON → TS module về sau), không nhân bản quest/coin rule ở frontend và backend.
- [ ] Loại bỏ từ UI và dữ liệu runtime đang được sử dụng những trường `xp`, `level`, `kindness`, `kindnessPrice` cũ hoặc migration có chủ đích (đừng xóa âm thầm inventory người dùng).
- [ ] Liệt kê những phần **đã chạy**, **mock**, **chưa làm**, tránh ghi là hoàn thành QR/auth/webhook.
- [ ] Thiết lập Git repo, phân nhánh `main`/feature, `.gitignore`, formatter, lint, CI và quy tắc code review.

## P1 — Game loop chơi được, client 2D full screen
- [ ] Mở game → chọn giới tính nam/nữ, đặt tên sạch ký tự, chọn ngoại hình cơ bản → lưu dữ liệu.
- [ ] Màn hình chính: khung cảnh chiếm phần lớn màn hình; chỉ avatar/tên, Xu, tên khu vực, nhiệm vụ gợi ý, dock gọn.
- [ ] Các tab `Bản đồ`, `Hành động`, `Nhiệm vụ`, `Nhân vật`, `Shop`, `Khác` **ẩn ban đầu**, mỗi lúc mở tối đa một overlay; ESC/back đóng đúng.
- [ ] Bản đồ 11 scene có cổng ra/vào, vị trí spawn, bảng dấu hotspot; các điểm thao tác rõ ràng, không chồng icon.
- [ ] Nhân vật chạy/đi tới điểm hợp lệ, không xuyên bàn thờ, ghế, cột, không kẹt camera.
- [ ] NPC chạm/nhấp được, có tên, hội thoại, nút nhận nhiệm vụ; nhiệm vụ hợp lệ xuất hiện `!`.
- [ ] Bố trí ghế: chọn một seat slot → tìm đường → ngồi → đứng khi di chuyển; không ngồi trùng khi online.
- [ ] 14 hành động: nút `Thực hiện +X Xu` → animation 2–4s → nhận đúng xu → cooldown 1–10 phút → hiện `⏳ mm:ss` **trong nút** và khóa nút.
- [ ] Người chơi rời scene, refresh hay tắt trình duyệt mở lại: timer tiếp tục đúng; không reset cooldown.
- [ ] Hành động không hợp ngữ cảnh vô hiệu (quét ghế lúc đang diễn ra Thánh lễ mô phỏng, leo cung thánh, ngồi trên NPC, thao tác không có điểm tương tác).
- [ ] Quest có trạng thái khóa/chưa nhận/đang làm/đủ điều kiện/đã nhận quà; theo dõi một quest; trả Xu đúng một lần.
- [ ] Sổ nhiệm vụ tìm thấy hoạt động tiếp theo/đưa người chơi tới scene; NPC vẫn có thể giải thích nếu quest đã xong.
- [ ] Shop/túi đồ: xem trước (KHÔNG trừ tiền), mua xác nhận (trừ đúng một lần), mặc/cởi ngay, tách áo/quần-váy/tóc/giày/phụ kiện.
- [ ] Không Level, không bán bí tích hoặc trang phục chức thánh cho nhân vật thường.

## P2 — Chất lượng UI, 2D và Mobile
- [ ] Ảnh nhà thờ: cung thánh phía sâu, vòm trắng, kính màu, tranh màu xanh, ghế hai bên, lối đi giữa, sàn phối cảnh tương tự ảnh tham khảo nhưng dựng layer 2D có va chạm.
- [ ] Rendering layer: background → công trình sâu → vật thể hậu cảnh → NPC/player theo Y → vật thể tiền cảnh → UI; không đổi thứ tự sai.
- [ ] Avatar rig có anchor rõ, 4 hướng tối thiểu, animation idle/walk/sit/kneel/genuflect/bow/sign_cross/pray/sweep/water/wipe/carry/sing/decorate/wave.
- [ ] Áo/quần/váy/giày không xuyên tay chân trong mọi tư thế; thay item không làm mất tóc/mặt.
- [ ] 360×800, 390×844, 768×1024, desktop 1366×768 và landscape mobile: không tràn, menu không bị bàn phím che, nút chạm ≥44×44 CSS px.
- [ ] Modal mobile thành bottom-sheet; nội dung có scroll riêng, game bên dưới không cuộn hay kích hoạt hotspot vô ý.
- [ ] `prefers-reduced-motion`, tắt hiệu ứng và hỗ trợ keyboard/focus khi có popup.
- [ ] Kiểm thử máy yếu: đo FPS, bộ nhớ, tải ảnh/assets; mục tiêu 30 FPS ổn định ở mobile phổ thông, ưu tiên thời gian phản hồi và không nóng máy hơn hiệu ứng.

## P3 — Server và database trước khi ra Internet
- [ ] Auth thực tế (tài khoản/phiên), username/avatar user, không lưu mật khẩu dạng plaintext.
- [ ] PostgreSQL migrations có rollback strategy, seed 11 scene/11 NPC/11 quest/21 item/14 action từ catalog đã chuẩn hóa.
- [ ] Server-authoritative wallet, cooldown, inventory, action sessions, quest progression; client chỉ hiển thị.
- [ ] `coin_ledger` bất biến, mỗi nguồn thưởng và mỗi idempotency key áp dụng duy nhất; transaction/row locks khi trừ/nhận Xu.
- [ ] Start/complete hành động không double-reward dù retry, 2 tabs, refresh, network timeout hoặc clock máy bị chỉnh.
- [ ] Quest, Shop, donate Xu có idempotency; không dùng localStorage làm nguồn dữ liệu chuẩn cho bản online.
- [ ] NPC, scene, action catalog versioned; đồng bộ trạng thái qua API.
- [ ] Phân quyền ADMIN tách với PLAYER; log thao tác quan trọng và bảo vệ endpoint admin.
- [ ] Test API unauthorized, cross-user, replay, parameter tamper, negative balance, spam.

## P4 — Ủng hộ, tri ân & sự kiện (chỉ bật sau P3)
- [ ] Đóng góp Xu ảo cho các dự án hoa, đèn, góc sinh hoạt → cập nhật trạng thái trang trí của cả cộng đồng.
- [ ] Khu ủng hộ tiền thật **tắt mặc định** (feature flag). Khi bật phải ghi rõ người thụ hưởng, mục đích sử dụng, thông tin ngân hàng đúng, điều khoản hoàn tiền/khiếu nại.
- [ ] Không nhúng thông tin ngân hàng nhạy cảm vào Git; hiển thị QR VietQR cấu hình trên server qua kênh tin cậy.
- [ ] Không xác nhận giao dịch bằng ảnh chụp, client callback, người dùng bấm “đã chuyển”; phải đối soát giao dịch ngân hàng/chứng từ hợp lệ bởi người có quyền.
- [ ] Bảng tri ân chỉ ghi tên đã **opt-in**, có quyền ẩn/thu hồi, kiểm duyệt, không tự công khai tiền, không xếp hạng đóng góp.
- [ ] Admin xem pending/confirmed/rejected/refunded, tra nhật ký, không thể duyệt bằng nút demo từ trình duyệt public.
- [ ] Noel: bố trí đèn, cây thông, hang đá; giữ cảnh hoạt động bình thường khi sự kiện kết thúc.

## P5 — Phát hành & nghiệm thu
- [ ] CI `lint + unit + contract + integration + e2e desktop/mobile + asset size checks` đạt 100% bài critical.
- [ ] Có log lỗi ẩn dữ liệu cá nhân, monitoring và backup restore đã thử.
- [ ] Có cơ chế config và rollback; không lộ env secret trong frontend bundle.
- [ ] Thử luồng một người chơi mới từ đầu đến mua đồ; kiểm tra mọi hành động và 11 khu vực không dead end.
- [ ] QA ký xác nhận bảng `handoff/05_TEST_RISK_REGISTER.md` và chụp ảnh kết quả ở 5 viewport.
- [ ] Landing web rõ ràng: mô phỏng, không phải nhà thờ thật; không phải nơi cử hành bí tích thật; ghi điều khoản sử dụng và quyền riêng tư.

**Definition of Done tuyệt đối:** không tăng Xu 2 lần cho cùng một lần hoàn thành; không tạo bản ghi tri ân công khai nếu thiếu xác nhận giao dịch và đồng ý hiển thị; không bị chặn thao tác trên mobile bởi UI; không mất inventory khi reload.

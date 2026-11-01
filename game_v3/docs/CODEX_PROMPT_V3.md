# PROMPT CHO CODEX: TIẾP TỤC DỰ ÁN GIÁO XỨ AN HÒA V3

Bạn là technical lead full-stack + game UX designer. Hãy đọc `docs/CODEX_V3_IMPLEMENTATION.md`, `docs/schema_v3.sql`, code trong `src/`, cùng hai ảnh reference `assets/reference_church_photo.png` và `assets/reference_approved_ui.png`.

**Không được bắt đầu bằng việc viết lại giao diện từ số 0.** Giữ bản nhà thờ 2D đang có: nhiều lớp phối cảnh, vòm trắng, trần cao, kính màu, cung thánh, ghế hai bên; giữ chức năng fullscreen/desktop/mobile, avatar nam nữ thay các slot đồ. Nâng rig body để phân lớp đầu/thân/tay/chân thật và animate chuẩn.

Cải thiện những mục theo thứ tự:

1. Hoàn thiện động tác: đi, đứng, ngồi ghế, quỳ, bái gối gối phải, cúi mình, làm dấu Thánh giá đúng thứ tự, chắp tay, quét sân, lau ghế, tưới cây, hát, treo đèn; chuyển động mượt và phù hợp nơi. Không xâm nhập cung thánh và không mô phỏng tha tội/rửa tội thật.
2. Chỉ giữ 6 nút dock. Cảnh nhà thờ không tràn icon; mỗi khu chỉ có 1 điểm mở danh sách hành động. Chọn hành động là mở hoặc trực tiếp bắt đầu animation. Đồng hồ hồi `mm:ss` phải nằm ngay trong nút, disabled sau khi hoàn thành. Khi reload phải giữ cooldown. Danh sách 14 actions ở `src/activities.js`. Không có level, không XP, mọi thứ mua bằng Xu.
3. Thay localStorage state bằng account backend/DB có migration từ V2. XP cũ không còn tác dụng. Sửa đồng hồ là lỗi phải bị chặn server-side. Mọi khoản cộng/trừ Xu phải đi qua wallet ledger giao dịch atomically; mỗi action/claim chỉ thưởng một lần mỗi chu kỳ.
4. Nâng Quest và Shop theo UI cũ: NPC nhận quest, quest tiến độ, đổi Xu, tủ đồ mix-and-match nam nữ. Test animation/action collision, không che modal và tránh seat overlap.
5. Hòm ủng hộ có hai tab độc lập: Xu ảo để nâng cấp nhà thờ trong trò chơi; tiền thật *tự nguyện để hỗ trợ phát triển game*, chỉ hiện QR khi admin cung cấp tên chủ TK, ngân hàng và xác minh cấu hình. Không sử dụng QR/số tài khoản giả. Có đối soát webhook hoặc sao kê, duyệt duy nhất, bảng tri ân opt-in và khả năng ẩn danh/rút tên. Demo admin hiện tại CHỈ là thử UI, bắt buộc dời khỏi client public khi deploy.
6. Xây trang Admin riêng có RBAC. Tích hợp thanh toán chỉ sau khi chủ dự án cấu hình tài khoản/đơn vị nhận và cơ chế xác minh an toàn. Tuyệt đối không xem click QR hoặc ảnh chụp giao dịch là xác nhận.
7. Chạy lint/tests/mobile 360×800, 390×844, desktop 1440×900. Kiểm tra không có hành động nào thưởng hai lần vì multi-click hay multi-tab, không mất đồ sau reload, cooldown đúng, đồng ý công khai rõ ràng.

**Output cần:** cấu trúc source dễ maintain, Postgres migration SQL, Seed 14 actions + quest/item/npc, REST API contracts, test suite e2e, README triển khai, screenshots thực tế desktop/mobile. Giữ trật tự thần học và tránh biến việc xưng tội, rửa tội, ân xá hoặc cầu nguyện thành hàng hóa.

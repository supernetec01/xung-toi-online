# V12 — lỗi đã xử lý và phần còn lại

Ngày 02/11/2026. Trạng thái ở đây là kết quả trên source thật; không tự coi toàn bộ checklist trong ZIP là đã đạt.

## Đã xử lý trong P0

- Spawn nguồn sân/lớp/giếng cũ nằm trong collider: P0 có entry thật hợp lệ và kiểm đường đến từng anchor/NPC trước publish.
- Footprint chỉ xét tâm, đoạn di chuyển có thể xuyên tường mỏng: kiểm chân và sweep AABB liên tục; path smoothing dùng cùng kiểm tra.
- Chuyển lệnh/catalog khi còn callback cũ: hủy token, xóa held input khi catalog đổi, kiểm từng frame; giữ kiểm thử thao tác nhanh và đóng modal khi đang đi.
- Hai chậu hoa chặn hành lang phía trên ghế khi bật footprint: điều chỉnh footprint/độ sâu chậu hoa để có đường hợp lệ tới ba cửa bên; không tắt collision để ép đi qua.
- V10 có selector `data-gender` lẫn với nút Studio: rig dùng `data-body-type`, bind nút trong modal. Không xoay toàn bộ sprite để đổi hướng.
- Trả lời bài học liên tiếp khi đang lưu: khóa nút trong lúc xử lý, mở câu kế tiếp sau kết quả; đóng modal không bị callback cũ tự mở lại. Sai/stale/duplicate được server xử lý, không cấp Xu lặp.
- CMS có thể nhập sprite index/bench/list không hợp lệ: validator chặn trước publish thay vì để renderer lỗi.
- Fixture API cũ dùng tọa độ Lucia trước khi đổi map: test lấy access/spawn/action từ catalog thật, vẫn đi qua rate limit và kiểm gần trên server. Log lần thất bại đầu được giữ riêng, không tính là PASS.
- Server làm tròn cả vị trí NPC/anchor hợp lệ khi kiểm khoảng cách: target lệch sang grid làm khoảng cách 5,83 thành 7,21, gây `APPROACH_REQUIRED` dù người chơi đứng đúng. Server dùng điểm thật nếu walkable, chỉ project điểm bị chặn. Hộp thoại chỉ mở sau xác nhận server. Hồi quy online giữ đủ yêu cầu nhiệm vụ; log chẩn đoán ở `artifacts/v12/failures/`.
- Test LIVE sau bài mật độ bị đầy render cap do NPC thử nghiệm CMS được giữ từ các lượt cũ: test cho đám đông đi sang map khác bằng API trước bài kiểm visibility riêng. Không tăng cap, xóa account hay bỏ kiểm mật độ.
- Audit M0 trước đây đòi danh sách item giống hệt baseline: giữ nguyên file baseline lịch sử, khai báo đúng ba ID tóc bổ sung và vẫn từ chối mất/đổi/trùng/thêm ID chưa khai báo. Bảy ca kiểm guard đạt.
- HTTP game server trả WebP dưới MIME chung: bổ sung `image/webp`/`image/avif`, kiểm header và byte WebP ở các asset V12/V8/Noel cùng path isolation; 16 kiểm tra read-only đạt trên bản demo bình thường.

## Còn mở

| ID | Mức/phạm vi | Trạng thái và điều kiện đóng |
| --- | --- | --- |
| V12-OPEN-01 | Kiến trúc ngoài trời | Sân/vườn/Noel hiện vẫn qua portal; `worldId` chỉ là registry chung. Cần ghép world liên tục khi làm MAP-08/MAP-11, rồi kiểm camera/collision/đồng bộ zone. |
| V12-OPEN-02 | Sáu map P1 | Tiền sảnh, ca đoàn, vườn, nhà xứ, gian trang phục, Noel chưa dựng lại theo V12. Chức năng cũ được giữ; ảnh P0 không phải bằng chứng nghiệm thu các map này. |
| V12-OPEN-03 | Mỹ thuật/UI | Chờ chủ dự án duyệt mức giống ảnh tham chiếu. Một số marker cố định có thể nằm trên nhân vật/đồ vật ở màn hình hẹp; cần xử lý hiển thị theo khoảng cách và bố cục khi làm polish T24. Chưa thay toàn bộ HUD. |
| V12-OPEN-04 | Hiệu năng/thiết bị | Viewport/touch giả lập không thay thế điện thoại thật; chưa có kết quả 30 NPC ở vườn mới, soak dài hoặc tải nhiều người. 30 lần đổi map chỉ kiểm không tích lũy entity/layer, không chứng minh heap không rò rỉ. |
| V12-OPEN-05 | Vé Noel | Chưa có provider, webhook, checkout và entitlement server. Chặn nghiệm thu T22/QA-021; không dựng cờ vé giả hoặc coi Xu là thanh toán thật. |
| V12-OPEN-06 | TikTok/production | Chỉ LIVE Simulator; thiếu quyền/provider thật và deployment HTTPS/staging. Không tự bật tích hợp tài khoản thật. |
| V12-OPEN-07 | QA cuối | T25 chờ T20–24, kiểm điện thoại và các mục còn PARTIAL/BLOCKED. Chưa phải release V12 hoàn chỉnh. |

Nếu database đang có scene tùy chỉnh bị geometry mới chặn anchor, migration/CLI chủ động báo `LAYOUT_REVIEW_REQUIRED` và rollback transaction. Đây là điểm cần operator sửa vị trí, không phải lý do xóa dữ liệu hoặc reset DB.

# SỔ LỖI, PHÒNG NGỪA BUG VÀ KỊCH BẢN TEST

## A. Lỗi đã xác định khi rà soát source V3

| ID | Mức | Trạng thái | Chi tiết / yêu cầu |
|---|---|---|---|
| AUD-001 | P1 | **ĐÃ SỬA trong bản bàn giao** | `tests/validate_content.cjs` ở V3 cũ đọc `docs/content.json` không có. Bản mới kiểm tra từ `src/data.js` + `src/activities.js`; chạy `npm run verify`. |
| AUD-002 | P1 | **CHƯA SỬA** | Source V3 vẫn mang các trường di sản `xp`, `level`, `kindnessPrice`, `kindness`; UI bỏ Level nhưng catalog chưa chuẩn hóa. Cần migration có test, tránh mất vật phẩm. |
| AUD-003 | P1 | **CHƯA SỬA** | `openShop` ghi “thử đồ trước khi mua” nhưng action hiện chỉ `buyOrEquip`; chưa có preview độc lập không trừ tiền. Bổ sung nút `Thử` + `Mua` + `Mặc` rõ ràng. |
| AUD-004 | P0 khi online | **CHƯA TRIỂN KHAI** | Xu và cooldown còn chạy client (`localStorage`, `Date.now()`): có thể sửa giờ/giả mạo xu. Chuyển authoritative sang backend trước public launch. |
| AUD-005 | P0 khi online | **CHƯA TRIỂN KHAI** | Duyệt DEMO donor nằm client; PHẢI bỏ khỏi public build và làm admin API phân quyền + bank reconciliation. |
| AUD-006 | P2 | **CHƯA TRIỂN KHAI** | Hai hotspot ghế chỉ có `seated=true`, chưa có seat slot, occupancy, navmesh; dễ trùng chỗ/xuyên ghế khi multiplayer. |
| AUD-007 | P2 | **CHƯA TRIỂN KHAI** | `moveTo` là thay tọa độ theo transition đơn giản, chưa có pathfinding/collision và check approach-distance; tương tác có thể xuyên vật thể. |
| AUD-008 | P1 | **CHƯA TRIỂN KHAI** | Animation completion dựa `setTimeout` và biến `activityBusy` client; reload/ẩn tab giữa thao tác chưa có resumable server execution. |
| AUD-009 | P2 | **CẦN SOÁT** | README V3 gốc chỉ hướng dẫn offline; schema SQL chưa có migration, seed, grants, test DB. Không tuyên bố sẵn sàng production. |

## B. Bug có thể phát sinh và cách phòng tránh

| Nhóm | Lỗi có thể xảy ra | Phòng ngừa | Test ID |
|---|---|---|---|
| Ví Xu | Nhấn liên tục/2 tab nhận Xu hai lần | ledger source_ref UNIQUE, row lock, idempotency | T01,T02 |
| Cooldown | Sửa giờ máy, refresh hoặc đổi scene reset giờ | server `ready_at`, delta sync, disabled server side | T03,T04,T05 |
| Request | Timeout sau commit, retry phát thưởng thêm | response receipt idempotent + GET execution | T06 |
| Quest | Claim 2 lần, event duplicate, nhặt 1 quyển sách tính 3 | event receipt unique, step target IDs | T07,T08,T09 |
| Shop | Xu âm, double charge, thử đồ bị trừ, item chưa mua vẫn mặc | DB transaction, previewState riêng, inventory check | T10,T11,T12 |
| Avatar | Tay xuyên áo/quần lệch khi ngồi/quỳ, đổi nam/nữ mất items | rig anchors per pose; compat catalog; snapshot | T13,T14 |
| Ghế | Hai player trùng slot, đứng dậy vẫn giữ slot | lease TTL & atomic seat reservation | T15 |
| Điều hướng | Nhân vật đi xuyên bàn thờ, không chạm được NPC trên mobile | navmesh, interact-radius, polygon hit tests | T16,T17 |
| Popup | Mở 2 tab chồng nhau, click xuyên modal, không đóng bằng Back | centralized ModalManager + focus trap | T18,T19 |
| Mobile | bottom dock bị che bởi home indicator, modal quá cao | safe-area insets, responsive tests | T20 |
| Perf | nặng FPS, memory leak từ timers/listeners, render lại cảnh 1Hz | profiling, cancel timers, stable DOM, lazy assets | T21,T22 |
| Data | đổi schema làm mất progress V2→V3, quest dependency cycle | explicit migration, versioned data validation | T23,T24 |
| Security | XSS trong username/publicName, client sửa giá/ID, bypass admin | escape text, schema validators, RBAC | T25,T26 |
| Bank | ảnh chuyển khoản giả, webhook giả/replay, nhầm tài khoản | bank proof verified server, unique provider txn | T27,T28 |
| Privacy | tên donor public dù chưa đồng ý, không thể ẩn | opt-in + moderation + revoke action | T29,T30 |
| UX | người chơi lạc trong scene, không biết tiếp tục | tracker “Đến nơi”, NPC quest marker, quick map | T31 |
| Religious | cầu nguyện coi như giao dịch mua ơn thiêng; mô phỏng rửa tội thật | copy review + nội dung giáo dục | T32 |

## C. Test case chi tiết có thể tự động hóa

- **T01** 20 lần bấm `complete` đồng thời với cùng `executionId` → đúng 1 coin ledger credit.
- **T02** cùng tài khoản ở hai tab bắt đầu hành động lúc cooldown bằng 0 → 1 thành công, 1 conflict; tổng Xu chính xác.
- **T03** thực hiện `sweep`, refresh 30 giây sau → nút còn ~1:30, không về 2:00 và không thành 0.
- **T04** sửa đồng hồ điện thoại tiến/lùi 1 giờ → server không cho hoàn thành sớm.
- **T05** rời `courtyard` tới `nave` rồi quay lại → cooldown `sweep` vẫn giữ.
- **T06** complete server commit, client timeout, gửi lại idempotency key → trả receipt cũ, không cộng nữa.
- **T07** gọi claim quest 5 lần với một key hoặc key khác → cùng một thưởng, status `claimed`.
- **T08** click 3 lần cùng `flower1` → tiến độ tưới 3 luống chỉ là 1/3.
- **T09** chưa nhận quest nhưng đã tưới luống, sau khi nhận quest → chính sách retroactive nhất quán, không nhận thưởng lặp.
- **T10** ví 50 Xu mua áo 110 Xu → HTTP 422, số dư vẫn 50, không có item.
- **T11** hai tab đồng thời mua một item → một debit, inventory một bản ghi.
- **T12** bấm `Thử` 3 món liên tiếp rồi đóng Shop → trang phục gốc vẫn như cũ, không trừ Xu.
- **T13** preview cả 2 giới tính × mọi slot × mọi pose → không xuyên hình, không mất bộ phận.
- **T14** mua áo, refresh và đăng nhập lại → áo còn trong kho; equipped đúng.
- **T15** player A ngồi seat 1, B không ngồi được, A rời/TTL hết → B có thể ngồi.
- **T16** click NPC phía sau hàng ghế → đi lối giữa/lối phụ hợp lệ, không xuyên qua ghế.
- **T17** mobile zoom/pan/chạm → hitbox khớp actor, không lệch pixel scale.
- **T18** mở Shop rồi Nhiệm vụ → chỉ 1 modal tồn tại, không còn backdrop/click handler cũ.
- **T19** mở modal, bấm ESC/Back → đóng, focus trở về nút trước đó; game không tự di chuyển.
- **T20** 360×800 và 390×844 → không có horizontal scroll ngoài scene; nút đủ kích thước và sát safe-area đúng.
- **T21** 10 phút chơi trên điện thoại phổ thông → không vượt ngân sách bộ nhớ đã đặt; FPS không rơi kéo dài dưới 30.
- **T22** mở/đóng Shop 100 lần → không tăng không giới hạn số event listeners/timers.
- **T23** nạp save V2 có XP, kindness, đồ đã mua, nhận quà → migrate V3 giữ số dư/đồ theo quy tắc một lần.
- **T24** validator kiểm tra ids/destinations/quest graph; cố tình thêm dependency cycle phải fail.
- **T25** tên user `\u003cimg onerror=...\u003e` hiển thị ký tự, không thực thi JS; giới hạn Unicode và length.
- **T26** user sửa request `coins=99999`, `price=-1`, `userId=other` → server reject, wallet khác không đổi.
- **T27** upload ảnh biên lai không có bank record → donation vẫn `pending/needs_review`, không vào wall.
- **T28** gửi lại webhook cùng transaction/provider reference → chỉ 1 confirmed transfer, không duplicate donor.
- **T29** không opt-in, giao dịch confirmed → **không** xuất hiện tên ở public wall.
- **T30** đã opt-in, bấm Ẩn → tên biến mất sau kiểm duyệt/cập nhật cache nhanh, log audit có record.
- **T31** player mới hoàn thành welcome → có hiển thị NPC/vùng tiếp theo, không bị kẹt quest.
- **T32** bài học rửa tội/hòa giải → không có nút “rửa tội thật”, “xưng tội thật”, “mua ân xá”, không thu nội dung riêng tư.

## D. Quy trình CI/QA

1. `npm run verify` trong `game_v3` (source check JS + data catalog validation), fail fast nếu thiếu reference file.
2. TS lint/type-check sau migration; schema SQL migration dry-run và test integration với DB sạch.
3. UI playwright/cypress (nếu cài trong repo), screenshot 360×800, 390×844, 768×1024, 1366×768, 1920×1080; tab/Shop/avatar/NPC/action/donation.
4. Security tests: unauthorized + cross-user + webhook replay + donor opt-in; load test hai tab và 20 concurrent requests.
5. Release canary → theo dõi error logs, p95 API latency, client FPS/memory; rollback if critical.

**Quy tắc báo lỗi:** lưu Bug ID, steps to reproduce, Expected/Actual, môi trường, severity, ảnh/video/log, commit fix, regression test. Không đánh dấu “không còn bug” nếu chỉ chạy một test happy path.

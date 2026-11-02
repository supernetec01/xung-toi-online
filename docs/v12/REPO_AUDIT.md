# V12 — audit và kế hoạch P0, 02/11/2026

Baseline: `a70ca9855927ee335eadc32058306b867754fd03`. Branch `feature/v12-p0-20261102`. Các tài liệu trong `spec/` là yêu cầu tham khảo, chưa phải bằng chứng triển khai. ID backlog theo TASK_BOARD/TASK_CHECKLIST, vì lời mô tả trong master đánh số khác.

## Source thật

Node 24/CommonJS, PostgreSQL 16, HTTP + WebSocket, client JavaScript/DOM/SVG thuần; không có Phaser/React/Three.js. Game chạy port 5001. Scene nguồn `data.js` → `activities.js` → `gameplay.js` → `scene-layout.js`; server dùng chung loader `scripts/lib/m0-project.cjs`, catalog JSONB và publication. Không có code V11 trong repo; gói V11 là tài liệu/prototype rời. V10 là renderer Studio mẫu, có ví/shop demo riêng phải loại khỏi tích hợp.

11 stable scene IDs: `courtyard`, `nave`, `foyer`, `classroom`, `choir`, `garden`, `office`, `shoproom`, `christmas`, `baptistry`, `confession`. Giữ chúng; các tên V12 chỉ là alias thiết kế.

## Reuse / adapt / thiếu

- **Reuse:** auth/session/MFA/RBAC, catalog/Shop/ledger, inventory, 11 quest/14 action, chat/moderation, NPC/presence, seat leases, LIVE Simulator, save recovery. Không tạo backend/ví/inventory thứ hai.
- **Adapt:** renderer scene hiện có 6 phòng V8, nhà thờ dùng ghế V9 và Noel mới có layer thật; còn sân/lớp/giếng/Hòa Giải là SVG đơn giản. Chưa có scene contract validation/debug view. Navigation dùng point-collider và BFS; input replacement/multi-key đã có vá QC nhưng cần regression mới.
- **Adapt:** rig hiện tại `svg-rig-4.2`, 4 hướng, atlas V4 120×185 và cache; chưa dùng Avatar V10. Studio chỉ 3 màu da và thiếu preview hướng/pose. Giữ ownership/cấu trúc atlas, nối rig V10 qua adapter.
- **Thiếu:** vé/checkout/entitlement thật và provider TikTok, như báo cáo QC trước. Không coi các tính năng giả định trong spec là đã tồn tại. Không bật thanh toán thật.

## File dự kiến thay đổi, sau khi inspect

| Nhóm | File thật | Mục đích |
| --- | --- | --- |
| T01 | `game_v3/src/scene-contract.js` (mới), `scene-layout.js`, `scene-art.js`, `server/catalog.cjs`, loader và `index.html` | Schema/registry chung, asset/footprint/portal/depth; kiểm catalog trước publish |
| Debug | `game_v3/src/scene-debug.js` (mới), `server/main.cjs` | Overlay developer riêng, chỉ Admin đã xác thực; không nằm trong giao diện công khai |
| T02 | `game_v3/src/navigation.js`, `game.js` | Feet footprint, swept segment, A*, input replacement/cancel callback, phản hồi điểm bị chặn |
| T03 | `game_v3/src/avatar-v10.js` (mới), `art.js`, `game.js`, `online.js`, `style.css`, `rules.js`, `server/game.cjs`, `world.cjs` | Rig từ V10, adapter V4, Studio, palette/hair, snapshot qua WS; không đổi ID item đã có |
| T04 | `church-pews.js`, layout/renderer/seat tests | Tái sử dụng ghế V9; xác nhận hướng/occlusion/lease trước khi sửa phần cần thiết |
| MAP01–05 | `scene-layout.js`, assets P0 mới trong `game_v3/assets/v12/`, migration **011+ mới** và CLI rollback | Nền sạch và props riêng theo ảnh duyệt; giữ tên/ID/quyền/nhiệm vụ |
| Gameplay P0 | `data.js`, `gameplay.js`, `game.js`, `server/game.cjs` khi cần | Bài học/quiz có tiến độ phía server, không mô phỏng bí tích thật |
| QA | `tests/v12*.cjs`, scripts npm/CI, `artifacts/v12/`, taskboard/matrix/báo cáo | Ảnh trước/sau, regression có bằng chứng, giới hạn thiết bị ghi rõ |

Đây là danh sách dự kiến, báo cáo cuối ghi file thực tế. Không sửa migration 001–010. Không thay toàn bộ renderer/game.

## Thứ tự

T00 baseline → T01 contract/loader/debug → T02 navigation và T03 avatar → T04 ghế → MAP01–05 theo dependency. MAP06–11, T20–24 theo sau; T25 có priority P0 nhưng phụ thuộc các task P1 nên không thể đánh dấu hoàn thành sớm. Chi phí/assets và geometry được kiểm riêng trên DB QC. Database demo gốc chỉ cập nhật khi bản code/test cụ thể đã sẵn sàng và đã backup; không áp dụng vào production.

Mỗi task cập nhật trạng thái thật, log/test/ảnh và rollback. Visual acceptance của chủ dự án, TLS/provider sandbox/điện thoại vật lý không được tự đổi thành PASS.

## T00 thực thi

Đã chụp 24 ảnh: 11 map × desktop/mobile + Avatar cũ. `npm test` và toàn bộ `test:online` baseline đạt trên DB QC riêng; 0 pageerror trong lượt chụp. Backup và restore drill đạt. Chưa thay production code trong lúc chạy baseline.

## T01 thực thi

Scene adapter giữ stable IDs; schema kiểm bounds/props/assets/portal và strict geometry cho contract version 1. Legacy chưa gắn version 1 vẫn đi qua adapter và cơ chế nearest spawn cũ, không tự thay catalog người dùng. 37 contract checks đạt (bổ sung guard shape/sprite khi dựng P0); overlay 6 chế độ đã mở trong browser Admin, PLAYER/MODERATOR/EDITOR bị 403; guest không có panel. Asset preload dùng cache promise tối đa 32 URL, lỗi được phép retry. Debug chỉ tải khi Admin dùng `?debugScene=1`, production tắt mặc định.

Audit bổ sung: spawn nguồn ở sân/lớp/giếng nằm trong collider cũ; runtime có nearest recovery nên baseline chạy được. P0 layout phải sửa nguồn spawn thật, không dựa mãi vào recovery.

## T02 thực thi

Thay BFS bằng A* có heap; footprint theo scene contract; sweep AABB mở rộng bắt tường mỏng 0,01 đơn vị mà baseline nhận xuyên. Kiểm tra foot rectangle trên polygon; path smoothing cũng dùng sweep. Client kiểm tra đoạn chuyển động mỗi frame và hủy lệnh/callback khi catalog thay đổi; click vùng bị chặn có phản hồi. 13 unit checks, held-key hai lượt, V9 rapid-click/collision/seat trên 4 viewport và verify đạt. Footprint mới được bật từng scene khi publish contract; scene legacy giữ hành vi hiện có.

## T03 thực thi

Một factory V10/V4 dùng cho map, NPC, Shop, HUD, LIVE và Admin preview. Renderer tham khảo V10 đã bỏ toàn bộ wallet/catalog/equip demo; vật phẩm vẫn do V4 quyết định. Giữ khung atlas 120×185 và fallback palette khi ảnh lỗi. Studio có 5 màu da (3 màu cũ vẫn được server chấp nhận), 7 lựa chọn tóc gồm auto, 4 hướng/7 pose, tủ đồ/Shop preview và xác nhận mua. Ba màu tóc mới thêm vào cùng catalog bằng migration 011; không thay giá/ID cũ hoặc cấp item từ client. Appearance version chặn ghi đè từ UI tab cũ; client V4 cũ vẫn dùng được patch từng trường. 29 UI/API/peer checks, 13 atlas checks và 22 viewport/rig checks đạt; có video ngắn từ Studio thật. Mobile là giả lập, không phải thiết bị vật lý.

## T04 và MAP-01–05 thực thi

Ghế V9 được tái sử dụng và kiểm tám hàng/24 seat anchor cùng Avatar V10; lease conflict/reload/expiry đã qua. Năm map P0 có artwork sạch, props riêng, collision theo chân và entry/access/NPC kiểm trước publish. Bài học ba câu dùng state/album V4 và snapshot server, không tạo ví hoặc phần thưởng Xu thứ hai. Hồi quy online phát hiện và sửa lỗi server làm tròn điểm NPC hợp lệ sang grid gây từ chối trò chuyện; UI chỉ mở sau xác nhận. 21 nhóm P0, 20 ảnh viewport và migration rollback đã qua; các suite cũ cũng được chạy lại. Báo cáo cuối, ảnh và giới hạn ở `P0_REPORT.md`/`QA_STATUS.md`; world ngoài trời liền mạch, sáu map P1, vé/provider và thiết bị thật vẫn còn thiếu.

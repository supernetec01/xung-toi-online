# ADR 003 — M0: ranh giới quyền, actor, state và rollout V4

**Trạng thái:** quyết định thiết kế cho M1–M6, không phải auth/RBAC đang chạy. Cổng 5001 và renderer/gameplay hiện hành giữ nguyên.

## Roles và quyền

Canonical roles: `PLAYER`, `MODERATOR`, `CONTENT_EDITOR`, `ADMIN`, `SUPER_ADMIN`. “EDITOR” trong một số dòng tasks/API spec chỉ là cách gọi tắt của CONTENT_EDITOR, không là role runtime khác. Không tin role trong browser/header/payload/save; chưa có user account trong M0.

Deny mặc định. `config/v4-boundaries.json` là hợp đồng kiểm tra offline, không được frontend dùng làm cổng bảo mật. M1 phải enforce server session+role mỗi request/message; ngoài deny server thì public không được prefetch metrics.

| Quyền | PLAYER | MODERATOR | CONTENT_EDITOR | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| Chơi/chat tài khoản mình | có | có | có | có | có |
| Xử lý report/mute chat | không | có, scoped/hạn mức | không | có | có |
| Sửa bản nháp | không | không | có | có | có |
| Publish/rollback | không | không | không | có | có |
| Quản lý users/compensation ledger | không | chỉ context report hạn chế | không | có, giới hạn/audit | có |
| Real/NPC/guest metrics và LIVE Studio | không | không | không | có | có |
| Cấp/bỏ role đặc quyền | không | không | không | không | MFA/reason/audit, bảo vệ Super Admin cuối |

Chat sanction tách account ban; user mute vẫn chơi, làm quest và Shop. Finance/QR chưa cấp quyền triển khai, luôn OFF ở M0. Không seed hoặc yêu cầu secret Admin ở M0.

## Actor semantics

- **PLAYER:** profile user xác thực bền, wallet/quest/inventory riêng; presence actor ephemeral theo lease. Một user nhiều tab chỉ một primary avatar trong M4, hiện local chưa phải presence.
- **FIXED_NPC:** 11 NPC gameplay theo IDs hiện tại, không user account/ví/chat giả; không density despawn, phải có fallback khi cấu hình vắng.
- **AMBIENT_NPC:** cư dân mô phỏng có nhãn “Cư dân”, script/schedule, không wallet/player chat; density chỉ điều chỉnh nhóm này sau hysteresis/cap.
- **LIVE_GUEST:** actor tạm một animation từ mock/provider được phép; không account/Xu/Shop/chat/ghế user; TTL và queue. Không tự tạo tài khoản TikTok thành game user.

Không trả tổng REAL/NPC/GUEST qua public DOM/REST/WS/hydration; việc render actor riêng lẻ để tương tác không phải aggregate metric. Counts chỉ trong private ADMIN/SUPER_ADMIN API/stream, có authz tại subscribe và tại event; moderator/editor không thấy dashboard counts.

## Lựa chọn kỹ thuật và tradeoff

Giữ modular monolith Node, renderer SVG/DOM và các quy tắc kiểm thử được; thêm server/auth trước CMS/chat/presence/LIVE. PostgreSQL authoritative, Redis chỉ thêm khi tải/lease/fanout cần. Không ép framework/engine hoặc TypeScript rewrite trong M0. JS catalog hiện tại làm input seed; không sao chép catalog hai nơi để mỗi bên tự đổi giá.

Không thay localStorage trong M0. Import phải có chính sách tin cậy và receipt riêng, không mặc định số dư/owned items do browser gửi là hợp lệ. Unknown catalog IDs phải giữ và xử lý mapping/archival, không xóa.

## Feature defaults và kiểm chứng

Admin/chat/ambient/mock LIVE/provider thật/QR/public metrics chưa mở. Hợp đồng cấu hình có test để khóa quyết định, **không** thay thế test 401/403/MFA/SQL/WS của M1–M6. M0 kiểm chứng source freeze, save tổng hợp, HTTP closed routes, ảnh baseline, test regression, snapshot restore và kế hoạch.

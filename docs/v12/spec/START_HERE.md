# GIÁO XỨ AN HÒA — CODEX TASK PACK V12

**Mục tiêu:** nâng chất toàn bộ map và avatar ở repository đang triển khai, dựa trên V4–V11, giữ các cơ chế game đã có.

**Đây là bộ task/đặc tả, KHÔNG PHẢI bản vá đã áp dụng lên repository.** Hình trong `references/approved` là ảnh định hướng mỹ thuật — không phải sprite sheet, collision map, hay cảnh tương tác đã tách lớp.

## Dành cho Codex
1. Đọc `CODEX_MASTER_TASK.md`.
2. Đọc `docs/SCENE_MATRIX.md`, `docs/AVATAR_AND_EQUIPMENT.md`, `docs/ARCHITECTURE_NAV_AND_STATE.md`, `docs/QA_AND_PERFORMANCE.md`.
3. Đọc `data/TASK_BOARD.json` và `tests/QA_MATRIX.csv`.
4. Mở game tại repo đang có, kiểm tra runtime và cấu trúc DB/API. Chưa được giả định repo dùng Phaser/React/Canvas/Three.js.
5. Tạo nhánh và bản chụp baseline; triển khai từng nhóm task với test và hình so sánh trước/sau.

## Tệp tham khảo có thể dùng cùng lúc
- `Giao_Xu_An_Hoa_V11_Map_Avatar_Handoff.zip`: yêu cầu các scene, dữ liệu map và lỗi đã ghi nhận.
- `Giao_Xu_An_Hoa_V10_Avatar_Studio_Codex.zip`: avatar renderer/Studio mẫu và hệ thống pose/directions.

## Ưu tiên nghiệm thu
1. Không còn va chạm sai, ghế sai hướng, xoay đầu, lệnh di chuyển kẹt.
2. Có một art style 2.5D xuyên suốt và tính năng hoạt động được trong từng map.
3. Có avatar nam/nữ, tủ đồ và animation thống nhất.
4. Không mất dữ liệu, không cộng Xu trùng, không lộ API Admin, không gây lỗi mobile.

## Phạm vi
Một master outdoor scene kết nối các khu; nội thất là subscenes/rooms thông qua portal, dùng chung account, avatar, quest, chat, shop, inventory, quyền vé và session. Không tạo game backend/ví Xu thứ hai.

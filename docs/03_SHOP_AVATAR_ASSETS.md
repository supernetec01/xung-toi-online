# 03 — TỦ ĐỒ, HÌNH NHÂN VẬT 2D, SHOP & KHO ASSET

## Character rig không phụ thuộc giới tính theo slot

`baseBody` (head/neck/torso/arms/legs), `skin`, `face`, `hairBack`, `pantsOrSkirt`, `shoeL/shoeR`, `topSleeves`, `topTorso`, `hairFront`, `accessory`, `heldProp`, `shadow`; các layer đổi z-order theo pose và hướng. Người dùng chọn mẫu nam hoặc nữ, nhưng asset `unisex` dùng được với cả hai nếu đủ atlas/anchors. Outfit skin không ảnh hưởng collider và seat target.

## Sprite/animation contract

Bắt buộc các hướng `up, down, left, right` (hoặc 8 hướng nếu có asset); animation: `idle`, `walk`, `sit`, `stand`, `kneel`, `genuflect`, `bow`, `sign_cross`, `pray`, `wave`, `sweep`, `water`, `wipe`, `sing`, `read`, `decorate`, `carry`. Các cử chỉ có `durationMs`, optional `footLock`, `heldProp`, anchor override; sự kiện kết thúc phải trả state `idle` và unlock input. Có quy tắc đặt `spriteVersion` và atlas manifest để tránh cache sai khi xuất bản.

Giới hạn asset mục tiêu ban đầu (điều chỉnh sau benchmark): sprite atlas ưu tiên WebP/AVIF cho hình tĩnh, PNG/WebP khi cần alpha và hỗ trợ, ≤2MB/atlas trên mobile phổ thông, ảnh chỉ load khi scene/item cần. Asset failed tải phải fallback bộ đồ mặc định; không để thân người trong suốt hoặc console crash. Không phát sinh 500 DOM nodes cho 1 avatar; sử dụng rendering batched/cached.

## Quy trình thử và mua

Shop mở overlay; tab category; item đang bán hiển thị giá Xu, icon sở hữu, điều kiện event; `Thử` dùng `previewEquipment` local và hiện nút `Hủy thử`, không đụng inventory/wallet. `Mua` gửi `itemId + idempotencyKey`; server validate item active, price, rig compatibility, balance, ownership, then atomic debit+inventory; UI cập nhật receipt, optional `Mặc ngay`; modal đóng thì phục hồi outfit mặc trước nếu chưa mua. Giá không được lấy từ client.

## Form Admin cho item — Schema ví dụ

```json
{
  "id":"top_noel_02", "nameVi":"Áo len Noel đỏ", "slot":"top",
  "rigCompatibility":["male","female"],"currency":"COIN","price":250,
  "assets":{"thumbnail":"cdn/wardrobe/top_noel_02_thumb.webp","atlasMale":"cdn/wardrobe/top_noel_02_m.webp","atlasFemale":"cdn/wardrobe/top_noel_02_f.webp"},
  "posesRequired":["idle","walk","sit","wave"],"published":false,
  "startsAt":null,"endsAt":null,"contentVersion":1
}
```

Giá trị assets ví dụ, không tồn tại cho tới khi admin upload. Validate tên/id/path, chống directory traversal. Đã published và có người mua thì không cho thay id hoặc loại slot; nếu cần phá tương thích tạo ID mới và giữ bản cũ trong archive.

## Lỗi dễ gặp

- Tay nhân vật đè ngược trên áo khi vẫy → thay z-index pose đúng, visual regression.
- Áo nữ làm hở thân khi đổi giới tính → equipment không tương thích phải tự unequip (KHÔNG xóa sở hữu), hiển thị toast.
- 2 người mua cùng lúc không liên quan; **2 tab cùng một người** phải chỉ trừ một lần; unique user/item và ledger source.
- Người chơi có 0 Xu bấm mua → 422 không âm ví, dialog số dư; không xử lý optimistic thành công.
- Admin archive item đã mua → không xóa inventory; người chơi giữ quyền mặc.
- CSS background / atlas thay đổi nhưng browser cache cũ → asset version/hash.

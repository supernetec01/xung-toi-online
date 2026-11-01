# AVATAR 2.5D — HỢP ĐỒNG TÍCH HỢP V10/V4

## Các thành phần
`avatarId`, `bodyType` (male/female), `skinToneId`, `hairStyleId`, `hairColorId`, `faceId`, `topItemId`, `bottomItemId`, `shoesItemId`, `accessoryIds[]`.
Dữ liệu nguồn lấy từ account/character/inventory đang có, không tạo item ID song song.

## Render
- Lớp vẽ: tóc sau → thân/đầu → chân → áo/quần → tay → giày → tóc trước → phụ kiện/hiệu ứng.
- Hoạt ảnh 4 hướng `front/back/left/right`; trạng thái `idle/walk/sit_back/kneel/pray/wave/interact`.
- **Không xoay toàn bộ sprite/đầu theo vector chuột**; chỉ đổi animation clip khi hướng di chuyển thay đổi đáng kể, tránh lắc hướng.
- Chân nhân vật là `world anchor`. Collider nhỏ ở chân; vẽ nhân vật đứng cao hơn anchor.
- Ngồi ghế: trạng thái `sit_back` khóa hướng nhìn về cung thánh; ghế phải có `seatId`, `approachPoint`, `seatAnchor`, `facing`, `occupancy`.

## UI Avatar Studio
- Nam/Nữ, màu da, tóc, preview trước/sau/trái/phải, thử outfit, tủ đồ có phân loại và bộ lọc.
- Mặc thử không trừ Xu; mua chỉ khi backend xác nhận transaction, và không có item trùng do bấm nhanh.
- Chuyển male/female không xóa item sở hữu; không cho mặc item không có quyền, hiện thông báo không tương thích nếu cần.
- `Salvar/Hoàn tất` cập nhật ngay avatar ở scene hiện tại, mini-map, cửa hàng và LIVE avatar nếu liên quan.

## Camera & scale
- Dùng scale nhân vật có giới hạn theo vùng Y/độ sâu, tránh phóng to mặt khi gần camera quá mức; NPC/player cùng quy tắc.
- Mặt không bị xoay 360 độ; tóc và trang phục không cắt qua nhau; palette đồng nhất.

## API kiến nghị (đối chiếu repo, không bắt buộc giữ đường dẫn)
- `GET /api/me/appearance`
- `PATCH /api/me/appearance` xác thực item ownership
- `GET /api/me/inventory`
- `POST /api/shop/purchase` idempotency key, atomic Xu deduction + item grant

## Test
Nam/nữ, 3 màu da, các hướng, 7 animation, thay outfit giữa chừng, reload, đổi scene, reconnect, 2 tab mua cùng vật phẩm, thiết bị mobile.

# Thêm trang phục và atlas

Catalog hiện tại vẫn dùng màu/palette SVG, mọi món cũ tiếp tục hoạt động. Atlas là lớp ảnh trang phục đặt trên rig mặc định; dùng PNG/WebP trong suốt, không cần vẽ lại cơ thể. Outfit không đổi collider hoặc ghế.

## Quy trình Admin

1. Shop & tủ đồ → Thêm trang phục; đặt ID ổn định, slot, giá Xu, màu fallback, icon và dáng tương thích.
2. Chọn file PNG/WebP ≤2MiB, ≤2048×2048. **Tải ảnh và lấy URL** giải mã/chuẩn hóa thành WebP; ghi lại URL hash và kích thước trả về. Không SVG, URL ngoài hay đường dẫn tùy ý.
3. Nếu dùng atlas, điền JSON `assets` gồm `male`/`female` theo dáng được chọn. Upload atlas trước; sau khi điền JSON có thể upload thumbnail riêng (lần tải ảnh cuối được dùng làm thumbnail).
4. Xem thử dáng, hướng và tư thế. Lưu draft có reason; Editor không publish. Admin kiểm tra và publish bản draft đúng version. Mở game đang chạy để xem món mới hiện trong Shop qua WS, không reload.
5. Archive để ngừng bán, không xóa ID/asset đã có người mua. Đổi slot hoặc ID phải tạo món mới. Đổi dáng không tương thích chỉ thay outfit về mặc định, vẫn giữ đồ trong inventory.

## Contract atlas đang hỗ trợ

Mỗi tile **120×185 px**, origin chân rig quanh `(60,175)`. Atlas ghép tile theo hàng, `width % 120 = 0`, `height % 185 = 0`. Index frame bắt đầu 0, trái sang phải rồi xuống hàng. Mỗi pose/hướng có 1 hoặc 2 frame; hai frame luân phiên 0,4 giây/frame. Reduced motion dùng frame đầu.

Bốn hướng: `up`, `down`, `left`, `right`.

17 pose: `idle`, `walk`, `sit`, `stand`, `kneel`, `genuflect`, `bow`, `sign_cross`, `pray`, `wave`, `sweep`, `water`, `wipe`, `sing`, `read`, `decorate`, `carry`. Action cũ `cross` ánh xạ `sign_cross`, `clean` ánh xạ `wipe`.

Dạng item tối thiểu (URL chỉ minh họa cấu trúc, phải thay bằng URL upload thật):

```js
const poses = Object.fromEntries(
  ['idle','walk','sit','stand','kneel','genuflect','bow','sign_cross','pray','wave','sweep','water','wipe','sing','read','decorate','carry']
    .map(pose => [pose, {up:[0],down:[1],left:[2],right:[3]}]),
);
const atlas = {
  url: '/uploads/<sha256-64-ký-tự>.webp',
  width: 480, height: 185, frameWidth: 120, frameHeight: 185, poses,
};
const item = {
  id: 'top_an_hoa_01', name: 'Áo An Hòa', slot: 'top', price: 100,
  color: '#7c9cc1', icon: '👕', rigCompatibility: ['male','female'],
  spriteVersion: 1, assets: {male: atlas, female: atlas},
};
```

Ví dụ dùng lại frame để giải thích chỉ mục; asset phát hành phải vẽ tư thế phù hợp, kiểm tra hình trực tiếp. Thiếu pose/hướng, frame vượt kích thước hoặc metadata không khớp ảnh thật sẽ bị server từ chối. `spriteVersion` tăng khi sửa atlas; URL theo hash không bị ghi đè.

Để dùng lại rig SVG, bỏ `assets`/để null và giữ màu fallback. Nếu atlas tải lỗi, body và các lớp palette vẫn hiện. Chưa có editor kéo thả anchor, atlas trên 2 frame/pose hoặc AVIF. `artifacts/online/avatar-pose-matrix.png` là 136 tổ hợp rig thủ tục; `atlas-equipped.png` và `atlas-shop.png` là kiểm thử tích hợp áo atlas.

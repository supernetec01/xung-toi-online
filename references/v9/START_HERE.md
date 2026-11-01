# GIÁO XỨ AN HÒA V9 — BÀN GIAO CODE SỬA GIAO DIỆN NHÀ THỜ

## Mục tiêu
Sửa đúng 3 lỗi nhìn thấy trong hình người dùng gửi:
1. **Ghế chồng lên nhau / bị nghiêng và sai hướng**: chỉ có 4 hàng bên trái + 4 hàng bên phải, phối cảnh thu nhỏ dần về phía bàn thờ, không thêm ghế vào lối đi chính.
2. **Đầu nhân vật xoay vòng khi di chuyển**: KHÔNG `rotate(angle)` trên toàn bộ sprite. Chỉ chọn sprite hướng `north/south/east/west`; chuyển animation theo từng hướng, với trạng thái ngồi dùng `sit_back` cố định nhìn về bàn thờ.
3. **Bấm đi liên tiếp mà lệnh bị kẹt**: mỗi lần bấm mới hủy đường cũ và callback cũ, đi theo đích mới ngay; không khóa input cho đến hết animation.

## File nên mở đầu tiên
- `Giao_Xu_An_Hoa_V9_Xem_Thu_Offline.html`: bản demo HTML độc lập, code được nhúng sẵn, có thể mở bằng Chrome.
- `index.html`: HTML nguồn, chạy với web server do dùng ES modules.
- `src/geometry.mjs`: collision, vị trí 8 ghế dài/24 ghế ngồi, A*, movement controller.
- `src/churchScene.mjs`: HTML SVG nhiều lớp cho kiến trúc, sàn, lối đi, ghế, nhân vật.
- `src/app.mjs`: click, chọn ghế, input bàn phím/mobile, V4 adapter.
- `docs/CODEX_MASTER_PROMPT.md`: chỉ thị Codex ghép vào dự án đã có.
- `docs/V4_INTEGRATION.md`: quy tắc tái dùng avatar/quest/chat/shop hiện tại.
- `docs/QA_ACCEPTANCE.md`: test không được bỏ qua.

## Chạy và test
```bash
cd Giao_Xu_An_Hoa_V9_Church_Fix
python -m http.server 8000
# Truy cập http://localhost:8000
node --test tests/*.test.mjs
```
Hoặc mở file `Giao_Xu_An_Hoa_V9_Xem_Thu_Offline.html` trực tiếp.

## Ranh giới triển khai
- Đây là bản demo được làm để chuyển thành code trong V4/V8, không tự nhận là đã sửa source V4 đang có trên máy người dùng.
- Không làm lại backend tài khoản, ví Xu, Shop, chat, NPC, Quest, admin hoặc TikTok LIVE.
- `assets/architecture_center.webp` chỉ là phần kiến trúc ở xa cắt từ hình đã duyệt. Ghế/sàn/NPC/player là lớp riêng. Khi làm thương mại, tiếp tục tách kiến trúc thành asset/mesh tối ưu và xóa toàn bộ HUD gắn trong hình nguồn.
- Chưa có kết nối thanh toán và không làm thay đổi quyền vé Noel.

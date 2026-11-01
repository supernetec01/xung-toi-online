# Nhà thờ, chuyển động và camera — bản sửa 01/11/2026

- Nhà thờ chuyển sang mặt sàn nhìn từ trên/chếch xuống, lối đi trung tâm, hai dãy ghế, cửa vào và khu cung thánh tách riêng. Geometry va chạm dùng cùng tọa độ với bố cục ghế; cung thánh chặn đi vào. Bản đồ lớn hơn viewport để đi sâu, camera theo người chơi cả ngang/dọc trên desktop và mobile.
- Thay việc đổi vị trí từng đoạn + CSS transition 550ms bằng requestAnimationFrame, tốc độ theo khoảng cách pixel. Click đổi hướng hủy đường cũ và tiếp tục từ vị trí đang đi; phản hồi HTTP cũ không kéo nhân vật ngược lại. Đường thẳng thông thoáng không cần chạy BFS toàn lưới.
- Rig nam/nữ có đầu tròn lớn hơn, mắt sáng/má hồng và thân bo tròn; giữ slot/outfit, bốn hướng và atlas 120×185 cũ.
- NPC cư dân ở nave chỉ xuất hiện khi có chỗ ngồi, không đi vòng quanh hay tụ tập ở cửa/lối giữa. Mỗi NPC một ghế, loại ghế có lease người thật, nhường ngay khi người chơi ngồi. Hai NPC giao nhiệm vụ đứng tại vị trí cố định cạnh cung thánh, không tham gia quần thể đi lang thang. Nhãn cư dân chỉ hiện khi trỏ vào để giảm rối mắt.

Migration `006_nave_layout.sql` xuất bản phiên bản catalog mới, giữ NPC/hotspot tùy biến. Không xóa hoặc thay ví, inventory, claimed quest, accepted quest snapshots. Fresh database dùng geometry mới ngay từ seed. Không sửa migration cũ.

## Kiểm chứng

`tests/world-upgrade.cjs`: đường đi hợp lệ, chặn cung thánh/ghế, NPC ngồi riêng, nhường ghế, click/keyboard di chuyển liên tục, camera hai trục và ảnh game online có NPC thật từ WS. Hồi quy online tại `artifacts/world-upgrade/online-regression.txt` (11 nhiệm vụ), local tại `regression.txt`.

Ảnh trong `artifacts/world-upgrade`: `church-entrance.png`, `church-walk.png`, `church-mobile.png`, `church-residents.png`, `chibi-characters.png`.

Đây vẫn là renderer SVG 2D; chưa chuyển thành engine 3D hoặc map tile biên tập thủ công. Chưa nghiệm thu trên điện thoại/Windows thật. Nếu rollback bố cục, cần dùng source renderer tương ứng với catalog geometry; không down migration hoặc restore DB cũ đè dữ liệu mới.

## Cập nhật trên máy đang chạy

Dừng Node bằng Ctrl+C, giữ Docker chạy rồi:

```powershell
git pull --ff-only origin main
npm.cmd run db:migrate
npm.cmd start
```

Tải lại trang bằng Ctrl+F5. Dữ liệu người chơi giữ nguyên. Nếu server đã dừng cả Docker, chạy `npm.cmd run db:start` trước migrate.

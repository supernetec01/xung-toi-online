# Quảng trường Noel — Đêm sao An Hòa

Ngày 02/11/2026, múi giờ Việt Nam. Thiết kế lại riêng khu `christmas`, tiếp tục dùng renderer, tài khoản, shop, NPC và nhiệm vụ hiện có.

## Thiết kế thực hiện

Tông xanh đêm, vàng nến, xanh thông và đỏ rượu; nhà thờ Pháp–Việt sáng đèn phía xa. Cây thông bên trái và hang đá bên phải tạo hai điểm nhấn; quảng trường lát đá với ngôi sao ở giữa chừa không gian cho nhân vật. Hai quầy Noel và cột đèn bổ sung cảm giác lễ hội, không đặt hàng loạt NPC vào artwork.

Đã thử tìm ý tưởng trên Google theo yêu cầu, nhưng proxy môi trường trả **403 CONNECT denied**. Vì vậy không có kết quả Google được dùng hay trích dẫn. Các ý tưởng dựa trên mô-típ phổ biến của chợ Noel/quảng trường nhà thờ và artwork gốc tạo cho dự án. Không tải ảnh từ Google làm nền game.

## Những phần tách riêng

- Kiến trúc và mặt đất là hai lớp SVG lấy từ artwork không có người, cây thông, hang đá hoặc quầy dựng sẵn.
- Bảy prop độc lập: hai quầy Noel, cây thông, hang đá, cụm quà và hai cột đèn. Mỗi prop có footprint va chạm và độ sâu riêng; NPC/avatar có thể đi phía trước hoặc bị che phía sau.
- Dây đèn là SVG riêng, chỉ animate opacity bằng CSS; tắt khi chọn giảm chuyển động.
- Click trực tiếp cây thông/quà/hang đá đi qua dịch vụ tương tác đang có. Quầy Noel mở menu hoạt động Noel. Biểu tượng nhiệm vụ vẫn có nhãn truy cập bàn phím.
- Camera desktop chừa thêm phần kiến trúc. Mobile tiếp tục theo nhân vật, lệch nhẹ khung nhìn về đồ vật khi đi sang hai bên; tọa độ va chạm luôn theo world, không theo viewport.
- Giữ nguyên ba ID `star`, `tree`, `gifts`, nhiệm vụ `q_noel`, hoạt động `noel`, NPC `child`/`lucia`, 11 cảnh và key save cũ. Không đổi phần thưởng, giá Shop hay quyền tài khoản.
- Asset WebP tổng **914.518 byte**; atlas được tách thành từng prop có alpha. Quầy trùng dùng cùng file. [Manifest và checksum](../artifacts/christmas/artwork-manifest.json).

## Kiểm thử và ảnh thực tế

`test:christmas` kiểm tra 51 điều kiện: floor/collider, đường vòng cây thông, target/NPC reachable, 5 viewport, bấm đồ vật thật, ba bước nhiệm vụ, reload offline/online, menu hoạt động, thoát map, giảm chuyển động, lỗi tải ảnh, SQL migration và rollback. [Kết quả](../artifacts/christmas/results.json), [log](../artifacts/christmas/test.txt).

Các suite cũ chạy lại trên database QC riêng: `npm test`, `test:online`, `test:v8`, `test:v9`, `format:check`, `audit:m0`. Log nằm trong `artifacts/christmas/`. CI đã thêm `test:christmas` và upload ảnh/log mới; việc thêm workflow không tự chứng minh GitHub Actions đã chạy.

Ảnh từ game đang chạy, có nhân vật/HUD và tương tác:

| Khung | Trước | Sau |
| --- | --- | --- |
| Desktop 1366×768 | [Ảnh cũ](../artifacts/christmas/before-1366.jpg) | [Ảnh mới](../artifacts/christmas/after-1366.jpg) |
| Mobile 390×844 | [Ảnh cũ](../artifacts/christmas/before-390.jpg) | [Ảnh mới](../artifacts/christmas/after-390.jpg) |

Ảnh bổ sung: [desktop 1920](../artifacts/christmas/after-1920.jpg), [mobile 375](../artifacts/christmas/after-375.jpg), [landscape](../artifacts/christmas/after-844.jpg), [camera khi tới hang đá](../artifacts/christmas/mobile-nativity.jpg), [online đã trang trí](../artifacts/christmas/online-decorated.jpg).

Chưa nghiệm thu trên điện thoại vật lý, Safari/iOS hoặc cấu hình yếu. Đây là nâng cấp map; không thay thế quyết định NO-GO production của đợt QC trước về payment/HTTPS/LIVE thật. Chủ dự án vẫn cần đánh giá thẩm mỹ từ ảnh/game mới.

## Cập nhật

Migration mới **010** chỉ xuất bản geometry/art/anchor của quảng trường vào catalog và đổi anchor hoạt động Noel; không sửa migration 001–009, không ghi bảng player state, wallet, inventory hoặc ledger. Nhãn/tên CMS và các scene khác được giữ. Tài khoản đang ở vị trí mới bị collider chiếm sẽ được client tìm vị trí hợp lệ khi tải lại như cơ chế recovery hiện có.

Trước khi áp dụng trong workspace đã sao lưu riêng và thử restore vào database tạm thành công. Không commit backup/credential. Khi áp dụng migration vào bản demo gốc, đã đối chiếu fingerprint toàn bộ account, player state, wallet và ledger trước/sau: không thay đổi; 10 scene khác, item, quest và NPC cũng giữ nguyên. [Bằng chứng](../artifacts/christmas/data-preservation.json), [restore drill](../artifacts/christmas/backup-restore.txt).

Dừng app cũ bằng Ctrl+C, rồi trong PowerShell:

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:migrate
npm.cmd start
```

Mở `http://localhost:5001`, tải lại trang rồi vào **Quảng trường Giáng sinh** qua Bản đồ hoặc Noel & album. Startup cũng kiểm tra migration. Giữ `.local/`, database và khóa mã hóa hiện tại.

Chạy lại riêng bằng runner QC đã cấu hình: `node qa/tools/env.cjs run npm.cmd run test:christmas` (Linux dùng `npm`). Xem [qa/README.md](../qa/README.md); không chạy các suite có tạo tài khoản trên DB người chơi.

## Rollback riêng quảng trường

Không restore database cũ đè lên dữ liệu mới. Có thể xuất bản lại layout trước, giữ tiến độ trang trí/quest/wallet:

```powershell
node scripts/christmas-layout.cjs previous
node scripts/christmas-layout.cjs previous --apply
```

Lệnh đầu là dry-run, kiểm tra target reachable; lệnh thứ hai tạo publication mới. Restart app và tải lại trang. Muốn bật lại cảnh đêm: thay `previous` bằng `night`. Nếu có NPC/anchor tùy chỉnh không hợp lệ, CLI từ chối để operator rà soát thay vì tự sửa/xóa nội dung đó. Cơ chế này không đảo version schema và không chạy lại migration cũ.

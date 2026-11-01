# 06 — TIKTOK LIVE GUEST, 1 BÌNH LUẬN = 1 LƯỢT XUẤT HIỆN

## Nguyên tắc

Bình luận có từ khóa trong live của chủ game -> event -> `LIVE_GUEST` tạm thời có tên hiển thị TikTok đã lọc -> xuất hiện tại **khu vực được admin chọn** -> **một** animation (vẫy tay, tưới cây, treo món đồ trang trí, gói quà) -> tự rời cảnh. **Không cần tài khoản**, không điều khiển di chuyển, không có Xu, túi đồ, chat, quyền lợi game, không thể chiếm ghế người thật hay đi vào cung thánh. Muốn chơi đầy đủ -> đăng ký website. Không tự linking identity TikTok sang account game.

## Điều kiện kỹ thuật

Tính đến ngày lập đặc tả, không được mặc định TikTok công khai API nhận bình luận LIVE cho mọi tài khoản; TikTok Interactive Games partner là chương trình cần tiếp cận/đăng ký, tài liệu công khai nhấn mạnh cơ chế quà tặng, không bảo đảm quyền đọc bình luận của người dùng này. Thiết kế `LiveEventProvider` interface với `MockLiveProvider` để chạy ngay, `AuthorizedProvider`/nhà cung cấp cho phép khi đã xác minh quyền, điều kiện và giới hạn. Không hardcode thông tin đăng nhập TikTok, cookie hay giải pháp vượt giới hạn vào source.

## UI Studio Admin

`/admin/live` gồm: trạng thái nguồn live (connected, reconnecting, unavailable), nút test simulator, control start/stop, chọn duy nhất một event + keyword (`VÀO`, `NOEL`, `HOA`, `QUÀ`), cảnh hiển thị, vị trí spawn, `maxVisibleGuests`, `queueMax`, `guestLifeSec`, `perViewerCooldownSec`, moderation switch, toggle public name, camera crop preview 9:16, forced end/kill switch. Có preset `quiet church` không dùng animation sôi nổi tại khu vực bàn thờ.

## Luồng event server-side

1. Provider nhận `comment` và chứng thực nguồn theo cơ chế nhà cung cấp; raw payload untrusted.
2. Adapter chuyển thành `{provider,eventId,sessionId,viewerKey,publicDisplayName,text,receivedAt}`.
3. Reject nếu không active live, keyword không đúng, người xem đã có lượt trong cooldown, spam, banned name, content không phù hợp hoặc duplicate `(provider,sessionId,eventId)`.
4. Insert live_event, đặt job vào queue qua transaction/outbox; event được ACK cho provider nếu hỗ trợ, không cấp Xu.
5. Spawn manager lấy slot phù hợp/capacity. Dùng avatar an toàn đã dựng sẵn (random seeded từ viewerKey), label tên TikTok đã chuẩn hóa/ẩn nếu cần; `guest.spawn` WS event.
6. Client animate đúng một lần. Server quản lý lifetime và emits `guest.despawn`; reconnect client snapshot chỉ hiển thị guests vẫn còn sống.
7. Event cộng 1 vào progress campaign **tối đa một lần/event hợp lệ**; nếu người xem bình luận nhiều lần trong cooldown, không nhân progress.

`viewerKey` phải là ID ổn định từ provider khi được cung cấp. Không dùng tên display làm khóa duy nhất; nếu provider không cấp ID ổn định, giữ hạn chế theo session/key nguồn và ghi nhận mức độ chống spam kém hơn; không tự khẳng định biết danh tính người xem.

## Quy tắc hiển thị

- Ban đầu max 20 guest có thể thấy (cấu hình, benchmark), queueMax 100, guestLife 20–30s, cooldown cùng viewer 60s, spawnRate 1–2 nhân vật/s (giá trị đề xuất).
- Tắt/tự bỏ sự kiện quá hạn hoặc đầy queue; không làm game lag khi 100–1000 bình luận dồn; dùng sprite pooling và LOD.
- Kịch bản một buổi LIVE **chỉ có một keyword active**, thay sự kiện thì phải clear/finish queue cũ để không chạy hành động sai.
- LIVE camera 9:16 crop scene sân vườn hoặc khu Noel, giữ “safe area” cho overlay comment native của TikTok.
- Tên công khai có thể chứa từ xúc phạm, số điện thoại, link; lọc, giới hạn ~18 ký tự và cho Admin ẩn ngay.
- Nhân vật guest là loại NPC đại diện người tham gia LIVE, không ngồi vào vị trí của người chơi chính.

## Hợp đồng adapter

```ts
interface LiveEventProvider {
  connect(config: ProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  onComment(callback: (event: NormalizedLiveComment) => void): () => void;
  health(): Promise<{connected:boolean; provider:string; lastEventAt?:string}>;
}
interface NormalizedLiveComment {
  provider: string; sessionId: string; eventId: string;
  viewerKey: string | null; displayName: string;
  text: string; receivedAt: string;
}
```

`MockLiveProvider` có giao diện `simulate({text,displayName,viewerKey})` chỉ được gọi trong DEV/STAGING/admin test; endpoint mock production phải disabled để người lạ không tự spam avatar.

## Bảo mật và kiểm thử

- 100 comment/event song song -> unique event, 1 progress mỗi event id, 0 Xu.
- 1 người spam 30 lần -> 1 guest trong window cooldown; không queue vô tận.
- Tắt LIVE khi 20 guests active -> cleanup; reconnect không phát lại event cũ.
- Event malicious displayName chứa HTML -> text escaped; không tạo script.
- Nếu connector live đứt -> Studio hiển thị rõ, game web vẫn chạy bình thường.
- Không suy đoán mọi tài khoản TikTok đều được phép tích hợp bình luận; validate provider compliance trước production.

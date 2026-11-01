# GIÁO XỨ AN HÒA — MASTER SPEC V2 (Web + Mobile 2D)

**Mục tiêu:** Từ prototype playable HTML/CSS/JS đi kèm, xây game mô phỏng sinh hoạt giáo xứ Công giáo hư cấu với phong cách 2D hoạt hình có chiều sâu, game full màn hình, giao diện tối giản, chơi ngắn, không giật lag, nhiệm vụ NPC và thay trang phục theo từng bộ phận.

**Nguồn sự thật:** `index.html`, `src/data.js` (content IDs), `src/art.js` (2D background/avatar reference), `src/game.js` (prototype gameplay), `docs/content.json` (seed), `docs/schema.sql` (backend reference). Tránh tự phát minh lại danh sách quest/NPC nếu chưa kiểm tra các file này.

## 1. Mục tiêu trải nghiệm

- **Web desktop:** 1280x720, 1440x900 và 1920x1080; scene chiếm toàn màn hình, HUD nổi và chỉ 1 modal ở một thời điểm.
- **Mobile:** touch-first; tối ưu landscape (16:9–20:9), portrait vẫn chơi được bằng vuốt ngang camera và tab dạng bottom sheet. Tính khoảng an toàn notch/gesture bar.
- **Đồ họa:** 2D vẽ tay/SVG hoặc atlas 2D, không dựng mô hình 3D. Chiều sâu bằng tường hậu cảnh, lớp kiến trúc, bàn thờ / đồ đạc, bóng tiếp xúc, sàn phối cảnh, nhân vật thay đổi kích thước theo trục Y, occlusion theo depth layer, màu ánh sáng nhẹ; chuyển cảnh fade. Giữ vật thể giống phong cách kiến trúc trong ảnh nhà thờ mẫu: vòm Gothic trắng cao, bàn thờ ở trục giữa, màu xanh trời của tranh phía sau tượng Chịu Nạn, kính màu hai bên, hai dãy ghế gỗ và lối đi chính giữa.
- **Giao diện:** lúc chơi chỉ có HUD nhân vật + tiền + một mini tracker + dock 7 mục (Bản đồ, Nhiệm vụ, Nhân vật, Shop, Túi đồ, Sự kiện, Khác). **Không bao giờ hiện đồng thời sidebar bản đồ và sidebar quest.** Popup/overlay chỉ mở khi người chơi bấm chức năng.
- **Game loop:** gặp NPC → nhận quest → đi tới điểm hành động → chơi tương tác 1–3 bước → trở lại Nhiệm vụ nhận quà → đổi đồ → mở nhiệm vụ mới. Mỗi quest 20–120 giây, tổng vertical slice 10–20 phút.

## 2. Những gì demo đã chạy được

- Tạo tên + chọn avatar **nam / nữ** và 3 màu da trong tab Nhân vật.
- Avatar SVG chia `<g data-part="legs">`, `arms`, `bottom`, `torso`, `head`, `accessory`; mua, mặc, đổi áo / quần-váy / giày / tóc / phụ kiện ngay lập tức (Shop + Túi đồ); lựa chọn mỹ phẩm chỉ là game.
- 11 khu vực liên kết bằng map/portal; NPC có hộp thoại, dấu chấm than khi có quest khả dụng; click/tap mặt nền để đi.
- 11 quest từ nhiều NPC, 2 mini-game (quiz, tập nhịp) và hoạt động tưới 3 hoa, trả sách, gói quà, trang trí 3 đồ Noel.
- Hệ XP, Xu giáo xứ, Điểm sẻ chia, level và cửa hàng; chỉ nhận quà khi claim; có item đổi bằng Điểm sẻ chia.
- Chế độ giảm animation, lưu offline localStorage, popup tối giản, hỗ trợ desktop/touch.

**Giới hạn hiện tại:** prototype dùng HTML/SVG + CSS positions, không có xác thực, đồng bộ đa thiết bị, mạng nhiều người chơi, pathfinding A*, collision thật, giao diện ngoài đời do họa sĩ vẽ. Một số tương tác di chuyển thẳng tới tọa độ trong khoảng ~590ms; không quảng cáo là đã có các tính năng server. Các bước dưới đây là lộ trình để Codex thực hiện.

## 3. Layout màn hình và mở/đóng tab

### 3.1 Trang chính (mọi popup mặc định tắt)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Ảnh avatar][Tên, Lv, XP] [Tên khu vực]            [🪙 xu] [💚 sẻ chia]  │
│ [📜 NHIỆM VỤ ĐƯỢC GHIM 1/3  >]                                      │
│                                                                          │
│              BACKGROUND 2D CHIỀU SÂU TOÀN MÀN HÌNH                     │
│         [NPC có !]      [Hotspot ghế] [NPC]      [điểm sang cảnh]     │
│                                                                          │
│           [Bản đồ] [Nhiệm vụ] [Nhân vật] [Shop] [Túi] [Noel] [Khác]  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Tối đa một tracker nhiệm vụ ở góc trái, click để vào tab quest.
- Popup `QuestJournal`: 3 tab **Đang làm / Có thể nhận / Đã nhận quà**, bên trong có tiến độ, mục tiêu, nút Nhận, Theo dõi, Nhận quà.
- Popup `Shop`: avatar preview trái (nếu desktop) + nhóm hàng bên phải, tab **Áo / Quần-Váy / Giày / Tóc / Phụ kiện / Quà sẻ chia**, mua rồi đổi ngay sang trang phục mới. Trên mobile chuyển thành preview nhỏ trên cùng + grid 2 cột, scroll modal.
- Popup `Player`: chọn nam/nữ, màu da, xem outfit; nút chuyển sang Túi đồ.
- Popup `Bag`: chỉ item đang sở hữu, bấm Mặc thay ngay; vẫn giữ các trang phục trước.
- Popup `Map`: 11 địa điểm, thông báo vị trí hiện tại; chọn 1 điểm thì đóng popup và chuyển cảnh.
- Popup `Events`: Noel, đi tới quảng trường và gợi ý chuỗi trang trí 3 bước.
- Popup `Settings`: tùy chọn ít chuyển động, hướng dẫn, reset bản demo.
- `Dialogue`: NPC portrait, câu thoại ngắn, tối đa 2–3 nút; không bắt người chơi đọc văn bản quá dài.

### 3.2 Bố cục mobile

- Ưu tiên landscape; portrait hiện cảnh lớn có **camera pan ngang**, không ép cảnh thành bản đồ siêu nhỏ. Tự đưa camera tới người chơi/điểm tương tác.
- Mục tiêu cảm ứng: icon hành động nên >=44×44 CSS px (hiện prototype dùng hotspot 40px; tăng lên >=44px khi production). Dock icon phải bấm được bằng ngón tay.
- Không mở sidebar trên game; cửa sổ mobile dạng bottom sheet với chiều cao tối đa 89dvh; nội dung cuộn **trong popup**, không cuộn toàn trang.
- Scale sprite và gameplay UI độc lập; ánh sáng/hiệu ứng không che nút; hỗ trợ safe area và thao tác trở về.
- Tự động focus camera NPC khi người chơi di chuyển trên portrait; cho vuốt cảnh để khám phá.

## 4. Thế giới 2D và không gian

| scene_id | Khu vực | Đặc trưng | Hotspot và NPC |
|---|---|---|---|
| `courtyard` | Sân giáo xứ | Nhà thờ hai tháp, mặt đường chính, cây, hoa, nước | Lucia, Giuse; nhà thờ, nhà xứ, vườn, lớp, Noel |
| `nave` | Gian chính | Vòm cao trắng, cửa kính màu, tranh xanh, cây thánh giá, bàn thờ, hai dãy ghế, lối giữa | Cha Minh, Sơ Maria; ghế A/B, bàn thờ, ca đoàn, Rửa Tội, Hòa Giải |
| `foyer` | Tiền sảnh | Cửa hai cánh, bảng giờ lễ minh họa, bình nước thánh | Ông Giuse, hai cửa |
| `baptistry` | Khu giếng Rửa Tội | Giếng đá, mặt nước, kính màu | Chị Hạnh, xem giếng, quiz |
| `confession` | Góc Hòa Giải | Cửa gỗ, ánh đèn dịu, chỗ chờ | Xem bài học; không mô phỏng lời xưng tội |
| `classroom` | Lớp giáo lý | Bảng xanh, sách, các dãy bàn | Sơ Maria, Bé An, cuốn sách, câu đố |
| `garden` | Vườn cộng đồng | 3 luống hoa, cây, đường đá | Bà Anna, Bác Phêrô; tưới hoa và trả sách |
| `office` | Nhà xứ | Bàn tiếp khách, tranh, bàn gói quà | Cha Minh, Chị Hương; bàn gói quà |
| `choir` | Phòng ca đoàn | Giá nhạc, phòng tập, bảng nhịp | Anh Gioan; mini-game nhịp |
| `christmas` | Quảng trường Noel | Cây thông, hang đá, sao, đèn | Bé An, Lucia; 3 điểm trang trí |
| `shoproom` | Gian trang phục | Tủ móc áo, gương, bàn quầy | Cô Têrêsa; mở Shop |

**Quy tắc bố trí gian chính:** lối giữa luôn trống để avatar di chuyển; hai dãy ghế gỗ được render theo y-depth. Chỉ xếp NPC giáo dân trong dãy ghế tại các slot hợp lệ. Cung thánh là khu hạn chế di chuyển của avatar; người chơi được chọn hotspot để xem kiến thức từ xa, không chạy qua bàn thờ. Phòng Hòa Giải tôn trọng tính kín đáo.

### 4.1 Kỹ thuật game engine sau khi Codex nâng cấp

- Chọn **Phaser 3 + TypeScript + Vite** cho scene/interactions/animation; **React hoặc Preact** cho HUD/modal; **Zustand** (hoặc store tương đương) cho trạng thái UI; Postgres + API cho tiến độ server nếu có đăng nhập. Với demo nhỏ có thể giữ HTML/SVG nguyên bản.
- Dùng ảnh nền ở 2–4 layer như `background_crypt`, `walls`, `architecture`, `floor`, `foreground` và 1 atlas đối tượng tương tác. Không dùng video background/3D WebGL nặng; Phaser có Canvas/WebGL renderer tùy thiết bị.
- Actor sprite Y-sort theo tọa độ chân: `depth=Math.floor(feetY)`. Sprite scale tuyến tính theo Y/camera nếu dùng góc phối cảnh; **tọa độ va chạm riêng** thay vì dùng kích thước ảnh.
- World model logic dùng `scene_id`, `spawn_point`, `walkable_polygon`, `collision_shapes`, `depth_ranges`, `interaction_hotspots` từ JSON/DB. Không hardcode vị trí trong CSS sau khi chuyển sang Phaser.
- Mỗi scene có `portal_id`, `target_scene_id`, `target_spawn` và vùng kích hoạt. Transition 150–250ms. Khi load một scene chỉ tải ảnh/sprite atlas của cảnh đó và những sprite dùng chung.
- Cần bản đồ collision thực tế (A* grid 32/48px, hitbox ghế và tường), cancel action nếu người chơi chạm điểm khác; NPC không di chuyển vào vùng cấm.

## 5. Sprite nhân vật thay đồ

```text
CharacterRoot
  shadow
  legs: leftLeg,rightLeg
  shoes: leftShoe,rightShoe
  arms: leftArm,rightArm
  bottom: pants OR skirt
  torso: top
  neck
  head: face, eyes, mouth
  hairFront / hairBack
  accessory
  displayName
```

- Profile gồm `gender` (chỉ kiểu avatar chọn trong game), `skin_tone`, `hair_style`, `equipped.top/bottom/shoes/hair/acc`. Không gắn giới tính với quyền mua đồ; mọi trang phục có thể thử trên cả nam và nữ, biến thể quần/váy render theo avatar.
- Mọi outfit phải có anchor thống nhất để không trượt tay/chân, có sprite cho idle/walk/sit/interact. Đề xuất atlas 4 hướng × 4–6 frame/animation; đủ dùng, không cần 60fps sprite sheet cho mỗi bộ áo.
- Ưu tiên **paper-doll layering**: giữ chung bộ chuyển động xương/khung hình, phủ atlas cho top/bottom/hair; không tạo file nhân vật full-body cho mọi tổ hợp (tránh hàng nghìn asset/chi phí RAM).
- Cấu trúc hiện tại trong `src/art.js` đã minh họa bằng 6 `<g data-part>`; Codex cần biến chúng thành sprite renderer / composition module có slot names rõ ràng và thay đồ không reload scene.

## 6. NPC và hành vi đơn giản

| npc_id | Vai trò | Khi click | Nhiệm vụ liên quan |
|---|---|---|---|
| lucia | Tình nguyện viên hướng dẫn | chào người mới, gợi ý khám phá | q_welcome |
| guard | Người đón tiếp | giải thích đường đi | q_pew gián tiếp |
| father | Cha xứ | lời chào, giới thiệu giáo xứ | q_father |
| sister | Giáo lý viên | giới thiệu lớp và giữ trật tự | q_class, q_confession |
| catechist | Hướng dẫn khu Rửa Tội | giới thiệu biểu tượng nước | q_baptism |
| anna | Cư dân lớn tuổi | nhờ tìm sách / nhận sách | q_book |
| gardener | Người chăm vườn | hướng dẫn tưới 3 luống | q_garden |
| volunteer | Người chuẩn bị quà | nhờ sắp 3 món vào hộp | q_gift |
| choirmaster | Ca trưởng | hướng dẫn trò chơi nhịp | q_choir |
| child | Bạn nhỏ giáo xứ | mời trang trí Noel | q_noel |
| shopkeeper | Chủ gian trang phục | mở tab Shop | Shop |

**NPC trạng thái:** `idle`, `available_quest`, `waiting_objective`, `quest_ready`, `conversation_open`, `cooldown`. Marker `!` chỉ khi người chơi đã đủ điều kiện nhận việc, `✓` khi quest đủ điều kiện nhận quà. Ưu tiên 1–2 câu ngắn, tối đa 2 lựa chọn. Mọi animation lời thoại có thể bỏ qua.

## 7. Nhiệm vụ chính — chỉ những việc đơn giản có phản hồi ngay

| quest_id | Nhiệm vụ | Sự kiện phải ghi nhận | Quà XP / Xu / Sẻ chia |
|---|---|---|---|
| q_welcome | Chào Lucia | talk_lucia | 80 / 70 / 0 |
| q_pew | Đến nhà thờ, chọn ghế | enter_nave + sit_pew | 100 / 35 / 0 |
| q_father | Gặp cha xứ | talk_father | 70 / 35 / 0 |
| q_baptism | Học về Rửa Tội | learn_baptism + quiz_baptism | 110 / 35 / 0 |
| q_confession | Học về Hòa Giải | learn_confession | 60 / 20 / 0 |
| q_book | Nhặt sách, trả bà Anna | pickup_book + return_book | 95 / 35 / 45 |
| q_garden | Tưới 3 luống hoa khác nhau | water_flower ×3 (unique object ID) | 100 / 30 / 35 |
| q_choir | Bấm đúng 3 nhịp | complete_rhythm | 85 / 40 / 10 |
| q_gift | Xếp đủ vở, khăn, thiệp | complete_gift | 100 / 40 / 40 |
| q_noel | Trang trí sao, cây, hộp quà | decorate ×3 (unique object ID) | 130 / 65 / 35 |
| q_class | Câu đố giữ trật tự | quiz_class | 65 / 25 / 0 |

**Luật XP và quà:** quest chỉ tăng tiến độ khi đã `accepted`; mỗi `object_id` unique chỉ ghi 1 lần; chỉ cấp thưởng khi nhấn **Nhận quà**, chuyển `status=claimed` trong cùng transaction backend; không cho spam NPC/đi lại vô hạn để kiếm coin. Riêng thao tác có trạng thái bền như tưới hoa/sách, khi nhận nhiệm vụ muộn hãy đối chiếu state sẵn có để không khiến player bị kẹt.

**Mở khóa**: `q_welcome` khởi tạo sẵn; `q_pew`, `q_father`, `q_garden`, `q_book`, `q_noel`, `q_class` mở khi claim `q_welcome`; `q_baptism`, `q_confession`, `q_choir` mở khi claim `q_pew`; `q_gift` mở khi claim `q_father`.

**Daily (chỉ khi mở rộng):** phát tối đa 3 quest/ngày và reset theo mốc server đã định, không reset các nhiệm vụ cốt truyện. Không thưởng tích lũy cho các bí tích, số giờ cầu nguyện hay hành động thiêng liêng.

## 8. Tiền tệ và quà

- **XP:** thăng level, mở hàng theo level, không mua bằng tiền thật.
- **Xu giáo xứ:** tiền giả trong game, mua quần áo, giày, tóc, phụ kiện.
- **Điểm sẻ chia:** nhận khi hoàn thành việc tốt trong thế giới giả lập (tưới hoa, mang sách, gói quà, giúp trang trí); đổi trang phục hoặc phụ kiện biểu tượng trong tab `Quà sẻ chia`. Không thể hiện công đức, mức độ đạo đức hay ơn thiêng của người chơi.
- Tất cả giao dịch thuần game, không kết nối ví điện tử/thanh toán và không bán bí tích, lời cầu nguyện, xưng tội, chức vụ tu sĩ hoặc quyền rước lễ.
- `wallet_transactions` kiểm soát cộng/trừ trong backend, gồm `idempotency_key` duy nhất, không tin dữ liệu gửi lên từ frontend.

## 9. Sự kiện Noel

- Bản demo mở sẵn quảng trường Noel cho mọi người chơi thử; 3 hotspot `star`, `tree`, `gifts`, hoàn thành từng cái sẽ đổi icon/trạng thái vật thể và ghi `decorate` duy nhất theo `object_id`.
- Bản production có thể dùng `event_definitions(active_from, active_to)` để trang trí bản đồ theo mùa, nhưng không khóa nhiệm vụ cốt truyện khi hết Noel. Ngày lễ là dữ liệu cấu hình, không hardcode trong game engine.
- Mini game nội dung: thu gom ngôi sao, xếp hoa, gói quà, tập ca đoàn; mỗi trò chơi có 3–5 thao tác tối đa; không cần cơ chế gacha hoặc trả phí ngẫu nhiên.

## 10. DB/API, lưu trữ và an toàn dữ liệu

- Dùng `docs/schema.sql` làm schema khởi đầu: users, profiles, scenes, npc_definitions, quest_definitions, quest_objectives, player_quests, player_objectives, player_event_ledger, wallet_balances, wallet_ledger, items, player_items, player_equipment, world_object_states.
- Frontend chỉ gọi `POST /actions` (server validate scene/quest/action), `POST /quests/:id/accept`, `POST /quests/:id/claim`, `POST /shop/purchase`, `POST /items/equip`, `GET /bootstrap` và `GET /scene/:id`.
- Backend chỉ nhận event allowlist và IDs, không lưu confession text, nội dung cầu nguyện, lịch sử tôn giáo ngoài đời, không suy đoán người dùng Công giáo hay không.
- Phòng tránh lặp: `request_id` UUID unique, `player_event_ledger(user_id,request_id)`, `wallet_ledger(user_id,source_key)` unique. Claim + reward trong một DB transaction, khóa row theo user.
- Khi chưa có backend, prototype lưu localStorage; không quảng cáo đây là lưu trữ an toàn/đồng bộ đa thiết bị. Tạo guest account server chỉ khi bổ sung auth.
- Nếu public, nội dung giáo lý và nghi thức cần được người có chuyên môn Công giáo rà soát trước phát hành.

## 11. Yêu cầu hiệu năng và QA

**Ngân sách mục tiêu (để Codex đo và tối ưu, không phải kết quả đã đạt):** desktop 60fps ở scene đông, mobile 30–60fps, p95 thời gian input → phản hồi đầu tiên dưới 150ms ở máy tầm trung, chi phí render thấp khi bật chế độ tiết kiệm. SVG demo hiện không có remote asset.

- Không load cùng lúc asset của 11 cảnh, chỉ nạp hiện trường + atlas chung và prefetch cảnh kề; WebP cho background, PNG/WebP có alpha cho character atlas.
- Không tạo một DOM node cho mỗi viên gạch hay mỗi frame animation trong production. Sprite texture atlas và tilemap dùng batch rendering; giới hạn particles/đổ bóng.
- Tránh animation layout/reflow, chuyển bằng transform/opacity; giãn thời gian kiểm tra NPC khi ngoài màn hình; gỡ listener và animation khi chuyển scene.
- Hỗ trợ `prefers-reduced-motion` và toggle ít hiệu ứng, âm thanh mặc định tắt hoặc theo policy của trình duyệt, cho phép mute.
- Kiểm thử bắt buộc: onboarding, đổi nam/nữ; 11 scene; dấu !; accepted → objectives → claim một lần; 3 hoa unique; trả sách; quiz; rhythm; gói quà; 3 Noel; mua/mặc từ Shop; túi đồ; mua bằng kindness; lưu/tải lại; mobile landscape/portrait; đóng mở modal liên tục; offline.

## 12. Lộ trình Codex, ưu tiên theo mức độ tạo ra game chơi được

### Giai đoạn 1 — bảo toàn demo và cải thiện cảm giác chơi
1. Chạy demo hiện tại, sửa lỗi runtime nếu có, viết smoke tests.
2. Giữ 11 scene và 11 quest, thêm visual polish vòm nhà thờ/tranh xanh/ghế, animation chuyển cảnh ngắn; không làm UI đông hơn.
3. Thêm sprite step animation, collision/hitbox và pathfinding đơn giản, nhân vật không xuyên ghế/tường. Đảm bảo avatar thay đồ khi đang đứng/đi/ngồi.
4. Camera mobile theo player, gesture pan/zoom có giới hạn, ưu tiên responsive landscape.
5. Kiểm thử quest và mua đồ, ghim quest, reward toast, session restore.

### Giai đoạn 2 — mở rộng bằng content/data
1. Chuyển nội dung data sang JSON / bảng DB, tạo editor quest/NPC cho admin.
2. Thêm server API + auth + transaction bảo đảm không gian lận điểm.
3. Thay SVG placeholder bằng sprite artwork tự thiết kế; xuất atlas và các lớp background.
4. Âm thanh nhẹ tự sáng tác hoặc nguồn được cấp phép; hỗ trợ tùy chọn bật/tắt.
5. Phân tích hiệu năng mobile, cắt animation/texture theo device capability.

### Giai đoạn 3 — chỉ làm khi MVP vững
1. Nhiệm vụ hằng ngày và event Noel theo mùa.
2. NPC có lịch sinh hoạt giả lập; biến thể thời gian ngày/đêm.
3. Multiplayer cùng scene, đồng bộ nhân vật/ghế (không ảnh hưởng nội dung giáo lý).
4. Hệ thống lưu cloud đa thiết bị và anti-cheat cơ bản.

## 13. Tiêu chí chấp nhận khi bàn giao

- Chơi được từ màn hình tạo tài khoản đến **ít nhất 5 quest nhận thưởng** mà không phải chỉnh DB/code thủ công.
- Toàn màn hình không sidebar; popup chỉ hiện sau hành động; đóng popup trả lại scene; không bị mất trạng thái.
- Avatar phải khác biệt nam/nữ; áo, quần/váy, tóc và giày đã mua đổi được bằng slot, không thay bằng màu overlay toàn người.
- Click ghế → nhân vật đi tới ghế và ngồi; ghế có occupied state trong world model để mở rộng multiplayer.
- Dùng deep 2D layers, không biến game thành slideshow ảnh, không dùng 3D nặng.
- Có cơ chế không cấp quà 2 lần; mọi điểm thưởng và điểm trừ item có event/transaction rõ ràng.
- Trên mobile thao tác được bằng ngón tay, có camera pan; modal không tràn ngoài màn hình; không yêu cầu hover.
- Tài liệu kỹ thuật mô tả rõ phần **đã làm thực sự** và phần **cần Codex bổ sung**.

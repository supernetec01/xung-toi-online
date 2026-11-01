# Cài đặt, chạy game và tạo Admin

Game chạy bằng **Node.js 24 + PostgreSQL 16**, cổng **5001**. GitHub lưu source và tài liệu; database, trang phục upload và thông tin Admin được tạo riêng trên mỗi máy, không đi kèm khi clone.

## 1. Chuẩn bị máy

Cài **Git**, **Node.js 24 LTS** (kèm npm 11) và **Docker**. Nguồn chính thức:

- Node.js: https://nodejs.org/en/download — chọn phiên bản 24 LTS.
- Git: https://git-scm.com/downloads
- Docker Desktop Windows/macOS: https://www.docker.com/products/docker-desktop/
- Docker Engine Ubuntu: https://docs.docker.com/engine/install/ubuntu/

**Windows:** dùng Ubuntu trong WSL2 và bật Docker Desktop → Settings → Resources → WSL Integration → Ubuntu. Nếu chưa có WSL, mở PowerShell với quyền Administrator và chạy:

```powershell
wsl --install -d Ubuntu
```

Khởi động lại khi Windows yêu cầu, mở **Ubuntu Terminal**, cài Git/Node.js **bên trong Ubuntu** theo hướng dẫn Linux trên trang Node.js. Lưu repo trong thư mục home Ubuntu, ví dụ `~/xung-toi-online`, để PostgreSQL dùng filesystem Linux. Docker Desktop phải đang chạy với Linux containers. Không chạy bộ lệnh Bash bên dưới trong CMD.

**Ubuntu/Linux:** Docker Engine phải đang chạy và tài khoản terminal có quyền dùng Docker. **macOS:** mở Docker Desktop trước khi chạy lệnh. Các script trên máy cá nhân dùng Docker context đang chọn; trong cloud Codex dùng daemon local riêng.

Kiểm tra trong terminal sẽ dùng để chạy game:

```sh
node --version
npm --version
git --version
docker info
```

Node phải là `v24.x`, npm `11.x` trở lên. Nếu dùng nvm đã cài, có thể chọn Node bằng `nvm install 24` rồi `nvm use 24`.

## 2. Tải source và cài đặt lần đầu

```sh
git clone --branch main https://github.com/supernetec01/xung-toi-online.git
cd xung-toi-online
npm ci
npm run db:start
npm run db:migrate
npm run admin:bootstrap
npm start
```

Nếu repo riêng tư, đăng nhập GitHub bằng phương thức Git chính thức trên máy của bạn khi clone yêu cầu. `db:start` tải image PostgreSQL lần đầu, tự tạo `.local/pgdata`, cấu hình mật khẩu DB riêng và chờ DB sẵn sàng. Giữ terminal `npm start` mở.

Mở trình duyệt trên **máy của bạn**:

- Game: `http://localhost:5001`
- Đăng ký/đăng nhập người chơi: `http://localhost:5001/account`
- Admin: `http://localhost:5001/admin`

Kiểm tra từ terminal khác:

```sh
curl http://localhost:5001/healthz
```

Kết quả có `"status":"ok"` và `"mode":"online-demo"`. Cài đặt này là chế độ development; không đặt `NODE_ENV=production` khi làm theo hướng dẫn local.

## 3. Đăng nhập Super Admin đầu tiên

`npm run admin:bootstrap` tạo Super Admin đầu tiên, mặc định tên đăng nhập **`operator`**, mật khẩu ngẫu nhiên, bắt buộc MFA. Mở file **`.local/operator.json`** bằng editor, ví dụ trong Ubuntu:

```sh
nano .local/operator.json
```

Đọc ba trường:

- `login`: tên đăng nhập.
- `password`: mật khẩu ban đầu.
- `totpSecret`: khóa thêm vào Google Authenticator, Microsoft Authenticator hoặc ứng dụng TOTP tương thích.

Trong ứng dụng Authenticator chọn **thêm thủ công bằng khóa**, nhập `totpSecret`, chọn mã **theo thời gian / TOTP**. Vào `http://localhost:5001/admin`, nhập `login`, `password` và mã **6 số đang hiện trong ứng dụng**. Khóa `totpSecret` không phải mã 6 số.

Nếu dùng nano, `Ctrl+X` để thoát; không cần sửa file. Không đưa file này lên Git hoặc gửi ảnh chứa mật khẩu/khóa MFA. Sau khi đăng nhập có thể đổi mật khẩu tại `/account`; file operator giữ thông tin ban đầu và không tự cập nhật mật khẩu sau khi đổi.

Chạy lại `admin:bootstrap` **không reset mật khẩu, không tạo thêm Admin** và không tự nâng quyền. Muốn chọn login khác, chỉ ở lần khởi tạo đầu tiên:

```sh
ADMIN_BOOTSTRAP_LOGIN=admin npm run admin:bootstrap
```

Muốn cấp quyền cho người khác: người đó tạo tài khoản ở `/account` → bật MFA ở trang tài khoản → Super Admin vào **Người chơi → Chi tiết → Quyền**, đăng nhập Admin bằng MFA trong vòng 5 phút gần nhất, cấp role có lý do. Người được cấp quyền đăng nhập lại vì phiên cũ bị thu hồi.

## 4. Chạy lần sau và cập nhật code

```sh
cd xung-toi-online
npm run db:start
npm start
```

`Ctrl+C` ở terminal game để dừng Node. Không xóa `.local/`; PostgreSQL giữ tài khoản và tiến độ khi Node dừng. Trước cập nhật:

```sh
# Sau khi dừng npm start bằng Ctrl+C:
npm run db:backup
git pull --ff-only origin main
npm ci
npm run db:migrate
npm start
```

Database mặc định dùng `127.0.0.1:55432`; game luôn dùng **5001**. Không chạy hai bản `npm start` cùng lúc. Nếu cần nhiều checkout trên cùng máy, đặt tên container/port DB riêng **trước lần `db:start` đầu tiên**:

```sh
ANHOA_DB_CONTAINER=anhoa-postgres-other ANHOA_DB_PORT=55433 npm run db:start
```

Cấu hình đã có trong `.local/database.json` được giữ nguyên ở các lần chạy sau.

## 5. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `DOCKER_NOT_READY` / không kết nối Docker daemon | Mở Docker Desktop hoặc khởi động Docker Engine; trên Windows bật WSL Integration cho đúng Ubuntu |
| Node không phải 24 / thiếu npm | Cài/chọn Node 24 trong chính terminal đang chạy, đặc biệt với WSL |
| Port `55432` bị chiếm / `CONTAINER_IN_USE` | Kiểm tra bản PostgreSQL/checkouts đang chạy. Không xóa dữ liệu cũ. Clone mới có thể chọn port/container riêng như trên |
| `ENOENT .local/database.json` | Chạy `npm run db:start` trước migrate/bootstrap; nếu dùng PostgreSQL ngoài thì cấp `DATABASE_URL` |
| `EADDRINUSE` trên `5001` | Đóng terminal game đang chạy hoặc dừng đúng process đó; giữ cổng game 5001 |
| `MFA_CODE_USED` | Đợi ứng dụng đổi sang mã 6 số mới; không dùng lại mã đã xác thực |
| `MFA_REQUIRED` khi cấp quyền/điều chỉnh Xu | Đăng xuất, đăng nhập Admin lại bằng mã MFA mới rồi thực hiện trong vòng 5 phút |
| Mã MFA sai | Kiểm tra đúng khóa/tài khoản và bật đồng bộ giờ tự động trên điện thoại/máy tính |
| Đăng nhập sau khi đổi mật khẩu bằng file operator thất bại | Dùng mật khẩu mới đã đổi; file operator không tự thay theo mật khẩu mới |
| Dùng domain/port forwarding và gặp `ORIGIN_FORBIDDEN` | Chạy với `PUBLIC_ORIGIN` là đúng origin được mở trong trình duyệt, ví dụ `PUBLIC_ORIGIN=https://game.example.com npm start` |

Các script đọc biến môi trường của process, **không tự nạp `.env`**. Muốn dùng PostgreSQL bên ngoài, đặt `DATABASE_URL` cho các lệnh migrate/bootstrap/start, bỏ bước tạo DB Docker. Production cần cấu hình riêng theo README, không thuộc quy trình local này.

## 6. Backup và kiểm thử

```sh
npm run db:backup
npm run db:restore-drill
npm run verify
npm run format:check
```

Backup nằm trong `.local/backups`, chứa dump, khóa MFA, uploads và cấu hình private. `restore-drill` dùng DB tạm để kiểm tra, không đè DB chính. Để chuyển **dữ liệu demo hiện tại từ cloud sang máy bạn**, cần chuyển backup riêng qua kênh lưu trữ của bạn; `git clone` chỉ lấy code. Xem `MIGRATION_PLAN.md`.

Kiểm thử đầy đủ dùng DB demo/test, server 5001 đang chạy và Chromium:

```sh
npx playwright install chromium
npm test
npm run test:online
```

Nếu có Chromium hệ thống trên Linux: `CHROMIUM_PATH=/usr/bin/chromium npm test`. Kiểm tra cài đặt mới bằng container/thư mục tạm riêng: `npm run test:install` (Linux/macOS có Docker). Quy trình cài đặt sạch, đăng nhập Super Admin/MFA và backup/restore đã được chạy ở Linux cloud; Windows/macOS chưa được kiểm thử trên thiết bị thật.

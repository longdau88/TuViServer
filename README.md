# TuVi Node.js Project

Cấu trúc dự án Node.js cơ bản với Express và MySQL.

## Chạy dự án

1. Cài đặt dependencies:
   ```bash
   npm install
   ```
2. Chạy chế độ phát triển:
   ```bash
   npm run dev
   ```
3. Chạy production:
   ```bash
   npm start
   ```

## Cấu trúc thư mục

- `src/`
  - `src/index.js` - điểm vào ứng dụng
  - `src/app.js` - cấu hình Express
  - `src/routes/` - định tuyến
  - `src/controllers/` - controller
  - `src/config/` - cấu hình kết nối DB

## Biến môi trường

Sử dụng `.env` để cấu hình cổng, MySQL, Redis và rate limit. Xem mẫu tại `.env.example`.

### ImgBB (avatar)

Ảnh avatar được upload lên [ImgBB](https://api.imgbb.com/) và lưu URL vào `users.avatar_url`.

Trong `.env`:
```env
IMGBB_API_KEY=your_api_key
```

API create/update vẫn chấp nhận `avatar_base64` (data URL hoặc base64 thuần) hoặc `avatar_url` (URL ảnh). Server sẽ upload lên ImgBB và lưu URL trả về.

### Redis & cache (khuyến nghị production)

1. Chạy Redis local: `docker compose up -d redis`
2. Trong `.env`: `REDIS_ENABLED=true`, `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`
3. API đọc nặng (`check-device`, `la-so-tu-vi`) được cache; create/update tự xóa cache.

Nếu Redis không chạy, server vẫn hoạt động (fallback MySQL), chỉ mất lớp cache và rate limit phân tán.

### Chịu tải cao (nhiều user cùng lúc)

- **Redis**: cache response + rate limit đồng bộ giữa nhiều instance Node.
- **DB pool**: tăng `DB_POOL_SIZE` (mặc định 25), không vượt quá giới hạn MySQL host.
- **Rate limit**: `RATE_LIMIT_MAX`, `RATE_LIMIT_HEAVY_MAX` — tránh làm sập DB khi traffic spike.
- **Scale ngang**: chạy nhiều process Node (PM2 cluster / nhiều container) phía sau reverse proxy (Nginx), cùng một Redis và MySQL.
- **CDN / static**: file `public/` có thể serve từ CDN để giảm tải app server.

## pull code mới nhất từ GitHub về máy chủ Alwaysdata

cd ~/www/TuViServer

để sửa file .env : nano .env

git pull origin main

npm install

Khởi động lại Server (Restart) Web -> Sites.
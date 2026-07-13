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

Sử dụng `.env` để cấu hình cổng và thông tin MySQL.

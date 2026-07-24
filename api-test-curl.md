# Test nhanh API bằng curl

Mặc định ví dụ dùng `http://localhost:3000`.

## 1. Health check

```bash
curl http://localhost:3000/health
```

## 2. Lấy token bằng tài khoản cấu hình trong `.env`

Điền đúng `AUTH_USERNAME` và `AUTH_PASSWORD` của server:

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "YOUR_AUTH_USERNAME",
    "password": "YOUR_AUTH_PASSWORD"
  }'
```

## 3. Lấy web token

API này tiện nhất để test nhanh từ web/Postman:

```bash
curl http://localhost:3000/oauth/web-token
```

Lưu token vào biến shell:

```bash
TOKEN="PASTE_ACCESS_TOKEN_HERE"
```

## 4. Gọi protected route

```bash
curl http://localhost:3000/protected \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Kiểm tra user theo device

```bash
curl "http://localhost:3000/api/user/check-device?device_id=web-test-device-001" \
  -H "Authorization: Bearer $TOKEN"
```

Route cũ vẫn còn hoạt động:

```bash
curl "http://localhost:3000/api/user/check-device_id?device_id=web-test-device-001" \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Tạo user

```bash
curl -X POST http://localhost:3000/api/user/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "birthday": "1990-05-20",
    "birth_time": "14:30",
    "gender": "male",
    "device_id": "web-test-device-001",
    "device_info": "{\"created_from\":\"curl\",\"platform\":\"manual-test\"}",
    "firebase_token": null
  }'
```

Kết quả trả về sẽ có `data.id`. Dùng id đó cho bước tiếp theo.

## 7. Cập nhật user

Ví dụ user vừa tạo có `id = 1`:

```bash
curl -X POST http://localhost:3000/api/user/update-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "full_name": "Nguyễn Văn A cập nhật",
    "email": "nguyenvana@example.com",
    "birthday": "1990-05-20",
    "birth_time": "15:10",
    "gender": "male",
    "device_info": "{\"created_from\":\"curl-update\",\"platform\":\"manual-test\"}",
    "firebase_token": null
  }'
```

## 8. Lấy lá số tử vi

```bash
curl "http://localhost:3000/api/user/la-so-tu-vi?user_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

## Thứ tự test nhanh khuyến nghị

1. `GET /health`
2. `GET /oauth/web-token`
3. Gán token vào biến `TOKEN`
4. `GET /api/user/check-device`
5. `POST /api/user/create`
6. `POST /api/user/update-user`
7. `GET /api/user/la-so-tu-vi`
8. `GET /protected`

## Ghi chú

- Các API dưới `/api/user/*` đều cần header `Authorization: Bearer <token>`.
- `birth_time` nên gửi theo định dạng `HH:mm`, ví dụ `06:15`, `14:30`.
- Nếu test lại nhiều lần với cùng email nhưng khác user, API sẽ báo trùng email.
- Nếu tạo mới thành công trên cùng `device_id`, server hiện đang xử lý theo hướng cập nhật user hiện có của thiết bị đó.

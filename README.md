# KTCNMT • 20/10 Interactive Event & Live Mini-Game Web App

Ứng dụng Micro-Web App tương tác thời gian thực phục vụ sự kiện kỷ niệm **Ngày Phụ nữ Việt Nam (19/10 – 20/10/2026)** của **Phòng Kỹ thuật Công nghệ Môi trường (KTCNMT) – Tổng công ty Cảng hàng không Việt Nam (ACV)**.

---

## 1. Khởi chạy tại Local với Docker (Port `2010`)

```bash
docker compose up -d --build
```

- Ứng dụng chạy tại địa chỉ: **`http://localhost:2010`** (đã đổi sang cổng `2010` tượng trưng cho ngày `20/10` để không trùng với port `3000` của các ứng dụng khác).
- Toàn bộ trạng thái động (Điểm danh RSVP, Đơn trà sữa sáng 20/10, Tường lời chúc, Trạng thái Mini-Game) được lưu tự động tại `./data/state.json` (mount vào `/app/data/state.json` trong container).

---

## 2. Ảnh Avatar Thành Viên (`/public/avatars/{id}.jpg`)

Đã tích hợp bộ ảnh chân dung thực tế của các thành viên vào `public/avatars/` kèm căn chỉnh khung hình khuôn mặt tự động trong [`MemberAvatar.tsx`](./src/components/MemberAvatar.tsx):
- **05 Bạn Nữ:** `quynh-nhu.jpg`, `ngoc-anh.jpg`, `my-dung.jpg`, `quynh-nga.jpg`, `mong-bang.jpg`
- **Anh Em Nam:** `anh-thai.jpg`, `manh-cuong.jpg`, `van-thuan.jpg`, `ba-kien.jpg`, `gia-khang.jpg`, `hai-minh.jpg`
- *(Với `trung-kien.jpg` và `huy-duong.jpg`, bạn có thể thả thêm vào `public/avatars/` bất cứ lúc nào; khi chưa có file ảnh, hệ thống tự động hiển thị Avatar chữ cái viết tắt `TK` và `HD` trên nền Gradient sang trọng).*

---

## 3. Thao tác Chạm 3 Lần (Triple-Tap Reset Ẩn)

- Sau khi chọn Avatar lần đầu, trình duyệt tự động ghi nhớ tài khoản qua `localStorage` (`ktcnmt_user_id`).
- Để đổi người dùng: **Chạm liên tiếp 3 lần trong vòng $\le 800\text{ms}$ vào cụm Avatar + Tên ngắn ở góc trên bên phải thanh Header**.

---

## 4. Hướng dẫn Deploy lên Railway

Dự án đã được cấu hình sẵn [`Dockerfile`](./Dockerfile) (Production Build) và [`railway.json`](./railway.json) tự động nhận biến môi trường `$PORT` của Railway:

### Bước 1: Tạo प्रोजेक्ट mới từ GitHub trên Railway
1. Đăng nhập vào [Railway.app](https://railway.app/).
2. Nhấn **New Project** $\rightarrow$ chọn **Deploy from GitHub repo**.
3. Chọn repository **`vuhuyduong/ktcnmt-events`** $\rightarrow$ nhấn **Deploy Now**.
4. Railway sẽ tự động đọc [`railway.json`](./railway.json) và [`Dockerfile`](./Dockerfile), chạy `npm run build` và khởi động bằng `npm run start` cùng Healthcheck tại `/api/state`.

### Bước 2: Gắn Volume lưu trữ bền vững cho `/app/data` (Khuyến nghị)
Để dữ liệu Điểm danh, Order Trà sữa, Lời chúc và Mini-game không bị mất khi redeploy container trên Railway:
1. Trên giao diện Service của bạn trong Railway, nhấn chuột phải vào canvas (hoặc bấm **+ New** / `Ctrl + K`) $\rightarrow$ chọn **Volume**.
2. Gắn Volume vào service `ktcnmt-events` với **Mount Path** là:
   ```text
   /app/data
   ```

### Bước 3: Mở Public Domain chia sẻ lên nhóm Zalo phòng KTCNMT
1. Vào tab **Settings** của Service trên Railway $\rightarrow$ mục **Networking / Public Networking**.
2. Nhấn **Generate Domain** (ví dụ: `ktcnmt-20-10.up.railway.app`).
3. Gửi đường link này vào nhóm Zalo phòng KTCNMT để 13 thành viên truy cập chọn Avatar, điểm danh, đặt trà sữa và chơi Mini-game đồng bộ tối 19/10!

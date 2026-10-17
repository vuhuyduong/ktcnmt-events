# KTCNMT · Chúc mừng ngày 20/10

Món quà nhỏ từ anh em Phòng Kỹ thuật Công nghệ Môi trường – ACV: chọn ảnh của mình, đọc lời nhắn, hẹn tiệc tối, gửi lời chúc và chơi cùng nhau.

Taxi khởi hành **17h00 ngày 19/10/2026**, từ **2 Sông Đáy** đến **134 Nguyễn Thái Học**, dự kiến **45–60 phút**. Chị em đi cùng anh em trong phòng. Tiệc **19h00**, **The Street chi nhánh 9**. Thông tin tập trung trong `EVENT_INFO` ở `src/data/roster.ts`.

## Chạy local

```bash
npm ci
STATE_FILE_PATH=/tmp/ktcnmt-local/state.json npm run dev
```

Mở `http://localhost:2010`. Không cần mã, khóa phiên hay script thiết lập. Chọn ảnh để mở trang riêng; cookie nhớ người vừa chọn. “Đổi thành viên” trở về ảnh mọi người. Host được xác định bằng `isHost` trong roster. Đây là nhận diện tiện dụng trong phòng, **không phải xác thực mạnh**; người có đường dẫn có thể chọn bất kỳ danh tính nào, kể cả host. Đây là lựa chọn sản phẩm theo yêu cầu chủ ứng dụng.

`STATE_FILE_PATH` chọn file runtime riêng, mặc định `data/state.json`. `PORT` tùy chỉnh cổng. `EVENT_PUBLIC_ORIGIN` là tùy chọn cho reverse proxy/domain tùy chỉnh, ví dụ `https://ltia-ktcnmt.up.railway.app` (không dấu `/` cuối); mặc định dùng Railway public domain hoặc origin request. Các biến mã/khóa mời của phiên bản cũ không còn được sử dụng.

Có thể dùng `docker compose up -d --build` để phát triển. Không chạy kiểm thử trên dữ liệu local thật hoặc Railway. Kiểm tra type bằng `npx tsc --noEmit`, production bằng `npm run build`; backend bằng `node scripts/backend-test.cjs` (tự dùng thư mục tạm và tự dọn).

## Hành vi và dữ liệu

Mỗi người tự chọn tham dự và taxi cùng nhau/tự di chuyển, không có xác nhận chọn sẵn. Anh em có thể chọn thêm người đi cùng và tự nguyện đồng hành trong trò chơi. Chỉ lời chúc người dùng chủ động nhập mới được đăng dưới tên người gửi. Không thêm số người, lời chúc hoặc lượt tim giả.

Trò lật thẻ trong lúc chờ chỉ lưu trong bộ nhớ trình duyệt, không gửi lượt chơi lên server. Khi host bắt đầu buổi vui, trò mở quà chung xuất hiện với danh sách tham dự được chốt tại thời điểm bắt đầu. Xác nhận tham dự chưa có nghĩa là đã có mặt: host cần đối chiếu thực tế và quà trước khi mở. Các thao tác vẫn kiểm tra lượt và phiên bản trạng thái, giữ kết quả chưa mở ở server. Mọi vai trò và thử thách tự nguyện, có thể đổi hoặc bỏ qua.

Các trường đặt món đã ngừng hiển thị và ngừng nhận qua API. Dữ liệu lịch sử vẫn được giữ trên disk; lưu lựa chọn đi lại không xóa đơn cũ hay ghi chú cũ. Các bản ghi đó không xuất hiện trong payload đơn hoặc công bố trên tường. RSVP cũ thiếu trạng thái rõ ràng được giữ để chính người đó xem và xác nhận lại, chưa được tính vào game.

## Railway và dữ liệu bền

Railway dùng `Dockerfile` và `railway.json`, chạy `npm run start` với `$PORT`. Gắn volume bền tại `/app/data`, đặt `STATE_FILE_PATH=/app/data/state.json`. JSON store chỉ hỗ trợ **một instance/replica**, không scale ngang. Giữ nguyên volume qua redeploy; tuyệt đối không copy state kiểm thử lên live.

Trước thay đổi dữ liệu hoặc redeploy, sao lưu file volume vào nơi riêng, giới hạn quyền và kiểm tra khả năng khôi phục. Runtime/backup không nằm trong Git hay `public/`. File ghi atomically; ghi lỗi không đổi cache, file hỏng báo lỗi thay vì tạo state trắng. App chỉ loại các `wish-seed-*` đã nhận diện sau khi tạo backup; không xóa dữ liệu thật để làm sạch màn hình.

Khôi phục khi cần: dừng ghi/service, giữ bản sao file hiện tại, đưa backup đã kiểm tra về `STATE_FILE_PATH`, bảo đảm quyền ghi rồi khởi động và đối chiếu. Kiểm tra redeploy bằng dữ liệu thật có sẵn và read-only; không tạo lời chúc/tim giả trên production.

## Ảnh và chữ

`MemberAvatar` dùng 11 ảnh WebP thật, hai người chưa có ảnh dùng initials không request ảnh thiếu. Giữ đúng crop và tỷ lệ logo ACV; không tạo chân dung giả. Be Vietnam Pro regular/semibold được tự lưu kèm giấy phép OFL trong `public/fonts` để chữ Việt nhất quán, không phụ thuộc font serif trên thiết bị. Xem `DESIGN.md` và `UX-CONTRACT.md` cho token và hợp đồng tương tác.

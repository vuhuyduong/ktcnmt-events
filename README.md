# Kỹ thuật công nghệ - Môi trường · Chúc mừng ngày 20/10

Món quà nhỏ từ anh em Phòng Kỹ thuật công nghệ - Môi trường – ACV: chọn ảnh của mình, đọc lời nhắn, hẹn tiệc tối, gửi lời chúc và chơi cùng nhau.

Taxi khởi hành **17h00 ngày 19/10/2026**, từ **2 Sông Đáy** đến **134 Nguyễn Thái Học**, dự kiến **45–60 phút**. Chị em đi cùng anh em trong phòng. Tiệc **19h00**, **The Street chi nhánh 9**. Thông tin tập trung trong `EVENT_INFO` ở `src/data/roster.ts`.

## Chạy local

```bash
npm ci
STATE_FILE_PATH=/tmp/ktcnmt-local/state.json npm run dev
```

Mở `http://localhost:2010`. Không cần mã, khóa phiên hay script thiết lập. Chọn ảnh để mở trang riêng; cookie nhớ người vừa chọn. Chạm nhanh ba lần trong một giây vào avatar góc trên, rồi xác nhận để trở về ảnh mọi người. Không có nút đổi thành viên công khai; API từ chối chọn người khác khi phiên hiện tại chưa kết thúc. Host được xác định bằng `isHost` trong roster. Đây là nhận diện tiện dụng trong phòng, **không phải xác thực mạnh**; người có đường dẫn có thể chọn bất kỳ danh tính nào, kể cả host. Đây là lựa chọn sản phẩm theo yêu cầu chủ ứng dụng.

`STATE_FILE_PATH` chọn file runtime riêng, mặc định `data/state.json`. `PORT` tùy chỉnh cổng. `EVENT_PUBLIC_ORIGIN` là tùy chọn cho reverse proxy/domain tùy chỉnh, ví dụ `https://ltia-ktcnmt.up.railway.app` (không dấu `/` cuối); mặc định dùng Railway public domain hoặc origin request. Các biến mã/khóa mời của phiên bản cũ không còn được sử dụng.

Có thể dùng `docker compose up -d --build` để phát triển. Không chạy kiểm thử trên dữ liệu local thật hoặc Railway. Kiểm tra type bằng `npx tsc --noEmit`, production bằng `npm run build`; backend bằng `node scripts/backend-test.cjs` (tự dùng thư mục tạm và tự dọn).

## Hành vi và dữ liệu

Mỗi người tự chọn tham dự và taxi cùng nhau/tự di chuyển, không có xác nhận chọn sẵn. Anh em có thể chọn thêm người đi cùng và tự nguyện đồng hành trong trò chơi. Chỉ lời chúc người dùng chủ động nhập mới được đăng dưới tên người gửi. Không thêm số người, lời chúc hoặc lượt tim giả.

Trò lật thẻ có 6 đôi, bộ thẻ được xáo ở server và chỉ trả nội dung thẻ đã mở. Đồng hồ bắt đầu ở thẻ đầu tiên; mỗi thẻ được mở tính một lần lật. Server lưu ván hiện tại và thành tích ván hoàn tất. Bảng xếp hạng có hai tiêu chí: ít lần lật (hòa thì nhanh hơn) và nhanh nhất (hòa thì ít lần lật hơn). Mỗi người giữ một kỷ lục theo từng tiêu chí; không nhận điểm tự khai từ client. Việc này độc lập với trò mở quà.

Đồng hồ đầu trang đếm tới **19:00 ngày 20/10/2026, UTC+07:00**, dừng ở 00 sau mốc này. Đây là mốc chúc mừng 20/10, không thay lịch taxi/tiệc 19/10 đã xác nhận. Khi mở profile nữ, hoa rơi trong khoảng 4 giây, không chặn thao tác; tắt hoàn toàn với reduced-motion.

Tab **Tin riêng** cho gửi/nhận với từng người trong roster, hiển thị tin chưa đọc và trạng thái đã đọc. Nội dung tối đa 2.000 ký tự, lưu ở cùng volume; API chỉ trả tin mà phiên hiện tại là người gửi hoặc người nhận, kể cả host cũng không có quyền đọc hội thoại khác. Bản nháp giữ khi đổi tab/người nhận trong phiên trang, cảnh báo khi rời trang hoặc đổi profile. Gửi lại cùng mã yêu cầu không tạo tin trùng. Yêu cầu đọc/gửi gắn với danh tính đang hiển thị; nếu đổi profile ở tab khác, hộp thư cũ khóa lại và yêu cầu tải lại, không gửi bản nháp dưới tên người mới. Trạng thái đã đọc tự thử lại ở lần tải thư tiếp theo nếu trước đó lỗi mạng.

Cookie được ký bằng khóa ngẫu nhiên bền ở cạnh file state (`<STATE_FILE_PATH>.session-key`), không cần cấu hình thêm. Cookie tên người thuần từ bản cũ không còn hợp lệ: người dùng chọn lại ảnh một lần. Sao lưu cả khóa nếu muốn giữ các phiên sau khôi phục. Chữ ký ngăn sửa cookie để giả danh, nhưng chọn ảnh vẫn không xác minh danh tính: triple click chỉ giảm đổi nhầm, không chặn một người chọn người khác từ trình duyệt mới. Không nên dùng hộp thư này cho thông tin nhạy cảm nếu chưa bổ sung xác thực riêng.

Mỗi người có thể bấm **Đổi ảnh đại diện** trong trang riêng, chọn ảnh JPG/PNG/WebP tối đa 5 MB, xem trước và bấm **Dùng ảnh này**. Server kiểm tra ảnh thật, xoay theo EXIF, cắt vuông 384×384 và bỏ metadata. Ảnh thay thế lưu cùng file state trên volume bền; mọi avatar (danh sách, lời chúc, hộp thư, bảng xếp hạng) dùng phiên bản mới. Chỉ phiên của chính người đó được đổi ảnh; tab có danh tính cũ bị từ chối. Ảnh mặc định trong `public/avatars` vẫn được giữ.

Avatar có dấu tick xanh khi thành viên đã lưu `attendanceStatus: attending`. Danh sách mã thành viên đã xác nhận được công khai để nhận biết nhanh; thông tin di chuyển, người đi cùng và ghi chú vẫn theo quyền xem hiện có. Chọn “cần thu xếp” hoặc “không đến” sẽ bỏ dấu tick; bản ghi cũ chưa xác nhận rõ ràng không có tick.

Huy Dương có nút **Chơi thử riêng (Admin)** trong tab Trò chơi, dùng được bất cứ lúc nào. Bấm **Bắt đầu ván thử** để thử mở hộp, chọn người đồng hành và chuyển lượt với danh sách thành viên mẫu, không cần RSVP. Bàn thử lưu riêng, không phát thông báo mở tiệc, không ghi xác nhận tham dự hay thay kết quả ván chung. Có thể đặt lại bàn thử rồi thử tiếp, hoặc bấm **Về trò chơi chung** để quay lại chương trình thật.

Khi host bắt đầu buổi vui, trò mở quà chung xuất hiện với danh sách tham dự được chốt tại thời điểm bắt đầu. Xác nhận tham dự chưa có nghĩa là đã có mặt: host cần đối chiếu thực tế và quà trước khi mở. Các thao tác vẫn kiểm tra lượt và phiên bản trạng thái, giữ kết quả chưa mở ở server. Mọi vai trò và thử thách tự nguyện, có thể đổi hoặc bỏ qua.

Các trường đặt món đã ngừng hiển thị và ngừng nhận qua API. Dữ liệu lịch sử vẫn được giữ trên disk; lưu lựa chọn đi lại không xóa đơn cũ hay ghi chú cũ. Các bản ghi đó không xuất hiện trong payload đơn hoặc công bố trên tường. RSVP cũ thiếu trạng thái rõ ràng được giữ để chính người đó xem và xác nhận lại, chưa được tính vào game.

## Railway và dữ liệu bền

Railway dùng `Dockerfile` và `railway.json`, chạy `npm run start` với `$PORT`. Gắn volume bền tại `/app/data`, đặt `STATE_FILE_PATH=/app/data/state.json`. JSON store chỉ hỗ trợ **một instance/replica**, không scale ngang. Giữ nguyên volume qua redeploy; tuyệt đối không copy state kiểm thử lên live.

Trước thay đổi dữ liệu hoặc redeploy, sao lưu file volume vào nơi riêng, giới hạn quyền và kiểm tra khả năng khôi phục. Runtime/backup không nằm trong Git hay `public/`. File ghi atomically; ghi lỗi không đổi cache, file hỏng báo lỗi thay vì tạo state trắng. App chỉ loại các `wish-seed-*` đã nhận diện sau khi tạo backup; không xóa dữ liệu thật để làm sạch màn hình.

Khôi phục khi cần: dừng ghi/service, giữ bản sao file hiện tại, đưa backup đã kiểm tra về `STATE_FILE_PATH`, bảo đảm quyền ghi rồi khởi động và đối chiếu. Kiểm tra redeploy bằng dữ liệu thật có sẵn và read-only; không tạo lời chúc/tim giả trên production.

## Ảnh và chữ

`MemberAvatar` dùng ảnh WebP thật đã được cắt theo từng người; ảnh mới Huy Dương được xoay theo EXIF, cắt chân dung, xuất 384×384 và loại metadata. Trung Kiên được chủ ứng dụng xác nhận là người thứ hai từ trái sang trong ảnh nhóm; đã cắt riêng khuôn mặt/vai và xuất WebP 384×384. Cả 13 người đã có ảnh thật. Giữ đúng crop và tỷ lệ logo ACV; không tạo chân dung giả. Be Vietnam Pro regular/semibold được tự lưu kèm giấy phép OFL trong `public/fonts` để chữ Việt nhất quán, không phụ thuộc font serif trên thiết bị. Xem `DESIGN.md` và `UX-CONTRACT.md` cho token và hợp đồng tương tác.

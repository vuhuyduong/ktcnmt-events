# KTCNMT · Chúc mừng ngày 20/10

Ứng dụng nội bộ của Phòng Kỹ thuật Công nghệ Môi trường – ACV: thiệp, đăng ký tiệc và đồ uống, lời chúc thật và trò chơi tự nguyện.

Thông tin sự kiện lấy từ `EVENT_INFO` trong `src/data/roster.ts`: tiệc **19:00 ngày 19/10/2026**, **The Street (Chi nhánh 9)**, **134 Nguyễn Thái Học, P. Bến Thành, Quận 1, TP.HCM**. Đồ uống dành cho sáng 20/10. Giờ đồ uống, giờ/điểm tập trung xe, chiều về, hạn đăng ký và đầu mối chưa công bố. Không dùng danh sách mời để suy ra số người dự tiệc hoặc khách đi cùng.

## Chạy local

```bash
npm ci
node scripts/setup-invites.mjs --base-url http://localhost:2010 --output-dir /tmp/ktcnmt-invites-private
cp /tmp/ktcnmt-invites-private/event-auth.env .env.local
npm run dev
```

Ứng dụng mở tại `http://localhost:2010`. Khi chạy trực tiếp trên máy, đặt `STATE_FILE_PATH` trong `.env.local` thành đường dẫn tuyệt đối tới file runtime riêng mà tài khoản chạy app có quyền ghi, chẳng hạn `/tmp/ktcnmt-local/state.json`. Không dùng đường dẫn production `/app/data/state.json` cho local nếu chưa tạo volume/quyền ghi tương ứng.

Có thể dùng `docker compose up -d --build` sau khi tạo `.env.local`; cấu hình compose hiện tại dành cho phát triển, mount `./data` vào `/app/data`. Không dùng dữ liệu local làm dữ liệu live. Kiểm tra mã nguồn bằng `npx tsc --noEmit` và `npm run build`.

## Mã mời và phiên đăng nhập

Tạo mã cho production bằng lệnh dưới đây, thay domain bằng URL ứng dụng thực tế và chọn thư mục riêng **bên ngoài repository**:

```bash
node scripts/setup-invites.mjs --base-url https://ltia-ktcnmt.up.railway.app --output-dir /srv/ktcnmt-private
```

Script tạo thư mục quyền `700` và ba file quyền `600`, không in bí mật ra stdout, không ghi đè file đã tồn tại:

- `event-auth.env`: các biến môi trường dùng phía server.
- `member-invitations.tsv`: link mời riêng cho từng thành viên.
- `host-invitations.tsv`: link quản trị riêng cho host.

Đặt các biến sau trong Railway Variables; không đặt tiền tố `NEXT_PUBLIC_`, commit hoặc đưa chúng vào Docker image:

| Biến                      | Mục đích                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EVENT_PUBLIC_ORIGIN`     | Origin công khai chính xác của ứng dụng, ví dụ `https://ltia-ktcnmt.up.railway.app`; không có dấu `/` cuối. Bắt buộc khi dùng domain riêng/proxy. |
| `EVENT_SESSION_SECRET`    | Khóa ký phiên ngẫu nhiên, ít nhất 32 ký tự                                                                                                        |
| `EVENT_MEMBER_CODES_JSON` | JSON ánh xạ member ID trong roster tới mã mời riêng, không rỗng                                                                                   |
| `EVENT_ADMIN_CODE`        | Mã quản trị riêng, khác mã thành viên                                                                                                             |
| `STATE_FILE_PATH`         | `/app/data/state.json` trên volume production                                                                                                     |

Link mời chứa mã trong fragment `#member=...&code=...` và được client xóa khỏi URL sau khi tiếp nhận. Chỉ gửi link riêng cho đúng người qua kênh riêng; không chia sẻ bảng mã hoặc link quản trị lên nhóm. Mã thành viên của host chỉ cấp quyền thành viên; quyền quản trị cần mã admin riêng. Chọn avatar hoặc sửa localStorage không cấp quyền. Truy cập không có phiên hợp lệ chỉ nhận dữ liệu công khai đã lược bỏ thông tin riêng; cần đăng nhập trước khi xem đăng ký, hậu cần hoặc thực hiện thao tác.

## Railway, dữ liệu bền và redeploy

Railway dùng `Dockerfile` và `railway.json`; service chạy `npm run start` với `$PORT`. Trước khi chia sẻ link:

1. Gắn **volume bền** vào service tại **`/app/data`**, đặt `STATE_FILE_PATH=/app/data/state.json` và các biến xác thực ở trên. Mô hình JSON file chỉ hỗ trợ **một instance/replica**; không scale ngang.
2. Dữ liệu runtime không nằm trong Git hoặc build context. Khởi tạo mới phải có 0 RSVP, đơn, lời chúc và tim; tên trong roster chỉ là người được mời. Không copy `data/state.json` từ local lên volume live.
3. Nếu service đã có dữ liệu, sao lưu file trên volume trước thay đổi hoặc redeploy. Bản backup có thông tin nội bộ: lưu ở nơi riêng, giới hạn quyền và kiểm tra có thể đọc/khôi phục. Không để backup trong repo hoặc `public/`.
4. Khi làm sạch dữ liệu cũ, đối chiếu từng bản ghi với xác nhận thật. App tự sao lưu trước khi loại `wish-seed-*` đã nhận diện. RSVP cũ thiếu trạng thái xác nhận được giữ để kiểm tra, hiển thị “Cần xác nhận lại” và chưa tính vào thống kê hoặc danh sách game cho đến khi chính thành viên lưu lại. Các lượt tim cũ không xác minh được không được trình bày như tương tác thật. Dữ liệu seed khác phải được nhận diện và rà soát; không xóa toàn bộ hoặc ghi đè trạng thái live bằng trạng thái rỗng. Nếu file hỏng hoặc không ghi được, xử lý lỗi và khôi phục từ backup đã kiểm tra; không tạo state giả để che lỗi.
5. Sau redeploy, đăng nhập bằng link mời riêng, kiểm tra đăng ký thật còn nguyên và không xuất hiện bản ghi mẫu. Kiểm tra một thay đổi đã xác nhận vẫn còn sau reload/restart; tránh tạo bài chúc/tim thử trên production.
6. Khôi phục khi cần: dừng ghi/service, giữ bản sao file hiện tại, đưa backup hợp lệ về đúng `STATE_FILE_PATH` trên volume, bảo đảm quyền ghi rồi khởi động lại và đối chiếu. Giữ nguyên volume khi redeploy; xóa volume sẽ xóa dữ liệu.

Không coi khởi động container thành công là bằng chứng dữ liệu đã bền. Cần xác nhận volume thực sự gắn đúng mount path trước lần redeploy có kiểm soát. Mã mời phải được giữ ổn định qua các lần redeploy; chỉ tạo lại khi chủ động xoay khóa/mã và phân phối link mới.

## Ảnh và hướng thiết kế

`MemberAvatar` dùng 11 ảnh WebP có thật trong `public/avatars`, cạnh dài tối đa 384px; hai thành viên chưa có ảnh dùng chữ viết tắt trực tiếp, không request file thiếu. Giữ ảnh gốc để chỉnh crop khi cần; chỉ sử dụng/chia sẻ ảnh với sự đồng ý phù hợp. Không tạo chân dung giả.

Xem `DESIGN.md` để giữ nhất quán màu, cỡ chữ, layout, nội dung trung thực và quyền lựa chọn. Không thêm dữ liệu mẫu, tim tự cộng, khách mặc định hoặc số thiết bị suy diễn để làm màn hình có vẻ đông vui.

Khi nhập từng biến trong Railway, giá trị `EVENT_MEMBER_CODES_JSON` là đối tượng JSON nguyên văn, không gồm dấu nháy đơn bên ngoài dùng bởi shell trong tệp `.env`. Có thể nhập toàn bộ tệp bằng Raw Editor hỗ trợ cú pháp dotenv; sau khi lưu hãy kiểm tra biến JSON được parse đúng bằng đăng nhập mã mời (không hiển thị secret trong log).

Kiểm thử backend (storage, phiên, quyền, RSVP và game) chạy trên thư mục tạm tự xóa: `node scripts/backend-test.cjs`, hoặc `docker exec ktcnmt-events node scripts/backend-test.cjs` khi dùng dependency trong container. Không trỏ bài kiểm thử vào volume thật.

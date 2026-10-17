# KTCNMT · Tháng Mười, gửi thương mến

Quyết định mới nhất của chủ ứng dụng ngày 17/10/2026 thay thế hướng audit cũ: một món quà 20/10 thân tình, sáng và ấm, bắt đầu bằng ảnh thật của mọi người. Chạm ảnh mở trang riêng, không mã mời hoặc bước thiết lập quyền.

## Hệ hình ảnh

`src/app/globals.css` sở hữu token và component CSS dùng chung.

| Vai trò              | Token        | Màu     |
| -------------------- | ------------ | ------- |
| Giấy ngà             | --background | #fff8f3 |
| Bề mặt               | --panel      | #fffcf8 |
| Chữ burgundy         | --text       | #542b35 |
| Chữ phụ              | --muted      | #775e60 |
| Hoa hồng / hành động | --pink       | #983e55 |
| Thành công / lá      | --green      | #3f6752 |

Be Vietnam Pro tự lưu trong `public/fonts`, gồm regular và semibold với bộ ký tự tiếng Việt đầy đủ, giấy phép OFL đi kèm. Heading dùng cùng font, không dùng serif fallback dễ lệch dấu. Body 16px; line-height thoáng, input 16px; nút chạm ít nhất 44px, focus rõ, cho phép zoom và tôn trọng reduced-motion.

## Bố cục và giọng nói

Trang đầu: năm ảnh nữ nổi bật, nhóm anh em phía dưới, lịch hẹn đã xác nhận. Desktop trải ngang; mobile gọn 3+2 ảnh nữ và 4+4 anh em. Chỉ hai người chưa có ảnh dùng initials. Không tạo ảnh giả, tính cách hay kỷ niệm giả.

Trang riêng: ảnh, lời chúc ngắn riêng theo tên từ roster, thiệp hồng ngà, lịch trình và lựa chọn tham dự/di chuyển. Gọi hành động bằng lời hàng ngày: “Hẹn nhau nhé”, “Lưu lựa chọn”, “Đổi thành viên”. Không dùng giọng doanh nghiệp. Lỗi chỉ xuất hiện khi có vấn đề; kết nối bình thường không cần nhãn trạng thái.

Lịch trình lấy từ `EVENT_INFO`: taxi 17h00 ngày 19/10/2026 từ 2 Sông Đáy đến 134 Nguyễn Thái Học, dự kiến 45–60 phút; tiệc 19h00 tại The Street chi nhánh 9. Không dựng thông tin liên hệ, hạn chốt hoặc các khối chưa công bố. Không hiển thị menu, đặt món hoặc kế hoạch quà chưa được phép công bố.

Trò lật thẻ có hoa, lá, tim và KTCNMT, chơi riêng trên máy, không đồng hồ hay bảng thành tích. Trò mở quà chung vẫn do host bắt đầu, giữ bảo vệ lượt và đồng bộ dữ liệu. Mọi thử thách và vai trò đồng hành đều tự nguyện, có thể bỏ qua. Chụp/quay/chia sẻ chỉ khi mọi người đồng ý.

## Danh tính và dữ liệu

Chọn ảnh là nhận diện tiện dụng cho nhóm quen biết, không phải xác thực mạnh. Cookie nhớ lựa chọn; host theo `isHost` trong roster, không thêm mã thay thế. Không chọn sẵn câu trả lời thành xác nhận thật. Chỉ hiển thị lời chúc và tương tác thật. Dữ liệu lịch sử giữ nguyên trên disk, bao gồm các trường đã thôi hiển thị; lưu chuyến đi không xóa lựa chọn cũ ngoài phạm vi.

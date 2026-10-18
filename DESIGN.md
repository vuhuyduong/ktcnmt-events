# Kỹ thuật công nghệ - Môi trường · Tháng Mười, gửi thương mến

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

Trang đầu: năm ảnh nữ nổi bật, nhóm anh em phía dưới, lịch hẹn đã xác nhận. Desktop trải ngang; mobile gọn 3+2 ảnh nữ và 4+4 anh em. Cả 13 người có ảnh WebP thật. Huy Dương đã cắt chân dung từ ảnh phong cảnh; Trung Kiên là người thứ hai từ trái sang trong ảnh nhóm, theo xác nhận của chủ ứng dụng. Không tạo ảnh giả, tính cách hay kỷ niệm giả.

Trang riêng: ảnh, lời chúc ngắn riêng theo tên từ roster, thiệp hồng ngà, lịch trình và lựa chọn tham dự/di chuyển. Gọi hành động bằng lời hàng ngày: “Hẹn nhau nhé”, “Lưu lựa chọn”, “Tin riêng”. Không dùng giọng doanh nghiệp. Lỗi chỉ xuất hiện khi có vấn đề; kết nối bình thường không cần nhãn trạng thái.

Lịch trình lấy từ `EVENT_INFO`: taxi 17h00 ngày 19/10/2026 từ 2 Sông Đáy đến 134 Nguyễn Thái Học, dự kiến 45–60 phút; tiệc 19h00 tại The Street chi nhánh 9. Không dựng thông tin liên hệ, hạn chốt hoặc các khối chưa công bố. Không hiển thị menu, đặt món hoặc kế hoạch quà chưa được phép công bố.

Trò lật thẻ có sáu đôi hoa, lá, tim và ngôi sao; server xáo thẻ, kiểm tra mỗi lần lật và ghi kỷ lục. Có đồng hồ ván chơi và hai bảng xếp hạng theo số lần lật/thời gian. Trò mở quà chung vẫn do host bắt đầu, giữ bảo vệ lượt và đồng bộ dữ liệu. Mọi thử thách và vai trò đồng hành đều tự nguyện, có thể bỏ qua. Chụp/quay/chia sẻ chỉ khi mọi người đồng ý.

## Danh tính và dữ liệu

Chọn ảnh là nhận diện tiện dụng cho nhóm quen biết, không phải xác thực mạnh. Cookie có chữ ký nhớ lựa chọn; đổi profile bằng ba lần chạm avatar trong một giây và xác nhận; host theo `isHost` trong roster, không thêm mã thay thế. Không chọn sẵn câu trả lời thành xác nhận thật. Chỉ hiển thị lời chúc và tương tác thật. Dữ liệu lịch sử giữ nguyên trên disk, bao gồm các trường đã thôi hiển thị; lưu chuyến đi không xóa lựa chọn cũ ngoài phạm vi.

## Bổ sung ngày 17/10/2026

Đếm ngược số hiện đại đặt ngay dưới header, nền burgundy đậm, số monospace vàng nhạt, ngày/giờ/phút/giây rõ ràng. Mốc 19:00 ngày 20/10/2026 giờ Việt Nam tách biệt với lịch tiệc 19/10 đã xác nhận. Mobile xếp lời dẫn trên dãy số, không tràn ở 320px.

Profile nữ được chào bằng hoa rơi nhẹ trong bốn giây; không nhận pointer events, không lặp khi đổi tab và tôn trọng reduced-motion. Điều hướng bốn tab thêm Tin riêng với số chưa đọc. Hộp thư desktop dùng danh sách hội thoại và nội dung; mobile dùng native select để chọn người nhận. Nội dung tin riêng không vào tường lời chúc hoặc payload công khai; host cũng chỉ thấy hội thoại của chính mình.

## Bổ sung ngày 18/10/2026

Trang riêng thêm nút đổi ảnh, mở hộp thoại xem trước hình tròn và xác nhận dùng ảnh. Dùng ảnh người dùng chọn, không dựng chân dung. Ảnh thay thế đã chuẩn hóa lưu bền trong state, nhận diện bằng phiên bản và dùng nhất quán ở mọi `MemberAvatar`.

Dấu tick xanh trên avatar thể hiện xác nhận tham dự thật, có nhãn cho trình đọc màn hình và chú giải ở danh sách chọn người. Chỉ trạng thái `attending` rõ ràng được tính; người chưa xác nhận, còn thu xếp hoặc không đi không có tick.

Trong tab Trò chơi, Huy Dương có chế độ chơi thử riêng, phân biệt rõ với trò chơi chung. Bàn thử dùng thành viên mẫu, được lưu riêng và có thể bắt đầu/đặt lại bất cứ lúc nào. Không sửa danh sách tham dự hoặc kết quả chung khi thử.

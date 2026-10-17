# Hướng thiết kế KTCNMT 20/10

Nguồn quyết định: audit ngày 17/10/2026 đã được duyệt. Trải nghiệm cần ấm áp, rõ ràng và tôn trọng quyền lựa chọn. Ảnh thật, lời nhắn chân thành và thông tin chính xác là điểm nhấn.

## Nền tảng hình ảnh

| Vai trò                      | Màu       |
| ---------------------------- | --------- |
| Nền                          | `#111827` |
| Panel                        | `#202B3C` |
| Chữ chính                    | `#f8fafc` |
| Chữ phụ                      | `#cbd5e1` |
| Hành động / hồng ấm          | `#f2a7b5` |
| Trạng thái đã lưu / xanh dịu | `#a7d8c4` |

Dùng font hệ thống hỗ trợ tiếng Việt, body 16px với line-height khoảng 1.5; nhãn 14px trở lên và input 16px. Nút có vùng chạm tối thiểu 44px, focus bàn phím rõ, trạng thái luôn có chữ đi kèm màu. Cho phép zoom. Tôn trọng reduced-motion cả CSS lẫn JavaScript.

## Bố cục và nội dung

Mobile ưu tiên thiệp gọn → thông tin tiệc → đăng ký. Desktop rộng tối đa 1120px, dùng hai cột khi đủ chỗ. Trò chơi ưu tiên tên người đến lượt, quà và hành động hợp lệ. Hạn chế glow, gradient, chữ in hoa và chuyển động trang trí.

Cấu hình sự kiện chỉ lấy từ `EVENT_INFO` trong `src/data/roster.ts`. Giữ nguyên thông tin tiệc đã xác nhận; giờ xe, điểm tập trung, chiều về, đầu mối, hạn đăng ký và giờ đồ uống chưa có xác nhận phải ghi “Chưa công bố”. Không tự thêm thực đơn hoặc hứa dịch vụ chưa được xác minh.

Thiệp là nội dung biên tập của anh em KTCNMT; không bịa tính cách, kỷ niệm hoặc đóng góp cá nhân. Tường chỉ chứa lời chúc và tương tác thật. Không dùng dữ liệu mẫu, số người online suy diễn hoặc đăng ký mặc định để lấp màn rỗng.

Mọi thử thách tự nguyện, có thể đổi hoặc bỏ qua mà không bị phạt. Chụp, quay và chia sẻ ảnh cần sự đồng ý của những người xuất hiện. Không phạt uống rượu hay yêu cầu uống cạn.

## Tài sản và bảo mật

Avatar thật đã có dùng WebP, cạnh dài tối đa 384px và giữ điểm lấy nét. Người chưa có ảnh dùng initials ngay, không gửi request ảnh thiếu. Không tạo ảnh chân dung giả. Logo ACV giữ đúng tỷ lệ.

Chọn avatar chỉ chọn danh tính để đăng nhập; quyền sửa dữ liệu và điều khiển host phải được server xác thực. Ghi chú cá nhân và hậu cần chỉ đến đúng người có quyền. RSVP, đồ uống và phương tiện là các lựa chọn độc lập; không chọn sẵn thành xác nhận thật.

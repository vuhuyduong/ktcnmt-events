# Active Context: Audit implementation 17/10/2026

Đang triển khai các sửa đổi đã được chủ app cho phép từ báo cáo audit UI/UX và độ tin cậy ngày 17/10/2026. Chưa triển khai hoặc thay đổi dữ liệu Railway trong bước chỉnh mã nguồn này.

Thông tin chuẩn nằm trong `EVENT_INFO`; không khôi phục lịch/địa điểm cũ hay giờ xe tự suy ra. Không có khách đi cùng mặc định. Số người dự và số hộp phải xuất phát từ đăng ký hợp lệ theo logic hiện hành, không hardcode tổng.

Các trọng tâm: xác thực phiên và phân quyền server; lưu bền trung thực; xử lý trạng thái tải/lỗi/bản nháp; RSVP và đồ uống độc lập; trò chơi đúng lượt, tự nguyện và giữ bí mật quà; chữ dễ đọc và desktop hai cột. Avatar WebP tối đa 384px, không request ảnh thiếu, cho phép zoom và metadata tiếng Việt.

Không commit dữ liệu runtime, mã mời, env hoặc backup. Trước sửa dữ liệu thật cần sao lưu và đối chiếu nguồn từng bản ghi. Tuyệt đối không ghi dump local lên volume live. Xem README để cấu hình volume và mã mời riêng.

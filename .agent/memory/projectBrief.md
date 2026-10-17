# Project Brief: KTCNMT 20/10

Ứng dụng sự kiện Ngày Phụ nữ Việt Nam của Phòng Kỹ thuật Công nghệ Môi trường – ACV. Danh sách mời gồm 5 thành viên nữ và 8 thành viên nam; số người dự tiệc, khách đi cùng và đơn đồ uống phải tính từ đăng ký thật, không xem danh sách mời là đã xác nhận.

Cấu hình chuẩn: `src/data/roster.ts` → `EVENT_INFO`. Tiệc lúc 19:00 ngày 19/10/2026 tại The Street (Chi nhánh 9), 134 Nguyễn Thái Học, P. Bến Thành, Quận 1, TP.HCM. Đồ uống dành cho sáng 20/10; giờ cụ thể, giờ/điểm tập trung xe, chiều về, đầu mối và hạn đăng ký chưa công bố.

Luồng chính: thiệp biên tập; đăng ký tiệc, đồ uống và phương tiện độc lập; lời chúc thật; trò chơi tự nguyện có host được xác thực. Không dùng ngày sinh trong client, dữ liệu seed giả, khách mặc định hoặc số thiết bị suy diễn. Xem `DESIGN.md` và `README.md` cho thiết kế và vận hành hiện tại.

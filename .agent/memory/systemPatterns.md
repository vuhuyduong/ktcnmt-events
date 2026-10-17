# System Patterns: KTCNMT 20/10

Next.js App Router, TypeScript, React, Tailwind và lucide-react. Cấu hình nội dung sự kiện tập trung tại `EVENT_INFO` trong `src/data/roster.ts`; `RESTAURANT_INFO` chỉ là alias tương thích.

State runtime ở `STATE_FILE_PATH`, production dùng `/app/data/state.json` trên volume `/app/data`. Chạy một instance cho mô hình lưu file. Ghi nguyên tử, không báo thành công khi persist lỗi, không khởi tạo dữ liệu giả khi file hỏng. Source và Docker image loại toàn bộ runtime state/backup/secrets. Khởi tạo mới không có RSVP, đơn, bài chúc hay tim mẫu.

Phiên thành viên được xác thực phía server qua mã mời riêng; admin dùng mã riêng. Không tin memberId, isHost, chọn avatar hoặc localStorage làm quyền. Payload chỉ chứa dữ liệu mà phiên có quyền xem; game không lộ nội dung hộp chưa mở.

`MemberAvatar` chỉ request 11 ảnh WebP có thật trong manifest, khai báo width/height và lazy decoding; ảnh chưa có hoặc tải lỗi dùng initials. Thiết kế và khả năng tiếp cận theo `DESIGN.md`.

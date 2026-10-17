export type Gender = "female" | "male";

export interface StaffMember {
  id: string;
  fullName: string;
  shortName: string;
  gender: Gender;
  wish?: string;
  isHost?: boolean;
}

export const STAFF_MEMBERS: StaffMember[] = [
  // Nhóm 1: 05 Bạn Nữ – "🌸 05 Bông Hoa KTCNMT"
  {
    id: "quynh-nhu",
    fullName: "Phạm Thị Quỳnh Như",
    shortName: "Quỳnh Như",
    gender: "female",
    wish: "Quỳnh Như thân mến, chúc bạn một ngày 20/10 nhiều niềm vui, sức khỏe và những khoảng nghỉ thật dễ chịu. Mong bạn luôn có thời gian cho những điều mình yêu thích.",
  },
  {
    id: "ngoc-anh",
    fullName: "Phạm Thị Ngọc Ánh",
    shortName: "Ngọc Ánh",
    gender: "female",
    wish: "Ngọc Ánh thân mến, chúc bạn ngày 20/10 ấm áp và nhiều niềm vui. Mong những dự định của bạn thuận lợi, mỗi ngày đều có điều để mong chờ.",
  },
  {
    id: "my-dung",
    fullName: "Lê Ngọc Mỹ Dung",
    shortName: "Mỹ Dung",
    gender: "female",
    wish: "Mỹ Dung thân mến, chúc bạn một ngày 20/10 thật vui và một chặng đường phía trước nhiều cơ hội. Mong bạn luôn được quan tâm, lắng nghe và làm những điều mình yêu thích.",
  },
  {
    id: "quynh-nga",
    fullName: "Phan Quỳnh Nga",
    shortName: "Quỳnh Nga",
    gender: "female",
    wish: "Quỳnh Nga thân mến, chúc bạn ngày 20/10 nhiều niềm vui, sức khỏe và bình an. Mong bạn tìm thấy những điều ý nghĩa trong công việc và cuộc sống.",
  },
  {
    id: "mong-bang",
    fullName: "Lâm Thị Mộng Băng",
    shortName: "Mộng Băng",
    gender: "female",
    wish: "Mộng Băng thân mến, chúc bạn một ngày 20/10 thật ấm áp. Mong những dự định riêng của bạn có thêm cơ hội, và mỗi ngày đều có niềm vui để mang về.",
  },

  // Nhóm 2: 08 Anh Em Nam – "🥂 08 Anh Em KTCNMT"
  {
    id: "trung-kien",
    fullName: "Phạm Trung Kiên",
    shortName: "Anh Kiên",
    gender: "male",
  },
  {
    id: "huy-duong",
    fullName: "Vũ Huy Dương",
    shortName: "Anh Dương",
    gender: "male",
    isHost: true,
  },
  {
    id: "anh-thai",
    fullName: "Nguyễn Anh Thái",
    shortName: "Anh Thái",
    gender: "male",
  },
  {
    id: "manh-cuong",
    fullName: "Nguyễn Mạnh Cường",
    shortName: "Anh Cường",
    gender: "male",
  },
  {
    id: "van-thuan",
    fullName: "Nguyễn Văn Thuận",
    shortName: "Văn Thuận",
    gender: "male",
  },
  {
    id: "ba-kien",
    fullName: "Hoàng Bá Kiên",
    shortName: "Bá Kiên",
    gender: "male",
  },
  {
    id: "gia-khang",
    fullName: "Trần Gia Khang",
    shortName: "Gia Khang",
    gender: "male",
  },
  {
    id: "hai-minh",
    fullName: "Lương Hải Minh",
    shortName: "Hải Minh",
    gender: "male",
  },
];

export const FEMALE_MEMBERS = STAFF_MEMBERS.filter(
  (m) => m.gender === "female",
);
export const MALE_MEMBERS = STAFF_MEMBERS.filter((m) => m.gender === "male");

export const SPECIAL_GUEST_ID = "guest-plus-one";

export type MaleTransportOptionId = "car" | "grab" | "vanguard" | "self";

export const MALE_TRANSPORT_OPTIONS: {
  id: MaleTransportOptionId;
  label: string;
  shortLabel: string;
}[] = [
  {
    id: "grab",
    label: "Đi taxi cùng chị em và anh em",
    shortLabel: "Đi taxi cùng nhau",
  },
  { id: "self", label: "Mình tự di chuyển", shortLabel: "Tự di chuyển" },
];

// Gợi ý biên tập để người gửi tự chọn và chỉnh sửa; không phải bài đăng sẵn.
export const QUICK_WISH_SUGGESTIONS = [
  {
    label: "Niềm vui & bình an",
    text: "Chúc chị em KTCNMT và các khách mời một ngày 20/10 nhiều niềm vui, sức khỏe và bình an. Mong mỗi người luôn có thời gian cho những điều mình yêu thích!",
  },
  {
    label: "Thuận lợi & nhiều cơ hội",
    text: "Nhân ngày Phụ nữ Việt Nam, chúc chị em nhiều sức khỏe, công việc thuận lợi và có thêm cơ hội cho những dự định riêng. Cảm ơn chị em đã cùng xây dựng tập thể KTCNMT!",
  },
  {
    label: "Một buổi gặp gỡ ấm áp",
    text: "Chúc chị em ngày 20/10 thật vui. Hy vọng buổi gặp gỡ của phòng sẽ là dịp cùng trò chuyện, nghỉ ngơi và lưu lại những kỷ niệm dễ chịu!",
  },
];

export const GAME_PARTICIPATION_NOTE =
  "Mọi thử thách đều tự nguyện. Bạn có thể đổi thử thách hoặc bỏ qua, không cần nêu lý do và không có hình phạt. Chỉ chụp, quay hoặc chia sẻ hình ảnh khi những người xuất hiện đồng ý.";

export interface BlindBoxReward {
  id: string;
  code: string;
  title: string;
  fullTitle: string;
  description: string;
  badge: string;
}

export const BLIND_BOX_REWARDS: BlindBoxReward[] = [
  {
    id: "loc-la-01",
    code: "Lộc Lá #01",
    title: 'Thử thách "Thợ Ảnh Có Tâm"',
    fullTitle: 'Lộc Lá #01 + Thử thách "Thợ Ảnh Có Tâm"',
    description:
      "Mời một người hỗ trợ tự nguyện chụp tối đa 3 bức ảnh nếu bạn muốn. Hỏi ý kiến mọi người trong khung hình trước khi chụp và trước khi chia sẻ. Có thể đổi sang một lời chúc hoặc bỏ qua.",
    badge: "📸 Ảnh Kỷ Niệm",
  },
  {
    id: "loc-la-02",
    code: "Lộc Lá #02",
    title: 'Thử thách "Lời Cảm Ơn"',
    fullTitle: 'Lộc Lá #02 + Thử thách "Lời Cảm Ơn"',
    description:
      "Mời một người hỗ trợ tự nguyện gửi một lời cảm ơn hoặc lời chúc chân thành. Không giới hạn thời gian; có thể đổi thử thách hoặc bỏ qua.",
    badge: "💎 Lời Cảm Ơn",
  },
  {
    id: "loc-la-03",
    code: "Lộc Lá #03",
    title: 'Thử thách "Một Việc Nhỏ"',
    fullTitle: 'Lộc Lá #03 + Thử thách "Một Việc Nhỏ"',
    description:
      "Mời một người hỗ trợ tự nguyện giúp một việc nhỏ ở bàn tiệc, như lấy khăn giấy hoặc rót nước theo nhu cầu của bạn. Có thể đổi thử thách hoặc bỏ qua.",
    badge: "🍽️ Một Việc Nhỏ",
  },
  {
    id: "loc-la-04",
    code: "Lộc Lá #04",
    title: 'Thử thách "Giai Điệu Phái Đẹp"',
    fullTitle: 'Lộc Lá #04 + Thử thách "Giai Điệu Phái Đẹp"',
    description:
      "Mời một người hỗ trợ tự nguyện hát một câu yêu thích, hoặc cùng cả bàn chọn một bài để nghe. Có thể đổi sang một lời chúc hoặc bỏ qua.",
    badge: "🎤 Giai Điệu Phái Đẹp",
  },
  {
    id: "loc-la-05",
    code: "Lộc Lá #05",
    title: 'Thử thách "Lời Chúc Chung"',
    fullTitle: 'Lộc Lá #05 + Thử thách "Lời Chúc Chung"',
    description:
      "Mời một người hỗ trợ tự nguyện gửi lời chúc 20/10 cùng cả bàn. Mỗi người tự chọn đồ uống và lượng dùng; không yêu cầu uống cạn. Có thể bỏ qua.",
    badge: "🥂 Lời Chúc Chung",
  },
  {
    id: "loc-la-06",
    code: "Lộc Lá #06",
    title: 'Thử thách "Quyền Lựa Chọn"',
    fullTitle: 'Lộc Lá #06 + Thử thách "Quyền Lựa Chọn"',
    description:
      "Bạn có thể đề nghị một việc nhỏ, lịch sự mà cả hai cùng thấy thoải mái, hoặc nhận một lời chúc từ anh em. Người được mời có thể từ chối; cả hai đều có thể đổi thử thách hoặc bỏ qua.",
    badge: "👑 Quyền Lựa Chọn",
  },
  {
    id: "loc-la-07",
    code: "Lộc Lá #07",
    title: 'Thử thách "Đại Sứ Nụ Cười"',
    fullTitle: 'Lộc Lá #07 + Thử thách "Đại Sứ Nụ Cười"',
    description:
      "Mời một người hỗ trợ tự nguyện kể một câu chuyện vui ngắn mà không tiết lộ chuyện riêng của người khác. Có thể đổi thử thách hoặc bỏ qua.",
    badge: "😄 Đại Sứ Nụ Cười",
  },
  {
    id: "loc-la-08",
    code: "Lộc Lá #08",
    title: 'Thử thách "Chuyên Gia Pha Chế"',
    fullTitle: 'Lộc Lá #08 + Thử thách "Chuyên Gia Pha Chế"',
    description:
      "Mời một người hỗ trợ tự nguyện giúp lấy món hoặc đồ uống bạn đã chọn. Hỏi trước về nhu cầu ăn uống; không ép thử món. Có thể đổi thử thách hoặc bỏ qua.",
    badge: "🍹 Người Hỗ Trợ",
  },
  {
    id: "loc-la-09",
    code: "Lộc Lá #09",
    title: 'Thử thách "Phóng Viên Đêm Tiệc"',
    fullTitle: 'Lộc Lá #09 + Thử thách "Phóng Viên Đêm Tiệc"',
    description:
      "Nếu bạn muốn, mời một người hỗ trợ tự nguyện quay một clip ngắn. Chỉ quay và chia sẻ khi mọi người xuất hiện đều đồng ý; có thể thay bằng một lời chúc hoặc bỏ qua.",
    badge: "🎬 Đạo Diễn Triệu View",
  },
  {
    id: "loc-la-10",
    code: "Lộc Lá #10",
    title: 'Thử thách "Lời Chúc Vàng Mười"',
    fullTitle: 'Lộc Lá #10 + Thử thách "Lời Chúc Vàng Mười"',
    description:
      "Mời một người hỗ trợ tự nguyện đọc hai câu thơ yêu thích hoặc gửi một lời chúc 20/10. Không cần ứng tác hay nhắc tên riêng; có thể đổi thử thách hoặc bỏ qua.",
    badge: "📜 Thi Sĩ KTCNMT",
  },
];

// Thông tin đã xác nhận được giữ nguyên; chưa có xác nhận thì không tự điền.
export const EVENT_INFO = {
  title: "KTCNMT · Chúc mừng ngày 20/10",
  department: "Phòng Kỹ thuật Công nghệ Môi trường",
  organization: "Tổng công ty Cảng hàng không Việt Nam (ACV)",
  dinner: {
    date: "19/10/2026",
    time: "19:00",
    displayTime: "19:00 | Thứ Hai 19/10/2026",
    venue: "The Street (Chi nhánh 9)",
    address: "134 Nguyễn Thái Học, P. Bến Thành, Quận 1, TP.HCM",
    mapsUrl: "https://maps.app.goo.gl/j3tjn4kV7pEUrBmY7",
  },
  sharedRide: {
    departure: "17h00",
    time: "17h00 · Thứ Hai, 19/10/2026",
    meetingPoint: "2 Sông Đáy",
    destination: "134 Nguyễn Thái Học",
    estimate: "45–60 phút",
    mapsUrl:
      "https://www.google.com/maps/dir/?api=1&origin=2+S%C3%B4ng+%C4%90%C3%A1y,+TP.HCM&destination=134+Nguy%E1%BB%85n+Th%C3%A1i+H%E1%BB%8Dc,+TP.HCM&travelmode=driving",
  },
} as const;

export const RESTAURANT_INFO = {
  name: EVENT_INFO.dinner.venue,
  time: EVENT_INFO.dinner.displayTime,
  address: EVENT_INFO.dinner.address,
  mapsUrl: EVENT_INFO.dinner.mapsUrl,
};

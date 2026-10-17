export type Gender = "female" | "male";

export interface StaffMember {
  id: string;
  fullName: string;
  shortName: string;
  dob: string;
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
    dob: "15/11/1994",
    gender: "female",
    wish: "Chúc Quỳnh Như luôn giữ vững nét thanh lịch, trẻ trung, rạng rỡ và mãi là nhịp cầu gắn kết ấm áp của đại gia đình KTCNMT!",
  },
  {
    id: "ngoc-anh",
    fullName: "Phạm Thị Ngọc Ánh",
    shortName: "Ngọc Ánh",
    dob: "21/08/1999",
    gender: "female",
    wish: "Chúc Ngọc Ánh luôn tỏa sáng rạng ngời như chính tên gọi của mình, công việc hanh thông và mỗi ngày đều ngập tràn niềm vui!",
  },
  {
    id: "my-dung",
    fullName: "Lê Ngọc Mỹ Dung",
    shortName: "Mỹ Dung",
    dob: "13/09/2000",
    gender: "female",
    wish: "Chúc Mỹ Dung tuổi trẻ rực rỡ, xinh đẹp bất chấp mọi deadline và luôn giữ nguồn năng lượng tích cực, tươi mới!",
  },
  {
    id: "quynh-nga",
    fullName: "Phan Quỳnh Nga",
    shortName: "Quỳnh Nga",
    dob: "18/06/2001",
    gender: "female",
    wish: "Chúc Quỳnh Nga luôn giữ nụ cười tươi tắn, duyên dáng, tự tin tỏa sáng và gặt hái thật nhiều điều tuyệt vời!",
  },
  {
    id: "mong-bang",
    fullName: "Lâm Thị Mộng Băng",
    shortName: "Mộng Băng",
    dob: "13/03/2004",
    gender: "female",
    wish: "Chúc cô em út Mộng Băng luôn hồn nhiên, xinh đẹp, bắt trọn mọi trend và luôn được cả phòng yêu thương hết mực!",
  },

  // Nhóm 2: 08 Anh Em Nam – "🥂 08 Anh Em KTCNMT"
  {
    id: "trung-kien",
    fullName: "Phạm Trung Kiên",
    shortName: "Anh Kiên",
    dob: "08/09/1974",
    gender: "male",
  },
  {
    id: "huy-duong",
    fullName: "Vũ Huy Dương",
    shortName: "Anh Dương",
    dob: "25/01/1984",
    gender: "male",
    isHost: true,
  },
  {
    id: "anh-thai",
    fullName: "Nguyễn Anh Thái",
    shortName: "Anh Thái",
    dob: "11/11/1991",
    gender: "male",
  },
  {
    id: "manh-cuong",
    fullName: "Nguyễn Mạnh Cường",
    shortName: "Anh Cường",
    dob: "10/01/1993",
    gender: "male",
  },
  {
    id: "van-thuan",
    fullName: "Nguyễn Văn Thuận",
    shortName: "Văn Thuận",
    dob: "20/03/1998",
    gender: "male",
  },
  {
    id: "ba-kien",
    fullName: "Hoàng Bá Kiên",
    shortName: "Bá Kiên",
    dob: "06/02/2000",
    gender: "male",
  },
  {
    id: "gia-khang",
    fullName: "Trần Gia Khang",
    shortName: "Gia Khang",
    dob: "07/12/2001",
    gender: "male",
  },
  {
    id: "hai-minh",
    fullName: "Lương Hải Minh",
    shortName: "Hải Minh",
    dob: "16/07/2003",
    gender: "male",
  },
];

export const FEMALE_MEMBERS = STAFF_MEMBERS.filter((m) => m.gender === "female");
export const MALE_MEMBERS = STAFF_MEMBERS.filter((m) => m.gender === "male");

export const SPECIAL_GUEST_ID = "guest-plus-one";

export const MILK_TEA_MENU = [
  {
    id: "olong-hoang-kim",
    name: "Trà Ô Long Sữa Trân Châu Hoàng Kim",
    tag: "Best Seller ✨",
    icon: "🧋",
  },
  {
    id: "hong-tra-kem-cheese",
    name: "Hồng Trà Sữa Kem Cheese",
    tag: "Béo ngậy 🧀",
    icon: "🥛",
  },
  {
    id: "ba-tuoc-tran-chau-trang",
    name: "Trà Sữa Bá Tước Trân Châu Trắng",
    tag: "Thơm dịu 🌸",
    icon: "🫖",
  },
  {
    id: "olong-dao-cam-sa",
    name: "Trà Ô Long Đào Cam Sả (Thanh mát)",
    tag: "Fresh 🍑",
    icon: "🍹",
  },
  {
    id: "matcha-latte-kem-sua",
    name: "Matcha Latte Kem Sữa",
    tag: "Trendy 🍵",
    icon: "🍵",
  },
] as const;

export const SUGAR_LEVELS = [
  "30% đường",
  "50% đường",
  "70% đường",
  "100% đường",
] as const;

export const ICE_LEVELS = ["Ít đá", "Đá bình thường"] as const;

export type MaleTransportOptionId = "car" | "grab" | "vanguard";

export const MALE_TRANSPORT_OPTIONS: {
  id: MaleTransportOptionId;
  label: string;
  shortLabel: string;
}[] = [
  {
    id: "car",
    label: "🚗 Có Ô tô cá nhân (hỗ trợ đón chị em từ cơ quan ra The Street)",
    shortLabel: "🚗 Có Ô tô cá nhân đón chị em",
  },
  {
    id: "grab",
    label: "🚕 Sẵn sàng ghép GrabCar đi cùng chị em ra quán",
    shortLabel: "🚕 Ghép GrabCar cùng chị em",
  },
  {
    id: "vanguard",
    label: "🛵 Đội Tiên phong: Chạy qua The Street trước nhận Hoa tươi & giữ bàn",
    shortLabel: "🛵 Tiên phong (Nhận hoa & giữ bàn)",
  },
];

export const QUICK_WISH_SUGGESTIONS = [
  {
    label: "🌸 Rạng rỡ & Hạnh phúc",
    text: "Chúc 05 bông hoa KTCNMT và các chị khách quý dịp 20/10 luôn trẻ trung, rạng rỡ, ngập tràn niềm vui và mãi là nguồn năng lượng ấm áp của đại gia đình KTCNMT!",
  },
  {
    label: "✨ Xinh đẹp vượt mọi Deadline",
    text: "Nhân ngày Phụ nữ Việt Nam 20/10, chúc phái đẹp phòng KTCNMT luôn xinh đẹp bất chấp mọi dự án, công việc hanh thông, cười tươi mỗi ngày và hạnh phúc trọn vẹn!",
  },
  {
    label: "🥂 Lung linh & Lộc lá đầy tay",
    text: "Chúc chị em tối 19/10 lên hình thật lung linh tại The Street, xé túi mù trúng lộc lớn và sáng 20/10 thưởng thức trà sữa thật ngọt ngào nhé!",
  },
];

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
    title: 'Lệnh Bài "Thợ Ảnh Có Tâm"',
    fullTitle: 'Lộc Lá #01 + Lệnh Bài "Thợ Ảnh Có Tâm"',
    description:
      'Chỉ định 01 chàng trai dùng điện thoại chụp ngay cho chủ nhân chiếc túi này 03 bức ảnh chân dung "thần thái nhất đêm nay" tại bàn tiệc. Chưa ưng ý chưa được ngồi xuống!',
    badge: "📸 Paparazzi VIP",
  },
  {
    id: "loc-la-02",
    code: "Lộc Lá #02",
    title: 'Lệnh Bài "Ba Mỹ Từ Tôn Vinh"',
    fullTitle: 'Lộc Lá #02 + Lệnh Bài "Ba Mỹ Từ Tôn Vinh"',
    description:
      "Chỉ định 01 chàng trai nhìn thẳng vào chủ nhân chiếc túi và nói liên tục 03 lời khen thật lòng, không trùng lặp trong vòng 15 giây (nếu ấp úng sẽ nâng ly 100%).",
    badge: "💎 Ba Mỹ Từ Tôn Vinh",
  },
  {
    id: "loc-la-03",
    code: "Lộc Lá #03",
    title: 'Lệnh Bài "Quản Gia Hoàng Gia"',
    fullTitle: 'Lộc Lá #03 + Lệnh Bài "Quản Gia Hoàng Gia"',
    description:
      'Chỉ định 01 chàng trai làm "Trợ lý riêng" phục vụ gắp mồi ngon, châm đá, lấy khăn giấy tại bàn tiệc trong suốt 15 phút tiếp theo.',
    badge: "🍽️ Quản Gia Hoàng Gia",
  },
  {
    id: "loc-la-04",
    code: "Lộc Lá #04",
    title: 'Lệnh Bài "Giai Điệu Phái Đẹp"',
    fullTitle: 'Lộc Lá #04 + Lệnh Bài "Giai Điệu Phái Đẹp"',
    description:
      'Chàng trai được chọn (cùng sự hỗ trợ của anh em trên bàn) phải hát vang 02 câu hát bất kỳ có chứa chữ "Hoa", "Đẹp" hoặc "Yêu" để tặng riêng cho bạn!',
    badge: "🎤 Giai Điệu Phái Đẹp",
  },
  {
    id: "loc-la-05",
    code: "Lộc Lá #05",
    title: 'Lệnh Bài "Nâng Ly Giao Hảo"',
    fullTitle: 'Lộc Lá #05 + Lệnh Bài "Nâng Ly Giao Hảo"',
    description:
      "Đặc quyền chỉ định 01 chàng trai đứng lên gửi một lời chúc 20/10 thật ấn tượng và đại diện uống cạn 100% ly mừng cùng cả bàn tiệc!",
    badge: "🥂 Nâng Ly Giao Hảo",
  },
  {
    id: "loc-la-06",
    code: "Lộc Lá #06",
    title: 'Lệnh Bài "Đặc Quyền Nữ Hoàng"',
    fullTitle: 'Lộc Lá #06 + Lệnh Bài "Đặc Quyền Nữ Hoàng"',
    description:
      'Bạn nắm giữ "Kim Bài Miễn Tử" – được quyền chỉ định 01 chàng trai thực hiện bất kỳ 01 yêu cầu lịch sự, vui vẻ nào ngay tại bàn tiệc (hoặc nhận 1 lời cảm ơn thật tình cảm từ người thương/đại diện anh em)!',
    badge: "👑 Kim Bài Miễn Tử",
  },
  {
    id: "loc-la-07",
    code: "Lộc Lá #07",
    title: 'Lệnh Bài "Đại Sứ Nụ Cười"',
    fullTitle: 'Lộc Lá #07 + Lệnh Bài "Đại Sứ Nụ Cười"',
    description:
      "Chỉ định 01 chàng trai kể một câu chuyện vui hoặc tạo 03 dáng pose ảnh độc lạ nhất để cả bàn tiệc cùng thả tim và cười thật sảng khoái!",
    badge: "😄 Đại Sứ Nụ Cười",
  },
  {
    id: "loc-la-08",
    code: "Lộc Lá #08",
    title: 'Lệnh Bài "Chuyên Gia Pha Chế"',
    fullTitle: 'Lộc Lá #08 + Lệnh Bài "Chuyên Gia Pha Chế"',
    description:
      "Chỉ định 01 chàng trai đích thân chuẩn bị ly thức uống ngon nhất kèm 01 món ăn tâm đắc nhất trên bàn tiệc mời tận tay Nữ Chủ Nhân!",
    badge: "🍹 Bartender Riêng",
  },
  {
    id: "loc-la-09",
    code: "Lộc Lá #09",
    title: 'Lệnh Bài "Phóng Viên Đêm Tiệc"',
    fullTitle: 'Lộc Lá #09 + Lệnh Bài "Phóng Viên Đêm Tiệc"',
    description:
      "Chỉ định 01 chàng trai quay ngay 01 clip Boomerang / Story ngắn 10 giây thật lung linh của Nữ Chủ Nhân cùng hội chị em tại The Street!",
    badge: "🎬 Đạo Diễn Triệu View",
  },
  {
    id: "loc-la-10",
    code: "Lộc Lá #10",
    title: 'Lệnh Bài "Lời Chúc Vàng Mười"',
    fullTitle: 'Lộc Lá #10 + Lệnh Bài "Lời Chúc Vàng Mười"',
    description:
      "Chỉ định 01 chàng trai ứng tác ngay 02 câu thơ hoặc câu đối thật kêu có nhắc tới tên của Nữ Chủ Nhân để chúc mừng ngày 20/10!",
    badge: "📜 Thi Sĩ KTCNMT",
  },
];

export const RESTAURANT_INFO = {
  name: "The Street (Chi nhánh 9)",
  time: "19:00 | Thứ Hai 19/10/2026",
  address: "134 Nguyễn Thái Học, P. Bến Thành, Quận 1, TP.HCM",
  mapsUrl: "https://maps.app.goo.gl/j3tjn4kV7pEUrBmY7",
};

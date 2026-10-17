# Product Context: KTCNMT 20/10 Event Web App

## Target Users
- **05 Female Members ("05 Bông Hoa KTCNMT"):** Quỳnh Như, Ngọc Ánh, Mỹ Dung, Quỳnh Nga, Mộng Băng.
- **08 Male Members ("08 Anh Em KTCNMT"):** Anh Kiên, Anh Dương (Host), Anh Thái, Anh Cường, Văn Thuận, Bá Kiên, Gia Khang, Hải Minh.
- **01 Special Guest (+1):** Spouse/partner accompanying a male member (total 14 attendees at the dinner table).

## Key Experience Principles
- **Equal & Warm Atmosphere:** Never display job titles or positions anywhere in the UI; only display avatars and friendly names (`shortName` / `fullName`).
- **Tech-Luxury Evening Party Aesthetic:** Dark Rose-Gold & Warm Amber palette (`from-slate-950 via-rose-950/90 to-slate-900`), glassmorphism cards (`bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl shadow-xl`), mobile-first `max-w-md mx-auto` shell, minimum `44px` touch targets with `active:scale-95`.
- **Frictionless Identity & Secret Reset:** Netflix-style Avatar Picker on first visit saved to `localStorage` (`ktcnmt_user_id`), with a hidden Triple-Tap gesture ($\le 800\text{ms}$) on the top-right header avatar to reset user selection.

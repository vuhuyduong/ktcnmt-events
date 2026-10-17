"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Gender } from "@/data/roster";

export type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

export interface MemberAvatarProps {
  id: string;
  name: string;
  fullName?: string;
  gender: Gender;
  size?: AvatarSize;
  checkedIn?: boolean;
  highlight?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<
  AvatarSize,
  { wrapper: string; text: string; badge: string; badgeIcon: number }
> = {
  sm: {
    wrapper: "w-9 h-9", // 36x36px
    text: "text-xs",
    badge: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    badgeIcon: 9,
  },
  md: {
    wrapper: "w-12 h-12", // 48x48px
    text: "text-sm",
    badge: "w-4 h-4 -bottom-0.5 -right-0.5",
    badgeIcon: 10,
  },
  lg: {
    wrapper: "w-16 h-16", // 64x64px (Gentlemen grid)
    text: "text-base",
    badge: "w-5 h-5 bottom-0 right-0",
    badgeIcon: 12,
  },
  xl: {
    wrapper: "w-20 h-20", // 80x80px (Queens spotlight grid)
    text: "text-xl",
    badge: "w-6 h-6 bottom-0 right-0",
    badgeIcon: 14,
  },
  "2xl": {
    wrapper: "w-24 h-24", // 96x96px (VIP Card / Stage Spotlight)
    text: "text-2xl",
    badge: "w-6 h-6 bottom-0.5 right-0.5",
    badgeIcon: 14,
  },
};

const FEMALE_GRADIENTS = [
  "from-rose-500 via-pink-500 to-amber-400",
  "from-fuchsia-500 via-rose-400 to-amber-300",
  "from-pink-500 via-rose-500 to-orange-300",
  "from-rose-600 via-pink-400 to-yellow-300",
  "from-purple-500 via-pink-500 to-amber-300",
];

const MALE_GRADIENTS = [
  "from-amber-500 via-orange-500 to-yellow-500",
  "from-slate-700 via-amber-600 to-orange-400",
  "from-orange-500 via-amber-500 to-yellow-400",
  "from-amber-600 via-orange-500 to-amber-300",
];

const AVATAR_FOCUS_CLASSES: Record<string, string> = {
  "quynh-nhu": "object-cover object-[center_22%]",
  "ngoc-anh": "object-cover object-[center_35%]",
  "my-dung": "object-cover object-[center_28%]",
  "quynh-nga": "object-cover object-[49%_20%] scale-[1.75] origin-[49%_20%]",
  "mong-bang": "object-cover object-[50%_39%] scale-[1.85] origin-[50%_39%]",
  "anh-thai": "object-cover object-[48%_19%] scale-[1.75] origin-[48%_19%]",
  "manh-cuong": "object-cover object-[center_22%]",
  "van-thuan": "object-cover object-[45%_28%] scale-[1.45] origin-[45%_28%]",
  "ba-kien": "object-cover object-[center_22%]",
  "gia-khang": "object-cover object-[center_25%]",
  "hai-minh": "object-cover object-[center_24%]",
};

export function getInitials(name: string, fullName?: string): string {
  const source = (fullName || name || "KT").trim();
  const clean = source.replace(/^(Anh|Chị|Bạn|Cô)\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KT";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const secondLast = parts[parts.length - 2][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return `${secondLast}${last}`.toUpperCase();
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  id,
  name,
  fullName,
  gender,
  size = "lg",
  checkedIn = false,
  highlight = false,
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [id]);

  const sizeCfg = SIZE_CLASSES[size];
  const initials = getInitials(name, fullName);
  const hash = hashId(id);

  const bgGradient =
    gender === "female"
      ? FEMALE_GRADIENTS[hash % FEMALE_GRADIENTS.length]
      : MALE_GRADIENTS[hash % MALE_GRADIENTS.length];

  const ringClass =
    gender === "female"
      ? highlight
        ? "p-[3px] bg-gradient-to-tr from-rose-400 via-pink-200 to-amber-200 shadow-[0_0_24px_rgba(251,113,133,0.65)]"
        : "p-[2.5px] bg-gradient-to-tr from-rose-400 via-pink-300 to-amber-200 shadow-[0_0_16px_rgba(251,113,133,0.4)]"
      : highlight
      ? "p-[3px] bg-gradient-to-tr from-amber-300 via-orange-400 to-yellow-200 shadow-[0_0_24px_rgba(251,191,36,0.65)]"
      : "p-[2px] bg-gradient-to-tr from-amber-400/90 via-orange-300/80 to-slate-500/80 shadow-[0_0_12px_rgba(251,191,36,0.25)]";

  const imgFocusClass =
    AVATAR_FOCUS_CLASSES[id] || "object-cover object-center";

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${sizeCfg.wrapper} ${ringClass} ${className}`}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
        {!imgError ? (
          <img
            src={`/avatars/${id}.jpg`}
            alt={name}
            onError={() => setImgError(true)}
            className={`w-full h-full rounded-full ${imgFocusClass}`}
          />
        ) : (
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center font-bold tracking-wider text-white drop-shadow-sm ${sizeCfg.text}`}
          >
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              {initials}
            </span>
          </div>
        )}
      </div>

      {checkedIn && (
        <span
          title="Đã xác nhận tham dự"
          className={`absolute ${sizeCfg.badge} rounded-full bg-emerald-500 border-2 border-slate-950 text-white flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.8)] z-10`}
        >
          <Check size={sizeCfg.badgeIcon} strokeWidth={3.5} />
        </span>
      )}
    </div>
  );
};

export default MemberAvatar;

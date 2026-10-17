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

// Only request portraits that exist. Members without a supplied photo use initials.
const AVATAR_IMAGES: Record<string, { width: number; height: number }> = {
  "quynh-nhu": { width: 384, height: 384 },
  "ngoc-anh": { width: 328, height: 384 },
  "my-dung": { width: 384, height: 384 },
  "quynh-nga": { width: 381, height: 384 },
  "mong-bang": { width: 288, height: 384 },
  "anh-thai": { width: 364, height: 384 },
  "manh-cuong": { width: 288, height: 384 },
  "van-thuan": { width: 384, height: 381 },
  "ba-kien": { width: 256, height: 384 },
  "gia-khang": { width: 256, height: 384 },
  "hai-minh": { width: 254, height: 384 },
};

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
  const portrait = AVATAR_IMAGES[id];
  const initialColors =
    gender === "female"
      ? "bg-[#f3dce0] text-[#733947]"
      : "bg-[#e3eadd] text-[#365b4c]";
  const ringClass = highlight ? "p-[3px] bg-[#d88b9b]" : "p-[2px] bg-[#d6c8bf]";

  const imgFocusClass =
    AVATAR_FOCUS_CLASSES[id] || "object-cover object-center";

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${sizeCfg.wrapper} ${ringClass} ${className}`}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#f3e6dc] flex items-center justify-center">
        {portrait && !imgError ? (
          <img
            src={`/avatars/${id}.webp`}
            width={portrait.width}
            height={portrait.height}
            loading="lazy"
            decoding="async"
            alt={fullName || name}
            onError={() => setImgError(true)}
            className={`w-full h-full rounded-full ${imgFocusClass}`}
          />
        ) : (
          <div
            className={`w-full h-full rounded-full ${initialColors} flex items-center justify-center font-semibold tracking-wide ${sizeCfg.text}`}
          >
            <span role="img" aria-label={fullName || name}>
              {initials}
            </span>
          </div>
        )}
      </div>

      {checkedIn && (
        <span
          title="Đã xác nhận tham dự"
          className={`absolute ${sizeCfg.badge} rounded-full bg-[#e3eadd] border-2 border-[#fff8f3] text-[#365b4c] flex items-center justify-center z-10`}
        >
          <Check size={sizeCfg.badgeIcon} strokeWidth={3.5} />
        </span>
      )}
    </div>
  );
};

export default MemberAvatar;

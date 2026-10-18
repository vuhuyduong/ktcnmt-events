"use client";

import { useEffect, useState } from "react";

// Explicit UTC+07:00 times keep each phase identical on every device.
const DINNER = {
  target: Date.parse("2026-10-19T19:00:00+07:00"),
  label: "19:00 · 19/10/2026 · Giờ Việt Nam",
  ariaLabel: "Đếm ngược tới 19 giờ ngày 19 tháng 10 năm 2026, giờ Việt Nam",
};
const MORNING = {
  target: Date.parse("2026-10-20T08:00:00+07:00"),
  label: "08:00 · 20/10/2026 · Giờ Việt Nam",
  ariaLabel: "Đếm ngược tới 8 giờ ngày 20 tháng 10 năm 2026, giờ Việt Nam",
};
const SWITCH_TIME = Date.parse("2026-10-19T20:00:00+07:00");

export function getEventCountdown(now: number) {
  if (now >= MORNING.target) return null;
  const phase = now >= SWITCH_TIME ? MORNING : DINNER;
  return {
    ...phase,
    remaining: Math.max(0, Math.floor((phase.target - now) / 1000)),
  };
}

export default function EventCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const countdown = getEventCountdown(now ?? 0);
  if (!countdown) return null;
  const remaining = now === null ? null : countdown.remaining;
  const values =
    remaining === null
      ? [null, null, null, null]
      : [
          Math.floor(remaining / 86400),
          Math.floor(remaining / 3600) % 24,
          Math.floor(remaining / 60) % 60,
          remaining % 60,
        ];
  return (
    <section
      className="event-countdown"
      aria-label={countdown.ariaLabel}
    >
      <div className="countdown-copy">
        <span className="countdown-eyebrow">Cùng chờ khoảnh khắc 20 · 10</span>
        <p>
          {remaining === 0
            ? "Chúc mừng ngày Phụ nữ Việt Nam ♡"
            : "Gửi yêu thương, đếm từng giây."}
        </p>
        <small>{countdown.label}</small>
      </div>
      <div className="countdown-digits" role="timer" aria-live="off">
        {values.map((value, i) => (
          <div className="countdown-unit" key={i}>
            <span>
              {value === null ? "––" : String(value).padStart(2, "0")}
            </span>
            <small>{["Ngày", "Giờ", "Phút", "Giây"][i]}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

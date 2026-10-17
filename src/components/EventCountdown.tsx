"use client";

import { useEffect, useState } from "react";

// An explicit UTC+07:00 target keeps the countdown identical on every device.
const TARGET = Date.parse("2026-10-20T19:00:00+07:00");
export default function EventCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.floor((TARGET - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
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
      aria-label="Đếm ngược tới 19 giờ ngày 20 tháng 10 năm 2026, giờ Việt Nam"
    >
      <div className="countdown-copy">
        <span className="countdown-eyebrow">Cùng chờ khoảnh khắc 20 · 10</span>
        <p>
          {remaining === 0
            ? "Chúc mừng ngày Phụ nữ Việt Nam ♡"
            : "Gửi yêu thương, đếm từng giây."}
        </p>
        <small>19:00 · 20/10/2026 · Giờ Việt Nam</small>
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

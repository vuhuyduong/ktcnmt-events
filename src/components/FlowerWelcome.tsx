"use client";

import { useEffect, useState } from "react";

export default function FlowerWelcome({ memberId }: { memberId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 4200);
    return () => clearTimeout(timer);
  }, [memberId]);
  if (!show) return null;
  return (
    <div className="flower-welcome" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={
            {
              left: `${(i * 37 + 5) % 100}%`,
              animationDelay: `${(i % 7) * 0.14}s`,
              animationDuration: `${2.6 + (i % 4) * 0.2}s`,
              fontSize: `${19 + (i % 4) * 6}px`,
              "--drift": `${(i % 2 ? 1 : -1) * (35 + (i % 5) * 14)}px`,
            } as React.CSSProperties
          }
        >
          {["🌸", "🌷", "✿", "🌼"][i % 4]}
        </span>
      ))}
    </div>
  );
}

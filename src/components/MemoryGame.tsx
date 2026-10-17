"use client";

import { useEffect, useRef, useState } from "react";

const motifs = [
  { symbol: "🌸", name: "Hoa anh đào" },
  { symbol: "🌷", name: "Hoa tulip" },
  { symbol: "🌼", name: "Hoa cúc" },
  { symbol: "🍃", name: "Lá xanh" },
  { symbol: "♡", name: "Trái tim" },
  { symbol: "KT", name: "KTCNMT" },
];
function deck() {
  const cards = motifs.flatMap((motif, pair) =>
    [0, 1].map((copy) => ({ ...motif, pair, id: `${pair}-${copy}` })),
  );
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export default function MemoryGame() {
  const [cards, setCards] = useState<ReturnType<typeof deck>>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [announcement, setAnnouncement] = useState(
    "Lật hai thẻ để tìm một đôi giống nhau nhé.",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setCards(deck());
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  function restart() {
    if (timer.current) clearTimeout(timer.current);
    setCards(deck());
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setAnnouncement("Đã xáo thẻ. Mình chơi một ván mới nhé!");
  }
  function flip(index: number) {
    if (
      open.length === 2 ||
      open.includes(index) ||
      matched.includes(cards[index].pair)
    )
      return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 1) {
      setAnnouncement(`Bạn vừa lật ${cards[index].name}. Tìm thẻ còn lại nhé.`);
      return;
    }
    setMoves((value) => value + 1);
    if (cards[next[0]].pair === cards[index].pair) {
      const pairs = [...matched, cards[index].pair];
      setMatched(pairs);
      setOpen([]);
      setAnnouncement(
        pairs.length === motifs.length
          ? "Đủ sáu đôi rồi! Một vườn hoa nhỏ dành cho bạn ♡"
          : `Đúng đôi ${cards[index].name}! Đã tìm ${pairs.length} trên 6 đôi.`,
      );
    } else {
      setAnnouncement("Chưa thành đôi. Nhớ vị trí rồi mình thử tiếp nhé.");
      timer.current = setTimeout(() => {
        setOpen([]);
        timer.current = null;
      }, 1100);
    }
  }
  return (
    <div className="memory-game">
      <div className="memory-intro">
        <span aria-hidden="true">✿</span>
        <h2>Lật thẻ tìm đôi</h2>
        <p>
          Trong lúc chờ buổi hẹn, ghé chơi một vườn hoa nhỏ. Không cần vội, cứ
          vui thôi.
        </p>
      </div>
      <div className="memory-count">
        <span>{matched.length}/6 đôi hoa</span>
        <span>{moves} lượt lật</span>
      </div>
      <div className="memory-grid" aria-label="Mười hai thẻ tìm đôi">
        {cards.map((card, index) => {
          const isMatched = matched.includes(card.pair),
            visible = isMatched || open.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${visible ? "flipped" : ""} ${isMatched ? "matched" : ""}`}
              onClick={() => flip(index)}
              disabled={isMatched || open.includes(index) || open.length === 2}
              aria-label={`Thẻ ${index + 1}, ${visible ? card.name + (isMatched ? ", đã tìm thành đôi" : "") : "chưa lật"}`}
              aria-pressed={visible}
            >
              <span aria-hidden="true">{visible ? card.symbol : "✿"}</span>
              <small aria-hidden="true">
                {visible ? (isMatched ? "Thành đôi" : card.name) : "KTCNMT"}
              </small>
            </button>
          );
        })}
      </div>
      <p className="memory-status" role="status" aria-live="polite">
        {announcement}
      </p>
      <button type="button" className="quiet-button" onClick={restart}>
        Xáo thẻ, chơi lại ↻
      </button>
      <p className="hint">
        Chơi riêng trên máy bạn, không tính vào lượt mở quà của buổi tối.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { STAFF_MEMBERS } from "@/data/roster";
import { formatDuration, type MemoryView } from "@/lib/social";
import MemberAvatar from "@/components/MemberAvatar";

const motifs = [
  { symbol: "🌸", name: "Hoa anh đào" },
  { symbol: "🌷", name: "Hoa tulip" },
  { symbol: "🌼", name: "Hoa cúc" },
  { symbol: "🍃", name: "Lá xanh" },
  { symbol: "♡", name: "Trái tim" },
  { symbol: "✦", name: "Ngôi sao" },
];

export default function MemoryGame({ memberId }: { memberId: string | null }) {
  const [data, setData] = useState<MemoryView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [identityChanged, setIdentityChanged] = useState(false);
  const identityMismatch = useRef(false);
  const [order, setOrder] = useState<"byFlips" | "byTime">("byFlips");
  const [now, setNow] = useState(0);
  const offset = useRef(0);
  const busy = useRef(false);
  const version = useRef(0);
  const run = data?.run;

  function apply(next: MemoryView) {
    offset.current = next.serverTime - Date.now();
    setData(next);
    setNow(next.serverTime);
  }
  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      if (
        busy.current ||
        identityMismatch.current ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      const seq = ++version.current;
      try {
        const response = await fetch(
          `/api/memory?memberId=${encodeURIComponent(memberId || "")}`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
          },
        );
        const next = await response.json();
        if (response.status === 401 || next.code === "SESSION_CHANGED") {
          if (!cancelled) {
            identityMismatch.current = true;
            setData(null);
            setIdentityChanged(true);
          }
          return;
        }
        if (!response.ok) throw new Error(next.error);
        if (!cancelled && seq === version.current) {
          apply(next);
          setError("");
        }
      } catch {
        if (!cancelled)
          setError("Chưa tải được ván chơi. Kiểm tra kết nối rồi thử lại nhé.");
      }
    };
    void fetchBoard();
    const poll = setInterval(() => void fetchBoard(), 15000);
    const tick = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => {
      cancelled = true;
      ++version.current;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [memberId]);

  async function act(action: "START" | "FLIP", index?: number) {
    if (!memberId || busy.current || identityChanged) return;
    busy.current = true;
    ++version.current;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, memberId, runId: run?.id, index }),
        signal: AbortSignal.timeout(12000),
      });
      const next = await response.json();
      if (response.status === 401 || next.code === "SESSION_CHANGED") {
        identityMismatch.current = true;
        setData(null);
        setIdentityChanged(true);
        return;
      }
      if (!response.ok) throw new Error(next.error);
      apply(next);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa lưu được. Hãy tải lại ván chơi trước khi lật tiếp.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const hiding = !!run?.hideAt && now >= run.hideAt;
  const duration = run?.startedAt ? (run.finishedAt || now) - run.startedAt : 0;
  if (identityChanged)
    return (
      <div role="alert">
        <h2>Profile đã thay đổi ở tab khác</h2>
        <p>Tải lại trang để tiếp tục chơi và ghi thành tích đúng người.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Tải lại profile
        </button>
      </div>
    );
  return (
    <div className="memory-game">
      <div className="memory-intro">
        <span aria-hidden="true">✿</span>
        <h2>Lật thẻ tìm đôi</h2>
        <p>
          Tìm đủ sáu đôi hoa, thử sức cùng mọi người. Mỗi lần mở một thẻ tính là
          một lần lật.
        </p>
      </div>
      {run ? (
        <>
          <div className="memory-count">
            <span>{run.matched.length}/6 đôi hoa</span>
            <span>{run.flips} lần lật</span>
            <span
              className="digital-time"
              aria-label={`Thời gian chơi ${formatDuration(duration)}`}
            >
              {formatDuration(duration)}
            </span>
          </div>
          <div
            className="memory-grid"
            aria-label="Mười hai thẻ tìm đôi"
            aria-busy={pending}
          >
            {run.cards.map((card, index) => {
              const isMatched =
                card.pair !== null && run.matched.includes(card.pair);
              const visible = card.pair !== null && (isMatched || !hiding);
              const motif = visible ? motifs[card.pair!] : null;
              return (
                <button
                  key={`${run.id}-${index}`}
                  type="button"
                  className={`memory-card ${visible ? "flipped" : ""} ${isMatched ? "matched" : ""}`}
                  onClick={() => void act("FLIP", index)}
                  disabled={
                    pending ||
                    !!run.finishedAt ||
                    isMatched ||
                    (run.open.includes(index) && !hiding) ||
                    (run.open.length === 2 && !hiding)
                  }
                  aria-label={`Thẻ ${index + 1}, ${motif ? motif.name + (isMatched ? ", đã tìm thành đôi" : "") : "chưa lật"}`}
                  aria-pressed={visible}
                >
                  <span aria-hidden="true">{motif?.symbol || "✿"}</span>
                  <small aria-hidden="true">
                    {motif ? (isMatched ? "Thành đôi" : motif.name) : "20 · 10"}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="memory-status" role="status">
            {run.finishedAt
              ? `Đủ sáu đôi rồi! ${run.flips} lần lật trong ${formatDuration(duration)}. Thành tích đã được lưu ♡`
              : run.open.length === 2 && !hiding
                ? "Chưa thành đôi. Nhớ vị trí rồi mình thử tiếp nhé."
                : run.open.length === 1
                  ? "Tìm thẻ còn lại của đôi hoa này nhé."
                  : "Lật hai thẻ để tìm một đôi giống nhau nhé."}
          </p>
        </>
      ) : (
        <div className="memory-start">
          <p>
            {memberId
              ? "Sẵn sàng mở một vườn hoa nhỏ?"
              : "Chọn ảnh của mình ở Nhà mình để chơi và ghi tên lên bảng xếp hạng nhé."}
          </p>
        </div>
      )}
      {memberId && (
        <button
          type="button"
          className={run ? "quiet-button" : "primary-button"}
          disabled={pending}
          onClick={() => void act("START")}
        >
          {pending
            ? "Đang lưu…"
            : run
              ? "Xáo thẻ, chơi lại ↻"
              : "Bắt đầu chơi →"}
        </button>
      )}
      {error && (
        <p className="feedback error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="quiet-button"
            onClick={() => window.location.reload()}
          >
            Tải lại ván chơi
          </button>
        </p>
      )}
      <p className="hint">
        Đồng hồ bắt đầu từ thẻ đầu tiên. Chỉ ván hoàn tất được xếp hạng; không
        tính vào lượt mở quà buổi tối.
      </p>
      <section className="leaderboard" aria-label="Bảng xếp hạng lật thẻ">
        <div className="section-row">
          <h3>Bảng xếp hạng</h3>
          <span aria-hidden="true">♛</span>
        </div>
        <div
          className="ranking-filters"
          role="group"
          aria-label="Xếp hạng theo"
        >
          <button
            type="button"
            aria-pressed={order === "byFlips"}
            onClick={() => setOrder("byFlips")}
          >
            Ít lần lật nhất
          </button>
          <button
            type="button"
            aria-pressed={order === "byTime"}
            onClick={() => setOrder("byTime")}
          >
            Nhanh nhất
          </button>
        </div>
        <p className="hint">
          {order === "byFlips"
            ? "Ưu tiên ít lần lật; bằng nhau thì ai nhanh hơn xếp trước."
            : "Ưu tiên thời gian; bằng nhau thì ai ít lần lật hơn xếp trước."}{" "}
          Mỗi người giữ một kỷ lục tốt nhất theo từng tiêu chí.
        </p>
        {!data ? (
          <p role="status">Đang tải bảng xếp hạng…</p>
        ) : data.leaderboards[order].length === 0 ? (
          <p className="ranking-empty">
            Chưa có thành tích. Bạn có muốn là người đầu tiên? ♡
          </p>
        ) : (
          <ol className="ranking-list">
            {data.leaderboards[order].map((score, i) => {
              const member = STAFF_MEMBERS.find(
                (m) => m.id === score.memberId,
              )!;
              return (
                <li
                  key={score.memberId}
                  className={score.memberId === memberId ? "your-rank" : ""}
                >
                  <span className="rank-number">{i + 1}</span>
                  <MemberAvatar
                    id={member.id}
                    name={member.shortName}
                    gender={member.gender}
                    size="sm"
                  />
                  <span className="rank-name">
                    {member.shortName}
                    {member.id === memberId && <small>Bạn</small>}
                  </span>
                  <span className="rank-score">
                    <strong>
                      {order === "byFlips"
                        ? `${score.flips} lần`
                        : formatDuration(score.durationMs)}
                    </strong>
                    <small>
                      {order === "byFlips"
                        ? formatDuration(score.durationMs)
                        : `${score.flips} lần lật`}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

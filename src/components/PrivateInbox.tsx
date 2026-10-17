"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { STAFF_MEMBERS } from "@/data/roster";
import type { PrivateMessage } from "@/lib/social";
import MemberAvatar from "@/components/MemberAvatar";

type Message = Omit<PrivateMessage, "requestId">;
type Draft = { content: string; requestId: string };
function requestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function sentTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrivateInbox({
  memberId,
  active,
  onUnread,
  onDirty,
}: {
  memberId: string;
  active: boolean;
  onUnread: (count: number) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const people = STAFF_MEMBERS.filter((m) => m.id !== memberId);
  const [recipientId, setRecipientId] = useState(people[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [identityChanged, setIdentityChanged] = useState(false);
  const seq = useRef(0);
  const sendBusy = useRef(false);
  const mounted = useRef(true);
  const mutating = useRef(0);
  const transcript = useRef<HTMLDivElement>(null);
  const recipient = people.find((m) => m.id === recipientId)!;
  const draft = drafts[recipientId]?.content || "";
  const conversation = messages.filter(
    (m) => m.senderId === recipientId || m.recipientId === recipientId,
  );
  const unread = messages.filter(
    (m) => m.recipientId === memberId && !m.readAt,
  );
  const hasUnread = unread.some((m) => m.senderId === recipientId);

  const refresh = useCallback(async () => {
    if (mutating.current || identityChanged) return;
    const version = ++seq.current;
    try {
      const response = await fetch(
        `/api/messages?memberId=${encodeURIComponent(memberId)}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        },
      );
      const data = await response.json();
      if (response.status === 401 || data.code === "SESSION_CHANGED") {
        if (mounted.current) {
          setMessages([]);
          setIdentityChanged(true);
        }
        return;
      }
      if (!response.ok) throw new Error(data.error);
      if (mounted.current && version === seq.current) {
        setMessages(data.messages);
        setLoaded(true);
        setError("");
      }
    } catch (e) {
      if (mounted.current && version === seq.current)
        setError(
          e instanceof Error
            ? e.message
            : "Chưa tải được hộp thư. Hãy thử lại nhé.",
        );
    }
  }, [memberId, identityChanged]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const tick = () => {
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh();
    };
    const timer = setInterval(tick, 10000);
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      mounted.current = false;
      ++seq.current;
      clearInterval(timer);
      window.removeEventListener("online", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);
  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);
  useEffect(() => {
    onUnread(unread.length);
  }, [unread.length, onUnread]);
  useEffect(() => {
    onDirty(Object.values(drafts).some((d) => !!d.content.trim()));
  }, [drafts, onDirty]);
  useEffect(() => {
    if (active && transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [active, recipientId, conversation.length]);

  useEffect(() => {
    if (!active || !loaded || !hasUnread || sending || identityChanged) return;
    let cancelled = false;
    mutating.current++;
    const version = ++seq.current;
    void (async () => {
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "READ",
            senderId: recipientId,
            memberId,
          }),
          signal: AbortSignal.timeout(12000),
        });
        const data = await response.json();
        if (response.status === 401 || data.code === "SESSION_CHANGED") {
          if (mounted.current) {
            setMessages([]);
            setIdentityChanged(true);
          }
          return;
        }
        if (!response.ok) throw new Error(data.error);
        if (!cancelled && mounted.current && version === seq.current)
          setMessages(data.messages);
      } catch {
        /* A later refresh retries read receipts without blocking the conversation. */
      } finally {
        mutating.current--;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    active,
    loaded,
    hasUnread,
    recipientId,
    sending,
    messages,
    identityChanged,
    memberId,
  ]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sendBusy.current || !draft.trim() || identityChanged) return;
    sendBusy.current = true;
    const sentTo = recipientId;
    const sentDraft = drafts[sentTo];
    setSending(true);
    setError("");
    setNotice("");
    mutating.current++;
    const version = ++seq.current;
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          senderId: memberId,
          recipientId: sentTo,
          ...sentDraft,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (response.status === 401 || data.code === "SESSION_CHANGED") {
        if (mounted.current) {
          setMessages([]);
          setIdentityChanged(true);
        }
        return;
      }
      if (!response.ok) throw new Error(data.error);
      if (!mounted.current || version !== seq.current) return;
      setMessages(data.messages);
      setLoaded(true);
      setDrafts((previous) =>
        previous[sentTo]?.requestId === sentDraft.requestId
          ? { ...previous, [sentTo]: { content: "", requestId: requestId() } }
          : previous,
      );
      setNotice(`Đã gửi tới ${recipient.shortName}.`);
    } catch (e) {
      if (mounted.current)
        setError(
          `${e instanceof Error ? e.message : "Chưa gửi được."} Lời nhắn đang nhập vẫn được giữ.`,
        );
    } finally {
      mutating.current--;
      sendBusy.current = false;
      if (mounted.current) setSending(false);
    }
  }
  if (!active) return null;
  if (identityChanged)
    return (
      <section className="card" role="alert">
        <h2>Profile đã thay đổi ở tab khác</h2>
        <p>
          Hộp thư đã tạm đóng để tránh gửi nhầm dưới tên người khác. Tải lại
          trang để mở đúng profile hiện tại.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Tải lại profile
        </button>
      </section>
    );
  return (
    <section className="card private-inbox" aria-label="Hộp thư riêng">
      <div className="inbox-intro">
        <p className="eyebrow">Một lời nhắn, dành riêng cho nhau</p>
        <h2>Hộp thư của bạn</h2>
        <p>
          Chọn một người để trò chuyện. Lời nhắn không xuất hiện trên tường lời
          chúc.
        </p>
        <p className="hint">
          Mỗi người hãy dùng đúng profile của mình để giữ lời nhắn riêng tư.
        </p>
      </div>
      <div className="inbox-layout">
        <aside className="inbox-people">
          <label htmlFor="message-recipient">Bạn muốn nhắn cho ai?</label>
          <select
            id="message-recipient"
            value={recipientId}
            onChange={(e) => {
              setRecipientId(e.target.value);
              setNotice("");
            }}
          >
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.shortName}
                {unread.some((msg) => msg.senderId === m.id)
                  ? " · Tin mới"
                  : ""}
              </option>
            ))}
          </select>
          <div className="conversation-list" aria-label="Các cuộc trò chuyện">
            {people.map((m) => {
              const count = unread.filter(
                (msg) => msg.senderId === m.id,
              ).length;
              const last = messages
                .filter(
                  (msg) => msg.senderId === m.id || msg.recipientId === m.id,
                )
                .at(-1);
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={m.id === recipientId}
                  onClick={() => {
                    setRecipientId(m.id);
                    setNotice("");
                  }}
                >
                  <MemberAvatar
                    id={m.id}
                    name={m.shortName}
                    gender={m.gender}
                    size="sm"
                  />
                  <span>
                    <strong>{m.shortName}</strong>
                    <small>
                      {drafts[m.id]?.content.trim()
                        ? "Bản nháp chưa gửi"
                        : last
                          ? (last.senderId === memberId ? "Bạn: " : "") +
                            last.content
                          : "Gửi một lời nhắn"}
                    </small>
                  </span>
                  {count > 0 && (
                    <b
                      className="unread-badge"
                      aria-label={`${count} tin chưa đọc`}
                    >
                      {count}
                    </b>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
        <div className="inbox-conversation">
          <div className="conversation-header">
            <MemberAvatar
              id={recipient.id}
              name={recipient.shortName}
              gender={recipient.gender}
              size="md"
            />
            <div>
              <h3>{recipient.shortName}</h3>
              <small>{recipient.fullName}</small>
            </div>
          </div>
          <div
            ref={transcript}
            className="message-transcript"
            role="log"
            aria-label={`Hội thoại với ${recipient.shortName}`}
            aria-live="polite"
            aria-relevant="additions"
          >
            {!loaded ? (
              <p className="empty-conversation">Đang mở hộp thư…</p>
            ) : !conversation.length ? (
              <p className="empty-conversation">
                Chưa có lời nhắn nào.
                <br />
                Gửi {recipient.shortName} một điều dễ thương nhé ♡
              </p>
            ) : (
              conversation.map((m) => (
                <article
                  key={m.id}
                  className={`message-bubble ${m.senderId === memberId ? "outgoing" : "incoming"}`}
                >
                  <span className="sr-only">
                    {m.senderId === memberId ? "Bạn" : recipient.shortName}
                    :{" "}
                  </span>
                  <p>{m.content}</p>
                  <small>
                    <time dateTime={m.createdAt}>{sentTime(m.createdAt)}</time>
                    {m.senderId === memberId &&
                      ` · ${m.readAt ? "Đã đọc" : "Đã gửi"}`}
                  </small>
                </article>
              ))
            )}
          </div>
          <form className="message-compose" onSubmit={send}>
            <label htmlFor="private-message">
              Lời nhắn tới {recipient.shortName}
            </label>
            <textarea
              id="private-message"
              rows={3}
              maxLength={2000}
              value={draft}
              placeholder="Viết một lời nhắn riêng…"
              onChange={(e) => {
                setDrafts((previous) => ({
                  ...previous,
                  [recipientId]: {
                    content: e.target.value,
                    requestId: requestId(),
                  },
                }));
                setNotice("");
              }}
            />
            <div className="section-row">
              <small>{draft.length}/2.000 ký tự</small>
              <button
                className="primary-button"
                type="submit"
                disabled={sending || !draft.trim() || !loaded}
              >
                <Send size={16} aria-hidden="true" />
                {sending ? "Đang gửi…" : "Gửi riêng"}
              </button>
            </div>
            {notice && (
              <p className="feedback success" role="status">
                {notice}
              </p>
            )}
          </form>
        </div>
      </div>
      {error && (
        <p className="feedback error" role="alert">
          {error}{" "}
          <button
            className="quiet-button"
            type="button"
            onClick={() => void refresh()}
          >
            Thử tải lại
          </button>
        </p>
      )}
    </section>
  );
}

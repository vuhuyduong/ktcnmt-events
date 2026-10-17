"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Calendar,
  Check,
  Gift,
  Heart,
  MapPin,
  MessageSquareHeart,
  Mail,
} from "lucide-react";
import EventCountdown from "@/components/EventCountdown";
import FlowerWelcome from "@/components/FlowerWelcome";
import PrivateInbox from "@/components/PrivateInbox";
import MemoryGame from "@/components/MemoryGame";
import MemberAvatar from "@/components/MemberAvatar";
import {
  BLIND_BOX_REWARDS,
  EVENT_INFO,
  MALE_TRANSPORT_OPTIONS,
  RESTAURANT_INFO,
  STAFF_MEMBERS,
} from "@/data/roster";
import type {
  GameState,
  MemberRsvp,
  QueenParticipant,
  WishItem,
} from "@/lib/store";

type Tab = "personal" | "wall" | "game" | "messages";
type Attendance = "attending" | "maybe" | "declined" | "";
type Session = {
  memberId: string | null;
  isAdmin: boolean;
};
type Snapshot = {
  rsvps: Record<string, MemberRsvp>;
  wishes: WishItem[];
  queens: QueenParticipant[];
  gameState: GameState;
};
const attendanceLabels = {
  attending: "Mình sẽ đến",
  maybe: "Mình cần thu xếp thêm",
  declined: "Mình không đến được",
};
const emptySnapshot: Snapshot = {
  rsvps: {},
  wishes: [],
  queens: [],
  gameState: {
    isLive: false,
    focusTimestamp: 0,
    phase: "WAITING",
    phaseStartedAt: 0,
    currentQueenId: "",
    activeBoxNumber: null,
    selectedMaleId: null,
    boxes: [],
    updatedAt: 0,
  },
};

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Chưa kết nối được. Vui lòng thử lại.");
  return data;
}
function dateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function EventApp() {
  const [tab, setTab] = useState<Tab>("personal");
  const [session, setSession] = useState<Session>({
    memberId: null,
    isAdmin: false,
  });
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState("Đang tải dữ liệu…");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("");
  const [ride, setRide] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [gameCompanion, setGameCompanion] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [transport, setTransport] = useState("");
  const [wish, setWish] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState("");
  const [gameError, setGameError] = useState("");
  const [gamePending, setGamePending] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const inboxDirty = useRef(false);
  const accountClicks = useRef<number[]>([]);
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const onInboxDirty = useCallback((value: boolean) => {
    inboxDirty.current = value;
  }, []);
  const [pendingLike, setPendingLike] = useState("");
  const [presentation, setPresentation] = useState(false);
  const initializedFor = useRef<string | null>(null);
  const dirty = useRef(false);
  const submitId = useRef<string | null>(null);
  const latestRequest = useRef(0);
  const currentIdentity = useRef<string | null>(null);
  const initialSessionRequest = useRef<Promise<Session> | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confettiKey = useRef("");
  const user = STAFF_MEMBERS.find((member) => member.id === session.memberId);
  const { gameState: game, rsvps, wishes, queens } = snapshot;
  const myRsvp = user ? rsvps[user.id] : undefined;
  const currentQueen = queens.find((queen) => queen.id === game.currentQueenId);
  const activeBox = game.boxes.find(
    (box) => box.boxNumber === game.activeBoxNumber,
  );
  const reward = BLIND_BOX_REWARDS.find(
    (item) => item.id === activeBox?.rewardId,
  );
  const selectedMale = STAFF_MEMBERS.find(
    (member) => member.id === game.selectedMaleId,
  );
  const canPlay =
    !!user && (session.isAdmin || user.id === game.currentQueenId);
  const confirmed = Object.values(rsvps).filter(
    (item) => item.attendanceStatus === "attending",
  );
  const guests = confirmed.filter((item) => item.hasPlusOne).length;

  const apply = useCallback((data: Partial<Snapshot>) => {
    setSnapshot((previous) => ({ ...previous, ...data }));
  }, []);
  const refresh = useCallback(async () => {
    const sequence = ++latestRequest.current;
    const identity = currentIdentity.current;
    try {
      const data = await request<Snapshot>("/api/state");
      if (
        sequence !== latestRequest.current ||
        identity !== currentIdentity.current
      )
        return;
      apply(data);
      setLoaded(true);
      setConnection("");
    } catch {
      if (sequence === latestRequest.current)
        setConnection("Chưa kết nối được — đang thử lại");
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        // Share initialization across Strict Mode effect replays; consume a personal link once.
        if (!initialSessionRequest.current) {
          initialSessionRequest.current = request<Session>("/api/session");
        }
        const data = await initialSessionRequest.current;
        if (!cancelled) {
          currentIdentity.current = data.memberId;
          setSession(data);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Không mở được phiên. Hãy thử lại.",
          );
          try {
            const fallback = await request<Session>("/api/session");
            if (!cancelled) {
              currentIdentity.current = fallback.memberId;
              setSession(fallback);
            }
          } catch {
            /* Keep manual retry available if the server is offline. */
          }
        }
      } finally {
        if (!cancelled) {
          setSessionLoaded(true);
          void refresh();
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Poll only a visible, online page. Fast game updates are limited to an active game.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible" && navigator.onLine) {
        if (tab === "game" && game.isLive) {
          try {
            const sequence = ++latestRequest.current;
            const identity = currentIdentity.current;
            const data = await request<Partial<Snapshot>>("/api/game");
            if (
              !stopped &&
              sequence === latestRequest.current &&
              identity === currentIdentity.current
            ) {
              apply(data);
              setConnection("");
            }
          } catch {
            setConnection("Chưa kết nối được — đang thử lại");
          }
        } else await refresh();
      }
      if (!stopped)
        timer = setTimeout(
          tick,
          tab === "game" && game.isLive
            ? 1500
            : connection.startsWith("Chưa")
              ? 30000
              : 15000,
        );
    };
    timer = setTimeout(tick, tab === "game" && game.isLive ? 1500 : 15000);
    const reconnect = () => {
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh();
      else if (!navigator.onLine)
        setConnection("Đang ngoại tuyến — dữ liệu vừa nhập vẫn được giữ");
    };
    document.addEventListener("visibilitychange", reconnect);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", reconnect);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
    };
  }, [apply, refresh, tab, game.isLive, connection]);

  // Initialize only after this roster identity’s server snapshot has loaded.
  // Polls then update the saved summary without overwriting the draft.
  useEffect(() => {
    if (!user || !loaded || initializedFor.current === user.id) return;
    const saved = rsvps[user.id];
    setAttendance(saved?.attendanceStatus || "");
    setRide(
      saved?.joinSharedRide1715 === undefined
        ? ""
        : saved.joinSharedRide1715
          ? "yes"
          : "no",
    );
    setPlusOne(!!saved?.hasPlusOne);
    setGameCompanion(saved?.gameCompanion === true);
    setPlusOneName(saved?.plusOneName || "");
    setTransport(
      ["grab", "self"].includes(saved?.transportOption || "")
        ? saved!.transportOption!
        : "",
    );
    setWish("");
    setEditing(!saved?.attendanceStatus);
    dirty.current = false;
    initializedFor.current = user.id;
  }, [user, loaded, rsvps]);

  useEffect(() => {
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (dirty.current || inboxDirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, []);

  useEffect(() => {
    if (
      tab !== "game" ||
      game.phase !== "REVEALED" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const key = `${game.activeBoxNumber}-${game.phaseStartedAt}`;
    if (confettiKey.current === key) return;
    confettiKey.current = key;
    void confetti({
      particleCount: 45,
      spread: 65,
      origin: { y: 0.65 },
      colors: ["#f2a7b5", "#a7d8c4", "#f8fafc"],
      disableForReducedMotion: true,
    });
  }, [tab, game.phase, game.activeBoxNumber, game.phaseStartedAt]);

  useEffect(() => {
    const dialog = logoutDialog.current;
    if (logoutConfirm && dialog && !dialog.open) dialog.showModal();
    else if (!logoutConfirm && dialog?.open) dialog.close();
  }, [logoutConfirm]);

  function accountClick() {
    const now = Date.now();
    accountClicks.current = [
      ...accountClicks.current.filter((t) => now - t < 1000),
      now,
    ];
    if (accountClicks.current.length >= 3) {
      accountClicks.current = [];
      setSwitchError("");
      setLogoutConfirm(true);
    }
  }

  function navigate(next: Tab) {
    setTab(next);
    setMessage("");
    setPresentation(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      titleRef.current?.focus({ preventScroll: true }),
    );
  }
  function changed() {
    dirty.current = true;
    submitId.current = null;
    setMessage("");
  }
  async function login(memberId: string) {
    if (signingIn || !sessionLoaded) return;
    setSigningIn(true);
    setAuthError("");
    try {
      const data = await request<Session>("/api/session", {
        memberId,
      });
      ++latestRequest.current;
      currentIdentity.current = data.memberId;
      initializedFor.current = null;
      setLoaded(false);
      setSnapshot(emptySnapshot);
      setSession(data);
      await refresh();
      navigate("personal");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Chưa mở được trang của bạn. Thử lại nhé.",
      );
    } finally {
      setSigningIn(false);
    }
  }
  async function logout() {
    if (saving || gamePending || pendingLike || signingOut) return;
    setSigningOut(true);
    setSwitchError("");
    try {
      const result = await fetch("/api/session", {
        method: "DELETE",
        signal: AbortSignal.timeout(12000),
      });
      if (!result.ok) throw new Error();
      ++latestRequest.current;
      currentIdentity.current = null;
      initializedFor.current = null;
      dirty.current = false;
      inboxDirty.current = false;
      setUnreadMessages(0);
      setSession((previous) => ({
        ...previous,
        memberId: null,
        isAdmin: false,
      }));
      setSnapshot(emptySnapshot);
      setLoaded(false);
      setLogoutConfirm(false);
      setMessage("");
      setFormError("");
      navigate("personal");
      await refresh();
    } catch {
      setSwitchError("Chưa đăng xuất được. Kiểm tra kết nối và thử lại nhé.");
    } finally {
      setSigningOut(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !loaded || saving) return;
    const invalid: Record<string, boolean> = {};
    if (!attendance) invalid.attendance = true;
    if (attendance === "attending" && user.gender === "female" && !ride)
      invalid.ride = true;
    if (attendance === "attending" && user.gender === "male" && !transport)
      invalid.transport = true;
    setInvalidFields(invalid);
    if (Object.keys(invalid).length) {
      setFormError("Vui lòng chọn đầy đủ các mục được đánh dấu trước khi lưu.");
      const first = Object.keys(invalid)[0];
      document.getElementById(first)?.focus();
      document
        .querySelector<HTMLInputElement>(`input[name="${first}"]`)
        ?.focus();
      return;
    }
    setSaving(true);
    setFormError("");
    setMessage("");
    submitId.current ||= Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const identity = currentIdentity.current;
    try {
      const data = await request<Snapshot>("/api/state", {
        action:
          user.gender === "female" ? "SUBMIT_FEMALE_RSVP" : "SUBMIT_MALE_RSVP",
        memberId: user.id,
        attendanceStatus: attendance,
        attending: attendance === "attending",
        joinSharedRide1715: attendance === "attending" && ride === "yes",
        hasPlusOne: attendance === "attending" && plusOne,
        gameCompanion: attendance === "attending" && gameCompanion,
        plusOneName,
        transportOption: attendance === "attending" ? transport : undefined,
        wishContent: wish.trim(),
        requestId: submitId.current,
      });
      if (identity !== currentIdentity.current) return;
      ++latestRequest.current;
      apply(data);
      dirty.current = false;
      submitId.current = null;
      setWish("");
      setEditing(false);
      setMessage("Đã lưu lựa chọn của bạn.");
    } catch (error) {
      if (identity !== currentIdentity.current) return;
      setFormError(
        `Chưa lưu được. Lựa chọn của bạn vẫn được giữ, hãy thử lại khi có mạng. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function like(wishId: string) {
    if (!user || pendingLike) return;
    setPendingLike(wishId);
    const identity = currentIdentity.current;
    try {
      const data = await request<Partial<Snapshot>>("/api/state", {
        action: "LIKE_WISH",
        wishId,
      });
      if (identity !== currentIdentity.current) return;
      ++latestRequest.current;
      apply(data);
    } catch {
      if (identity !== currentIdentity.current) return;
      setMessage("Chưa gửi được lượt tim. Hãy thử lại khi có mạng.");
    } finally {
      setPendingLike("");
    }
  }
  async function gameAction(payload: Record<string, unknown>) {
    if (gamePending) return;
    setGamePending(true);
    setGameError("");
    setMessage("");
    const identity = currentIdentity.current;
    try {
      const data = await request<Partial<Snapshot>>("/api/game", {
        ...payload,
        expectedQueenId: game.currentQueenId,
        expectedUpdatedAt: game.updatedAt,
      });
      if (identity !== currentIdentity.current) return;
      ++latestRequest.current;
      apply(data);
      setResetConfirm(false);
      if (payload.action === "RESET_GAME") setMessage("Đã đặt lại trò chơi.");
    } catch (error) {
      if (identity !== currentIdentity.current) return;
      setGameError(
        error instanceof Error
          ? error.message
          : "Chưa thực hiện được. Vui lòng thử lại.",
      );
    } finally {
      setGamePending(false);
    }
  }

  const inviteCard = (
    <section className="invitation card">
      <div className="letter-top">
        <span aria-hidden="true">✿</span>
        <span>Tháng Mười, gửi thương mến</span>
      </div>
      {user && (
        <MemberAvatar
          id={user.id}
          name={user.shortName}
          fullName={user.fullName}
          gender={user.gender}
          size="2xl"
          highlight
        />
      )}
      <h2>
        {user?.gender === "female"
          ? `Gửi ${user.shortName},`
          : user
            ? `Chào ${user.shortName},`
            : "Gửi những bông hoa của phòng,"}
      </h2>
      <p className="invitation-lead">
        Một buổi hẹn,
        <br />
        nhiều niềm vui.
      </p>
      <p>
        {user?.wish ||
          (user
            ? "Cùng anh em chuẩn bị một buổi tối thật vui cho chị em nhé. Có mặt, đồng hành hay gửi một lời chúc — cứ chọn điều phù hợp với mình."
            : "Một lời chúc nhỏ, một buổi tối bên nhau. Anh em Kỹ thuật công nghệ - Môi trường mến chúc chị em ngày 20/10 thật vui, bình an và luôn được yêu thương.")}
      </p>
      <p className="signature">
        Thân mến, anh em Kỹ thuật công nghệ - Môi trường ♡
      </p>
      {user && (
        <a className="quiet-button registration-anchor" href="#registration">
          Hẹn gặp nhau nhé ↓
        </a>
      )}
      <div className="itinerary">
        <h3>Buổi hẹn của chúng mình</h3>
        <div className="event-detail">
          <span className="time-marker">{EVENT_INFO.sharedRide.departure}</span>
          <div>
            <strong>Cùng nhau lên xe</strong>
            <p>
              Thứ Hai, 19/10/2026 · Taxi từ {EVENT_INFO.sharedRide.meetingPoint}{" "}
              đến {EVENT_INFO.sharedRide.destination}. Chị em đi cùng anh em
              trong phòng.
            </p>
            <a
              href={EVENT_INFO.sharedRide.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem đường đi · {EVENT_INFO.sharedRide.estimate} dự kiến ↗
            </a>
            <p>Mình đi sớm một chút để tránh kẹt xe nhé.</p>
          </div>
        </div>
        <div className="event-detail">
          <span className="time-marker">19h00</span>
          <div>
            <strong>Quây quần ở The Street · Chi nhánh 9</strong>
            <p>{RESTAURANT_INFO.address}</p>
            <a
              href={RESTAURANT_INFO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở bản đồ quán ↗
            </a>
          </div>
        </div>
      </div>
      <p className="muted">
        Cứ chọn trang phục mình thấy thoải mái và tự tin nhé.
      </p>
    </section>
  );

  return (
    <main className={`app-shell ${presentation ? "presentation" : ""}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="app-header">
        <a
          href="/"
          className="brand"
          aria-label="Kỹ thuật công nghệ - Môi trường mừng ngày 20 tháng 10"
        >
          <img src="/acv-logo.png" alt="ACV" width="46" height="46" />
          <span>
            Kỹ thuật công nghệ - Môi trường
            <small>Mừng ngày Phụ nữ Việt Nam</small>
          </span>
        </a>
        {user && (
          <button
            type="button"
            className="quiet-button account"
            aria-label={`Profile của ${user.fullName}`}
            disabled={saving || gamePending || !!pendingLike}
            onClick={accountClick}
          >
            <MemberAvatar
              id={user.id}
              name={user.shortName}
              gender={user.gender}
              size="sm"
            />
          </button>
        )}
      </header>
      {user?.gender === "female" && (
        <FlowerWelcome key={user.id} memberId={user.id} />
      )}
      {!presentation && <EventCountdown />}
      <div className="page-heading">
        <div>
          <h1 ref={titleRef} tabIndex={-1} id="main-content">
            {tab === "personal"
              ? user
                ? `Chào ${user.shortName}`
                : "Tháng Mười, có bạn thật vui."
              : tab === "wall"
                ? "Những lời chúc gửi trao"
                : tab === "messages"
                  ? "Một lời nhắn dành riêng"
                  : "Một chút vui cùng nhau"}
          </h1>
        </div>
        <p className="connection" role="status">
          {connection}
          {connection.startsWith("Chưa") && (
            <button type="button" onClick={() => void refresh()}>
              Thử lại
            </button>
          )}
        </p>
      </div>
      {message && (
        <p className="feedback success" role="status">
          {message}
        </p>
      )}
      {game.isLive && tab !== "game" && (
        <div className="game-invitation">
          <Gift aria-hidden="true" />
          <span>Trò chơi đã bắt đầu.</span>
          <button
            type="button"
            className="quiet-button"
            onClick={() => navigate("game")}
          >
            Tham gia →
          </button>
        </div>
      )}

      {tab === "personal" && !user && (
        <section className="welcome-picker" aria-label="Chọn ảnh của bạn">
          <div className="welcome-copy">
            <span className="welcome-flower" aria-hidden="true">
              ✿
            </span>
            <h2>Món quà nhỏ dành cho chị em</h2>
            <p>
              Chạm vào ảnh của mình để mở lời nhắn và hẹn nhau một buổi tối thật
              vui nhé.
            </p>
          </div>
          <div className="women-picks">
            {STAFF_MEMBERS.filter((m) => m.gender === "female").map(
              (member) => (
                <button
                  className="portrait-pick"
                  key={member.id}
                  type="button"
                  disabled={signingIn || !sessionLoaded}
                  onClick={() => void login(member.id)}
                  aria-label={`Mở trang của ${member.fullName}`}
                >
                  <MemberAvatar
                    id={member.id}
                    name={member.shortName}
                    fullName={member.fullName}
                    gender={member.gender}
                    size="2xl"
                    highlight
                  />
                  <span>{member.shortName}</span>
                  <small>Mở lời nhắn ♡</small>
                </button>
              ),
            )}
          </div>
          <div className="men-title">
            <span>Anh em nhà mình</span>
            <p>Cùng đến, cùng vui, cùng gửi lời chúc.</p>
          </div>
          <div className="men-picks">
            {STAFF_MEMBERS.filter((m) => m.gender === "male").map((member) => (
              <button
                className="portrait-pick"
                key={member.id}
                type="button"
                disabled={signingIn || !sessionLoaded}
                onClick={() => void login(member.id)}
                aria-label={`Mở trang của ${member.fullName}`}
              >
                <MemberAvatar
                  id={member.id}
                  name={member.shortName}
                  fullName={member.fullName}
                  gender={member.gender}
                  size="lg"
                />
                <span>{member.shortName}</span>
              </button>
            ))}
          </div>
          {signingIn && <p role="status">Đang mở trang của bạn…</p>}
          {authError && (
            <p className="feedback error" role="alert">
              {authError}
            </p>
          )}
        </section>
      )}
      {tab === "personal" && (
        <div className={`personal-grid ${!user ? "welcome-itinerary" : ""}`}>
          {inviteCard}
          <div className="registration-column" id="registration">
            {!user ? null : !loaded ? (
              <section className="card" aria-busy="true">
                <h2>Hẹn nhau nhé</h2>
                <p>Đang tải lựa chọn đã lưu…</p>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => void refresh()}
                >
                  Thử tải lại
                </button>
              </section>
            ) : (
              <section
                className="card registration"
                aria-label="Hẹn nhau buổi tối"
              >
                <h2>Hẹn nhau buổi tối nhé</h2>
                {myRsvp && !myRsvp.attendanceStatus && (
                  <p className="feedback legacy-notice" role="status">
                    Lựa chọn từ lần trước vẫn còn ở đây. Vui lòng kiểm tra và
                    lưu lại để xác nhận; dữ liệu này chưa được tính vào số người
                    tham dự.
                  </p>
                )}
                {myRsvp && !editing ? (
                  <div className="saved-summary">
                    <div className="saved-heading">
                      <Check aria-hidden="true" />
                      <strong>Đã lưu lựa chọn</strong>
                    </div>
                    <p>
                      <strong>Tiệc tối 19/10:</strong>{" "}
                      {myRsvp.attendanceStatus
                        ? attendanceLabels[myRsvp.attendanceStatus]
                        : "Cần xác nhận lại"}
                    </p>
                    {myRsvp.attending && (
                      <p>
                        <strong>Di chuyển:</strong>{" "}
                        {user.gender === "female"
                          ? myRsvp.joinSharedRide1715
                            ? "Đi taxi cùng mọi người"
                            : "Mình tự di chuyển"
                          : MALE_TRANSPORT_OPTIONS.find(
                              (option) => option.id === myRsvp.transportOption,
                            )?.label || "Mình tự di chuyển"}
                      </p>
                    )}
                    {user.gender === "male" && myRsvp.attending && (
                      <p>
                        <strong>Cùng chơi:</strong>{" "}
                        {myRsvp.gameCompanion
                          ? "Sẵn lòng đồng hành"
                          : "Ngồi cổ vũ cũng vui"}
                      </p>
                    )}
                    {myRsvp.hasPlusOne && (
                      <p>
                        <strong>Khách đi cùng:</strong>{" "}
                        {myRsvp.plusOneName || "1 khách"}
                      </p>
                    )}
                    <p className="muted">
                      Cập nhật {dateTime(myRsvp.updatedAt)} · giờ Việt Nam
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        setEditing(true);
                        setMessage("");
                      }}
                    >
                      Đổi lựa chọn
                    </button>
                  </div>
                ) : (
                  <form
                    noValidate
                    onSubmit={save}
                    className="form-stack"
                    onChange={changed}
                  >
                    <fieldset disabled={saving} className="form-fields">
                      <fieldset>
                        <legend>Tối 19/10, mình có đến được không?</legend>
                        <div className="choice-stack">
                          {Object.entries(attendanceLabels).map(
                            ([value, label]) => (
                              <label className="choice" key={value}>
                                <input
                                  type="radio"
                                  name="attendance"
                                  aria-invalid={!!invalidFields["attendance"]}
                                  aria-describedby={
                                    invalidFields["attendance"]
                                      ? "registration-error"
                                      : undefined
                                  }
                                  value={value}
                                  checked={attendance === value}
                                  required
                                  onChange={() =>
                                    setAttendance(value as Attendance)
                                  }
                                />
                                <span>{label}</span>
                              </label>
                            ),
                          )}
                        </div>
                      </fieldset>
                      {attendance === "attending" &&
                        (user.gender === "female" ? (
                          <fieldset>
                            <legend>Di chuyển đến buổi tiệc</legend>
                            <div className="choice-stack">
                              {[
                                ["yes", "Đi taxi cùng mọi người"],
                                ["no", "Mình tự di chuyển"],
                              ].map(([value, label]) => (
                                <label className="choice" key={value}>
                                  <input
                                    type="radio"
                                    name="ride"
                                    aria-invalid={!!invalidFields["ride"]}
                                    aria-describedby={
                                      invalidFields["ride"]
                                        ? "registration-error"
                                        : undefined
                                    }
                                    checked={ride === value}
                                    required
                                    onChange={() => setRide(value)}
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                            <p className="hint">
                              Taxi khởi hành 17h00 tại 2 Sông Đáy, dự kiến 45–60
                              phút đến quán.
                            </p>
                          </fieldset>
                        ) : (
                          <>
                            <label className="choice">
                              <input
                                type="checkbox"
                                checked={plusOne}
                                onChange={(event) =>
                                  setPlusOne(event.target.checked)
                                }
                              />
                              <span>Mình có một người đi cùng (tùy chọn)</span>
                            </label>
                            {plusOne && (
                              <>
                                <label htmlFor="guest-name">
                                  Tên khách (tùy chọn)
                                </label>
                                <input
                                  id="guest-name"
                                  value={plusOneName}
                                  maxLength={80}
                                  onChange={(event) =>
                                    setPlusOneName(event.target.value)
                                  }
                                />
                              </>
                            )}
                            <label className="choice">
                              <input
                                type="checkbox"
                                checked={gameCompanion}
                                onChange={(event) =>
                                  setGameCompanion(event.target.checked)
                                }
                              />
                              <span>
                                Mình sẵn lòng cùng chơi khi được mời đồng hành
                              </span>
                            </label>
                            <p className="hint">
                              Hoàn toàn tùy ý. Mọi người cùng vui tại bàn, có
                              thể đổi thử thách hoặc bỏ qua bất cứ lúc nào.
                            </p>
                            <label htmlFor="transport">
                              Mình đến bằng cách nào?
                            </label>
                            <select
                              id="transport"
                              aria-invalid={!!invalidFields["transport"]}
                              aria-describedby={
                                invalidFields["transport"]
                                  ? "registration-error"
                                  : undefined
                              }
                              value={transport}
                              required
                              onChange={(event) =>
                                setTransport(event.target.value)
                              }
                            >
                              <option value="">Chọn phương án</option>
                              {MALE_TRANSPORT_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <p className="hint">
                              Anh em đi taxi cùng chị em lúc 17h00 từ 2 Sông
                              Đáy; ai muốn tự đi cũng thoải mái nhé.
                            </p>
                          </>
                        ))}
                      {user.gender === "male" && (
                        <>
                          <label htmlFor="wish">
                            Gửi lời chúc đến chị em (tùy chọn)
                          </label>
                          <textarea
                            className="resize-none"
                            id="wish"
                            rows={4}
                            maxLength={2000}
                            value={wish}
                            onChange={(event) => setWish(event.target.value)}
                            placeholder="Viết lời nhắn của chính bạn…"
                          />
                          <p className="hint">
                            Lời chúc được đăng trên tường chung dưới tên bạn khi
                            lưu.
                          </p>
                        </>
                      )}
                      {formError && (
                        <p
                          id="registration-error"
                          role="alert"
                          className="feedback error"
                        >
                          {formError}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                      >
                        {saving ? "Đang lưu…" : "Lưu lựa chọn"}
                      </button>
                      <p className="hint">
                        Bạn có thể quay lại đổi lựa chọn bất cứ lúc nào.
                      </p>
                    </fieldset>
                  </form>
                )}
              </section>
            )}
            {session.isAdmin && (
              <section className="card logistics">
                <p className="eyebrow">Chỉ người phụ trách</p>
                <h2>Hậu cần</h2>
                <div className="stats">
                  <div>
                    <strong>{confirmed.length}</strong>
                    <span>Thành viên xác nhận</span>
                  </div>
                  <div>
                    <strong>{guests}</strong>
                    <span>Khách đi cùng</span>
                  </div>
                </div>
                <p className="hint">
                  Hẹn tham dự chưa có nghĩa là đã có mặt. Trước khi mở game, hãy
                  đối chiếu danh sách thực tế và phần quà. Danh sách game được
                  cố định khi bắt đầu.
                </p>
                <details>
                  <summary>Mọi người đã hẹn thế nào?</summary>
                  <div className="logistics-list">
                    {STAFF_MEMBERS.map((member) => {
                      const rsvp = rsvps[member.id];
                      return (
                        <article key={member.id}>
                          <strong>{member.fullName}</strong>
                          <p>
                            {rsvp
                              ? rsvp.attendanceStatus
                                ? attendanceLabels[rsvp.attendanceStatus]
                                : "Cần xác nhận lại"
                              : "Chưa trả lời"}
                            {rsvp?.hasPlusOne
                              ? ` · Khách: ${rsvp.plusOneName || "1 khách"}`
                              : ""}
                          </p>
                          {rsvp?.attending && (
                            <p>
                              {member.gender === "female"
                                ? rsvp.joinSharedRide1715
                                  ? "Đi taxi cùng mọi người"
                                  : "Mình tự di chuyển"
                                : MALE_TRANSPORT_OPTIONS.find(
                                    (option) =>
                                      option.id === rsvp.transportOption,
                                  )?.label || "Mình tự di chuyển"}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </details>
              </section>
            )}
          </div>
        </div>
      )}

      {tab === "wall" && (
        <section className="wall-content">
          <div className="card wall-intro">
            <MessageSquareHeart aria-hidden="true" />
            <h2>Mỗi lời nhắn đều đáng quý</h2>
            <p>
              Những lời chúc do thành viên gửi, thay cho một lời cảm ơn và lời
              hẹn cùng nhau.
            </p>
            {!user && (
              <button
                type="button"
                className="quiet-button"
                onClick={() => navigate("personal")}
              >
                Chọn ảnh của mình để gửi lời chúc hoặc thả tim →
              </button>
            )}
          </div>
          {!loaded ? (
            <p role="status">Đang tải lời chúc…</p>
          ) : wishes.length === 0 ? (
            <div className="card empty-state">
              <Heart aria-hidden="true" />
              <h2>Lời chúc đầu tiên đang chờ được gửi</h2>
              <p>Anh em có thể viết lời nhắn ở trang của mình.</p>
            </div>
          ) : (
            <div className="wish-grid">
              {wishes.map((item) => {
                const author = STAFF_MEMBERS.find(
                  (member) => member.id === item.authorId,
                );
                return (
                  <article className="card wish-card" key={item.id}>
                    <div className="wish-author">
                      {author && (
                        <MemberAvatar
                          id={author.id}
                          name={author.shortName}
                          gender={author.gender}
                          size="md"
                        />
                      )}
                      <div>
                        <strong>{author?.shortName || item.authorName}</strong>
                        <p className="hint">{dateTime(item.createdAt)}</p>
                      </div>
                    </div>
                    <p className="wish-content">{item.content}</p>
                    <button
                      className="quiet-button like-button"
                      type="button"
                      disabled={!user || !!pendingLike}
                      onClick={() => void like(item.id)}
                      aria-label={`Thả tim lời chúc của ${author?.shortName || item.authorName}, ${item.likes} lượt tim`}
                    >
                      <Heart aria-hidden="true" />
                      {item.likes} <span>lượt tim</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "game" && (
        <div className="game-layout">
          <section className="card game-stage">
            {game.phase !== "WAITING" && (
              <>
                <div className="section-row">
                  <p className="eyebrow">Cùng vui, luôn tự nguyện</p>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setPresentation(!presentation)}
                  >
                    {presentation ? "Thu gọn màn hình" : "Màn trình chiếu"}
                  </button>
                </div>
                <p className="muted">
                  Có thể bỏ qua lượt hoặc đổi sang một lời chúc. Chụp, quay và
                  chia sẻ ảnh chỉ khi người được chụp đồng ý; mọi thức uống đều
                  tùy chọn.
                </p>
              </>
            )}
            {game.phase === "WAITING" ? (
              <MemoryGame
                key={user?.id || "guest"}
                memberId={user?.id || null}
              />
            ) : game.phase === "COMPLETED" ? (
              <div className="empty-state">
                <Heart aria-hidden="true" />
                <h2>Cảm ơn vì những khoảnh khắc cùng nhau</h2>
                <p>
                  Các lượt chơi đã hoàn tất. Mời bạn xem lại kết quả bên dưới
                  hoặc trở về lời mời.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("personal")}
                >
                  Về lời mời
                </button>
              </div>
            ) : (
              <>
                <div className="turn-heading">
                  <p>{canPlay ? "Đến lượt của bạn" : "Lượt mở quà"}</p>
                  <h2>{currentQueen?.shortName || "Đang cập nhật…"}</h2>
                </div>
                {game.phase === "SELECTING_BOX" && (
                  <div className="box-grid">
                    {game.boxes.map((box) => (
                      <button
                        key={box.boxNumber}
                        className={`gift-box ${box.isOpened ? "opened" : ""}`}
                        type="button"
                        disabled={box.isOpened || !canPlay || gamePending}
                        onClick={() =>
                          void gameAction({
                            action: "OPEN_BOX",
                            boxNumber: box.boxNumber,
                          })
                        }
                      >
                        <Gift aria-hidden="true" />
                        <strong>Hộp {box.boxNumber}</strong>
                        <span>
                          {box.isOpened
                            ? box.openedByQueenName
                            : canPlay
                              ? "Chạm để mở"
                              : "Chờ đến lượt"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {game.phase === "SHAKING" && (
                  <div className="empty-state" role="status">
                    <Gift aria-hidden="true" />
                    <h2>Đang mở hộp {game.activeBoxNumber}…</h2>
                    <p>Một chút hồi hộp trước khi món quà xuất hiện.</p>
                  </div>
                )}
                {reward &&
                  ["REVEALED", "SPINNING_MALE", "MALE_SELECTED"].includes(
                    game.phase,
                  ) && (
                    <div className="reward-card">
                      <p className="eyebrow">
                        Hộp {game.activeBoxNumber} ·{" "}
                        {activeBox?.openedByQueenName}
                      </p>
                      <h2>{reward.title}</h2>
                      <p>{reward.description}</p>
                      <p className="hint">
                        Bạn có thể đổi thử thách thành một lời chúc hoặc bỏ qua.
                        Hãy cùng chọn điều mọi người thấy thoải mái.
                      </p>
                    </div>
                  )}
                {game.phase === "REVEALED" && (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!canPlay || gamePending}
                    onClick={() => void gameAction({ action: "SPIN_MALE" })}
                  >
                    Chọn người đồng hành
                  </button>
                )}
                {game.phase === "SPINNING_MALE" && (
                  <p className="selection-message" role="status">
                    Đang chọn người đồng hành…
                  </p>
                )}
                {game.phase === "MALE_SELECTED" && (
                  <div className="companion">
                    <p>Người đồng hành được mời</p>
                    <h2>{selectedMale?.shortName}</h2>
                    <p>
                      Bạn có thể nhận lời hoặc cùng gửi một lời chúc thay thế.
                    </p>
                    {session.isAdmin && (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={gamePending}
                        onClick={() =>
                          void gameAction({ action: "BACK_TO_BOARD" })
                        }
                      >
                        Sang lượt tiếp theo
                      </button>
                    )}
                  </div>
                )}
                {canPlay &&
                  ["SELECTING_BOX", "REVEALED", "MALE_SELECTED"].includes(
                    game.phase,
                  ) && (
                    <button
                      type="button"
                      className="quiet-button skip-turn"
                      disabled={gamePending}
                      onClick={() => void gameAction({ action: "SKIP_TURN" })}
                    >
                      Bỏ qua lượt / Thay bằng lời chúc
                    </button>
                  )}
              </>
            )}
            {gameError && (
              <p role="alert" className="feedback error">
                {gameError}
              </p>
            )}
            {game.boxes.some((box) => box.isOpened) && (
              <details className="game-results">
                <summary>Kết quả đã mở</summary>
                <div className="logistics-list">
                  {game.boxes
                    .filter((box) => box.isOpened && box.rewardId)
                    .map((box) => (
                      <article key={box.boxNumber}>
                        <strong>
                          Hộp {box.boxNumber} · {box.openedByQueenName}
                        </strong>
                        <p>
                          {
                            BLIND_BOX_REWARDS.find(
                              (item) => item.id === box.rewardId,
                            )?.title
                          }
                        </p>
                        {box.assignedMaleName && (
                          <p>
                            Người đồng hành:{" "}
                            {STAFF_MEMBERS.find(
                              (m) => m.id === box.assignedMaleId,
                            )?.shortName || box.assignedMaleName}
                          </p>
                        )}
                      </article>
                    ))}
                </div>
              </details>
            )}
          </section>
          {session.isAdmin && !presentation && (
            <section className="card host-panel">
              <p className="eyebrow">Huy Dương giữ nhịp buổi vui</p>
              <h2>Điều khiển chương trình</h2>
              <p className="muted">
                Kiểm tra người tham dự thực tế và đủ quà trước khi bắt đầu. Chỉ
                những người đã chọn tham dự mới vào danh sách.
              </p>
              <button
                className="primary-button"
                type="button"
                disabled={gamePending || game.phase !== "WAITING"}
                onClick={() => void gameAction({ action: "START_LIVE" })}
              >
                Bắt đầu trò chơi
              </button>
              {game.isLive && game.phase !== "COMPLETED" && (
                <>
                  <label htmlFor="queen">Chuyển lượt</label>
                  <select
                    id="queen"
                    disabled={gamePending}
                    value={game.currentQueenId}
                    onChange={(event) =>
                      void gameAction({
                        action: "SET_QUEEN",
                        queenId: event.target.value,
                      })
                    }
                  >
                    {queens.map((queen) => (
                      <option key={queen.id} value={queen.id}>
                        {queen.shortName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="quiet-button"
                    disabled={gamePending}
                    onClick={() => void gameAction({ action: "BACK_TO_BOARD" })}
                  >
                    Về bàn quà / Lượt tiếp
                  </button>
                </>
              )}
              <details className="danger-zone">
                <summary>Đặt lại chương trình</summary>
                <p>
                  Thao tác này xóa toàn bộ kết quả trò chơi, giữ nguyên lựa chọn
                  và lời chúc.
                </p>
                {!resetConfirm ? (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => setResetConfirm(true)}
                  >
                    Đặt lại trò chơi…
                  </button>
                ) : (
                  <div
                    className="reset-confirm"
                    role="group"
                    aria-label="Xác nhận đặt lại trò chơi"
                  >
                    <p>Bạn chắc chắn muốn xóa kết quả và xáo lại hộp quà?</p>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={gamePending}
                      onClick={() =>
                        void gameAction({
                          action: "RESET_GAME",
                          keepLive: false,
                        })
                      }
                    >
                      {gamePending ? "Đang đặt lại…" : "Xác nhận xóa kết quả"}
                    </button>
                    <button
                      className="quiet-button"
                      type="button"
                      disabled={gamePending}
                      onClick={() => setResetConfirm(false)}
                    >
                      Giữ kết quả
                    </button>
                  </div>
                )}
              </details>
            </section>
          )}
        </div>
      )}
      {user ? (
        <PrivateInbox
          key={user.id}
          memberId={user.id}
          active={tab === "messages"}
          onUnread={setUnreadMessages}
          onDirty={onInboxDirty}
        />
      ) : (
        tab === "messages" && (
          <section className="card empty-state">
            <Mail aria-hidden="true" />
            <h2>Mở hộp thư của bạn</h2>
            <p>Chọn ảnh của mình để gửi và đọc lời nhắn riêng nhé.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("personal")}
            >
              Chọn ảnh của mình →
            </button>
          </section>
        )
      )}
      <dialog
        ref={logoutDialog}
        className="draft-confirm card"
        aria-labelledby="switch-title"
        onCancel={() => setLogoutConfirm(false)}
        onClose={() => setLogoutConfirm(false)}
      >
        <h2 id="switch-title">Mở lại danh sách thành viên?</h2>
        <p>
          {dirty.current || inboxDirty.current
            ? "Bạn có nội dung chưa lưu hoặc lời nhắn chưa gửi. Trở lại danh sách sẽ bỏ các bản nháp này."
            : "Profile đang mở sẽ được đăng xuất khỏi trình duyệt này. Mỗi người hãy chọn đúng ảnh của mình nhé."}
        </p>
        {switchError && (
          <p className="feedback error" role="alert">
            {switchError}
          </p>
        )}
        <button
          className="primary-button"
          type="button"
          onClick={() => setLogoutConfirm(false)}
        >
          Ở lại profile của mình
        </button>
        <button
          className="quiet-button"
          type="button"
          disabled={saving || gamePending || !!pendingLike || signingOut}
          onClick={() => void logout()}
        >
          {signingOut ? "Đang đăng xuất…" : "Về danh sách thành viên"}
        </button>
      </dialog>
      {!presentation && (
        <nav className="bottom-nav" aria-label="Điều hướng chính">
          {(
            [
              {
                id: "personal",
                label: user ? "Của bạn" : "Nhà mình",
                Icon: Calendar,
              },
              { id: "wall", label: "Lời chúc", Icon: MessageSquareHeart },
              { id: "game", label: "Trò chơi", Icon: Gift },
              { id: "messages", label: "Tin riêng", Icon: Mail },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => navigate(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {id === "messages" && unreadMessages > 0 && (
                <b
                  className="unread-badge"
                  aria-label={`${unreadMessages} tin chưa đọc`}
                >
                  {unreadMessages}
                </b>
              )}
            </button>
          ))}
        </nav>
      )}
      <footer>
        Kỹ thuật công nghệ - Môi trường · 20.10.2026
        <span>Một chút thương mến, từ anh em trong phòng.</span>
      </footer>
    </main>
  );
}

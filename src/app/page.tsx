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
} from "lucide-react";
import MemberAvatar from "@/components/MemberAvatar";
import {
  BLIND_BOX_REWARDS,
  EVENT_INFO,
  ICE_LEVELS,
  MALE_TRANSPORT_OPTIONS,
  MILK_TEA_MENU,
  RESTAURANT_INFO,
  STAFF_MEMBERS,
  SUGAR_LEVELS,
} from "@/data/roster";
import type {
  GameState,
  MemberRsvp,
  MilkTeaOrder,
  QueenParticipant,
  WishItem,
} from "@/lib/store";

type Tab = "personal" | "wall" | "game";
type Attendance = "attending" | "maybe" | "declined" | "";
type Session = {
  memberId: string | null;
  isAdmin: boolean;
  configured: boolean;
};
type Snapshot = {
  rsvps: Record<string, MemberRsvp>;
  milkTeaOrders: Record<string, MilkTeaOrder>;
  wishes: WishItem[];
  queens: QueenParticipant[];
  gameState: GameState;
};
const attendanceLabels = {
  attending: "Sẽ tham dự",
  maybe: "Chưa chắc",
  declined: "Không tham dự",
};
const emptySnapshot: Snapshot = {
  rsvps: {},
  milkTeaOrders: {},
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
    configured: false,
  });
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState("Đang tải dữ liệu…");
  const [selectedMember, setSelectedMember] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("");
  const [ride, setRide] = useState("");
  const [wantsDrink, setWantsDrink] = useState("");
  const [drink, setDrink] = useState("");
  const [sugar, setSugar] = useState("");
  const [ice, setIce] = useState("");
  const [note, setNote] = useState("");
  const [dietaryNote, setDietaryNote] = useState("");
  const [plusOne, setPlusOne] = useState(false);
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
  const { gameState: game, rsvps, milkTeaOrders, wishes, queens } = snapshot;
  const myRsvp = user ? rsvps[user.id] : undefined;
  const myOrder = user ? milkTeaOrders[user.id] : undefined;
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
      setConnection("Đã cập nhật");
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
          const fragment = new URLSearchParams(window.location.hash.slice(1));
          const memberId = fragment.get("member");
          const code = fragment.get("code");
          if (code)
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          if (memberId && code) {
            setSelectedMember(memberId);
            initialSessionRequest.current = request<Session>("/api/session", {
              memberId,
              inviteCode: code,
            });
          } else
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
              setConnection("Đã cập nhật");
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

  // Initialize only after the authenticated user's server snapshot has loaded.
  // Polls then update the saved summary without overwriting the draft.
  useEffect(() => {
    if (!user || !loaded || initializedFor.current === user.id) return;
    const saved = rsvps[user.id];
    const order = milkTeaOrders[user.id];
    setAttendance(saved?.attendanceStatus || "");
    setRide(
      saved?.joinSharedRide1715 === undefined
        ? ""
        : saved.joinSharedRide1715
          ? "yes"
          : "no",
    );
    setWantsDrink(order ? "yes" : saved?.attendanceStatus ? "no" : "");
    setDrink(order?.drinkName || "");
    setSugar(order?.sugar || "");
    setIce(order?.ice || "");
    setNote(order?.note || "");
    setDietaryNote(saved?.dietaryNote || "");
    setPlusOne(!!saved?.hasPlusOne);
    setPlusOneName(saved?.plusOneName || "");
    setTransport(saved?.transportOption || "");
    setWish("");
    setEditing(!saved?.attendanceStatus);
    dirty.current = false;
    initializedFor.current = user.id;
  }, [user, loaded, rsvps, milkTeaOrders]);

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

  function navigate(next: Tab) {
    setTab(next);
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
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (signingIn) return;
    if (!selectedMember || !inviteCode.trim()) {
      setAuthError("Chọn tên của bạn và nhập mã mời cá nhân.");
      document
        .getElementById(!selectedMember ? "member" : "invite-code")
        ?.focus();
      return;
    }
    setSigningIn(true);
    setAuthError("");
    try {
      const data = await request<Session>("/api/session", {
        memberId: selectedMember,
        inviteCode,
      });
      ++latestRequest.current;
      currentIdentity.current = data.memberId;
      initializedFor.current = null;
      setLoaded(false);
      setSnapshot(emptySnapshot);
      setSession(data);
      setInviteCode("");
      await refresh();
      setMessage("Đã mở đăng ký của bạn.");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Chưa đăng nhập được. Hãy thử lại.",
      );
    } finally {
      setSigningIn(false);
    }
  }
  async function logout() {
    if (saving || gamePending || pendingLike) return;
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
      setSession((previous) => ({
        ...previous,
        memberId: null,
        isAdmin: false,
      }));
      setSnapshot(emptySnapshot);
      setLoaded(false);
      setLogoutConfirm(false);
      setSelectedMember("");
      setMessage("");
      setFormError("");
      navigate("personal");
      await refresh();
    } catch {
      setMessage("Chưa đăng xuất được. Hãy kiểm tra kết nối và thử lại.");
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
    if (user.gender === "female" && !wantsDrink) invalid["wants-drink"] = true;
    if (user.gender === "female" && wantsDrink === "yes") {
      if (!drink) invalid.drink = true;
      if (!sugar) invalid.sugar = true;
      if (!ice) invalid.ice = true;
    }
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
        wantsDrink: wantsDrink === "yes",
        drinkName: drink,
        sugar,
        ice,
        note,
        dietaryNote,
        hasPlusOne: attendance === "attending" && plusOne,
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
      <p className="eyebrow">KTCNMT · 20.10.2026</p>
      {user?.gender === "female" && (
        <MemberAvatar
          id={user.id}
          name={user.shortName}
          fullName={user.fullName}
          gender={user.gender}
          size="xl"
        />
      )}
      <h2>
        {user?.gender === "female"
          ? `Gửi ${user.shortName},`
          : "Gửi chị em KTCNMT,"}
      </h2>
      <p className="invitation-lead">Một buổi hẹn, nhiều niềm vui.</p>
      <p>
        Nhân ngày Phụ nữ Việt Nam, chúc chị em luôn mạnh khỏe, bình an và có
        nhiều niềm vui trong công việc lẫn cuộc sống. Cảm ơn chị em đã cùng xây
        dựng tập thể KTCNMT.
      </p>
      <p className="signature">Thân mến, Anh em KTCNMT</p>
      <a className="quiet-button registration-anchor" href="#registration">
        {user ? "Đến đăng ký của bạn ↓" : "Mở đăng ký của bạn ↓"}
      </a>
      <div className="event-detail">
        <Calendar aria-hidden="true" />
        <div>
          <strong>{RESTAURANT_INFO.time}</strong>
          <p>Buổi gặp mặt mừng 20/10</p>
        </div>
      </div>
      <div className="event-detail">
        <MapPin aria-hidden="true" />
        <div>
          <strong>{RESTAURANT_INFO.name}</strong>
          <p>{RESTAURANT_INFO.address}</p>
          <a
            href={RESTAURANT_INFO.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở bản đồ ↗
          </a>
        </div>
      </div>
      <p className="muted">
        Bạn cứ chọn trang phục mình thấy thoải mái và tự tin.
      </p>
      <details>
        <summary>Di chuyển & thông tin cần biết</summary>
        <div className="details-content">
          <p>
            Giờ xe: {EVENT_INFO.sharedRide.time}. Điểm tập trung:{" "}
            {EVENT_INFO.sharedRide.meetingPoint}. Chiều về:{" "}
            {EVENT_INFO.sharedRide.returnPlan}.
          </p>
          <p>
            Hạn đăng ký: {EVENT_INFO.registrationDeadline}. Đầu mối hỗ trợ:{" "}
            {EVENT_INFO.contact}. Vui lòng theo dõi thông báo của ban tổ chức
            trong nhóm phòng.
          </p>
          <p>
            Đồ uống dành cho chị em vào sáng 20/10; giờ nhận cụ thể:{" "}
            {EVENT_INFO.drinks.time}. Đăng ký tiệc tối và chọn đồ uống là hai
            lựa chọn độc lập.
          </p>
          <p>
            Menu bữa tối chưa công bố. Bạn có thể ghi nhu cầu ăn uống trong đăng
            ký; thông tin này chỉ dành cho bạn và người phụ trách hậu cần.
          </p>
        </div>
      </details>
    </section>
  );

  return (
    <main className={`app-shell ${presentation ? "presentation" : ""}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="app-header">
        <a href="/" className="brand" aria-label="KTCNMT mừng ngày 20 tháng 10">
          <img src="/acv-logo.png" alt="ACV" width="46" height="46" />
          <span>
            KTCNMT<small>Mừng ngày Phụ nữ Việt Nam</small>
          </span>
        </a>
        {user && (
          <button
            type="button"
            className="quiet-button account"
            disabled={saving || gamePending || !!pendingLike}
            onClick={() => {
              if (dirty.current) setLogoutConfirm(true);
              else void logout();
            }}
          >
            <MemberAvatar
              id={user.id}
              name={user.shortName}
              gender={user.gender}
              size="sm"
            />
            <span>Đổi thành viên</span>
          </button>
        )}
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">19 — 20 tháng 10</p>
          <h1 ref={titleRef} tabIndex={-1} id="main-content">
            {tab === "personal"
              ? user
                ? `Chào ${user.shortName}`
                : "Lời mời dành cho bạn"
              : tab === "wall"
                ? "Những lời chúc gửi trao"
                : "Túi mù & niềm vui"}
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

      {tab === "personal" && (
        <div className="personal-grid">
          {inviteCard}
          <div className="registration-column" id="registration">
            {!user ? (
              <section className="card">
                <p className="eyebrow">Đăng ký của bạn</p>
                <h2>Mở lời mời cá nhân</h2>
                <p className="muted">
                  Chọn đúng tên và nhập mã mời do ban tổ chức cung cấp. Nếu có
                  liên kết mời riêng, bạn có thể mở trực tiếp liên kết đó.
                </p>
                <form noValidate onSubmit={login} className="form-stack">
                  <fieldset disabled={signingIn} className="form-fields">
                    <label htmlFor="member">Thành viên</label>
                    <select
                      id="member"
                      value={selectedMember}
                      required
                      onChange={(event) =>
                        setSelectedMember(event.target.value)
                      }
                    >
                      <option value="">Chọn tên của bạn</option>
                      {STAFF_MEMBERS.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="invite-code">Mã mời cá nhân</label>
                    <input
                      id="invite-code"
                      type="password"
                      autoComplete="current-password"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      required
                    />
                    <button
                      className="primary-button"
                      disabled={signingIn || !sessionLoaded}
                    >
                      {signingIn ? "Đang mở…" : "Mở đăng ký"}
                    </button>
                    {authError && (
                      <p role="alert" className="feedback error">
                        {authError}
                      </p>
                    )}
                    {sessionLoaded && !session.configured && (
                      <p className="muted">
                        Đăng ký chưa mở. Bạn vẫn có thể xem lời mời, lời chúc và
                        chương trình. Ban tổ chức cần thiết lập mã mời trước khi
                        nhận đăng ký.
                      </p>
                    )}
                  </fieldset>
                </form>
              </section>
            ) : !loaded ? (
              <section className="card" aria-busy="true">
                <h2>Đăng ký của bạn</h2>
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
                aria-label="Đăng ký tham dự"
              >
                <p className="eyebrow">Tùy theo lịch của bạn</p>
                <h2>Lựa chọn của bạn</h2>
                {myRsvp && !myRsvp.attendanceStatus && (
                  <p className="feedback legacy-notice" role="status">
                    Có dữ liệu đăng ký từ phiên bản cũ. Vui lòng kiểm tra và lưu
                    lại để xác nhận; dữ liệu này chưa được tính vào số người
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
                            ? "Muốn đi xe chung"
                            : "Tự di chuyển"
                          : MALE_TRANSPORT_OPTIONS.find(
                              (option) => option.id === myRsvp.transportOption,
                            )?.label || "Tự di chuyển"}
                      </p>
                    )}
                    {myRsvp.hasPlusOne && (
                      <p>
                        <strong>Khách đi cùng:</strong>{" "}
                        {myRsvp.plusOneName || "1 khách"}
                      </p>
                    )}
                    {user.gender === "female" && (
                      <p>
                        <strong>Đồ uống 20/10:</strong>{" "}
                        {myOrder
                          ? `${myOrder.drinkName} · ${myOrder.sugar} · ${myOrder.ice}`
                          : "Không dùng đồ uống"}
                      </p>
                    )}
                    {myOrder?.note && <p>Ghi chú đồ uống: {myOrder.note}</p>}
                    {myRsvp.dietaryNote && (
                      <p>Nhu cầu ăn uống: {myRsvp.dietaryNote}</p>
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
                      Chỉnh sửa đăng ký
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
                        <legend>Tiệc tối 19/10</legend>
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
                                ["yes", "Muốn đi xe chung"],
                                ["no", "Tự di chuyển"],
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
                              Đây là nhu cầu di chuyển, chưa phải chuyến xe đã
                              được xếp. Giờ và điểm đón sẽ được thông báo sau.
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
                              <span>Có một khách đi cùng</span>
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
                            <label htmlFor="transport">
                              Di chuyển & hỗ trợ
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
                              <option value="self">Tự di chuyển</option>
                              {MALE_TRANSPORT_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <p className="hint">
                              Nhu cầu hỗ trợ sẽ được ban tổ chức xác nhận riêng
                              trước khi xếp chuyến.
                            </p>
                          </>
                        ))}
                      <label htmlFor="dietary-note">
                        Nhu cầu ăn uống (tùy chọn)
                      </label>
                      <textarea
                        className="resize-none"
                        id="dietary-note"
                        rows={2}
                        maxLength={500}
                        value={dietaryNote}
                        onChange={(event) => setDietaryNote(event.target.value)}
                        placeholder="Ví dụ: ăn chay, món không dùng…"
                      />
                      <p className="hint">
                        Chỉ bạn và hậu cần xem được. Nhu cầu cần hỗ trợ riêng
                        nên trao đổi trực tiếp với ban tổ chức trong nhóm phòng.
                      </p>
                      {user.gender === "female" && (
                        <>
                          <fieldset>
                            <legend>Đồ uống sáng 20/10</legend>
                            <p className="muted">
                              Bạn có thể chọn đồ uống dù không tham dự tiệc tối.
                            </p>
                            <div className="choice-stack">
                              {[
                                ["yes", "Chọn một món"],
                                ["no", "Không dùng đồ uống"],
                              ].map(([value, label]) => (
                                <label className="choice" key={value}>
                                  <input
                                    type="radio"
                                    name="wants-drink"
                                    aria-invalid={
                                      !!invalidFields["wants-drink"]
                                    }
                                    aria-describedby={
                                      invalidFields["wants-drink"]
                                        ? "registration-error"
                                        : undefined
                                    }
                                    checked={wantsDrink === value}
                                    required
                                    onChange={() => setWantsDrink(value)}
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          {wantsDrink === "yes" && (
                            <>
                              <label htmlFor="drink">Món bạn chọn</label>
                              <select
                                id="drink"
                                aria-invalid={!!invalidFields["drink"]}
                                aria-describedby={
                                  invalidFields["drink"]
                                    ? "registration-error"
                                    : undefined
                                }
                                required
                                value={drink}
                                onChange={(event) =>
                                  setDrink(event.target.value)
                                }
                              >
                                <option value="">Chọn đồ uống</option>
                                {MILK_TEA_MENU.map((item) => (
                                  <option key={item.id} value={item.name}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                              <div className="form-pair">
                                <div>
                                  <label htmlFor="sugar">Lượng đường</label>
                                  <select
                                    id="sugar"
                                    aria-invalid={!!invalidFields["sugar"]}
                                    aria-describedby={
                                      invalidFields["sugar"]
                                        ? "registration-error"
                                        : undefined
                                    }
                                    required
                                    value={sugar}
                                    onChange={(event) =>
                                      setSugar(event.target.value)
                                    }
                                  >
                                    <option value="">Chọn mức đường</option>
                                    {SUGAR_LEVELS.map((value) => (
                                      <option key={value}>{value}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label htmlFor="ice">Lượng đá</label>
                                  <select
                                    id="ice"
                                    aria-invalid={!!invalidFields["ice"]}
                                    aria-describedby={
                                      invalidFields["ice"]
                                        ? "registration-error"
                                        : undefined
                                    }
                                    required
                                    value={ice}
                                    onChange={(event) =>
                                      setIce(event.target.value)
                                    }
                                  >
                                    <option value="">Chọn mức đá</option>
                                    {ICE_LEVELS.map((value) => (
                                      <option key={value}>{value}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <label htmlFor="drink-note">
                                Ghi chú đồ uống (tùy chọn)
                              </label>
                              <textarea
                                className="resize-none"
                                id="drink-note"
                                rows={2}
                                maxLength={500}
                                value={note}
                                onChange={(event) =>
                                  setNote(event.target.value)
                                }
                              />
                              <p className="hint">
                                Các tùy chỉnh ngoài menu cần ban tổ chức xác
                                nhận với cửa hàng.
                              </p>
                            </>
                          )}
                        </>
                      )}
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
                        Bạn có thể quay lại chỉnh sửa. Hạn chốt đăng ký:{" "}
                        {EVENT_INFO.registrationDeadline}.
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
                  <div>
                    <strong>{Object.keys(milkTeaOrders).length}</strong>
                    <span>Đơn đồ uống</span>
                  </div>
                </div>
                <p className="hint">
                  Đăng ký tham dự chưa phải xác nhận có mặt. Trước khi mở game,
                  hãy đối chiếu danh sách thực tế và phần quà. Danh sách game
                  được cố định khi bắt đầu.
                </p>
                <details>
                  <summary>Danh sách đăng ký & nhu cầu</summary>
                  <div className="logistics-list">
                    {STAFF_MEMBERS.map((member) => {
                      const rsvp = rsvps[member.id];
                      const order = milkTeaOrders[member.id];
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
                                  ? "Muốn đi xe chung"
                                  : "Tự di chuyển"
                                : MALE_TRANSPORT_OPTIONS.find(
                                    (option) =>
                                      option.id === rsvp.transportOption,
                                  )?.label || "Tự di chuyển"}
                            </p>
                          )}
                          {rsvp?.dietaryNote && (
                            <p>Nhu cầu: {rsvp.dietaryNote}</p>
                          )}
                          {order && (
                            <p>
                              {order.drinkName} · {order.sugar} · {order.ice}
                              {order.note ? ` · ${order.note}` : ""}
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
                Mở lời mời để gửi lời chúc hoặc thả tim →
              </button>
            )}
          </div>
          {!loaded ? (
            <p role="status">Đang tải lời chúc…</p>
          ) : wishes.length === 0 ? (
            <div className="card empty-state">
              <Heart aria-hidden="true" />
              <h2>Lời chúc đầu tiên đang chờ được gửi</h2>
              <p>Anh em có thể viết lời nhắn ở mục đăng ký của mình.</p>
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
                        <strong>{item.authorName}</strong>
                        <p className="hint">{dateTime(item.createdAt)}</p>
                      </div>
                    </div>
                    <p className="wish-content">{item.content}</p>
                    <button
                      className="quiet-button like-button"
                      type="button"
                      disabled={!user || !!pendingLike}
                      onClick={() => void like(item.id)}
                      aria-label={`Thả tim lời chúc của ${item.authorName}, ${item.likes} lượt tim`}
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
              Có thể bỏ qua lượt hoặc đổi sang một lời chúc. Chụp, quay và chia
              sẻ ảnh chỉ khi người được chụp đồng ý; mọi thức uống đều tùy chọn.
            </p>
            {game.phase === "WAITING" ? (
              <div className="empty-state">
                <Gift aria-hidden="true" />
                <h2>Chờ buổi hẹn bắt đầu</h2>
                <p>
                  Trò chơi sẽ mở khi ban tổ chức sẵn sàng. Bạn có thể xem thiệp
                  hoặc gửi lời chúc trong lúc chờ.
                </p>
              </div>
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
                          <p>Người đồng hành: {box.assignedMaleName}</p>
                        )}
                      </article>
                    ))}
                </div>
              </details>
            )}
          </section>
          {session.isAdmin && !presentation && (
            <section className="card host-panel">
              <p className="eyebrow">Quyền quản trị đã xác thực</p>
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
                  Thao tác này xóa toàn bộ kết quả trò chơi, giữ nguyên đăng ký
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
      {logoutConfirm && (
        <section
          className="draft-confirm card"
          role="alert"
          aria-label="Thay đổi chưa lưu"
        >
          <h2>Bạn đang có thay đổi chưa lưu</h2>
          <p>
            Lưu lựa chọn trước khi đổi thành viên, hoặc bỏ các thay đổi đang
            nhập.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => setLogoutConfirm(false)}
          >
            Tiếp tục chỉnh sửa
          </button>
          <button
            className="quiet-button"
            type="button"
            disabled={saving || gamePending || !!pendingLike}
            onClick={() => void logout()}
          >
            Bỏ thay đổi & đổi thành viên
          </button>
        </section>
      )}
      {!presentation && (
        <nav className="bottom-nav" aria-label="Điều hướng chính">
          {(
            [
              {
                id: "personal",
                label: user ? "Của bạn" : "Lời mời",
                Icon: Calendar,
              },
              { id: "wall", label: "Lời chúc", Icon: MessageSquareHeart },
              { id: "game", label: "Trò chơi", Icon: Gift },
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
            </button>
          ))}
        </nav>
      )}
      <footer>
        KTCNMT · 20.10.2026<span>Được chuẩn bị với sự trân trọng.</span>
      </footer>
    </main>
  );
}

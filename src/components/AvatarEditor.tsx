"use client";

import { useEffect, useRef, useState } from "react";

export default function AvatarEditor({ memberId, onSaved, onBusyChange, disabled = false }: {
  memberId: string;
  disabled?: boolean;
  onSaved: (versions: Record<string, string>) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!selected) { setPreview(""); return; }
    const url = URL.createObjectURL(selected);
    setPreview(url);
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [selected]);
  function dismiss() {
    dialog.current?.close();
    setSelected(null);
  }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file || busy || disabled) return;
    setMessage("");
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Chọn ảnh nhỏ hơn 5 MB nhé.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      const response = await fetch("/api/avatar", {
        method: "POST", body: file,
        headers: { "Content-Type": file.type, "x-member-id": memberId },
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa đổi được ảnh.");
      onSaved(result.avatarVersions);
      setMessage("Đã đổi ảnh đại diện của bạn.");
      dismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa đổi được ảnh. Bạn thử lại nhé.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return <div className="avatar-editor" aria-busy={busy}>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
      aria-label="Chọn ảnh đại diện mới"
      onChange={event => {
        if (disabled) return;
        const file = event.target.files?.[0];
        event.target.value = "";
        setError("");
        setMessage("");
        if (file && file.size > 5 * 1024 * 1024) setError("Chọn ảnh nhỏ hơn 5 MB nhé.");
        else if (file) setSelected(file);
      }} />
    <button type="button" className="quiet-button" disabled={busy || disabled} onClick={() => input.current?.click()}>
      {busy ? "Đang đổi ảnh…" : "Đổi ảnh đại diện"}
    </button>
    <small>Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được cắt vuông ở giữa.</small>
    {message && <p role="status" className="feedback">{message}</p>}
    {error && !selected && <p role="alert" className="feedback error">{error}</p>}
    <dialog ref={dialog} className="avatar-preview-dialog" aria-labelledby="avatar-preview-title"
      onCancel={event => { event.preventDefault(); if (!busy) dismiss(); }}>
      <h2 id="avatar-preview-title">Ảnh đại diện mới</h2>
      {preview && <img src={preview} alt="Xem trước ảnh đại diện mới" width={192} height={192} className="avatar-preview" />}
      <p>Ảnh sẽ hiển thị như thế này với mọi người.</p>
      {error && <p role="alert" className="feedback error">{error}</p>}
      <div className="avatar-preview-actions">
        <button type="button" className="quiet-button" disabled={busy} onClick={dismiss}>Hủy</button>
        <button type="button" className="primary-button" disabled={busy || !selected} onClick={() => void upload(selected || undefined)}>
          {busy ? "Đang lưu ảnh…" : "Dùng ảnh này"}
        </button>
      </div>
    </dialog>
  </div>;
}

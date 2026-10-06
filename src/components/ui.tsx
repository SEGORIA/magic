"use client";
import { X, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { initials } from "@/lib/domain";
export function Avatar({
  name,
  id,
  size = "",
}: {
  name: string;
  id?: string | null;
  size?: string;
}) {
  return (
    <span className={`avatar ${size}`}>
      {id ? <img src={`/api/media/${id}`} alt={name} /> : initials(name)}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sparkles size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children ?? "Todo empieza con un pequeño paso."}</p>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog className="modal" ref={ref} onCancel={onClose} aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Submit({
  busy,
  children = "Guardar",
}: {
  busy: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button className="btn primary" type="submit" disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle className="spin" size={18} />
          Guardando…
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function ProgressBar({ value }: { value: number | null }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label="Criterios logrados"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

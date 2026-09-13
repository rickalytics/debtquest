import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  X,
  Check,
  Sparkles,
  Compass,
  Users,
  Gift,
  Heart,
  Flame,
  Sun,
  Coffee,
  Popcorn,
  Music,
  Flag,
  Feather,
  Footprints,
  CreditCard,
  Car,
  GraduationCap,
  House,
  Target,
} from "lucide-react";
export const ICONS = {
  sparkles: Sparkles,
  compass: Compass,
  users: Users,
  gift: Gift,
  heart: Heart,
  flame: Flame,
  sun: Sun,
  coffee: Coffee,
  popcorn: Popcorn,
  music: Music,
  flag: Flag,
  feather: Feather,
  footprints: Footprints,
  credit_card: CreditCard,
  auto: Car,
  student: GraduationCap,
  mortgage: House,
  other: Target,
  installment: CreditCard,
};
export function Motif({ name = "sparkles", size = 20, ...props }) {
  const Component = ICONS[name];
  return Component ? (
    <Component size={size} strokeWidth={1.7} {...props} />
  ) : (
    <span aria-hidden="true">{name}</span>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Compass size={24} strokeWidth={1.7} />
      </span>
      debtquest<span className="brand-dot">.</span>
    </span>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Avatar({ name = "You", tone = "clay", small = false }) {
  return (
    <span
      className={`avatar ${tone} ${small ? "small" : ""}`}
      role="img"
      aria-label={name}
    >
      {name
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function Field({ label, hint, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />} {hint && <small>{hint}</small>}
    </label>
  );
}
export function Dialog({ title, subtitle, onClose, children, busy = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus?.();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) {
          const box = ref.current.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <IconButton label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function InlineError({ error }) {
  return error ? (
    <p className="inline-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return {
    busy,
    error,
    run: async (fn) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        return await fn();
      } catch (e) {
        setError(e.message || "Something went wrong. Please try again.");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
  };
}
export function Progress({ value, label }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Empty({ icon = "compass", title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Motif name={icon} size={32} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function DailyTask({ icon, title, description, points, done, onClick }) {
  return (
    <button
      className={`daily-task ${done ? "completed" : ""}`}
      onClick={onClick}
      disabled={done}
    >
      <span className={`task-icon ${icon}`}>
        <Motif name={icon} size={21} />
      </span>
      <span className="task-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="task-points">
        {done ? (
          <Check size={18} />
        ) : (
          <>
            +{points}
            <small> XP</small>
          </>
        )}
      </span>
    </button>
  );
}

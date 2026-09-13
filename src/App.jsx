import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } from "recharts";
import {
  initDB,
  loadAllData,
  saveAllData,
  isSupabaseConfigured,
  signInWithPassword,
  signUpWithPassword,
  signOut,
} from "./db.js";
import { supabase } from "./supabaseClient.js";
import { parseBackup } from "./backup.js";
import { exportBackup } from "./native.js";
import DeleteAccountDialog from "./DeleteAccountDialog.jsx";
import { LegalLinks } from "./Legal.jsx";

const AppContext = createContext(null);

// ─── Persistence: IndexedDB (local) or Supabase (cloud) ───

const DEFAULT_DATA = {
  accounts: [],
  payments: [],
  goals: [],
  achievements: [],
  rewards: [],
  redeemedRewards: [],
  xp: 0,
  streak: 0,
  lastPaymentMonth: null,
  profile: { name1: "Player 1", name2: "Player 2" },
};

const BADGE_DEFS = [
  { id: "first_blood", name: "First Blood", emoji: "🗡️", desc: "Log your first payment", check: (d) => d.payments.length >= 1 },
  { id: "snowball", name: "Snowball Rolling", emoji: "☃️", desc: "Pay off your smallest debt", check: (d) => d.accounts.some(a => a.isPaidOff) },
  { id: "on_a_roll", name: "On a Roll", emoji: "🔥", desc: "3-month payment streak", check: (d) => d.streak >= 3 },
  { id: "hot_streak", name: "Hot Streak", emoji: "💥", desc: "6-month payment streak", check: (d) => d.streak >= 6 },
  { id: "ten_pct", name: "10% Down", emoji: "📉", desc: "Reduce total debt by 10%", check: (d) => {
    const orig = d.accounts.reduce((s, a) => s + a.originalBalance, 0);
    const curr = d.accounts.reduce((s, a) => s + a.currentBalance, 0);
    return orig > 0 && (orig - curr) / orig >= 0.1;
  }},
  { id: "halfway", name: "Halfway There", emoji: "🏔️", desc: "Pay off 50% of total debt", check: (d) => {
    const orig = d.accounts.reduce((s, a) => s + a.originalBalance, 0);
    const curr = d.accounts.reduce((s, a) => s + a.currentBalance, 0);
    return orig > 0 && (orig - curr) / orig >= 0.5;
  }},
  { id: "four_digits", name: "Four Digits", emoji: "💰", desc: "Pay over $1,000 total", check: (d) => d.payments.reduce((s, p) => s + p.amountPaid, 0) >= 1000 },
  { id: "boss_slayer", name: "Final Boss", emoji: "🐉", desc: "Pay off your largest debt", check: (d) => {
    if (d.accounts.length === 0) return false;
    const largest = d.accounts.reduce((a, b) => a.originalBalance > b.originalBalance ? a : b);
    return largest.isPaidOff;
  }},
  { id: "debt_free", name: "Debt Free!", emoji: "👑", desc: "Pay off ALL debts", check: (d) => d.accounts.length > 0 && d.accounts.every(a => a.isPaidOff) },
];

const LEVELS = [
  { name: "Debt Rookie", minXP: 0, emoji: "🌱" },
  { name: "Debt Warrior", minXP: 500, emoji: "⚔️" },
  { name: "Debt Slayer", minXP: 2000, emoji: "🔥" },
  { name: "Debt Crusher", minXP: 5000, emoji: "💎" },
  { name: "Debt Free Legend", minXP: 10000, emoji: "👑" },
];

const DEBT_TYPES = [
  { value: "mortgage", label: "Mortgage", emoji: "🏠" },
  { value: "auto", label: "Auto Loan", emoji: "🚗" },
  { value: "credit_card", label: "Credit Card", emoji: "💳" },
  { value: "installment", label: "Installment", emoji: "📋" },
  { value: "student", label: "Student Loan", emoji: "🎓" },
  { value: "other", label: "Other", emoji: "📦" },
];

const ACCOUNT_COLORS = ["#7c6af7", "#f7c26a", "#6af7b8", "#f76a9b", "#6ac4f7", "#f7946a", "#b86af7", "#6af7e8"];

function getLevel(xp) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXP) lvl = l; }
  return lvl;
}

function getNextLevel(xp) {
  for (const l of LEVELS) { if (xp < l.minXP) return l; }
  return null;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtFull(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function pct(a, b) { return b === 0 ? 0 : Math.min(100, Math.max(0, ((b - a) / b) * 100)); }

// ─── Custom chart tooltip ───
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c1c27", border: "1px solid #2a2a3d", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e8e8f0" }}>
      <div style={{ color: "#6b6b8a", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

// ─── Confetti burst ───
function Confetti({ show }) {
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    color: ["#7c6af7", "#f7c26a", "#6af7b8", "#f76a9b", "#6ac4f7"][i % 5],
    size: 4 + Math.random() * 6,
  })), []);
  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: 0, left: `${p.x}%`,
          width: p.size, height: p.size, borderRadius: p.size > 7 ? "50%" : "1px",
          background: p.color,
          animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── Progress Ring ───
function ProgressRing({ progress, size = 100, stroke = 6, color = "#7c6af7", children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(progress, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c1c27" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Nav icon ───
function NavIcon({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      background: "none", border: "none", cursor: "pointer", padding: "6px 0",
      color: active ? "#f7c26a" : "#6b6b8a", transition: "color 0.2s",
      fontSize: 11, fontFamily: "inherit", minWidth: 50,
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontWeight: active ? 700 : 400 }}>{label}</span>
    </button>
  );
}

// ─── Modal wrapper ───
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, maxHeight: "85dvh", overflow: "auto",
        background: "#13131a", border: "1px solid #2a2a3d", borderRadius: "20px 20px 0 0",
        padding: "20px 20px calc(32px + env(safe-area-inset-bottom))", animation: "slideUp 0.3s ease",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f7c26a" }}>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose} style={{ background: "#1c1c27", border: "1px solid #2a2a3d", borderRadius: 8, width: 32, height: 32, color: "#6b6b8a", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Input ───
function Input({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</span>
      <input {...props} style={{
        width: "100%", padding: "10px 12px", background: "#1c1c27", border: "1px solid #2a2a3d",
        borderRadius: 8, color: "#e8e8f0", fontSize: 16, outline: "none", fontFamily: "inherit",
        ...(props.style || {}),
      }} />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</span>
      <select {...props} style={{
        width: "100%", padding: "10px 12px", background: "#1c1c27", border: "1px solid #2a2a3d",
        borderRadius: 8, color: "#e8e8f0", fontSize: 16, outline: "none", fontFamily: "inherit",
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Btn({ children, variant = "primary", ...props }) {
  const styles = {
    primary: { background: "linear-gradient(135deg, #7c6af7, #9b6af7)", color: "#fff" },
    gold: { background: "linear-gradient(135deg, #f7c26a, #f7a64e)", color: "#0a0a0f" },
    ghost: { background: "transparent", border: "1px solid #2a2a3d", color: "#e8e8f0" },
    danger: { background: "transparent", border: "1px solid #f76a6a", color: "#f76a6a" },
  };
  return (
    <button {...props} style={{
      padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer",
      fontFamily: "inherit", fontWeight: 700, fontSize: 14, width: "100%",
      transition: "transform 0.1s, opacity 0.2s", ...styles[variant], ...(props.style || {}),
    }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

function AuthScreen({ onToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState(null);
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    background: "#1c1c27",
    border: "1px solid #2a2a3d",
    borderRadius: 8,
    color: "#e8e8f0",
    fontSize: 16,
    outline: "none",
    fontFamily: "inherit",
    marginBottom: 12,
    boxSizing: "border-box",
  };

  const handleSignIn = async () => {
    setErr(null);
    if (!email.trim() || !password) {
      setErr("Enter email and password");
      return;
    }
    setBusy(true);
    try {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) setErr(error.message);
    } catch (e) {
      setErr(e.message || "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    setErr(null);
    if (!email.trim() || password.length < 6) {
      setErr("Use a valid email and password (6+ characters)");
      return;
    }
    setBusy(true);
    try {
      const { error } = await signUpWithPassword(email.trim(), password);
      if (error) setErr(error.message);
      else setNotice("Check your email to confirm your account, then return here to sign in.");
    } catch (e) {
      setErr(e.message || "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0a0f",
      color: "#e8e8f0",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "center",
      padding: "calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))",
      maxWidth: 400,
      margin: "0 auto",
      boxSizing: "border-box",
    }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, margin: 0 }}>
          Debt<span style={{ color: "#f7c26a" }}>Quest</span>
        </h1>
        <p style={{ color: "#6b6b8a", fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>
          Sign in to sync data in the cloud (same login on phone and desktop).
        </p>
      </div>
      {notice && <p role="status" style={{ color: "#6af7b8", marginBottom: 12 }}>{notice}</p>}
      {err && (
        <div style={{ color: "#f76a6a", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</div>
      )}
      <input
        type="email"
        aria-label="Email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        style={inputStyle}
      />
      <input
        type="password"
        aria-label="Password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        style={inputStyle}
      />
      <Btn variant="gold" onClick={handleSignIn} style={{ marginBottom: 10 }} disabled={busy}>
        {busy ? "…" : "Sign in"}
      </Btn>
      <Btn variant="ghost" onClick={handleSignUp} disabled={busy}>
        {busy ? "…" : "Create account"}
      </Btn>
      <LegalLinks />
    </div>
  );
}

// ─── MAIN APP ───
export default function DebtQuest() {
  const [data, setData] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authUser, setAuthUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showLogPayment, setShowLogPayment] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState(null);
  const [showEditAccount, setShowEditAccount] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [showAddReward, setShowAddReward] = useState(false);

  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Auth callbacks stay synchronous: awaiting another auth call here can deadlock.
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) setLoadError(error.message);
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    }).catch(e => { if (mounted) { setLoadError(e.message); setAuthReady(true); } });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const userId = authUser?.id;
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setData(null);
    setLoadError(null);
    setSaveError(null);
    setShowDeleteAccount(false);
    setTab("dashboard");
    if (isSupabaseConfigured && !userId) return;
    (async () => {
      try {
        await initDB();
        const loaded = await loadAllData();
        if (active) setData(loaded);
      } catch (e) {
        if (active) setLoadError(e.message || "Unable to load your data.");
      }
    })();
    return () => { active = false; };
  }, [authReady, userId, reloadKey]);

  // Keep the last durable state visible until the write succeeds. Block overlapping
  // edits, and leave failed forms intact so the user can retry without data loss.
  const save = useCallback(async (newData) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await saveAllData(newData);
      setData(newData);
      return true;
    } catch (e) {
      setSaveError(e.message || "Unable to save. Check your connection and try again.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  // Toast helper
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Confetti helper
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  // Check and award achievements
  const checkAchievements = useCallback((newData) => {
    const updated = { ...newData, achievements: [...newData.achievements] };
    for (const badge of BADGE_DEFS) {
      if (!updated.achievements.includes(badge.id) && badge.check(updated)) {
        updated.achievements.push(badge.id);
        updated.xp += 200;

      }
    }
    return updated;
  }, []);

  // ─── Add Account ───
  const handleAddAccount = useCallback(async (form) => {
    if (!form.name.trim() || ![form.originalBalance, form.currentBalance || 0, form.interestRate || 0, form.minimumPayment || 0].every(v => Number.isFinite(Number(v)) && Number(v) >= 0) || !Number.isInteger(Number(form.dueDate)) || Number(form.dueDate) < 1 || Number(form.dueDate) > 31) {
      showToast("Enter valid balances, rates, and a due day from 1 to 31.", "error"); return;
    }
    const acct = {
      id: uid(),
      name: form.name,
      type: form.type,
      originalBalance: parseFloat(form.originalBalance) || 0,
      currentBalance: form.currentBalance === "" ? Number(form.originalBalance) : Number(form.currentBalance),
      interestRate: parseFloat(form.interestRate) || 0,
      minimumPayment: parseFloat(form.minimumPayment) || 0,
      dueDate: parseInt(form.dueDate) || 1,
      emoji: DEBT_TYPES.find(t => t.value === form.type)?.emoji || "📦",
      color: ACCOUNT_COLORS[data.accounts.length % ACCOUNT_COLORS.length],
      createdAt: new Date().toISOString(),
      isPaidOff: form.currentBalance !== "" && Number(form.currentBalance) === 0,
    };
    const newData = { ...data, accounts: [...data.accounts, acct] };
    if (!await save(checkAchievements(newData))) return;
    setShowAddAccount(false);
    showToast(`${acct.emoji} ${acct.name} added!`);
  }, [data, save, checkAchievements, showToast]);

  // ─── Log Payment ───
  const handleLogPayment = useCallback(async (form) => {
    const acctIdx = data.accounts.findIndex(a => a.id === form.accountId);
    if (acctIdx < 0) return;

    const acct = { ...data.accounts[acctIdx] };
    const amount = parseFloat(form.amount) || 0;
    if (!Number.isFinite(amount) || amount <= 0 || amount > acct.currentBalance) { showToast("Enter a payment greater than zero and no more than the remaining balance.", "error"); return; }
    const balAfter = Math.max(0, acct.currentBalance - amount);

    const payment = {
      id: uid(),
      accountId: form.accountId,
      paymentDate: form.date || new Date().toISOString().split("T")[0],
      amountPaid: amount,
      balanceBefore: acct.currentBalance,
      balanceAfter: balAfter,
      note: form.note || "",
    };

    acct.currentBalance = balAfter;
    if (balAfter <= 0) acct.isPaidOff = true;

    // XP calculation
    let xpGain = Math.round(amount / 10); // 1 XP per $10
    if (amount > acct.minimumPayment && acct.minimumPayment > 0) {
      xpGain = Math.round(xpGain * 1.5); // 50% bonus for exceeding minimum
    }
    if (acct.isPaidOff && acct.currentBalance <= 0) {
      xpGain += 500; // Big bonus for paying off
    }

    // Streak
    const thisMonth = new Date().toISOString().slice(0, 7);
    let newStreak = data.streak;
    if (data.lastPaymentMonth !== thisMonth) {
      const lastDate = data.lastPaymentMonth ? new Date(data.lastPaymentMonth + "-01") : null;
      const thisDate = new Date(thisMonth + "-01");
      if (lastDate) {
        const diff = (thisDate.getFullYear() - lastDate.getFullYear()) * 12 + thisDate.getMonth() - lastDate.getMonth();
        newStreak = diff === 1 ? newStreak + 1 : 1;
      } else {
        newStreak = 1;
      }
    }

    const accounts = [...data.accounts];
    accounts[acctIdx] = acct;

    let newData = {
      ...data,
      accounts,
      payments: [...data.payments, payment],
      xp: data.xp + xpGain,
      streak: newStreak,
      lastPaymentMonth: thisMonth,
    };

    newData = checkAchievements(newData);
    const newBadges = newData.achievements.filter(a => !data.achievements.includes(a));
    if (!await save(newData)) return;
    setShowLogPayment(false);

    // Build mini projection for this account
    const projAcct = newData.accounts[acctIdx];
    const projPoints = [];
    let monthsToPayoff = null;
    let monthsMinOnly = null;
    let interestAtCurrentPace = 0;
    let interestMinOnly = 0;
    let interestSavedThisPayment = 0;

    if (projAcct && !projAcct.isPaidOff) {
      const rate = projAcct.interestRate / 100 / 12;
      const acctPayments = newData.payments.filter(p => p.accountId === projAcct.id);
      const avgPayment = acctPayments.length >= 2
        ? acctPayments.reduce((s, p) => s + p.amountPaid, 0) / acctPayments.length
        : amount;

      // --- Sim 1: Current pace (avg payment) ---
      let bal = projAcct.currentBalance;
      projPoints.push({ month: "Now", balance: Math.round(bal) });
      for (let m = 1; m <= 360 && bal > 0; m++) {
        const interest = rate * bal;
        interestAtCurrentPace += interest;
        const pmt = Math.min(bal + interest, Math.max(avgPayment, projAcct.minimumPayment));
        bal = Math.max(0, bal + interest - pmt);
        if (m % 2 === 0 || bal <= 0) {
          const d = new Date(); d.setMonth(d.getMonth() + m);
          projPoints.push({ month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), balance: Math.round(bal) });
        }
        if (bal <= 0) { monthsToPayoff = m; break; }
      }

      // --- Sim 2: Min-only from current balance (the "scheduled" baseline) ---
      bal = projAcct.currentBalance;
      for (let m = 1; m <= 600 && bal > 0; m++) {
        const interest = rate * bal;
        interestMinOnly += interest;
        const pmt = Math.min(bal + interest, projAcct.minimumPayment);
        bal = Math.max(0, bal + interest - pmt);
        if (bal <= 0) { monthsMinOnly = m; break; }
      }

      // --- Sim 3: Interest saved by THIS payment being above minimum ---
      // Compare: what if this payment had been exactly the minimum?
      if (amount > projAcct.minimumPayment && projAcct.minimumPayment > 0) {
        const extraPrincipal = amount - projAcct.minimumPayment;
        // The interest saved is roughly: extra principal × rate × remaining months
        // More precisely, simulate from balance+extra vs balance
        let balWith = projAcct.currentBalance; // already reflects full payment
        let balWithout = projAcct.currentBalance + extraPrincipal; // as if only min was paid
        let intWith = 0, intWithout = 0;
        for (let m = 1; m <= 600; m++) {
          const iW = rate * balWith;
          const iWO = rate * balWithout;
          intWith += iW;
          intWithout += iWO;
          balWith = Math.max(0, balWith + iW - Math.min(balWith + iW, Math.max(avgPayment, projAcct.minimumPayment)));
          balWithout = Math.max(0, balWithout + iWO - Math.min(balWithout + iWO, Math.max(avgPayment, projAcct.minimumPayment)));
          if (balWith <= 0 && balWithout <= 0) break;
        }
        interestSavedThisPayment = Math.max(0, intWithout - intWith);
      }
    }

    // Cumulative interest saved: total interest at min-only minus total interest at current pace
    // We need to compute from ORIGINAL balance for the "full schedule" comparison
    let cumulativeInterestSaved = 0;
    if (projAcct && projAcct.interestRate > 0) {
      const rate = projAcct.interestRate / 100 / 12;
      // Full min-only from original balance
      let balOrig = projAcct.originalBalance;
      let intOrig = 0;
      for (let m = 1; m <= 600 && balOrig > 0; m++) {
        const interest = rate * balOrig;
        intOrig += interest;
        const pmt = Math.min(balOrig + interest, projAcct.minimumPayment);
        balOrig = Math.max(0, balOrig + interest - pmt);
      }
      // Actual interest paid so far (approx from payments) + projected remaining
      const acctPaymentsAll = newData.payments.filter(p => p.accountId === projAcct.id);
      const totalPaidSoFar = acctPaymentsAll.reduce((s, p) => s + p.amountPaid, 0);
      const principalPaid = projAcct.originalBalance - projAcct.currentBalance;
      const interestPaidSoFar = Math.max(0, totalPaidSoFar - principalPaid);
      const totalProjectedInterest = interestPaidSoFar + interestAtCurrentPace;
      cumulativeInterestSaved = Math.max(0, intOrig - totalProjectedInterest);
    }

    // Months ahead of schedule
    const monthsAhead = (monthsMinOnly && monthsToPayoff) ? monthsMinOnly - monthsToPayoff : 0;

    setPaymentSuccess({
      acct: newData.accounts[acctIdx],
      payment,
      xpGain,
      newBadges,
      paidOff: acct.isPaidOff,
      projection: projPoints,
      monthsToPayoff,
      monthsMinOnly,
      monthsAhead,
      interestSavedThisPayment: Math.round(interestSavedThisPayment * 100) / 100,
      cumulativeInterestSaved: Math.round(cumulativeInterestSaved * 100) / 100,
      totalPaidOnAcct: newData.payments.filter(p => p.accountId === acct.id).reduce((s, p) => s + p.amountPaid, 0),
    });

    if (acct.isPaidOff) {
      triggerConfetti();
    }
  }, [data, save, checkAchievements, showToast, triggerConfetti]);

  // Delete account
  const handleDeleteAccount = useCallback(async (id) => {
    if (!window.confirm("Delete this debt and its payment history? This cannot be undone.")) return;
    const newData = {
      ...data,
      accounts: data.accounts.filter(a => a.id !== id),
      payments: data.payments.filter(p => p.accountId !== id),
    };
    if (!await save(newData)) return;
    setSelectedAccount(null);
    setShowEditAccount(null);
    showToast("Account deleted");
  }, [data, save, showToast]);

  // ─── Projection engine ───
  const buildProjection = useCallback((accounts, extraMonthly = 0) => {
    if (!accounts.length) return [];
    let balances = accounts.filter(a => !a.isPaidOff).map(a => ({
      id: a.id, name: a.name, bal: a.currentBalance, rate: a.interestRate, min: a.minimumPayment, color: a.color
    }));
    const points = [{ month: "Now", total: balances.reduce((s, b) => s + b.bal, 0) }];
    for (let m = 1; m <= 360 && balances.some(b => b.bal > 0); m++) {
      for (const b of balances) {
        if (b.bal <= 0) continue;
        const interest = (b.rate / 100 / 12) * b.bal;
        const payment = Math.min(b.bal + interest, b.min + (b.id === balances.find(x => x.bal > 0)?.id ? extraMonthly : 0));
        b.bal = Math.max(0, b.bal + interest - payment);
      }
      if (m % 3 === 0 || balances.every(b => b.bal <= 0)) {
        points.push({ month: `Mo ${m}`, total: Math.round(balances.reduce((s, b) => s + b.bal, 0)) });
      }
      if (balances.every(b => b.bal <= 0)) break;
    }
    return points;
  }, []);

  if (loadError) return <div className="release-error" role="alert"><h1>Your data could not be loaded</h1><p>{loadError}</p><p>Your saved data has not been replaced.</p><Btn onClick={() => setReloadKey(k => k + 1)}>Retry</Btn><LegalLinks /></div>;

  if (isSupabaseConfigured && !authReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f", color: "#f7c26a", fontSize: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div>Loading…</div>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !authUser) {
    return <AuthScreen onToast={(msg) => showToast(msg)} />;
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f", color: "#f7c26a", fontSize: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div>Loading DebtQuest...</div>
        </div>
      </div>
    );
  }

  const totalOriginal = data.accounts.reduce((s, a) => s + a.originalBalance, 0);
  const totalCurrent = data.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const totalPaid = totalOriginal - totalCurrent;
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;
  const level = getLevel(data.xp);
  const nextLevel = getNextLevel(data.xp);
  const levelProgress = nextLevel ? ((data.xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100 : 100;
  const totalPayments = data.payments.reduce((s, p) => s + p.amountPaid, 0);

  // ─── RENDER ───
  const screens = { dashboard: Dashboard, detail: AccountDetail, projections: Projections, achievements: Achievements, rewards: Rewards, settings: Settings };
  const Screen = screens[tab] || Dashboard;

  return (
    <AppContext.Provider value={{ data, setTab, setSelectedAccount, setShowAddAccount, totalCurrent, totalPaid, overallProgress, level, nextLevel, levelProgress, selectedAccount, setShowLogPayment, setShowEditAccount, buildProjection, totalPayments, authUser, setShowDeleteAccount, save, showToast, handleDeleteAccount, setShowAddReward, triggerConfetti, showAddReward, showAddAccount, handleAddAccount, showLogPayment, handleLogPayment, showEditAccount, paymentSuccess, setPaymentSuccess }}>
    <div style={{
      maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", background: "#0a0a0f", color: "#e8e8f0",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <Confetti show={showConfetti} />
      {paymentSuccess && <PaymentSuccess />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "calc(20px + env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", zIndex: 2000,
          background: toast.type === "error" ? "#3a1020" : "#102a1a",
          border: `1px solid ${toast.type === "error" ? "#f76a6a" : "#6af7b8"}`,
          borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600,
          color: toast.type === "error" ? "#f76a6a" : "#6af7b8",
          animation: "fadeUp 0.3s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {saving && <div className="save-overlay" role="status">Saving…</div>}
      {saveError && <div className="save-error" role="alert"><p>Change was not saved. {saveError}</p><button onClick={() => setSaveError(null)}>Dismiss and retry</button><button onClick={() => window.location.reload()}>Reload saved data</button></div>}
      {showDeleteAccount && <DeleteAccountDialog onClose={() => setShowDeleteAccount(false)} onDeleted={() => { setShowDeleteAccount(false); setData(null); setAuthUser(null); }} />}

      {/* Header */}
      <div style={{
        padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #1c1c27", background: "rgba(10,10,15,0.95)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>Debt<span style={{ color: "#f7c26a" }}>Quest</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6b6b8a" }}>{level.emoji} Lv.{LEVELS.indexOf(level) + 1}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f7c26a" }}>{data.xp} XP</span>
        </div>
      </div>

      {/* Screen */}
      <div style={{ paddingTop: 16, paddingBottom: "calc(80px + env(safe-area-inset-bottom))", flex: 1, minHeight: 0, overflow: "auto" }}>
        <Screen />
      </div>

      {/* FAB - Log Payment */}
      {tab === "dashboard" && data.accounts.some(a => !a.isPaidOff) && (
        <button onClick={() => setShowLogPayment(true)} style={{
          position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom))", right: "max(16px, calc(50% - 224px))", zIndex: 50,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #f7c26a, #f7a64e)", border: "none",
          fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(247,194,106,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          💰
        </button>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(10px)",
        borderTop: "1px solid #1c1c27", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom, 8px)",
        zIndex: 100,
      }}>
        <NavIcon icon="🏠" label="Home" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        <NavIcon icon="📊" label="Projections" active={tab === "projections"} onClick={() => setTab("projections")} />
        <NavIcon icon="🎁" label="Rewards" active={tab === "rewards"} onClick={() => setTab("rewards")} />
        <NavIcon icon="🏆" label="Badges" active={tab === "achievements"} onClick={() => setTab("achievements")} />
        <NavIcon icon="⚙️" label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      {/* Modals */}
      {showAddAccount && <AddAccountModal />}
      {showLogPayment && <LogPaymentModal />}
      <EditAccountModal />
      {showAddReward && <AddRewardModal />}
    </div>
    </AppContext.Provider>
  );
}


const Dashboard = () => {
  const { data, setTab, setSelectedAccount, setShowAddAccount, totalCurrent, totalPaid, overallProgress, level, nextLevel, levelProgress } = useContext(AppContext);
  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Hero card */}
      <div style={{
        background: "linear-gradient(135deg, #1a1230 0%, #0d1a24 100%)",
        border: "1px solid #2a2a3d", borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Remaining</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#e8e8f0", letterSpacing: -1 }}>{fmt(totalCurrent)}</div>
            <div style={{ fontSize: 13, color: "#6af7b8", marginTop: 2 }}>{fmt(totalPaid)} paid off</div>
          </div>
          <ProgressRing progress={overallProgress} size={72} stroke={5} color="#f7c26a">
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f7c26a" }}>{Math.round(overallProgress)}%</span>
          </ProgressRing>
        </div>
        <div style={{ height: 6, background: "#1c1c27", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${overallProgress}%`, background: "linear-gradient(90deg, #7c6af7, #f7c26a)", borderRadius: 3, transition: "width 0.8s ease" }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Level", value: level.emoji, sub: level.name },
          { label: "XP", value: data.xp.toLocaleString(), sub: nextLevel ? `${Math.round(levelProgress)}% to next` : "MAX" },
          { label: "Streak", value: `${data.streak}`, sub: data.streak === 1 ? "month" : "months" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e8f0", margin: "4px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#6b6b8a" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Account cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Accounts</h2>
        <button onClick={() => setShowAddAccount(true)} style={{
          background: "linear-gradient(135deg, #7c6af7, #9b6af7)", border: "none", borderRadius: 8,
          padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>+ Add</button>
      </div>

      {data.accounts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b6b8a", background: "#13131a", borderRadius: 12, border: "1px dashed #2a2a3d" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>No debts added yet</div>
          <div style={{ fontSize: 12 }}>Add your first account to start your quest!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.accounts.map(acct => {
            const prog = pct(acct.currentBalance, acct.originalBalance);
            return (
              <button key={acct.id} onClick={() => { setSelectedAccount(acct.id); setTab("detail"); }}
                style={{
                  background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16,
                  cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", color: "#e8e8f0",
                  borderLeft: `3px solid ${acct.color}`, transition: "transform 0.1s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{acct.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{acct.name}</div>
                      <div style={{ fontSize: 11, color: "#6b6b8a" }}>{acct.interestRate}% APR · Min {fmt(acct.minimumPayment)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(acct.currentBalance)}</div>
                    {acct.isPaidOff && <span style={{ fontSize: 10, color: "#6af7b8", fontWeight: 700 }}>✓ PAID OFF</span>}
                  </div>
                </div>
                <div style={{ height: 4, background: "#1c1c27", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${prog}%`, background: acct.color, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#6b6b8a", marginTop: 4 }}>{Math.round(prog)}% paid off</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent achievements */}
      {data.achievements.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}>Recent Wins</h2>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {data.achievements.slice(-5).reverse().map(aid => {
              const b = BADGE_DEFS.find(x => x.id === aid);
              return b ? (
                <div key={aid} style={{
                  background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 10, padding: "10px 14px",
                  minWidth: 90, textAlign: "center", flexShrink: 0,
                }}>
                  <div style={{ fontSize: 24 }}>{b.emoji}</div>
                  <div style={{ fontSize: 10, color: "#f7c26a", fontWeight: 700, marginTop: 4 }}>{b.name}</div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AccountDetail = () => {
  const { data, setTab, selectedAccount, setShowLogPayment, setShowEditAccount } = useContext(AppContext);

    const acct = data.accounts.find(a => a.id === selectedAccount);
    if (!acct) return <div style={{ padding: 20, color: "#6b6b8a" }}>Account not found</div>;
    const prog = pct(acct.currentBalance, acct.originalBalance);
    const payments = data.payments.filter(p => p.accountId === acct.id).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <button onClick={() => setTab("dashboard")} style={{
          background: "none", border: "none", color: "#7c6af7", cursor: "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, marginBottom: 12, padding: 0,
        }}>← Back</button>

        <div style={{
          background: "linear-gradient(135deg, #1a1230 0%, #0d1a24 100%)",
          border: "1px solid #2a2a3d", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16,
          borderTop: `3px solid ${acct.color}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{acct.emoji}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{acct.name}</h2>
          <div style={{ fontSize: 12, color: "#6b6b8a", marginBottom: 16 }}>{DEBT_TYPES.find(t => t.value === acct.type)?.label} · {acct.interestRate}% APR</div>

          <ProgressRing progress={prog} size={120} stroke={8} color={acct.color}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{Math.round(prog)}%</span>
            <span style={{ fontSize: 10, color: "#6b6b8a" }}>paid off</span>
          </ProgressRing>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div style={{ background: "#0a0a0f", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, color: "#6b6b8a", textTransform: "uppercase" }}>Remaining</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e8f0" }}>{fmt(acct.currentBalance)}</div>
            </div>
            <div style={{ background: "#0a0a0f", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, color: "#6b6b8a", textTransform: "uppercase" }}>Original</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#6b6b8a" }}>{fmt(acct.originalBalance)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <Btn variant="gold" onClick={() => { setShowLogPayment(acct.id); }}>💰 Log Payment</Btn>
          <Btn variant="ghost" onClick={() => setShowEditAccount(acct)}>⚙️ Edit</Btn>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}>Payment History</h3>
        {payments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#6b6b8a", fontSize: 13 }}>No payments yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payments.map(p => (
              <div key={p.id} style={{
                background: "#13131a", border: "1px solid #1c1c27", borderRadius: 10, padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#6af7b8" }}>−{fmtFull(p.amountPaid)}</div>
                  <div style={{ fontSize: 11, color: "#6b6b8a" }}>{p.paymentDate}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#6b6b8a" }}>Balance after</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtFull(p.balanceAfter)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

const Projections = () => {
  const { data, buildProjection } = useContext(AppContext);

    const minOnly = buildProjection(data.accounts, 0);
    const extra200 = buildProjection(data.accounts, 200);
    const extra500 = buildProjection(data.accounts, 500);

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8e8f0", marginBottom: 4 }}>Payoff Projections</h2>
        <p style={{ fontSize: 12, color: "#6b6b8a", marginBottom: 16 }}>See how extra payments accelerate your freedom</p>

        {data.accounts.filter(a => !a.isPaidOff).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b6b8a" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div>All debts paid off — or add accounts to see projections!</div>
          </div>
        ) : (
          <>
            <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#6b6b8a", marginBottom: 8 }}>Total Debt Over Time</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={minOnly}>
                  <defs>
                    <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c6af7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7c6af7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c1c27" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#7c6af7" fill="url(#gMin)" strokeWidth={2} name="Min payments" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#6b6b8a", marginBottom: 8 }}>Scenario Comparison</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={minOnly.map((p, i) => ({
                  month: p.month,
                  min: p.total,
                  plus200: extra200[i]?.total ?? 0,
                  plus500: extra500[i]?.total ?? 0,
                }))}>
                  <CartesianGrid stroke="#1c1c27" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="min" stroke="#6b6b8a" strokeWidth={1.5} dot={false} name="Min only" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="plus200" stroke="#7c6af7" strokeWidth={2} dot={false} name="+$200/mo" />
                  <Line type="monotone" dataKey="plus500" stroke="#f7c26a" strokeWidth={2} dot={false} name="+$500/mo" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
                {[{ c: "#6b6b8a", l: "Min only", dash: true }, { c: "#7c6af7", l: "+$200/mo" }, { c: "#f7c26a", l: "+$500/mo" }].map((x, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: x.c }}>
                    <div style={{ width: 16, height: 2, background: x.c, borderRadius: 1 }} />
                    {x.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b6b8a", textTransform: "uppercase" }}>Min payment timeline</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e8f0", marginTop: 4 }}>{minOnly.length > 0 ? minOnly[minOnly.length - 1].month : "N/A"}</div>
              </div>
              <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b6b8a", textTransform: "uppercase" }}>+$500/mo timeline</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f7c26a", marginTop: 4 }}>{extra500.length > 0 ? extra500[extra500.length - 1].month : "N/A"}</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

const Achievements = () => {
  const { data, level, nextLevel, levelProgress, totalPayments } = useContext(AppContext);
  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* XP / Level card */}
      <div style={{
        background: "linear-gradient(135deg, #1a1230 0%, #0d1a24 100%)",
        border: "1px solid #2a2a3d", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 20,
      }}>
        <div style={{ fontSize: 40 }}>{level.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f7c26a", marginTop: 4 }}>{level.name}</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", marginTop: 2 }}>{data.xp.toLocaleString()} XP</div>
        {nextLevel && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 6, background: "#1c1c27", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${levelProgress}%`, background: "linear-gradient(90deg, #7c6af7, #f7c26a)", borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#6b6b8a", marginTop: 4 }}>{nextLevel.minXP - data.xp} XP to {nextLevel.name} {nextLevel.emoji}</div>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 12 }}>Badges</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BADGE_DEFS.map(b => {
          const unlocked = data.achievements.includes(b.id);
          return (
            <div key={b.id} style={{
              background: unlocked ? "#13131a" : "#0d0d14",
              border: `1px solid ${unlocked ? "#2a2a3d" : "#1a1a24"}`,
              borderRadius: 14, padding: 16, textAlign: "center",
              opacity: unlocked ? 1 : 0.4, transition: "opacity 0.3s",
            }}>
              <div style={{ fontSize: 32, filter: unlocked ? "none" : "grayscale(1)" }}>{b.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? "#f7c26a" : "#6b6b8a", marginTop: 6 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: "#6b6b8a", marginTop: 2 }}>{b.desc}</div>
              {unlocked && <div style={{ fontSize: 10, color: "#6af7b8", marginTop: 4, fontWeight: 700 }}>✓ UNLOCKED</div>}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ marginTop: 20, background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}>All-Time Stats</h3>
        {[
          { label: "Total Payments Made", value: data.payments.length },
          { label: "Total Amount Paid", value: fmtFull(totalPayments) },
          { label: "Accounts Paid Off", value: data.accounts.filter(a => a.isPaidOff).length },
          { label: "Longest Streak", value: `${data.streak} months` },
          { label: "Badges Earned", value: `${data.achievements.length} / ${BADGE_DEFS.length}` },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid #1c1c27" : "none" }}>
            <span style={{ fontSize: 13, color: "#6b6b8a" }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Settings = () => {
  const { data, authUser, setTab, setShowDeleteAccount, save, showToast, handleDeleteAccount } = useContext(AppContext);

    const handleExport = async () => {
      try { await exportBackup(data); }
      catch { showToast("Backup was not shared. Please try Export again.", "error"); }
    };

    const handleImport = () => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = ".json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds the 10 MB limit.");
          const imported = parseBackup(await file.text());
          if (!window.confirm("Replace the data in this account with this backup? Export a backup first if you want to keep the current data.")) return;
          if (await save(imported)) showToast("Data imported successfully! 🎉");
        } catch (e) { showToast(e.message || "Invalid backup file", "error"); }
      };
      input.click();
    };

    const handleReset = async () => {
      if (confirm("⚠️ This will delete ALL your data. Are you sure?")) {
        if (!await save({ ...DEFAULT_DATA })) return;
        setTab("dashboard");
        showToast("All data reset");
      }
    };

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8e8f0", marginBottom: 16 }}>Settings</h2>

        {isSupabaseConfigured && (
          <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f7c26a", marginBottom: 12 }}>Cloud account</h3>
            <p style={{ fontSize: 12, color: "#6b6b8a", marginBottom: 12, lineHeight: 1.45 }}>
              Signed in as {authUser?.email || "user"}. Data syncs to Supabase.
            </p>
            <Btn
              variant="ghost"
              onClick={async () => {
                try { await signOut(); showToast("Signed out"); }
                catch (e) { showToast(e.message, "error"); }
              }}
            >
              Sign out
            </Btn>
            <Btn variant="danger" style={{ marginTop: 10 }} onClick={() => setShowDeleteAccount(true)}>Delete cloud account</Btn>
          </div>
        )}

        <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f7c26a", marginBottom: 12 }}>Data Management</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn variant="ghost" onClick={handleExport}>📦 Export Backup (JSON)</Btn>
            <Btn variant="ghost" onClick={handleImport}>📥 Import Backup</Btn>
            <Btn variant="danger" onClick={handleReset}>🗑️ Reset All Data</Btn>
          </div>
        </div>

        <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f7c26a", marginBottom: 12 }}>All Accounts</h3>
          {data.accounts.length === 0 ? (
            <div style={{ color: "#6b6b8a", fontSize: 13, textAlign: "center", padding: 20 }}>No accounts</div>
          ) : (
            data.accounts.map(acct => (
              <div key={acct.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid #1c1c27",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{acct.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{acct.name}</div>
                    <div style={{ fontSize: 11, color: "#6b6b8a" }}>{fmt(acct.currentBalance)} remaining</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteAccount(acct.id)} style={{
                  background: "none", border: "1px solid #f76a6a33", borderRadius: 6, padding: "4px 10px",
                  color: "#f76a6a", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>Delete</button>
              </div>
            ))
          )}
        </div>

        <LegalLinks />
        <p style={{ color: "#a6a6ba", fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>{isSupabaseConfigured ? "Cloud mode: an internet connection is required to load and save. Reload before editing on a second device." : "Device-only mode: data stays in this app on this device. Export regular backups before changing phones or uninstalling."}</p>
        <p style={{ color: "#a6a6ba", fontSize: 12, lineHeight: 1.6, marginTop: 12 }}>DebtQuest records payments you enter; it does not send payments or connect to your bank. Projections are estimates and may differ from lender statements.</p>
        <div style={{ textAlign: "center", color: "#a6a6ba", fontSize: 11, marginTop: 20 }}>
          DebtQuest v1.0 · Built with 🎯
        </div>
      </div>
    );
  };

const Rewards = () => {
  const { data, setShowAddReward, save, showToast, triggerConfetti } = useContext(AppContext);

    const spendable = data.xp;
    const rewards = data.rewards || [];
    const redeemed = data.redeemedRewards || [];

    const handleRedeem = async (reward) => {
      if (spendable < reward.cost) return showToast("Not enough XP!", "error");
      const entry = { id: uid(), rewardId: reward.id, name: reward.name, emoji: reward.emoji, cost: reward.cost, date: new Date().toISOString().split("T")[0] };
      const newData = {
        ...data,
        xp: data.xp - reward.cost,
        redeemedRewards: [...redeemed, entry],
      };
      if (!await save(newData)) return;
      triggerConfetti();
      showToast(`${reward.emoji} Redeemed: ${reward.name}!`);
    };

    const handleDeleteReward = async (id) => {
      if (!await save({ ...data, rewards: rewards.filter(r => r.id !== id) })) return;
      showToast("Reward removed");
    };

    return (
      <div style={{ padding: "0 16px 100px" }}>
        {/* XP Balance */}
        <div style={{
          background: "linear-gradient(135deg, #1a1230 0%, #201040 100%)",
          border: "1px solid #3a2a6a", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: "#7c6af7", textTransform: "uppercase", letterSpacing: 1 }}>Spendable XP</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#f7c26a", fontFamily: "'Syne', sans-serif", marginTop: 4 }}>
            {spendable.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "#6b6b8a", marginTop: 4 }}>Earn XP by logging payments</div>
        </div>

        {/* Shop */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Reward Shop</h2>
          <button onClick={() => setShowAddReward(true)} style={{
            background: "linear-gradient(135deg, #7c6af7, #9b6af7)", border: "none", borderRadius: 8,
            padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>+ Custom</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {rewards.map(r => {
            const canAfford = spendable >= r.cost;
            return (
              <div key={r.id} style={{
                background: "#13131a", border: `1px solid ${canAfford ? "#2a2a3d" : "#1a1a24"}`,
                borderRadius: 14, padding: 14, opacity: canAfford ? 1 : 0.55,
                transition: "opacity 0.2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: canAfford ? "linear-gradient(135deg, #1a1230, #201040)" : "#0d0d14",
                      border: `1px solid ${canAfford ? "#3a2a6a" : "#1a1a24"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                    }}>{r.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "#6b6b8a", marginTop: 2 }}>{r.desc}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: canAfford ? "#f7c26a" : "#6b6b8a", marginTop: 4 }}>
                        {r.cost.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                    <button onClick={() => handleRedeem(r)} disabled={!canAfford} style={{
                      background: canAfford ? "linear-gradient(135deg, #f7c26a, #f7a64e)" : "#1c1c27",
                      border: "none", borderRadius: 8, padding: "6px 14px",
                      color: canAfford ? "#0a0a0f" : "#6b6b8a", fontWeight: 700, fontSize: 11,
                      cursor: canAfford ? "pointer" : "default", fontFamily: "inherit",
                    }}>Redeem</button>
                    <button onClick={() => handleDeleteReward(r.id)} style={{
                      background: "none", border: "none", color: "#6b6b8a", fontSize: 10,
                      cursor: "pointer", fontFamily: "inherit", padding: "2px 0",
                    }}>remove</button>
                  </div>
                </div>
              </div>
            );
          })}
          {rewards.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "#6b6b8a", fontSize: 13 }}>
              No rewards yet — add some custom ones!
            </div>
          )}
        </div>

        {/* Redemption History */}
        {redeemed.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}>Redemption History</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...redeemed].reverse().map(r => (
                <div key={r.id} style={{
                  background: "#13131a", border: "1px solid #1c1c27", borderRadius: 10,
                  padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{r.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#6b6b8a" }}>{r.date}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#f76a9b" }}>−{r.cost.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

const AddRewardModal = () => {
  const { data, showAddReward, setShowAddReward, save, showToast } = useContext(AppContext);

    const [form, setForm] = useState({ name: "", desc: "", emoji: "🎁", cost: "" });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const emojis = ["🎁", "🧹", "🍽️", "💆", "🍆", "🍑", "😴", "🎬", "🛍️", "🏖️", "🍕", "🎮", "💐", "🍷", "🚗", "💅", "🧖", "☕", "🔥"];

    return (
      <Modal open={showAddReward} onClose={() => setShowAddReward(false)} title="Create Custom Reward">
        <Input label="Reward Name" placeholder="e.g. Breakfast in Bed" value={form.name} onChange={e => set("name", e.target.value)} />
        <Input label="Description" placeholder="What do you get?" value={form.desc} onChange={e => set("desc", e.target.value)} />
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Icon</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {emojis.map(e => (
              <button key={e} onClick={() => set("emoji", e)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: "pointer",
                background: form.emoji === e ? "#3a2a6a" : "#1c1c27",
                border: form.emoji === e ? "2px solid #7c6af7" : "1px solid #2a2a3d",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{e}</button>
            ))}
          </div>
        </div>
        <Input label="XP Cost" type="number" placeholder="1000" value={form.cost} onChange={e => set("cost", e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <Btn variant="gold" onClick={async () => {
            if (!form.name || !Number.isInteger(Number(form.cost)) || Number(form.cost) <= 0) return;
            const reward = { id: uid(), name: form.name, desc: form.desc, emoji: form.emoji, cost: parseInt(form.cost) || 500, createdBy: "" };
            if (!await save({ ...data, rewards: [...(data.rewards || []), reward] })) return;
            setShowAddReward(false);
            showToast(`${reward.emoji} Reward added!`);
          }}>🎁 Add Reward</Btn>
        </div>
      </Modal>
    );
  };

const AddAccountModal = () => {
  const { showAddAccount, setShowAddAccount, handleAddAccount } = useContext(AppContext);

    const [form, setForm] = useState({ name: "", type: "credit_card", originalBalance: "", currentBalance: "", interestRate: "", minimumPayment: "", dueDate: "1" });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal open={showAddAccount} onClose={() => setShowAddAccount(false)} title="Add Debt Account">
        <Input label="Account Name" placeholder="e.g. Chase Sapphire" value={form.name} onChange={e => set("name", e.target.value)} />
        <Select label="Type" options={DEBT_TYPES.map(t => ({ value: t.value, label: `${t.emoji} ${t.label}` }))} value={form.type} onChange={e => set("type", e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Original Balance" type="number" placeholder="25000" value={form.originalBalance} onChange={e => set("originalBalance", e.target.value)} />
          <Input label="Current Balance" type="number" placeholder="22000" value={form.currentBalance} onChange={e => set("currentBalance", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Interest Rate %" type="number" step="0.01" placeholder="19.99" value={form.interestRate} onChange={e => set("interestRate", e.target.value)} />
          <Input label="Min Payment" type="number" placeholder="350" value={form.minimumPayment} onChange={e => set("minimumPayment", e.target.value)} />
        </div>
        <Input label="Due Date (day of month)" type="number" min="1" max="31" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <Btn variant="gold" onClick={() => { if (form.name && form.originalBalance) handleAddAccount(form); }}>
            ⚔️ Add to Quest
          </Btn>
        </div>
      </Modal>
    );
  };

const LogPaymentModal = () => {
  const { data, showLogPayment, setShowLogPayment, handleLogPayment } = useContext(AppContext);

    const defaultAcct = typeof showLogPayment === "string" ? showLogPayment : (data.accounts[0]?.id || "");
    const [form, setForm] = useState({
      accountId: defaultAcct,
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const acct = data.accounts.find(a => a.id === form.accountId);

    return (
      <Modal open={!!showLogPayment} onClose={() => setShowLogPayment(false)} title="Log Payment">
        <Select label="Account" value={form.accountId}
          options={data.accounts.filter(a => !a.isPaidOff).map(a => ({ value: a.id, label: `${a.emoji} ${a.name} — ${fmt(a.currentBalance)}` }))}
          onChange={e => set("accountId", e.target.value)} />
        {acct && (
          <div style={{ background: "#0a0a0f", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#6b6b8a" }}>Current balance</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtFull(acct.currentBalance)}</span>
          </div>
        )}
        <Input label="Amount Paid" type="number" step="0.01" placeholder="500.00" value={form.amount} onChange={e => set("amount", e.target.value)} />
        <Input label="Payment Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <Input label="Note (optional)" placeholder="Extra payment from bonus" value={form.note} onChange={e => set("note", e.target.value)} />
        {acct && form.amount && (
          <div style={{ background: "#0d1a14", border: "1px solid #1a3a2a", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#6af7b8" }}>New balance: {fmtFull(Math.max(0, acct.currentBalance - parseFloat(form.amount)))}</div>
            {parseFloat(form.amount) > acct.minimumPayment && (
              <div style={{ fontSize: 11, color: "#f7c26a", marginTop: 4 }}>🌟 Above minimum! 1.5x XP bonus</div>
            )}
          </div>
        )}
        <Btn variant="gold" onClick={() => { if (form.accountId && form.amount) handleLogPayment(form); }}>
          💰 Log Payment
        </Btn>
      </Modal>
    );
  };

const EditAccountModal = () => {
  const { showEditAccount, setShowEditAccount, handleDeleteAccount } = useContext(AppContext);

    const acct = showEditAccount;
    if (!acct) return null;
    return (
      <Modal open={!!showEditAccount} onClose={() => setShowEditAccount(null)} title={`Edit ${acct.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="danger" onClick={() => handleDeleteAccount(acct.id)}>🗑️ Delete Account</Btn>
          <Btn variant="ghost" onClick={() => setShowEditAccount(null)}>Cancel</Btn>
        </div>
      </Modal>
    );
  };

const PaymentSuccess = () => {
  const { data, setTab, setSelectedAccount, paymentSuccess, setPaymentSuccess, level } = useContext(AppContext);

    const s = paymentSuccess;
    if (!s) return null;
    const prog = pct(s.acct.currentBalance, s.acct.originalBalance);
    const payoffDate = s.monthsToPayoff ? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + s.monthsToPayoff);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    })() : null;

    const dismiss = () => {
      setPaymentSuccess(null);
      setSelectedAccount(s.acct.id);
      setTab("detail");
    };

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1100, background: "#0a0a0f",
        display: "flex", flexDirection: "column", overflow: "auto",
      }}>
        <style>{`
          @keyframes successPop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
          @keyframes countUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(124,106,247,0.2); } 50% { box-shadow: 0 0 40px rgba(247,194,106,0.4); } }
          @keyframes barFill { from { width: 0%; } }
          @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes victoryGlow {
            0% { text-shadow: 0 0 10px #f7c26a44; }
            50% { text-shadow: 0 0 40px #f7c26a88, 0 0 80px #7c6af744; }
            100% { text-shadow: 0 0 10px #f7c26a44; }
          }
          @keyframes crownDrop {
            0% { transform: translateY(-60px) rotate(-20deg) scale(0); opacity: 0; }
            60% { transform: translateY(8px) rotate(5deg) scale(1.2); opacity: 1; }
            80% { transform: translateY(-4px) rotate(-2deg) scale(0.95); }
            100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          }
          @keyframes shineSlide {
            0% { left: -60%; }
            100% { left: 120%; }
          }
          @keyframes pulseRing {
            0% { transform: scale(0.8); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0; }
          }
          @keyframes fadeStagger1 { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        `}</style>

        <div style={{ flex: 1, padding: "24px 16px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {s.paidOff ? (
          /* ═══════ VICTORY CELEBRATION ═══════ */
          <>
            {/* Pulsing rings behind crown */}
            <div style={{ position: "relative", textAlign: "center", marginBottom: 8, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {[0, 0.4, 0.8].map((d, i) => (
                <div key={i} style={{
                  position: "absolute", width: 100 + i * 40, height: 100 + i * 40, borderRadius: "50%",
                  border: `2px solid ${["#f7c26a", "#7c6af7", "#6af7b8"][i]}`,
                  animation: `pulseRing 2s ease ${d}s infinite`,
                }} />
              ))}
              <div style={{ fontSize: 72, animation: "crownDrop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards", position: "relative", zIndex: 2 }}>👑</div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: 6, animation: "fadeStagger1 0.5s ease 0.4s both" }}>
              <div style={{
                fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif",
                background: "linear-gradient(135deg, #f7c26a, #6af7b8, #7c6af7)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "victoryGlow 3s ease infinite",
              }}>
                DEBT SLAIN
              </div>
            </div>

            {/* Account tombstone */}
            <div style={{
              textAlign: "center", marginBottom: 24,
              animation: "fadeStagger1 0.5s ease 0.6s both",
            }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>{s.acct.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>{s.acct.name}</div>
              <div style={{ fontSize: 13, color: "#6b6b8a" }}>{fmt(s.acct.originalBalance)} → <span style={{ color: "#6af7b8", fontWeight: 700 }}>$0</span></div>
            </div>

            {/* Completed bar with shine effect */}
            <div style={{
              position: "relative", height: 12, borderRadius: 6, overflow: "hidden",
              background: "#1c1c27", marginBottom: 24,
              animation: "fadeStagger1 0.4s ease 0.7s both",
            }}>
              <div style={{
                height: "100%", width: "100%", borderRadius: 6,
                background: "linear-gradient(90deg, #7c6af7, #f7c26a, #6af7b8)",
                animation: "barFill 1.5s ease 0.8s both",
              }} />
              <div style={{
                position: "absolute", top: 0, width: "40%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "shineSlide 2s ease 2s infinite",
              }} />
            </div>

            {/* Final stats grid */}
            <div style={{
              background: "linear-gradient(135deg, #1a1230 0%, #0d1a24 100%)",
              border: "1px solid #2a2a3d", borderRadius: 16, padding: 20, marginBottom: 16,
              animation: "fadeStagger1 0.5s ease 0.9s both",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f7c26a", textAlign: "center", marginBottom: 14 }}>⚔️ FINAL BATTLE REPORT</div>
              {[
                { label: "Total Paid", value: fmtFull(s.totalPaidOnAcct), color: "#6af7b8" },
                { label: "Payments Made", value: data.payments.filter(p => p.accountId === s.acct.id).length, color: "#e8e8f0" },
                { label: "XP Earned This Kill", value: `+${s.xpGain}`, color: "#f7c26a" },
                ...(s.cumulativeInterestSaved > 0 ? [{ label: "Interest Saved", value: fmtFull(s.cumulativeInterestSaved), color: "#b86af7" }] : []),
                ...(s.monthsAhead > 0 ? [{ label: "Finished Early By", value: `${s.monthsAhead.toFixed(1)} months`, color: "#6ac4f7" }] : []),
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: i < 4 ? "1px solid #1c1c27" : "none",
                }}>
                  <span style={{ fontSize: 13, color: "#6b6b8a" }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Remaining quest status */}
            {data.accounts.filter(a => !a.isPaidOff).length > 0 ? (
              <div style={{
                textAlign: "center", padding: "14px 16px", borderRadius: 12,
                background: "#131320", border: "1px solid #2a2a3d", marginBottom: 20,
                animation: "fadeStagger1 0.5s ease 1.1s both",
              }}>
                <div style={{ fontSize: 13, color: "#e8e8f0", fontWeight: 600 }}>
                  {data.accounts.filter(a => !a.isPaidOff).length} quest{data.accounts.filter(a => !a.isPaidOff).length > 1 ? "s" : ""} remaining
                </div>
                <div style={{ fontSize: 12, color: "#6b6b8a", marginTop: 2 }}>
                  {fmt(data.accounts.filter(a => !a.isPaidOff).reduce((s2, a) => s2 + a.currentBalance, 0))} left to conquer
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "20px 16px", borderRadius: 14,
                background: "linear-gradient(135deg, #0d2a1a, #1a3a2a)", border: "1px solid #2a5a3a",
                marginBottom: 20, animation: "fadeStagger1 0.5s ease 1.1s both",
              }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>🏆👑🏆</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#6af7b8", fontFamily: "'Syne', sans-serif" }}>ALL DEBTS CONQUERED</div>
                <div style={{ fontSize: 12, color: "#4a8a6a", marginTop: 4 }}>You are now a Debt Free Legend.</div>
              </div>
            )}

            {/* New badges */}
            {s.newBadges.length > 0 && (
              <div style={{
                background: "linear-gradient(135deg, #1a1230, #201040)", border: "1px solid #3a2a6a",
                borderRadius: 14, padding: 16, marginBottom: 16, textAlign: "center",
                animation: "successPop 0.5s ease 1.3s both",
              }}>
                <div style={{ fontSize: 12, color: "#f7c26a", fontWeight: 700, marginBottom: 8 }}>🏆 Badge{s.newBadges.length > 1 ? "s" : ""} Unlocked!</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  {s.newBadges.map(bid => {
                    const b = BADGE_DEFS.find(x => x.id === bid);
                    return b ? (
                      <div key={bid}>
                        <div style={{ fontSize: 36 }}>{b.emoji}</div>
                        <div style={{ fontSize: 11, color: "#e8e8f0", fontWeight: 600, marginTop: 4 }}>{b.name}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ animation: "fadeStagger1 0.5s ease 1.4s both" }}>
              <Btn variant="gold" onClick={dismiss}>⚔️ Onward</Btn>
              <button onClick={() => { setPaymentSuccess(null); setTab("dashboard"); }} style={{
                background: "none", border: "none", color: "#6b6b8a", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, marginTop: 12, width: "100%", textAlign: "center",
              }}>Back to Dashboard</button>
            </div>
          </>
        ) : (
          /* ═══════ NORMAL PAYMENT SUCCESS ═══════ */
          <>
          {/* Hero */}
          <div style={{
            textAlign: "center", marginBottom: 24,
            animation: "successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f7c26a" }}>
              Payment Logged!
            </div>
            <div style={{ fontSize: 14, color: "#6b6b8a", marginTop: 4 }}>
              {s.acct.emoji} {s.acct.name}
            </div>
          </div>

          {/* XP + Amount card */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
            animation: "countUp 0.4s ease 0.2s both",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #1a1230, #201040)", border: "1px solid #3a2a6a",
              borderRadius: 14, padding: 16, textAlign: "center", animation: "glowPulse 2s ease infinite",
            }}>
              <div style={{ fontSize: 11, color: "#7c6af7", textTransform: "uppercase", letterSpacing: 1 }}>Paid</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", marginTop: 4 }}>{fmtFull(s.payment.amountPaid)}</div>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #1a2010, #203010)", border: "1px solid #3a5a2a",
              borderRadius: 14, padding: 16, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "#6af7b8", textTransform: "uppercase", letterSpacing: 1 }}>XP Earned</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#6af7b8", marginTop: 4 }}>+{s.xpGain}</div>
            </div>
          </div>

          {/* Account progress bar */}
          <div style={{
            background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16,
            animation: "countUp 0.4s ease 0.35s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#6b6b8a" }}>Account Progress</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f7c26a" }}>{Math.round(prog)}%</span>
            </div>
            <div style={{ height: 10, background: "#1c1c27", borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
              <div style={{
                height: "100%", borderRadius: 5,
                background: `linear-gradient(90deg, ${s.acct.color}, #f7c26a)`,
                width: `${prog}%`, animation: "barFill 1s ease 0.5s both",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b6b8a" }}>
              <span>Remaining: {fmt(s.acct.currentBalance)}</span>
              <span>of {fmt(s.acct.originalBalance)}</span>
            </div>
          </div>

          {/* Projected payoff chart */}
          {s.projection.length > 2 && !s.paidOff && (
            <div style={{
              background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 14, padding: 16, marginBottom: 16,
              animation: "countUp 0.4s ease 0.5s both",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>Projected Payoff</div>
              <div style={{ fontSize: 11, color: "#6b6b8a", marginBottom: 12 }}>At your current payment pace</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={s.projection}>
                  <defs>
                    <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.acct.color} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={s.acct.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c1c27" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#6b6b8a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={55} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="balance" stroke={s.acct.color} fill="url(#gSuccess)" strokeWidth={2} name="Balance" />
                </AreaChart>
              </ResponsiveContainer>
              {payoffDate && (
                <div style={{
                  marginTop: 10, padding: "10px 14px", background: "#0d1a14", border: "1px solid #1a3a2a",
                  borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b6b8a" }}>Estimated payoff</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#6af7b8" }}>{payoffDate}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#6b6b8a" }}>That's about</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e8f0" }}>
                      {s.monthsToPayoff < 12
                        ? `${s.monthsToPayoff} mo`
                        : `${Math.floor(s.monthsToPayoff / 12)}y ${s.monthsToPayoff % 12}m`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Ahead of Schedule & Interest Savings Tracker ── */}
          {!s.paidOff && (s.monthsAhead > 0 || s.interestSavedThisPayment > 0 || s.cumulativeInterestSaved > 0) && (
            <div style={{
              background: "linear-gradient(135deg, #0d1a14 0%, #0a1520 100%)",
              border: "1px solid #1a3a2a", borderRadius: 14, padding: 16, marginBottom: 16,
              animation: "countUp 0.4s ease 0.58s both",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>⏱️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#6af7b8" }}>Pace Tracker</span>
              </div>

              {/* Ahead of schedule */}
              {s.monthsAhead > 0 && (
                <div style={{
                  background: "#0a1210", border: "1px solid #1a3a2a", borderRadius: 10,
                  padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#6b6b8a" }}>Ahead of minimum schedule</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#6af7b8", marginTop: 2 }}>
                        {s.monthsAhead >= 12
                          ? `${Math.floor(s.monthsAhead / 12)}y ${s.monthsAhead % 12}m`
                          : `${s.monthsAhead.toFixed(1)} months`}
                      </div>
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #1a3a2a, #0d2a1a)",
                      border: "2px solid #6af7b8", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 18,
                    }}>🚀</div>
                  </div>
                  {s.monthsMinOnly && (
                    <div style={{ fontSize: 10, color: "#4a8a6a", marginTop: 6 }}>
                      Min-only payoff: {s.monthsMinOnly} mo → Your pace: {s.monthsToPayoff} mo
                    </div>
                  )}
                </div>
              )}

              {/* Interest savings — this payment */}
              {s.interestSavedThisPayment > 0 && (
                <div style={{
                  background: "#0f1520", border: "1px solid #1a2a4a", borderRadius: 10,
                  padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#6b6b8a" }}>Interest saved by this payment</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#6ac4f7", marginTop: 2 }}>
                        {fmtFull(s.interestSavedThisPayment)}
                      </div>
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #1a2a4a, #0d1a3a)",
                      border: "2px solid #6ac4f7", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 18,
                    }}>💎</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#4a7aaa", marginTop: 6 }}>
                    By paying {fmt(s.payment.amountPaid - s.acct.minimumPayment)} above min, you avoid this in future interest
                  </div>
                </div>
              )}

              {/* Cumulative interest saved */}
              {s.cumulativeInterestSaved > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #1a1020, #10081a)",
                  border: "1px solid #3a2a5a", borderRadius: 10,
                  padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#6b6b8a" }}>Total interest you're saving</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                        <span style={{ color: "#b86af7" }}>{fmtFull(s.cumulativeInterestSaved)}</span>
                      </div>
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #2a1a4a, #1a0a3a)",
                      border: "2px solid #b86af7", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 18,
                    }}>🏦</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#7a5aaa", marginTop: 6 }}>
                    Cumulative vs. minimum-only schedule from original balance
                  </div>
                  {/* Mini bar: what you'd pay vs what you will pay */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b6b8a", marginBottom: 3 }}>
                      <span>Your projected interest</span>
                      <span>Min-only interest</span>
                    </div>
                    <div style={{ position: "relative", height: 6, background: "#f76a6a33", borderRadius: 3 }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3,
                        background: "linear-gradient(90deg, #6af7b8, #6ac4f7)",
                        width: `${Math.max(10, 100 - (s.cumulativeInterestSaved / (s.cumulativeInterestSaved + 1) * 30))}%`,
                        transition: "width 1s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#6af7b8", textAlign: "center", marginTop: 3 }}>
                      That's money staying in your pocket 💪
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16,
            animation: "countUp 0.4s ease 0.65s both",
          }}>
            {[
              { label: "Total paid", value: fmt(s.totalPaidOnAcct), color: "#6af7b8" },
              { label: "Streak", value: `${data.streak} mo`, color: "#f7c26a" },
              { label: "Level", value: level.emoji + " " + level.name.split(" ").pop(), color: "#7c6af7" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 10,
                padding: "10px 8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: item.color, marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* New badges */}
          {s.newBadges.length > 0 && (
            <div style={{
              background: "linear-gradient(135deg, #1a1230, #201040)", border: "1px solid #3a2a6a",
              borderRadius: 14, padding: 16, marginBottom: 16, textAlign: "center",
              animation: "successPop 0.5s ease 0.8s both",
            }}>
              <div style={{ fontSize: 12, color: "#f7c26a", fontWeight: 700, marginBottom: 8 }}>🏆 New Badge{s.newBadges.length > 1 ? "s" : ""} Unlocked!</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                {s.newBadges.map(bid => {
                  const b = BADGE_DEFS.find(x => x.id === bid);
                  return b ? (
                    <div key={bid}>
                      <div style={{ fontSize: 36 }}>{b.emoji}</div>
                      <div style={{ fontSize: 11, color: "#e8e8f0", fontWeight: 600, marginTop: 4 }}>{b.name}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Motivational nudge */}
          {!s.paidOff && s.monthsToPayoff && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, background: "#131320",
              border: "1px solid #2a2a3d", marginBottom: 20, fontSize: 13,
              color: "#6b6b8a", lineHeight: 1.5, textAlign: "center",
              animation: "countUp 0.4s ease 0.9s both",
            }}>
              {s.monthsAhead > 0 && s.interestSavedThisPayment > 0
                ? `🔥 ${s.monthsAhead.toFixed(1)} months ahead and saving ${fmtFull(s.interestSavedThisPayment)} in interest — every extra dollar fights for you!`
                : s.payment.amountPaid > s.acct.minimumPayment
                  ? `🔥 Paying ${fmt(s.payment.amountPaid - s.acct.minimumPayment)} above minimum — that's how you crush it!`
                  : `💡 Tip: Even $50 extra/month can shave months off and save hundreds in interest.`}
            </div>
          )}

          {/* CTA */}
          <div style={{ animation: "countUp 0.4s ease 1s both" }}>
            <Btn variant="gold" onClick={dismiss}>
              👍 Nice — Back to Account
            </Btn>
            <button onClick={() => { setPaymentSuccess(null); setTab("dashboard"); }} style={{
              background: "none", border: "none", color: "#6b6b8a", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, marginTop: 12, width: "100%", textAlign: "center",
            }}>
              Go to Dashboard
            </button>
          </div>
          </>
        )}
        </div>
      </div>
    );
  };

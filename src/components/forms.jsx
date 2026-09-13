import { useState } from "react";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  LockKeyhole,
  Copy,
  Heart,
  Users,
  Gift,
  Sparkles,
  Trash2,
  Download,
  Upload,
  LogOut,
  Link as LinkIcon,
} from "lucide-react";
import { Dialog, Button, Field, InlineError, useAction, Motif } from "./ui.jsx";
import {
  dayKey,
  uid,
  money,
  totals,
  recordPayment,
  normalizeJourney,
  REWARDS,
} from "../lib/journey.js";
import {
  createCircle,
  createInvite,
  joinCircle,
  inviteLink,
  postWin,
  leaveCircle,
  clearSharedActivity,
  blockMember,
  reportEvent,
  unblockMember,
  revokeInvites,
  reportMember,
  updateDisplayName,
} from "../lib/social.js";
import { isDemo, resetDemo } from "../lib/demo.js";
import { isSupabaseConfigured } from "../supabaseClient.js";
import { exportBackup } from "../native.js";
import { parseBackup } from "../backup.js";
import {
  deleteCloudAccount,
  signOut,
  DEFAULT_STATE,
  DEFAULT_REWARDS,
} from "../db.js";
import { LegalLinks } from "../Legal.jsx";
import { gameResult } from "../lib/game.js";
import { primeGameAudio } from "../lib/feedback.js";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
const types = [
  ["credit_card", "Credit card"],
  ["auto", "Auto loan"],
  ["student", "Student loan"],
  ["mortgage", "Mortgage"],
  ["installment", "Installment loan"],
  ["other", "Other"],
];
export function DebtForm({ data, commit, onClose, account, toast }) {
  const [form, setForm] = useState(
    account
      ? { ...account }
      : {
          name: "",
          type: "credit_card",
          originalBalance: "",
          currentBalance: "",
          interestRate: "",
          minimumPayment: "",
          dueDate: 1,
        },
  );
  const action = useAction();
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Dialog
      title={account ? "Edit your debt" : "One step starts here."}
      subtitle={
        account
          ? "Keep your tracker aligned with your latest statement."
          : "Add a debt. Give your progress somewhere to go."
      }
      onClose={onClose}
      busy={action.busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            const original = Number(form.originalBalance),
              current =
                form.currentBalance === ""
                  ? original
                  : Number(form.currentBalance);
            const rate = Number(form.interestRate),
              minimum = Number(form.minimumPayment),
              due = Number(form.dueDate);
            if (
              !form.name.trim() ||
              ![original, current, rate, minimum].every(
                (n) => Number.isFinite(n) && n >= 0 && n <= 1e9,
              ) ||
              !Number.isInteger(due) ||
              due < 1 ||
              due > 31
            )
              throw new Error(
                "Check the balances, interest rate, and due day.",
              );
            const debt = {
              ...form,
              id: account?.id || uid(),
              name: form.name.trim(),
              originalBalance: original,
              currentBalance: current,
              interestRate: rate,
              minimumPayment: minimum,
              dueDate: due,
              isPaidOff: current === 0,
              createdAt: account?.createdAt || new Date().toISOString(),
              emoji: {
                credit_card: "💳",
                auto: "🚗",
                student: "🎓",
                mortgage: "🏡",
                installment: "📋",
                other: "📦",
              }[form.type],
              color: "#507d6c",
            };
            await commit((d) => ({
              ...d,
              accounts: account
                ? d.accounts.map((a) => (a.id === account.id ? debt : a))
                : [...d.accounts, debt],
            }));
            onClose();
            toast(
              account
                ? "Debt updated."
                : "Your journey has a new starting point.",
            );
          });
        }}
      >
        <Field
          label="Account name"
          placeholder="Everyday card"
          required
          maxLength={60}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Field label="Debt type">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {types.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field
            label="Starting balance"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={form.originalBalance}
            onChange={(e) => set("originalBalance", e.target.value)}
          />
          <Field
            label="Current balance"
            hint="Leave blank if just starting."
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.currentBalance}
            onChange={(e) => set("currentBalance", e.target.value)}
          />
          <Field
            label="Interest rate (APR %)"
            type="number"
            min="0"
            max="1000"
            step="0.01"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
          />
          <Field
            label="Minimum monthly payment"
            type="number"
            min="0"
            step="0.01"
            value={form.minimumPayment}
            onChange={(e) => set("minimumPayment", e.target.value)}
          />
        </div>
        <Field
          label="Payment due day"
          type="number"
          min="1"
          max="31"
          value={form.dueDate}
          onChange={(e) => set("dueDate", e.target.value)}
        />
        <span className="privacy-note">
          <LockKeyhole size={14} /> Debt names and balances are never posted to
          your circle.
        </span>
        <InlineError error={action.error} />
        <Button disabled={action.busy}>
          {action.busy
            ? "Saving…"
            : account
              ? "Save changes"
              : "Add to my journey"}
          <ArrowRight size={18} />
        </Button>
      </form>
    </Dialog>
  );
}
export function PaymentForm({
  data,
  commit,
  circle,
  onClose,
  onSuccess,
  refreshSocial,
  selected,
}) {
  const [form, setForm] = useState({
      accountId:
        selected || data.accounts.find((a) => a.currentBalance > 0)?.id || "",
      amount: "",
      date: dayKey(),
      note: "",
      statementBalance: "",
    }),
    [share, setShare] = useState(data.journey.shareWins && !!circle),
    [showStatement, setShowStatement] = useState(false);
  const action = useAction();
  const account = data.accounts.find((a) => a.id === form.accountId);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Dialog
      title="Log your next win."
      subtitle="Big or small, every payment deserves a moment."
      onClose={onClose}
      busy={action.busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            primeGameAudio();
            let result, before;
            const saved = await commit((d) => {
              before = d;
              result = recordPayment(d, {
                ...form,
                amount: Number(form.amount),
              });
              return result.data;
            });
            let shared = false,
              shareFailed = false;
            if (share && circle) {
              try {
                await postWin(circle.id, {
                  kind: "payment",
                  paymentId: result.payment.id,
                  progress: totals(saved).percent,
                  amount: result.payment.amountPaid,
                  shareAmount: data.journey.shareAmounts,
                });
                shared = true;
                await refreshSocial();
              } catch {
                shareFailed = true;
              }
            }
            onSuccess(
              gameResult(before, saved, {
                ...result,
                type: "payment",
                shared,
                shareFailed,
                amount: Number(form.amount),
              }),
            );
          });
        }}
      >
        <Field label="Which debt?">
          <select
            value={form.accountId}
            onChange={(e) => set("accountId", e.target.value)}
          >
            {data.accounts
              .filter((a) => a.currentBalance > 0)
              .map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name} · {money(a.currentBalance)} left
                </option>
              ))}
          </select>
        </Field>
        <div className="amount-field">
          <span>$</span>
          <input
            aria-label="Amount paid"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={
              showStatement && form.statementBalance !== ""
                ? 1e12
                : account?.currentBalance
            }
            step="0.01"
            placeholder="0.00"
            required
            autoFocus
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>
        <Field
          label="Payment date"
          type="date"
          required
          max={dayKey()}
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (showStatement) set("statementBalance", "");
            setShowStatement(!showStatement);
          }}
        >
          {showStatement
            ? "Hide statement balance"
            : "Interest or fees changed your balance?"}
        </button>
        {showStatement && (
          <Field
            label="New statement balance"
            type="number"
            min="0"
            step="0.01"
            value={form.statementBalance}
            onChange={(e) => set("statementBalance", e.target.value)}
            hint="Use the remaining balance on your lender’s statement."
          />
        )}
        <Field
          label="A note to yourself (optional)"
          maxLength={500}
          placeholder="Future me says thank you."
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
        {circle && (
          <label className="toggle-line">
            <span>
              <strong>Share this win with {circle.name}</strong>
              <small>
                {data.journey.shareAmounts
                  ? "Your payment amount will be included."
                  : "Only your progress percentage. No amounts or debt names."}
              </small>
            </span>
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
            />
          </label>
        )}
        <p className="form-help">
          This records a payment you already made. It doesn’t send money or
          automatically reconcile interest.
        </p>
        <InlineError error={action.error} />
        <Button disabled={action.busy}>
          {action.busy ? "Saving your step…" : "Log payment"}
          <Check size={18} />
        </Button>
      </form>
    </Dialog>
  );
}
export function CircleForm({ data, onClose, onCreated, initialToken = "" }) {
  const [mode, setMode] = useState(initialToken ? "join" : "create"),
    [kind, setKind] = useState(
      data.journey.style === "couple" ? "couple" : "friends",
    ),
    [name, setName] = useState("Our next chapter"),
    [token, setToken] = useState(initialToken),
    [displayName, setDisplayName] = useState(data.journey.name);
  const action = useAction();
  return (
    <Dialog
      title="Good company. Bigger possibilities."
      subtitle="A private place for your people to show up for each other."
      onClose={onClose}
      busy={action.busy}
    >
      <div className="segmented">
        <button
          onClick={() => setMode("create")}
          className={mode === "create" ? "selected" : ""}
        >
          Start a circle
        </button>
        <button
          onClick={() => setMode("join")}
          className={mode === "join" ? "selected" : ""}
        >
          Join a circle
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            let id;
            if (mode === "create")
              id = await createCircle({ name, kind, displayName });
            else {
              let code = token.trim();
              try {
                code = new URL(code).searchParams.get("join") || code;
              } catch {}
              id = await joinCircle(code, displayName);
            }
            await onCreated(id);
          });
        }}
      >
        <Field
          label="Name your circle sees"
          required
          minLength={1}
          maxLength={32}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {mode === "create" ? (
          <>
            <div className="choice-row two">
              <button
                type="button"
                onClick={() => setKind("couple")}
                className={`choice ${kind === "couple" ? "selected" : ""}`}
              >
                <Heart size={22} />
                <strong>Just us two</strong>
                <small>Make room for your shared future.</small>
              </button>
              <button
                type="button"
                onClick={() => setKind("friends")}
                className={`choice ${kind === "friends" ? "selected" : ""}`}
              >
                <Users size={22} />
                <strong>My people</strong>
                <small>Up to 8 friends, one cheering section.</small>
              </button>
            </div>
            <Field label="Circle name">
              <select value={name} onChange={(e) => setName(e.target.value)}>
                {[
                  "Our next chapter",
                  "The freedom club",
                  "Sunday money dates",
                  "Team fresh start",
                ].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          </>
        ) : (
          <Field
            label="Invite link or code"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the invitation here"
          />
        )}
        <div className="callout sage">
          <ShieldCheck size={22} />
          <p>
            Members see your display name and the wins you choose to share. Your
            debt names, balances, and notes stay private.
          </p>
        </div>
        <InlineError error={action.error} />
        <Button disabled={action.busy}>
          {action.busy
            ? "One moment…"
            : mode === "create"
              ? "Create my circle"
              : "Join my people"}
          <ArrowRight size={18} />
        </Button>
      </form>
    </Dialog>
  );
}
export function InviteDialog({ circle, onClose, toast }) {
  const [link, setLink] = useState(""),
    [expires, setExpires] = useState("");
  const action = useAction();
  return (
    <Dialog
      title="Better with your people."
      subtitle={`Invite someone to ${circle.name}.`}
      onClose={onClose}
      busy={action.busy}
    >
      <div className="invite-art">
        <Users size={48} />
        <span>+1</span>
      </div>
      {isDemo ? (
        <>
          <p className="form-help">
            This is a sample circle. To invite real people, leave the demo and
            sign in.
          </p>
          <a className="button primary" href="/">
            Start my real journey
            <ArrowRight size={18} />
          </a>
        </>
      ) : (
        <>
          <p className="form-help">
            Anyone with this link can join until it expires or the circle is
            full. Share it only with people you trust.
          </p>
          {link ? (
            <>
              <label className="invite-link">
                <LinkIcon size={16} />
                <input aria-label="Invitation link" readOnly value={link} />
              </label>
              <small className="form-help">
                Expires {new Date(expires).toLocaleDateString()} · Circle
                capacity applies.
              </small>
              <Button
                onClick={() =>
                  action.run(async () => {
                    if (Capacitor.isNativePlatform())
                      await Share.share({
                        title: "A little closer. Together.",
                        text: `Join ${circle.name} on DebtQuest.`,
                        url: link,
                      });
                    else if (navigator.share)
                      await navigator.share({
                        title: "Join my DebtQuest circle",
                        url: link,
                      });
                    else {
                      await navigator.clipboard.writeText(link);
                      toast("Invite link copied.");
                    }
                  })
                }
              >
                Share invitation
                <ArrowRight size={18} />
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  action.run(async () => {
                    await navigator.clipboard.writeText(link);
                    toast("Invite link copied.");
                  })
                }
              >
                <Copy size={16} />
                Copy link
              </Button>
            </>
          ) : (
            <Button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  const invite = await createInvite(circle.id);
                  setLink(inviteLink(invite.token));
                  setExpires(invite.expiresAt);
                })
              }
            >
              {action.busy ? "Creating…" : "Create private invite"}
              <ArrowRight size={18} />
            </Button>
          )}
        </>
      )}
      <InlineError error={action.error} />
    </Dialog>
  );
}
export function RewardForm({ data, commit, onClose, toast }) {
  const [name, setName] = useState(""),
    [desc, setDesc] = useState(""),
    [cost, setCost] = useState(100),
    [icon, setIcon] = useState("coffee");
  const action = useAction();
  return (
    <Dialog
      title="Make progress feel good."
      subtitle="Choose a reward you can look forward to without adding debt."
      onClose={onClose}
      busy={action.busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            if (!name.trim() || !Number.isInteger(Number(cost)) || cost < 1)
              throw new Error(
                "Give your reward a name and a positive XP cost.",
              );
            await commit((d) => ({
              ...d,
              rewards: [
                ...d.rewards,
                {
                  id: uid(),
                  name: name.trim(),
                  desc,
                  emoji: icon,
                  cost: Number(cost),
                },
              ],
            }));
            onClose();
            toast("A little motivation, added.");
          });
        }}
      >
        <div className="icon-choices">
          {["coffee", "popcorn", "sun", "music", "heart", "gift"].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={i}
              aria-pressed={icon === i}
              className={icon === i ? "selected" : ""}
              onClick={() => setIcon(i)}
            >
              <Motif name={i} size={24} />
            </button>
          ))}
        </div>
        <Field
          label="Reward name"
          required
          maxLength={60}
          placeholder="Breakfast in bed"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="What makes it special?"
          maxLength={160}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <Field
          label="XP to unlock"
          type="number"
          min="1"
          max="100000"
          step="1"
          required
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <InlineError error={action.error} />
        <Button disabled={action.busy}>
          Create reward
          <Gift size={18} />
        </Button>
      </form>
    </Dialog>
  );
}
export function SafetyDialog({ event, member, onClose, refresh, toast }) {
  const [category, setCategory] = useState("harassment");
  const action = useAction();
  return (
    <Dialog
      title="Your circle should feel safe."
      subtitle={`Manage activity from ${member?.name || "this member"}.`}
      onClose={onClose}
      busy={action.busy}
    >
      <Field label="Report reason">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="harassment">Harassment or offensive content</option>
          <option value="spam">Spam or misleading activity</option>
          <option value="privacy">Privacy concern</option>
          <option value="other">Another concern</option>
        </select>
      </Field>
      <Button
        disabled={action.busy}
        onClick={() =>
          action.run(async () => {
            if (event) await reportEvent(event.id, category);
            else await reportMember(member.userId, category);
            toast(
              isDemo
                ? "Report recorded in this demo."
                : "Report submitted for review.",
            );
            onClose();
          })
        }
      >
        {event ? "Report activity" : "Report member"}
      </Button>
      <Button
        variant="danger"
        disabled={action.busy}
        onClick={() =>
          action.run(async () => {
            await blockMember(event?.userId || member.userId);
            await refresh();
            toast(
              isDemo
                ? "Member hidden in this demo."
                : "Member blocked. Your activity is hidden from each other.",
            );
            onClose();
          })
        }
      >
        Block {member?.name || "member"}
      </Button>
      <InlineError error={action.error} />
      <p className="form-help">
        Blocking hides activity between you and this member. Reports are
        private.
      </p>
    </Dialog>
  );
}
export function SettingsDialog({
  data,
  commit,
  user,
  social,
  onClose,
  refresh,
  toast,
  reload,
}) {
  const [name, setName] = useState(data.journey.name),
    [why, setWhy] = useState(data.journey.why),
    [deleting, setDeleting] = useState(false),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const action = useAction();
  function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    action.run(async () => {
      if (file.size > 10485760)
        throw new Error("Backup exceeds the 10 MB limit.");
      const imported = parseBackup(await file.text());
      if (
        !window.confirm(
          "Replace your current tracker data with this backup? Export first if you want to keep both.",
        )
      )
        return;
      await commit(normalizeJourney(imported));
      toast("Your journey is restored.");
      onClose();
    });
  }
  return (
    <Dialog
      title="Make this yours."
      subtitle={
        isDemo
          ? "Sample journey · changes stay in this demo."
          : user?.email || "Your journey is saved on this device."
      }
      onClose={onClose}
      busy={action.busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            if (!name.trim()) throw new Error("Enter your first name.");
            await commit((d) => ({
              ...d,
              profile: { ...d.profile, name1: name.trim() },
              journey: { ...d.journey, name: name.trim(), why },
            }));
            if (social.circles.length) {
              try {
                await updateDisplayName(name.trim());
                await refresh();
              } catch (e) {
                throw new Error(
                  "Your private profile was saved. Your circle name could not update: " +
                    e.message,
                );
              }
            }
            toast("Your journey, updated.");
          });
        }}
      >
        <Field
          label="Your first name"
          maxLength={32}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="What you’re making room for"
          maxLength={80}
          required
          value={why}
          onChange={(e) => setWhy(e.target.value)}
        />
        <Button variant="secondary" disabled={action.busy}>
          Save profile
        </Button>
      </form>
      <div className="settings-section">
        <h3>Sharing, on your terms</h3>
        <label className="toggle-line">
          <span>
            <strong>Share future wins by default</strong>
            <small>You can change this on each payment.</small>
          </span>
          <input
            type="checkbox"
            checked={data.journey.shareWins}
            disabled={action.busy}
            onChange={(e) => {
              const checked = e.target.checked;
              action.run(() =>
                commit((d) => ({
                  ...d,
                  journey: { ...d.journey, shareWins: checked },
                })),
              );
            }}
          />
        </label>
        <label className="toggle-line">
          <span>
            <strong>Include payment amounts</strong>
            <small>
              Only on wins you choose to share. Past posts stay as shared.
            </small>
          </span>
          <input
            type="checkbox"
            checked={data.journey.shareAmounts}
            disabled={action.busy}
            onChange={(e) => {
              const checked = e.target.checked;
              action.run(() =>
                commit((d) => ({
                  ...d,
                  journey: { ...d.journey, shareAmounts: checked },
                })),
              );
            }}
          />
        </label>
        {social.circles.map((circle) => (
          <div className="settings-circle" key={circle.id}>
            <strong>{circle.name}</strong>
            <button
              className="text-button"
              onClick={() =>
                action.run(async () => {
                  if (
                    !window.confirm(
                      "Remove your shared activity from this circle? Your private tracker stays intact.",
                    )
                  )
                    return;
                  await clearSharedActivity(circle.id);
                  await refresh();
                  toast("Your shared activity was removed.");
                })
              }
            >
              Remove my shared activity
            </button>
            <button
              className="text-button"
              onClick={() =>
                action.run(async () => {
                  await revokeInvites(circle.id);
                  toast(
                    isDemo
                      ? "Sample invitations reset."
                      : "Invitation links revoked.",
                  );
                })
              }
            >
              Revoke invitation links
            </button>
            <button
              className="text-button danger-text"
              onClick={() =>
                action.run(async () => {
                  if (
                    !window.confirm(
                      "Leave this circle and remove your shared activity?",
                    )
                  )
                    return;
                  await leaveCircle(circle.id);
                  await refresh();
                  toast("You left the circle.");
                })
              }
            >
              Leave circle
            </button>
          </div>
        ))}
        {social.blocks?.length > 0 && (
          <div className="settings-circle">
            <strong>Blocked members</strong>
            {social.blocks.map((member) => (
              <button
                key={member.userId}
                className="text-button"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    await unblockMember(member.userId);
                    await refresh();
                    toast("Member unblocked.");
                  })
                }
              >
                Unblock {member.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="settings-section">
        <h3>Your data stays in your hands</h3>
        <Button
          variant="secondary"
          onClick={() => action.run(() => exportBackup(data))}
        >
          <Download size={17} />
          Export backup
        </Button>
        <label className="button secondary file-label">
          <Upload size={17} />
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={importFile}
          />
        </label>
        {isDemo ? (
          <Button variant="secondary" onClick={resetDemo}>
            Reset sample journey
          </Button>
        ) : (
          <button
            className="text-button danger-text"
            onClick={() =>
              action.run(async () => {
                if (
                  !window.confirm(
                    "Clear your private debts, payments, points, and rewards? Export a backup first. Circle posts stay until you remove them separately.",
                  )
                )
                  return;
                await commit({
                  ...DEFAULT_STATE,
                  accounts: [],
                  payments: [],
                  rewards: DEFAULT_REWARDS,
                  redeemedRewards: [],
                });
                onClose();
                toast("A fresh start is ready.");
              })
            }
          >
            Reset private tracker
          </button>
        )}
        <p className="form-help">
          DebtQuest records the payments you enter. It does not move money or
          connect to your bank. Estimates may differ from lender statements.
        </p>
      </div>
      {!isDemo && isSupabaseConfigured && (
        <div className="settings-section">
          <Button
            variant="secondary"
            onClick={() => action.run(() => signOut())}
          >
            <LogOut size={17} />
            Sign out
          </Button>
          <button
            className="text-button danger-text"
            onClick={() => setDeleting(!deleting)}
          >
            Delete cloud account
          </button>
          {deleting && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  if (confirm !== "DELETE")
                    throw new Error("Type DELETE to confirm.");
                  await deleteCloudAccount(password);
                  onClose();
                  reload();
                });
              }}
            >
              <p className="form-help">
                Permanently delete your login, private tracker, and shared
                activity. Circles you own are also removed for all members.
                Leave those circles first to pass ownership. Export first if you
                need a copy.
              </p>
              <Field
                label="Current password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Field
                label="Type DELETE to confirm"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <Button
                variant="danger"
                disabled={action.busy || confirm !== "DELETE"}
              >
                Permanently delete account
              </Button>
            </form>
          )}
        </div>
      )}
      <InlineError error={action.error} />
      <LegalLinks />
      <span className="version-label">
        DebtQuest · A little closer, together.
      </span>
    </Dialog>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sun,
  Route,
  Users,
  Gift,
  Bell,
  Plus,
  ArrowRight,
  ArrowUpRight,
  X,
  Check,
  LockKeyhole,
  Heart,
  Sparkles,
  Settings,
  RefreshCw,
  Pencil,
  Trash2,
  Menu,
  Compass,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import useJourney from "./lib/useJourney.js";
import { isDemo } from "./lib/demo.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import {
  dayKey,
  awardDaily,
  levelOf,
  totals,
  money,
  uid,
} from "./lib/journey.js";
import { getSocial, postWin, cheer } from "./lib/social.js";
import {
  Brand,
  Button,
  IconButton,
  Avatar,
  Progress,
  Dialog,
  Motif,
  InlineError,
  useAction,
} from "./components/ui.jsx";
import { Auth, Onboarding, PasswordReset } from "./components/Welcome.jsx";
import {
  DebtForm,
  PaymentForm,
  CircleForm,
  InviteDialog,
  RewardForm,
  SafetyDialog,
  SettingsDialog,
} from "./components/forms.jsx";
import Today from "./pages/Today.jsx";
import Journey from "./pages/Journey.jsx";
import Circle from "./pages/Circle.jsx";
import Rewards from "./pages/Rewards.jsx";
const navigation = [
  ["today", "Today", Sun],
  ["journey", "Journey", Route],
  ["circle", "Circle", Users],
  ["rewards", "Rewards", Gift],
];
const blankSocial = {
  viewerId: null,
  circles: [],
  members: [],
  events: [],
  blocks: [],
};
async function haptic() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
  }
}
function CheckinDialog({ circle, checked, onClose, onSave, defaultShare }) {
  const [share, setShare] = useState(defaultShare);
  const action = useAction();
  return (
    <Dialog
      title="A small promise. A fresh start."
      subtitle="Take a breath. Look at your progress. You’re doing something good for future you."
      onClose={onClose}
      busy={action.busy}
    >
      <div className="checkin-affirmation">
        <Sun size={34} />
        <p>
          Today, I’m making room
          <br />
          for a little more freedom.
        </p>
      </div>
      {circle && (
        <label className="toggle-line">
          <span>
            <strong>Check in with {circle.name}</strong>
            <small>
              Your circle will see that you showed up. No balances are shared.
            </small>
          </span>
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
          />
        </label>
      )}
      <InlineError error={action.error} />
      <Button
        disabled={action.busy}
        onClick={() => action.run(() => onSave(share))}
      >
        {action.busy
          ? "Saving…"
          : checked
            ? "Share my check-in"
            : "I’m here for future me"}
        {!checked && <span className="button-xp">+25 XP</span>}
      </Button>
      <p className="form-help">
        There’s no perfect streak to protect. Come back whenever you can.
      </p>
    </Dialog>
  );
}
function Celebration({ result, onClose, onCircle }) {
  return (
    <Dialog
      title={
        result.reward
          ? "This moment is yours."
          : result.type === "checkin"
            ? "You showed up. That matters."
            : result.paidOff
              ? "One less thing. A whole lot lighter."
              : "Look at you moving forward."
      }
      onClose={onClose}
    >
      <div className="celebration">
        <div className="celebration-orbit">
          <i />
          <i />
          <i />
          <i />
          <span>
            <Motif
              name={
                result.reward
                  ? result.reward.emoji
                  : result.type === "checkin"
                    ? "sun"
                    : result.paidOff
                      ? "flag"
                      : "sparkles"
              }
              size={45}
            />
          </span>
        </div>
        <h3>
          {result.reward
            ? result.reward.name
            : result.type === "checkin"
              ? "Future you says thank you."
              : `${money(result.amount, true)} toward your next chapter.`}
        </h3>
        <p>
          {result.reward
            ? "Make a plan to enjoy it. You earned a little good."
            : result.shared
              ? "Your circle has a new reason to cheer you on."
              : "Another small step toward the life you’re making room for."}
        </p>
        {result.points > 0 && (
          <span className="earned-xp">
            <Sparkles size={16} />+{result.points} XP earned
          </span>
        )}
        {result.shareFailed && (
          <p className="inline-error">
            {result.type === "checkin"
              ? "Your check-in was saved. Visit your circle’s weekly quest to try sharing it again."
              : "Your payment was saved. Open the debt’s payment details to try sharing the win again."}
          </p>
        )}
        <Button onClick={onClose}>
          Keep the good going
          <ArrowRight size={17} />
        </Button>
        {result.shared && (
          <button className="text-button" onClick={onCircle}>
            See your circle
            <Heart size={15} />
          </button>
        )}
      </div>
    </Dialog>
  );
}
function DebtDetails({
  account,
  data,
  onClose,
  onEdit,
  onPayment,
  commit,
  toast,
  onShare,
  circle,
}) {
  const action = useAction();
  const history = data.payments
    .filter((p) => p.accountId === account.id)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  return (
    <Dialog
      title={account.name}
      subtitle={`${account.interestRate}% APR · ${money(account.minimumPayment)}/month minimum`}
      onClose={onClose}
      busy={action.busy}
    >
      <div className="debt-detail-balance">
        <span>Remaining balance</span>
        <strong>{money(account.currentBalance, true)}</strong>
        <small>
          {money(Math.max(0, account.originalBalance - account.currentBalance))}{" "}
          of your starting balance behind you
        </small>
      </div>
      {!account.isPaidOff && (
        <Button onClick={onPayment}>
          <Plus size={17} />
          Log a payment
        </Button>
      )}
      <Button variant="secondary" onClick={onEdit}>
        <Pencil size={15} />
        Edit debt details
      </Button>
      <div className="detail-history">
        <h3>Your steps forward</h3>
        {history.length ? (
          history.map((p) => (
            <div key={p.id}>
              <div>
                <strong>{money(p.amountPaid, true)}</strong>
                <small>{p.paymentDate}</small>
                {p.note && <p>{p.note}</p>}
              </div>
              {circle && (
                <button
                  className="text-button"
                  disabled={action.busy}
                  onClick={() => action.run(() => onShare(p))}
                >
                  Share win
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="form-help">Your first payment starts the story.</p>
        )}
      </div>
      <InlineError error={action.error} />
      <button
        className="text-button danger-text"
        onClick={() =>
          action.run(async () => {
            if (
              !window.confirm(
                `Remove ${account.name} and its payment history from your private tracker? Existing circle posts can be removed in Settings.`,
              )
            )
              return;
            await commit((d) => ({
              ...d,
              accounts: d.accounts.filter((a) => a.id !== account.id),
              payments: d.payments.filter((p) => p.accountId !== account.id),
            }));
            toast("Debt removed from your tracker.");
            onClose();
          })
        }
      >
        <Trash2 size={14} />
        Remove this debt
      </button>
    </Dialog>
  );
}
export default function App() {
  const {
    user,
    authReady,
    data,
    error,
    commit,
    reload,
    saving,
    recovery,
    finishRecovery,
  } = useJourney();
  const [tab, setTab] = useState("today"),
    [modal, setModal] = useState(null),
    [social, setSocial] = useState(blankSocial),
    [socialError, setSocialError] = useState(""),
    [circleId, setCircleId] = useState(null),
    [toastMessage, setToastMessage] = useState("");
  const action = useAction();
  const toastTimer = useRef(),
    socialEpoch = useRef(0),
    invitationHandled = useRef(false);
  const toast = useCallback((message) => {
    setToastMessage(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 5000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const refreshSocial = useCallback(async () => {
    const epoch = ++socialEpoch.current;
    try {
      const next = await getSocial();
      if (epoch === socialEpoch.current) {
        setSocial(next || blankSocial);
        setSocialError("");
      }
      return next;
    } catch (e) {
      if (epoch === socialEpoch.current) setSocialError(e.message);
      throw e;
    }
  }, [user?.id]);
  useEffect(() => {
    setModal(null);
    setSocial(blankSocial);
    setSocialError("");
    return () => {
      socialEpoch.current++;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!data?.journey.onboarded) return;
    const refresh = () => refreshSocial().catch(() => {});
    refresh();
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [!!data?.journey.onboarded, refreshSocial]);
  useEffect(() => {
    if (data?.journey.onboarded && !invitationHandled.current) {
      const token = new URLSearchParams(location.search).get("join");
      if (token) {
        invitationHandled.current = true;
        setModal({ type: "circle", token });
      }
    }
  }, [data?.journey.onboarded]);
  const circle =
      social.circles.find((c) => c.id === circleId) || social.circles[0],
    members = social.members.filter((m) => m.circleId === circle?.id),
    events = social.events
      .filter((e) => e.circleId === circle?.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  function navigate(next) {
    setTab(next);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const close = () => setModal(null);
  const openPayment = (selected) => setModal({ type: "payment", selected });
  async function checkin(share) {
    let points;
    await commit((d) => {
      const result = awardDaily(d, "checkin");
      points = result.points;
      return result.data;
    });
    let shared = false,
      shareFailed = false;
    if (share && circle) {
      try {
        await postWin(circle.id, { kind: "checkin" });
        shared = true;
        await refreshSocial();
      } catch {
        shareFailed = true;
      }
    }
    haptic();
    setModal({
      type: "celebrate",
      result: { type: "checkin", points, shared, shareFailed },
    });
  }
  async function onCheer(event, emoji) {
    await action.run(async () => {
      const removing = event.reactions?.some(
        (r) => r.userId === social.viewerId && r.emoji === emoji,
      );
      await cheer(event.id, emoji);
      await refreshSocial();
      if (!removing) {
        let points = 0;
        try {
          await commit((d) => {
            const result = awardDaily(d, "cheer");
            points = result.points;
            return result.data;
          });
        } catch {
          toast(
            "Encouragement sent. Your XP could not be saved; reload before your next change.",
          );
          return;
        }
        haptic();
        toast(
          points
            ? `A little good energy, sent. +${points} XP`
            : "A little good energy, sent.",
        );
      }
    });
  }
  async function sharePayment(payment) {
    if (
      !window.confirm(
        `Share this win with ${circle.name}? They will see your current overall progress${data.journey.shareAmounts ? " and this payment amount" : ""}. Your debt name and note stay private.`,
      )
    )
      return;
    await postWin(circle.id, {
      kind: "payment",
      paymentId: payment.id,
      progress: totals(data).percent,
      amount: payment.amountPaid,
      shareAmount: data.journey.shareAmounts,
    });
    await refreshSocial();
    toast("Your win is in the circle.");
  }
  if (!authReady)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-dot" />
        Finding your next chapter…
      </div>
    );
  if (recovery && user) return <PasswordReset onDone={finishRecovery} />;
  if (!isDemo && isSupabaseConfigured && !user) return <Auth />;
  if (error)
    return (
      <main className="loading-screen">
        <Brand />
        <h1>Let’s get you back on track.</h1>
        <InlineError error={error} />
        <Button onClick={reload}>
          <RefreshCw size={17} />
          Try loading again
        </Button>
      </main>
    );
  if (!data)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-dot" />A little good is on its way…
      </div>
    );
  if (!data.journey.onboarded)
    return <Onboarding data={data} commit={commit} />;
  const level = levelOf(data),
    busy = action.busy || saving;
  const common = {
    data,
    circle,
    members,
    events,
    viewerId: social.viewerId,
    onPayment: () => openPayment(),
    onAddDebt: () => setModal({ type: "debt" }),
    onCheckin: () => setModal({ type: "checkin" }),
    onCheer,
    onSafety: (event, member) => setModal({ type: "safety", event, member }),
    onNavigate: navigate,
    challengeEvents: [
      ...events,
      ...(social.checkins || []).filter((e) => e.circleId === circle?.id),
    ],
    busy,
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href={isDemo ? "/?demo=1" : "/"}
          className="brand-link"
          aria-label="DebtQuest home"
        >
          <Brand />
        </a>
        <span className="sidebar-label">YOUR NEXT CHAPTER</span>
        <nav aria-label="Main navigation">
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "circle" && social.circles.length > 0 && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-level">
            <span className="level-icon">
              <Compass size={24} />
            </span>
            <span>
              <small>LEVEL {level.index}</small>
              <strong>{level.name}</strong>
            </span>
            <span className="level-number">{level.index}</span>
            <Progress value={level.progress} label="Next level" />
            <small>
              {level.next
                ? `${Math.max(0, level.next.at - data.journey.lifetimeXP)} XP to your next chapter`
                : "Keep making room for freedom"}
            </small>
          </div>
          <button
            className="sidebar-profile"
            onClick={() => setModal({ type: "settings" })}
            aria-label="Open settings"
          >
            <Avatar name={data.journey.name || "You"} />
            <span>
              <strong>{data.journey.name || "Your journey"}</strong>
              <small>
                {isDemo
                  ? "Sample journey"
                  : user
                    ? "Cloud account"
                    : "Saved on this device"}
              </small>
            </span>
            <Settings size={17} />
          </button>
          <span className="sidebar-tagline">A little closer. Together.</span>
        </div>
      </aside>
      <div className="app-body">
        {isDemo && (
          <div className="demo-bar">
            <span>
              <Sparkles size={13} />
              <strong>A little look around.</strong> You’re exploring a sample
              journey.
            </span>
            <a href="/">
              Start your own
              <ArrowRight size={13} />
            </a>
          </div>
        )}
        <header className="topbar">
          <span className="desktop-breadcrumb">
            Your next chapter<span>/</span>
            {navigation.find((n) => n[0] === tab)[1]}
          </span>
          <a
            className="mobile-brand brand-link"
            href={isDemo ? "/?demo=1" : "/"}
          >
            <Brand />
          </a>
          <div className="topbar-actions">
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="points-pill">
              <Sparkles size={14} />
              {data.xp.toLocaleString()} XP
            </span>
            <IconButton
              label="See circle activity"
              onClick={() => navigate("circle")}
            >
              <Bell size={19} />
              {events.length > 0 && <i className="notification-dot" />}
            </IconButton>
            <button
              className="avatar-button"
              aria-label="Settings"
              onClick={() => setModal({ type: "settings" })}
            >
              <Avatar name={data.journey.name || "You"} small />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex="-1">
          <InlineError error={action.error} />
          {tab === "today" && <Today {...common} />}
          {tab === "journey" && (
            <Journey
              {...common}
              onDebt={(account) =>
                setModal({ type: "details", accountId: account.id })
              }
            />
          )}
          {tab === "circle" && (
            <Circle
              {...common}
              social={social}
              onSelect={setCircleId}
              onCreate={() => setModal({ type: "circle" })}
              onInvite={() => setModal({ type: "invite" })}
              onRefresh={() => refreshSocial().catch(() => {})}
              error={socialError}
              canConnect={isDemo || isSupabaseConfigured}
            />
          )}
          {tab === "rewards" && (
            <Rewards
              data={data}
              busy={busy}
              onCreate={() => setModal({ type: "reward" })}
              onRedeem={(reward) => setModal({ type: "redeem", reward })}
            />
          )}
          <footer className="main-footer">
            <Brand />
            <span>Less debt. More life.</span>
            <a href="/support.html">A little help?</a>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(([id, label, Icon]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => navigate(id)}
          >
            <span>
              <Icon size={22} strokeWidth={tab === id ? 2 : 1.6} />
            </span>
            {label}
          </button>
        ))}
      </nav>
      {toastMessage && (
        <div className="toast" role="status">
          <Check size={17} />
          {toastMessage}
          <IconButton
            label="Dismiss notification"
            onClick={() => setToastMessage("")}
          >
            <X size={15} />
          </IconButton>
        </div>
      )}
      {modal?.type === "debt" && (
        <DebtForm
          data={data}
          commit={commit}
          account={modal.account}
          onClose={close}
          toast={toast}
        />
      )}
      {modal?.type === "payment" && (
        <PaymentForm
          data={data}
          commit={commit}
          circle={circle}
          onClose={close}
          selected={modal.selected}
          refreshSocial={refreshSocial}
          onSuccess={(result) => {
            haptic();
            setModal({ type: "celebrate", result });
          }}
        />
      )}
      {modal?.type === "circle" && (
        <CircleForm
          data={data}
          initialToken={modal.token}
          onClose={close}
          onCreated={async (id) => {
            await refreshSocial();
            setCircleId(id);
            navigate("circle");
            if (location.search.includes("join=")) {
              const url = new URL(location.href);
              url.searchParams.delete("join");
              history.replaceState(null, "", url);
            }
            toast("Good company. A new chapter.");
          }}
        />
      )}
      {modal?.type === "invite" && circle && (
        <InviteDialog circle={circle} onClose={close} toast={toast} />
      )}
      {modal?.type === "reward" && (
        <RewardForm commit={commit} onClose={close} toast={toast} />
      )}
      {modal?.type === "safety" && (
        <SafetyDialog
          event={modal.event}
          member={modal.member}
          onClose={close}
          refresh={refreshSocial}
          toast={toast}
        />
      )}
      {modal?.type === "settings" && (
        <SettingsDialog
          data={data}
          commit={commit}
          user={user}
          social={social}
          onClose={close}
          refresh={refreshSocial}
          toast={toast}
          reload={reload}
        />
      )}
      {modal?.type === "checkin" && (
        <CheckinDialog
          circle={circle}
          checked={data.journey.checkins.includes(dayKey())}
          defaultShare={!!circle && data.journey.shareWins}
          onClose={close}
          onSave={checkin}
        />
      )}
      {modal?.type === "celebrate" && (
        <Celebration
          result={modal.result}
          onClose={close}
          onCircle={() => navigate("circle")}
        />
      )}
      {modal?.type === "details" &&
        data.accounts.some((a) => a.id === modal.accountId) && (
          <DebtDetails
            account={data.accounts.find((a) => a.id === modal.accountId)}
            data={data}
            commit={commit}
            onClose={close}
            onEdit={() =>
              setModal({
                type: "debt",
                account: data.accounts.find((a) => a.id === modal.accountId),
              })
            }
            onPayment={() => openPayment(modal.accountId)}
            onShare={sharePayment}
            circle={circle}
            toast={toast}
          />
        )}
      {modal?.type === "redeem" && (
        <Dialog
          title="Make a little room for joy."
          subtitle={`Claim ${modal.reward.name} for ${modal.reward.cost} XP?`}
          onClose={close}
          busy={busy}
        >
          <div className="redeem-preview">
            <Motif name={modal.reward.emoji} size={48} />
            <p>{modal.reward.desc}</p>
          </div>
          <InlineError error={action.error} />
          <Button
            disabled={busy}
            onClick={() =>
              action.run(async () => {
                const reward = modal.reward;
                await commit((d) => {
                  if (d.xp < reward.cost)
                    throw new Error(
                      "Keep going — you need a few more points for this one.",
                    );
                  return {
                    ...d,
                    xp: d.xp - reward.cost,
                    redeemedRewards: [
                      ...d.redeemedRewards,
                      {
                        ...reward,
                        id: uid(),
                        rewardId: reward.id,
                        date: new Date().toISOString(),
                      },
                    ],
                  };
                });
                haptic();
                setModal({ type: "celebrate", result: { reward } });
              })
            }
          >
            Claim this moment
            <Gift size={17} />
          </Button>
          <p className="form-help">
            Your level stays with you when you spend XP.
          </p>
        </Dialog>
      )}
    </div>
  );
}

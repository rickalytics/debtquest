import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  LockKeyhole,
  Plus,
  Sparkles,
  Star,
  Flag,
  Flame,
  Heart,
  Play,
} from "lucide-react";
import {
  Button,
  Progress,
  Dialog,
  Motif,
  SectionTitle,
} from "../components/ui.jsx";
import { Pip, Chest, IslandWorld } from "../components/QuestArt.jsx";
import { CircleFeed, WeekChallenge } from "../components/CircleFeed.jsx";
import { dayKey, levelOf, money, totals, weekDays } from "../lib/journey.js";
import { COMPANION_STYLES, companionStyle, weeklyQuest } from "../lib/game.js";
import { isDemo } from "../lib/demo.js";

const positions = [
  [28.6, 72.6],
  [51.7, 63.1],
  [32.3, 43.6],
  [58.8, 36.2],
  [58.8, 18.5],
];
function QuestTask({
  icon: Icon,
  title,
  description,
  points,
  done,
  onClick,
  busy,
}) {
  return (
    <button
      className={`quest-task ${done ? "done" : ""}`}
      onClick={onClick}
      aria-label={title}
      disabled={done || busy}
    >
      <span className="quest-task-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="quest-task-prize">
        {done ? (
          <Check size={22} />
        ) : (
          <>
            <b>+{points}</b>
            <small>XP</small>
          </>
        )}
      </span>
    </button>
  );
}
export default function Today({
  data,
  circle,
  members,
  events,
  viewerId,
  onPayment,
  onAddDebt,
  onCheckin,
  onCheer,
  onSafety,
  onNavigate,
  challengeEvents,
  busy,
  onChest,
  onShowcase,
}) {
  const [selected, setSelected] = useState(null),
    [greeting, setGreeting] = useState(false);
  const level = levelOf(data),
    summary = totals(data),
    checked = data.journey.checkins.includes(dayKey()),
    quest = weeklyQuest(data),
    look = companionStyle(data);
  const active =
    COMPANION_STYLES.filter((s) => s.at <= data.journey.lifetimeXP).length - 1;
  const canPay = data.accounts.some((a) => a.currentBalance > 0);
  const paidToday = data.journey.paymentDays.includes(dayKey());
  const cheered = data.journey.cheerDays.includes(dayKey());
  const tasksDone = Number(checked) + Number(paidToday) + Number(cheered);
  return (
    <>
      <div className="page-heading quest-heading">
        <div>
          <span className="eyebrow">SMALL STEPS. EPIC PROGRESS.</span>
          <h1>
            Your next adventure, {data.journey.name || "friend"}
            <span>.</span>
          </h1>
          <p>A little less debt. A whole new world.</p>
        </div>
        <Button onClick={canPay ? onPayment : onAddDebt}>
          <Plus size={19} />
          {canPay
            ? "Log a payment"
            : data.accounts.length
              ? "Add a debt"
              : "Add your first debt"}
        </Button>
      </div>
      <div className="quest-layout">
        <section className="quest-world-card" aria-label="Your quest world">
          <div className="world-card-heading">
            <div>
              <span className="eyebrow">YOUR ADVENTURE MAP</span>
              <h2>Freedom Isles</h2>
            </div>
            <span className="world-level">
              <Star size={15} fill="currentColor" />
              LEVEL {level.index}
            </span>
          </div>
          <div className="world-stage">
            <IslandWorld />
            <div className="world-chapter">
              <span className="live-spark" /> {COMPANION_STYLES[active].island}
              <small>{active + 1} / 5 islands unlocked</small>
            </div>
            {COMPANION_STYLES.map((style, i) => (
              <button
                key={style.id}
                className={`world-node ${i <= active ? "unlocked" : "locked"} ${i === active ? "current" : ""}`}
                style={{
                  left: positions[i][0] + "%",
                  top: positions[i][1] + "%",
                }}
                onClick={() => setSelected(style)}
                aria-label={`${style.island}, ${i <= active ? "unlocked" : `unlocks at ${style.at} lifetime XP`}`}
              >
                <span>
                  {i < active ? (
                    <Check size={25} />
                  ) : i === active ? (
                    <Star size={27} fill="currentColor" />
                  ) : (
                    <LockKeyhole size={21} />
                  )}
                </span>
                <small hidden={i !== active && i !== active + 1}>
                  {i === active
                    ? "YOU ARE HERE"
                    : i === active + 1
                      ? "UP NEXT"
                      : i + 1}
                </small>
              </button>
            ))}
            <button
              className={`world-companion ${greeting ? "greeting" : ""}`}
              onClick={() => setGreeting(!greeting)}
              aria-label="Say hello to Pip"
              aria-pressed={greeting}
            >
              <span className="pip-speech">
                {greeting
                  ? "You + me. We've got this!"
                  : "Ready for our next quest?"}
              </span>
              <Pip look={look.id} mood={greeting ? "celebrate" : "happy"} />
              <span className="pip-name">PIP · YOUR QUEST BUDDY</span>
            </button>
            <div className="world-caption">
              <Flag size={14} />
              <span>{data.journey.why}</span>
            </div>
          </div>
          <div className="world-progress">
            <div>
              <span>
                <strong>
                  {level.next
                    ? `${level.next.at - data.journey.lifetimeXP} XP`
                    : "All islands unlocked"}
                </strong>
                {level.next
                  ? ` to ${COMPANION_STYLES[active + 1].island}`
                  : " · keep your adventure going"}
              </span>
              <span>
                {data.journey.lifetimeXP.toLocaleString()} lifetime XP
              </span>
            </div>
            <Progress value={level.progress} label="Next island progress" />
            <p>
              {level.next
                ? `Next unlock: ${COMPANION_STYLES[active + 1].name}. Every kind of progress counts.`
                : "Your islands stay unlocked when you spend reward points."}
            </p>
          </div>
          {isDemo && (
            <button className="showcase-link" onClick={onShowcase}>
              <Play size={14} fill="currentColor" />
              Try a payment celebration<span>Sample only</span>
            </button>
          )}
        </section>
        <div className="quest-sidebar">
          <section className="daily-quests-card">
            <div className="quest-section-head">
              <div>
                <span className="eyebrow">YOUR DAILY QUESTS</span>
                <h2>Let's make a little magic.</h2>
              </div>
              <span className="quest-counter">{tasksDone}/3</span>
            </div>
            <QuestTask
              icon={Flame}
              title={checked ? "You showed up today" : "I’m here for future me"}
              description="One check-in. A little momentum."
              points={25}
              done={checked}
              onClick={onCheckin}
              busy={busy}
            />
            <QuestTask
              icon={Flag}
              title={
                paidToday
                  ? "Payment quest complete"
                  : "Put a little debt behind you"
              }
              description="Log a payment you've already made."
              points={50}
              done={paidToday}
              onClick={canPay ? onPayment : onAddDebt}
              busy={busy}
            />
            <QuestTask
              icon={Heart}
              title={
                cheered
                  ? "Good energy delivered"
                  : "Be someone's cheering section"
              }
              description="Encourage a win in your circle."
              points={15}
              done={cheered}
              onClick={() => onNavigate("circle")}
              busy={busy}
            />
            <p className="quest-fineprint">
              Check in without paying. Payment quests can wait until it fits
              your plan.
            </p>
          </section>
          <section
            className={`weekly-chest-card ${quest.ready ? "ready" : ""}`}
          >
            <div className="weekly-chest-copy">
              <span className="eyebrow">THE CONSISTENCY CHEST</span>
              <h2>
                {quest.claimed
                  ? "A week worth celebrating."
                  : quest.ready
                    ? "Your chest is ready!"
                    : "Three days. One little treasure."}
              </h2>
              <p>
                {quest.claimed
                  ? "+40 XP collected. Your next chest starts Monday."
                  : "Check in on 3 different days this week. Unlock a guaranteed 40 XP."}
              </p>
            </div>
            <Chest open={quest.claimed} />
            <div className="quest-week">
              {weekDays().map((d) => (
                <span
                  key={d.key}
                  className={`${data.journey.checkins.includes(d.key) ? "done" : ""} ${d.today ? "today" : ""}`}
                  aria-label={`${d.key}, ${data.journey.checkins.includes(d.key) ? "checked in" : "not checked in"}`}
                >
                  <small>{d.label}</small>
                  <i>
                    {data.journey.checkins.includes(d.key) ? (
                      <Check size={15} />
                    ) : (
                      "·"
                    )}
                  </i>
                </span>
              ))}
            </div>
            <Button
              variant={quest.ready ? "primary" : "soft"}
              disabled={!quest.ready || busy}
              onClick={onChest}
            >
              {quest.claimed ? (
                <>
                  <Check size={17} />
                  Chest collected
                </>
              ) : quest.ready ? (
                <>
                  Open chest <span className="button-xp">+40 XP</span>
                </>
              ) : (
                <>
                  <LockKeyhole size={15} />
                  {Math.min(quest.count, 3)} of 3 check-in days
                </>
              )}
            </Button>
          </section>
        </div>
        <section className="real-progress-card">
          <div className="real-progress-icon">
            <Flag size={27} />
          </div>
          <div>
            <span className="eyebrow">YOUR REAL-WORLD WIN</span>
            <h2>
              {summary.original
                ? `${money(summary.cleared)} of debt cleared`
                : "Your first chapter is waiting"}
            </h2>
            <p>
              {summary.original
                ? `${Math.round(summary.percent)}% of your starting debt · ${data.accounts.filter((a) => a.isPaidOff).length} debts paid off`
                : "Add a debt to connect this adventure to your progress."}
            </p>
          </div>
          <button className="text-button" onClick={() => onNavigate("journey")}>
            Your debts
            <ChevronRight size={17} />
          </button>
        </section>
        <section className="quest-party panel">
          <SectionTitle
            eyebrow="YOUR PARTY'S LATEST WINS"
            title={
              circle
                ? "Your party is making moves."
                : "Every quest is better together."
            }
            action={
              <button
                className="text-button"
                onClick={() => onNavigate("circle")}
              >
                Your circle
                <ArrowRight size={16} />
              </button>
            }
          />
          <CircleFeed
            events={events.slice(0, 2)}
            members={members}
            viewerId={viewerId}
            onCheer={onCheer}
            onSafety={onSafety}
            busy={busy}
            compact
          />
        </section>
        {circle && (
          <WeekChallenge
            events={challengeEvents}
            members={members}
            onCheckin={onCheckin}
            checked={challengeEvents.some(
              (e) =>
                e.userId === viewerId &&
                e.kind === "checkin" &&
                dayKey(new Date(e.createdAt)) === dayKey(),
            )}
            busy={busy}
          />
        )}
      </div>
      {selected && (
        <Dialog title={selected.island} onClose={() => setSelected(null)}>
          <div className="island-detail">
            <Pip look={selected.id} />
            <span className="island-unlock-label">
              {selected.at <= data.journey.lifetimeXP
                ? "UNLOCKED"
                : `${selected.at - data.journey.lifetimeXP} MORE LIFETIME XP`}
            </span>
            <h3>{selected.name}</h3>
            <p>{selected.detail}</p>
            <p>
              {selected.at <= data.journey.lifetimeXP
                ? "This look is yours to keep. Equip it in Rewards."
                : "Check-ins, payment days, encouragement, and weekly chests all move you forward."}
            </p>
            <Button
              onClick={() => {
                setSelected(null);
                onNavigate("rewards");
              }}
            >
              {selected.at <= data.journey.lifetimeXP
                ? "Visit your collection"
                : "See the unlocks"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

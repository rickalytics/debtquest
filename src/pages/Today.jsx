import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Check,
  ShieldCheck,
  Sparkles,
  Flame,
  ChevronRight,
} from "lucide-react";
import {
  Button,
  Progress,
  SectionTitle,
  DailyTask,
  Motif,
} from "../components/ui.jsx";
import JourneyArt from "../components/JourneyArt.jsx";
import { CircleFeed, WeekChallenge } from "../components/CircleFeed.jsx";
import {
  dayKey,
  weekDays,
  totals,
  money,
  projectPayoff,
  payoffLabel,
} from "../lib/journey.js";
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
}) {
  const summary = totals(data),
    checked = data.journey.checkins.includes(dayKey()),
    days = weekDays(),
    weekCount = days.filter((d) =>
      data.journey.checkins.includes(d.key),
    ).length,
    projection = projectPayoff(data.accounts);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE CLOSER, EVERY DAY</span>
          <h1>
            You’re going places, {data.journey.name || "friend"}
            <span className="clay-text">.</span>
          </h1>
          <p>Your future has a little more freedom in it.</p>
        </div>
        <Button
          onClick={
            data.accounts.some((a) => a.currentBalance > 0)
              ? onPayment
              : onAddDebt
          }
        >
          <Plus size={18} />
          {data.accounts.some((a) => a.currentBalance > 0)
            ? "Log a payment"
            : "Add your first debt"}
        </Button>
      </div>
      <div className="today-grid">
        <section className="freedom-hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span /> YOUR FREEDOM FUND
            </span>
            <h2>
              {summary.original > 0
                ? "Look how far you’ve come."
                : "This is where your next chapter begins."}
            </h2>
            <div className="hero-amount">
              {money(summary.cleared)}
              <span>of debt, behind you</span>
            </div>
            <div className="hero-progress">
              <div>
                <strong>
                  {Math.round(summary.percent)}% closer to freedom
                </strong>
                <span>{money(summary.original)} starting debt</span>
              </div>
              <Progress value={summary.percent} label="Starting debt cleared" />
            </div>
            <button className="hero-link" onClick={() => onNavigate("journey")}>
              See your journey
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-illustration">
            <JourneyArt />
            <div className="destination-tag">
              <span>THE NEXT CHAPTER</span>
              <strong>{data.journey.why}</strong>
              <Sparkles size={15} />
            </div>
          </div>
        </section>
        <section className="checkin-card">
          <div className="card-topline">
            <span className="eyebrow">A PROMISE TO YOURSELF</span>
            <span className="icon-tile peach">
              <Flame size={20} />
            </span>
          </div>
          <h2>Just keep showing up.</h2>
          <p>You don’t have to make a payment to make progress.</p>
          <div className="week-dots">
            {days.map((d) => (
              <div className={d.today ? "today" : ""} key={d.key}>
                <span>{d.label}</span>
                <span
                  className={`day-circle ${data.journey.checkins.includes(d.key) ? "done" : ""} ${d.future ? "future" : ""}`}
                  role="img"
                  aria-label={`${d.key}${data.journey.checkins.includes(d.key) ? ", checked in" : ""}`}
                >
                  {data.journey.checkins.includes(d.key) ? (
                    <Check size={15} />
                  ) : d.today ? (
                    <span />
                  ) : (
                    "·"
                  )}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant={checked ? "soft" : "primary"}
            disabled={checked || busy}
            onClick={onCheckin}
          >
            {checked ? (
              <>
                <Check size={17} />
                You showed up today
              </>
            ) : (
              <>
                I’m here for future me <span className="button-xp">+25 XP</span>
              </>
            )}
          </Button>
          <small>
            {weekCount
              ? `${weekCount} day${weekCount === 1 ? "" : "s"} of showing up this week. That counts.`
              : "One small step is all it takes."}
          </small>
        </section>
        <section className="daily-card panel">
          <SectionTitle
            eyebrow="LITTLE THINGS ADD UP"
            title="Your next good move"
          />
          <DailyTask
            icon="footprints"
            title="Give your progress a little nudge"
            description="Record a payment you’ve already made."
            points={50}
            done={data.journey.paymentDays.includes(dayKey())}
            onClick={
              data.accounts.some((a) => a.currentBalance > 0)
                ? onPayment
                : onAddDebt
            }
          />
          <DailyTask
            icon="heart"
            title="Be someone’s good energy"
            description="Send a little encouragement to your circle."
            points={15}
            done={data.journey.cheerDays.includes(dayKey())}
            onClick={() => onNavigate("circle")}
          />
          <button className="plan-nudge" onClick={() => onNavigate("journey")}>
            <span className="icon-tile sage">
              <Motif name="compass" size={22} />
            </span>
            <span>
              <strong>Your freedom has a timeline.</strong>
              <small>
                {data.accounts.length
                  ? `${payoffLabel(projection.months)} · Explore what’s possible`
                  : "Add a debt to find your starting point"}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
          <div className="quiet-note">
            <ShieldCheck size={14} />
            Your pace. Your progress. No comparison needed.
          </div>
        </section>
        {circle ? (
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
        ) : (
          <section className="circle-invite-card">
            <span className="icon-tile peach">
              <Motif name="users" size={24} />
            </span>
            <h2>
              Good company.
              <br />
              Better momentum.
            </h2>
            <p>
              Bring your partner or a few friends. Celebrate the steps, without
              sharing your balances.
            </p>
            <Button variant="secondary" onClick={() => onNavigate("circle")}>
              Find your people
              <ArrowRight size={17} />
            </Button>
          </section>
        )}
        <section className="today-feed panel">
          <SectionTitle
            eyebrow="PROGRESS IS BETTER SHARED"
            title="A little good news"
            action={
              <button
                className="text-button"
                onClick={() => onNavigate("circle")}
              >
                Your circle
                <ArrowRight size={15} />
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
        <aside className="quote-card">
          <span className="quote-spark">✳</span>
          <blockquote>
            “We’re not just paying things off. We’re making room for what’s
            next.”
          </blockquote>
          <span>YOUR NEXT CHAPTER IS WORTH IT</span>
          <div className="quote-line" />
        </aside>
      </div>
    </>
  );
}

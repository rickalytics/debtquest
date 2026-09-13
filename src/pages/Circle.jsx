import {
  Heart,
  Users,
  Plus,
  LockKeyhole,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Avatar,
  SectionTitle,
  Empty,
  InlineError,
} from "../components/ui.jsx";
import { CircleFeed, WeekChallenge } from "../components/CircleFeed.jsx";
import { dayKey } from "../lib/journey.js";
export default function Circle({
  data,
  social,
  circle,
  members,
  events,
  onSelect,
  onCreate,
  onInvite,
  onCheckin,
  onCheer,
  onSafety,
  onRefresh,
  busy,
  error,
  canConnect,
  challengeEvents,
}) {
  const checked = challengeEvents.some(
    (e) =>
      e.userId === social.viewerId &&
      e.kind === "checkin" &&
      dayKey(new Date(e.createdAt)) === dayKey(),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOOD COMPANY FOR THE LONG GAME</span>
          <h1>
            You don’t have to do it alone<span className="clay-text">.</span>
          </h1>
          <p>A little accountability. A lot of rooting for each other.</p>
        </div>
        {circle && (
          <Button onClick={onInvite}>
            <Plus size={18} />
            Invite your people
          </Button>
        )}
      </div>
      <InlineError error={error} />
      {error && (
        <Button variant="secondary" onClick={onRefresh}>
          <RefreshCw size={16} />
          Try again
        </Button>
      )}
      {!circle ? (
        <section className="circle-empty panel">
          <div className="circle-empty-art">
            <Avatar name="You" tone="clay" />
            <span>
              <Heart size={24} />
            </span>
            <Avatar name="Your person" tone="sage" />
          </div>
          <h2>
            Your people make
            <br />
            the journey lighter.
          </h2>
          <p>
            Create a private circle for two, or bring up to eight friends. Share
            the wins you choose. Keep the numbers you don’t.
          </p>
          {canConnect ? (
            <Button onClick={onCreate}>
              Start or join a circle
              <ArrowRight size={18} />
            </Button>
          ) : (
            <>
              <p className="notice">
                This build saves on your device. Real circles need a cloud
                account in a connected build.
              </p>
              <a className="button primary" href="/?demo=1">
                Explore a sample circle
                <ArrowRight size={18} />
              </a>
            </>
          )}
          <div className="circle-promises">
            <span>
              <LockKeyhole size={17} />
              Invite only
            </span>
            <span>
              <Heart size={17} />
              Encouragement over comparison
            </span>
            <span>
              <ShieldCheck size={17} />
              Share on your terms
            </span>
          </div>
        </section>
      ) : (
        <>
          <div className="circle-header-card">
            <div className="circle-symbol">
              {circle.kind === "couple" ? (
                <Heart size={29} />
              ) : (
                <Users size={29} />
              )}
            </div>
            <div className="circle-header-copy">
              {social.circles.length > 1 ? (
                <label className="circle-select-label">
                  <span className="sr-only">Choose your circle</span>
                  <select
                    aria-label="Choose your circle"
                    value={circle.id}
                    onChange={(e) => onSelect(e.target.value)}
                  >
                    {social.circles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <h2>{circle.name}</h2>
              )}
              <span>
                <LockKeyhole size={13} />
                Private {circle.kind === "couple"
                  ? "couple’s"
                  : "friends’"}{" "}
                circle · {members.length}{" "}
                {members.length === 1 ? "person" : "people"}
              </span>
            </div>
            <div className="circle-member-faces">
              {members.map((m) => (
                <button
                  key={m.userId}
                  className="member-button"
                  disabled={m.userId === social.viewerId}
                  aria-label={`Manage member ${m.name}`}
                  onClick={() => onSafety(null, m)}
                >
                  <Avatar name={m.name} tone={m.tone} />
                  <small>{m.userId === social.viewerId ? "You" : m.name}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="circle-page-grid">
            <section className="panel activity-panel">
              <SectionTitle
                title="The little wins club"
                action={
                  <button
                    className="text-button"
                    onClick={onRefresh}
                    disabled={busy}
                    aria-label="Refresh circle"
                  >
                    <RefreshCw size={15} />
                  </button>
                }
              />
              <p className="section-description">
                Big steps. Small steps. They all deserve a little love.
              </p>
              <CircleFeed
                events={events}
                members={members}
                viewerId={social.viewerId}
                onCheer={onCheer}
                onSafety={onSafety}
                busy={busy}
              />
            </section>
            <aside className="circle-aside">
              <WeekChallenge
                events={challengeEvents}
                members={members}
                onCheckin={onCheckin}
                checked={checked}
                busy={busy}
              />
              <section className="circle-pact">
                <span className="eyebrow">OUR KIND OF CIRCLE</span>
                <h3>
                  Cheer the effort.
                  <br />
                  Respect the pace.
                </h3>
                <p>
                  We’re here to celebrate showing up. Your balances, debt names,
                  and private notes stay yours.
                </p>
                <div>
                  <ShieldCheck size={18} />
                  <span>Only progress you choose to share appears here.</span>
                </div>
              </section>
              <button className="text-button another-circle" onClick={onCreate}>
                <Plus size={16} />
                Start or join another circle
              </button>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

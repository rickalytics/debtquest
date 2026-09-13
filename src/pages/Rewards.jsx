import {
  Plus,
  LockKeyhole,
  ArrowRight,
  Sparkles,
  Check,
  Ticket,
} from "lucide-react";
import { Button, Motif, SectionTitle, Progress } from "../components/ui.jsx";
import { levelOf, BADGES } from "../lib/journey.js";
export default function Rewards({ data, onCreate, onRedeem, busy }) {
  const level = levelOf(data);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE THE JOURNEY FEEL GOOD</span>
          <h1>
            A little joy along the way<span className="clay-text">.</span>
          </h1>
          <p>You’re building a better future. Enjoy the getting there.</p>
        </div>
        <Button variant="secondary" onClick={onCreate}>
          <Plus size={17} />
          Make a reward
        </Button>
      </div>
      <section className="rewards-banner">
        <div className="reward-emblem">
          <Sparkles size={37} />
        </div>
        <div className="rewards-balance">
          <span>YOUR WELL-EARNED POINTS</span>
          <strong>
            {data.xp.toLocaleString()}
            <small> XP</small>
          </strong>
          <p>Consistency looks good on you.</p>
        </div>
        <div className="level-summary">
          <div>
            <span className="level-pill">LEVEL {level.index}</span>
            <strong>{level.name}</strong>
          </div>
          <Progress value={level.progress} label="Level progress" />
          <span>
            {level.next
              ? `${Math.max(0, level.next.at - data.journey.lifetimeXP)} XP to ${level.next.name}`
              : "You’re making freedom a habit."}
          </span>
        </div>
      </section>
      <SectionTitle
        eyebrow="SOMETHING TO LOOK FORWARD TO"
        title="Little rewards. Real happiness."
      />
      <p className="section-description">
        Spend your points on moments, not more stuff. These are promises you
        make to yourself or each other.
      </p>
      <div className="rewards-grid">
        {data.rewards.map((r, i) => (
          <article className={`reward-card tone-${i % 4}`} key={r.id}>
            <div className="reward-art">
              <Motif name={r.emoji} size={44} />
              <span className="reward-art-star one">✦</span>
              <span className="reward-art-star two">✳</span>
              <span className="reward-cost">{r.cost} XP</span>
            </div>
            <div className="reward-copy">
              <h3>{r.name}</h3>
              <p>{r.desc || "A little something worth looking forward to."}</p>
              <Button
                variant={data.xp >= r.cost ? "secondary" : "quiet"}
                disabled={busy || data.xp < r.cost}
                onClick={() => onRedeem(r)}
              >
                {data.xp >= r.cost ? (
                  <>
                    Claim this moment
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <LockKeyhole size={14} />
                    {r.cost - data.xp} XP to go
                  </>
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <section className="badges-section">
        <SectionTitle
          eyebrow="LOOK WHAT YOU’RE BECOMING"
          title="Milestones worth keeping"
          action={
            <span className="muted">
              {BADGES.filter((b) => b.earned(data)).length} of {BADGES.length}{" "}
              earned
            </span>
          }
        />
        <div className="badges-grid">
          {BADGES.map((b) => (
            <div
              className={`badge-card ${b.earned(data) ? "earned" : "locked"}`}
              key={b.id}
            >
              <div className="badge-medal">
                <Motif name={b.icon} size={28} />
                {b.earned(data) && (
                  <span>
                    <Check size={11} />
                  </span>
                )}
              </div>
              <strong>{b.name}</strong>
              <small>{b.desc}</small>
            </div>
          ))}
        </div>
      </section>
      {data.redeemedRewards.length > 0 && (
        <section className="panel claimed-section">
          <SectionTitle title="Moments you’ve made room for" />
          <div className="history-list">
            {[...data.redeemedRewards]
              .reverse()
              .slice(0, 10)
              .map((r) => (
                <div key={r.id}>
                  <span className="icon-tile peach">
                    <Motif name={r.emoji} />
                  </span>
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {r.date
                        ? new Date(r.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Claimed reward"}
                    </small>
                  </span>
                  <span>{r.cost} XP</span>
                </div>
              ))}
          </div>
        </section>
      )}
      <p className="rewards-foot">
        <Ticket size={15} />
        XP has no cash value. No purchases, prizes, or promises of financial
        returns.
      </p>
    </>
  );
}

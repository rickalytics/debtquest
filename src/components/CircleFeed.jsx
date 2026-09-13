import {
  Heart,
  MoreHorizontal,
  ArrowUpRight,
  Check,
  Hand,
  Sparkles,
  Flag,
} from "lucide-react";
import { Avatar, IconButton, Empty, Progress, Button } from "./ui.jsx";
import { dayKey, money, weekDays } from "../lib/journey.js";
export function relativeTime(value) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
export function CircleFeed({
  events,
  members,
  viewerId,
  onCheer,
  onSafety,
  busy,
  compact = false,
}) {
  if (!events.length)
    return (
      <Empty icon="heart" title="Every little win belongs here.">
        Share a check-in or a payment to give your circle something to
        celebrate.
      </Empty>
    );
  return (
    <div className={`circle-feed ${compact ? "compact" : ""}`}>
      {events.map((event) => {
        const member = members.find((m) => m.userId === event.userId);
        const own = event.userId === viewerId;
        return (
          <article className="feed-event" key={event.id}>
            <Avatar
              name={member?.name || "Member"}
              tone={member?.tone || "sage"}
            />
            <div className="feed-body">
              <div className="feed-top">
                <strong>{own ? "You" : member?.name || "Member"}</strong>
                <time dateTime={event.createdAt}>
                  {relativeTime(event.createdAt)}
                </time>
                {!own && (
                  <IconButton
                    label={`Manage activity from ${member?.name || "member"}`}
                    onClick={() => onSafety(event, member)}
                  >
                    <MoreHorizontal size={17} />
                  </IconButton>
                )}
              </div>
              <p>
                {event.kind === "payment" ? (
                  <>
                    made a little more room to breathe
                    {event.amount != null ? (
                      <>
                        {" "}
                        · <strong>{money(event.amount, true)}</strong> paid
                      </>
                    ) : (
                      ""
                    )}
                    .
                  </>
                ) : event.kind === "joined" ? (
                  "joined the journey. Good things ahead."
                ) : (
                  "showed up for their future self."
                )}
              </p>
              {event.kind === "payment" && event.progress != null && (
                <span className="win-chip">
                  <Sparkles size={13} />
                  {Math.round(event.progress)}% of starting debt cleared
                </span>
              )}
              <div className="reaction-row">
                {[
                  ["clap", Hand, "Cheer"],
                  ["heart", Heart, "Send love"],
                ].map(([emoji, Icon, label]) => {
                  const reactions = event.reactions || [],
                    count = reactions.filter((r) => r.emoji === emoji).length,
                    selected = reactions.some(
                      (r) => r.userId === viewerId && r.emoji === emoji,
                    );
                  return (
                    <button
                      key={emoji}
                      aria-label={`${label} for ${own ? "your" : member?.name || "member"}’s win`}
                      aria-pressed={selected}
                      disabled={busy || own}
                      onClick={() => onCheer(event, emoji)}
                      className={`reaction ${selected ? "selected" : ""}`}
                    >
                      <Icon
                        size={15}
                        fill={
                          selected && emoji === "heart"
                            ? "currentColor"
                            : "none"
                        }
                      />
                      {count || (
                        <span className="reaction-hint">
                          {emoji === "clap" ? "You’ve got this" : "Love this"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function WeekChallenge({
  events,
  members,
  onCheckin,
  checked,
  compact = false,
  busy = false,
}) {
  const start = weekDays()[0].key,
    end = weekDays()[6].key;
  const checkins = new Set(
    events
      .filter(
        (e) =>
          e.kind === "checkin" &&
          dayKey(new Date(e.createdAt)) >= start &&
          dayKey(new Date(e.createdAt)) <= end,
      )
      .map((e) => `${e.userId}:${dayKey(new Date(e.createdAt))}`),
  );
  const goal = Math.max(1, members.length) * 3,
    completed = checkins.size;
  return (
    <div className={`week-challenge ${compact ? "compact" : ""}`}>
      <div className="challenge-label">
        <span>
          <Flag size={14} />
          THIS WEEK, TOGETHER
        </span>
        <span className="tiny-badge">Team quest</span>
      </div>
      <div className="challenge-main">
        <div>
          <h3>
            Small steps.
            <br />
            Big energy.
          </h3>
          <p>
            Three check-ins each.
            <br />A little accountability goes a long way.
          </p>
        </div>
        <div className="challenge-sticker">
          <span>✳</span>
          <Heart size={25} />
        </div>
      </div>
      <div className="challenge-progress">
        <span>
          <strong>{completed}</strong> / {goal} check-ins
        </span>
        <div className="avatar-stack">
          {members.slice(0, 4).map((m) => (
            <Avatar key={m.userId} name={m.name} tone={m.tone} small />
          ))}
        </div>
      </div>
      <Progress
        value={(completed / goal) * 100}
        label="Weekly circle check-ins"
      />
      <div className="challenge-foot">
        <span>
          {completed >= goal
            ? "You did that. Together."
            : `${Math.max(0, goal - completed)} little steps to go`}
        </span>
        <button
          className="text-button"
          disabled={checked || busy}
          onClick={onCheckin}
        >
          {checked ? (
            <>
              <Check size={14} />
              You’re in
            </>
          ) : (
            <>
              Check in
              <ArrowUpRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

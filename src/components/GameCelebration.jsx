import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Heart,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  FastForward,
  ShieldCheck,
} from "lucide-react";
import { Dialog, Button, Motif, Progress } from "./ui.jsx";
import { Pip, Chest } from "./QuestArt.jsx";
import { money } from "../lib/journey.js";
import {
  soundEnabled,
  setGameSound,
  primeGameAudio,
  playWinAudio,
} from "../lib/feedback.js";

function AnimatedBalance({ from, to, instant }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (instant) {
      setValue(to);
      return;
    }
    let frame;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / 1000);
      setValue(from + (to - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, instant]);
  return (
    <>
      <span aria-hidden="true">{money(value, true)}</span>
      <span className="sr-only">{money(to, true)}</span>
    </>
  );
}

export default function GameCelebration({
  result,
  onClose,
  onCircle,
  onEquip,
  busy,
  onPreview,
}) {
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [skip, setSkip] = useState(false),
    [phase, setPhase] = useState(0),
    [sound, setSound] = useState(soundEnabled),
    [equipped, setEquipped] = useState(false),
    [equipError, setEquipError] = useState("");
  const reduced = systemReduced || skip;
  const levelUp =
    result.levelAfter &&
    result.levelBefore &&
    result.levelAfter.index > result.levelBefore.index;
  const unlock = result.unlocks?.at(-1);
  const title = result.reward
    ? "This moment is yours."
    : result.type === "chest"
      ? "Treasure earned!"
      : result.paidOff
        ? "DEBT DEFEATED!"
        : levelUp
          ? "LEVEL UP!"
          : result.type === "checkin"
            ? "Quest complete!"
            : result.balanceAfter >= result.balanceBefore
              ? "Payment recorded!"
              : "A little debt. Gone.";
  const hasBalance =
    Number.isFinite(result.balanceBefore) &&
    Number.isFinite(result.balanceAfter);
  const reduction = hasBalance
    ? Math.max(0, result.balanceBefore - result.balanceAfter)
    : 0;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = (e) => setSystemReduced(e.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (reduced) {
      setPhase(2);
      return;
    }
    const first = setTimeout(() => setPhase(1), 160),
      second = setTimeout(() => setPhase(2), 1050);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [reduced]);
  useEffect(() => {
    const timer = setTimeout(() => {
      stop = playWinAudio(levelUp || result.paidOff || result.type === "chest");
    }, 100);
    let stop = () => {};
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [levelUp, result.paidOff, result.type, sound]);
  return (
    <Dialog
      title={title}
      onClose={onClose}
      busy={busy}
      className={`game-dialog ${reduced ? "calm" : ""}`}
    >
      <div className={`game-celebration phase-${phase}`}>
        {result.preview && (
          <div className="preview-scenes">
            <span>SAMPLE CELEBRATION · NO RECORDS CHANGE</span>
            <div>
              {[
                ["payment", "Payment"],
                ["level", "Level up"],
                ["payoff", "Debt cleared"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={result.scene === id}
                  onClick={() => onPreview(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="victory-stage" aria-hidden="true">
          <div className="victory-halo" />
          {Array.from({ length: 18 }, (_, i) => (
            <i
              className="victory-confetti"
              key={i}
              style={{
                "--i": i,
                "--x": `${Math.cos(i * 2.4) * 150}px`,
                "--y": `${Math.sin(i * 2.4) * 120 - 40}px`,
                "--rotation": `${i * 47}deg`,
                background: ["#f6c354", "#8e75ee", "#4ccda2", "#ef91a1"][i % 4],
              }}
            />
          ))}
          {result.type === "chest" ? (
            <Chest open={phase > 0} />
          ) : result.reward ? (
            <div className="victory-reward">
              <Motif name={result.reward.emoji} size={62} />
              <Star size={25} fill="currentColor" />
            </div>
          ) : (
            <Pip look={unlock?.id || result.companion} mood="celebrate" />
          )}
          {hasBalance && (
            <span className={`debt-impact ${result.paidOff ? "defeated" : ""}`}>
              {result.paidOff ? (
                <>
                  <Check size={20} />
                  PAID OFF
                </>
              ) : reduction > 0 ? (
                <>{money(reduction, true)} cleared</>
              ) : (
                "PAYMENT RECORDED"
              )}
            </span>
          )}
          {result.points > 0 && (
            <span className="xp-flight">
              <Sparkles size={16} />+{result.points} XP
            </span>
          )}
        </div>
        <div className="victory-copy">
          <h3>
            {result.reward
              ? result.reward.name
              : result.paidOff
                ? "One debt down. A lighter life ahead."
                : result.type === "chest"
                  ? "Three days of showing up. That's treasure."
                  : result.type === "checkin"
                    ? "A small step for you. A big day for Pip."
                    : `${money(result.amount, true)} toward your freedom.`}
          </h3>
          {hasBalance && (
            <div className="victory-balance">
              <span>THIS DEBT'S REMAINING BALANCE</span>
              <strong>
                <AnimatedBalance
                  from={result.balanceBefore}
                  to={result.balanceAfter}
                  instant={reduced}
                />
              </strong>
              <small>
                Previously {money(result.balanceBefore, true)}
                {result.balanceAfter >= result.balanceBefore
                  ? " · includes your statement adjustment"
                  : ""}
              </small>
            </div>
          )}
          {!hasBalance && (
            <p>
              {result.reward
                ? "Make a plan to enjoy it. Your lifetime level stays with you."
                : "This progress is yours to keep. On to the next little adventure."}
            </p>
          )}
        </div>
        {result.points > 0 && (
          <div className="victory-xp">
            <span className="earned-xp">
              <Sparkles size={18} />+{result.points} XP earned
            </span>
            {result.levelAfter && (
              <>
                <strong>
                  {levelUp
                    ? `LEVEL ${result.levelBefore.index} → ${result.levelAfter.index}`
                    : `LEVEL ${result.levelAfter.index}`}{" "}
                  · {result.levelAfter.name}
                </strong>
                <Progress
                  value={
                    phase === 0
                      ? levelUp
                        ? 0
                        : result.levelBefore.progress
                      : result.levelAfter.progress
                  }
                  label="Saved level progress"
                />
                <small>
                  {result.lifetimeAfter.toLocaleString()} lifetime XP
                  {result.levelAfter.next
                    ? ` · ${result.levelAfter.next.at - result.lifetimeAfter} XP to next level`
                    : " · all islands unlocked"}
                </small>
              </>
            )}
          </div>
        )}
        {hasBalance && !result.points && (
          <p className="victory-note">
            Payment saved. You've already earned payment XP for this date.
          </p>
        )}
        {unlock && (
          <div className="new-unlock">
            <span className="unlock-spark">
              <Star size={21} fill="currentColor" />
            </span>
            <div>
              <span>NEW COMPANION LOOK UNLOCKED</span>
              <strong>{unlock.name}</strong>
              <small>{unlock.island} is open!</small>
            </div>
            {!result.preview && (
              <button
                className="text-button"
                disabled={busy || equipped}
                onClick={async () => {
                  setEquipError("");
                  try {
                    await onEquip(unlock.id);
                    setEquipped(true);
                  } catch (e) {
                    setEquipError(e.message);
                  }
                }}
              >
                {equipped ? "Equipped ✓" : "Equip"}
              </button>
            )}
          </div>
        )}
        {result.badges?.length > 0 && (
          <div className="victory-badges">
            {result.badges.map((b) => (
              <span key={b.id}>
                <Motif name={b.icon} size={16} />
                {b.name}
                <small>Badge earned</small>
              </span>
            ))}
          </div>
        )}
        {equipError && (
          <p className="inline-error" role="alert">
            {equipError}
          </p>
        )}
        {result.shareFailed && (
          <p className="inline-error">
            {result.type === "checkin"
              ? "Check-in saved. Visit your circle's weekly quest to try sharing again."
              : "Payment saved. Open this debt's payment details to try sharing again."}
          </p>
        )}
        {result.shared && (
          <p className="victory-shared">
            <Heart size={15} />
            Your circle has a new reason to cheer.
          </p>
        )}
        <div className="victory-actions">
          <Button onClick={onClose} disabled={busy}>
            Continue quest
            <ArrowRight size={18} />
          </Button>
          {result.shared && (
            <button className="text-button" onClick={onCircle}>
              See your circle
              <Heart size={15} />
            </button>
          )}
        </div>
        <div className="effect-controls">
          <button
            aria-pressed={sound}
            onClick={() => {
              setGameSound(!sound);
              setSound(!sound);
              if (!sound) primeGameAudio();
            }}
          >
            {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}Sound{" "}
            {sound ? "on" : "off"}
          </button>
          <button onClick={() => setSkip(true)} disabled={reduced}>
            <FastForward size={15} />
            {reduced ? "Calm effects" : "Skip animation"}
          </button>
          <span>
            <ShieldCheck size={13} />
            {result.preview ? "Sample only" : "Saved before celebrating"}
          </span>
        </div>
      </div>
    </Dialog>
  );
}

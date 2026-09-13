import { useMemo, useState } from "react";
import {
  Plus,
  ArrowRight,
  LockKeyhole,
  ArrowUpRight,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  Button,
  Motif,
  Progress,
  SectionTitle,
  Empty,
} from "../components/ui.jsx";
import { money, totals, projectPayoff, payoffLabel } from "../lib/journey.js";
function PayoffChart({ baseline, projection }) {
  const maxMonths = Math.max(baseline.months || 0, projection.months || 0, 1),
    maxBalance = Math.max(baseline.points[0].balance, 1);
  const path = (points) =>
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${20 + (p.month / maxMonths) * 580},${18 + (1 - p.balance / maxBalance) * 142}`,
      )
      .join(" ");
  return (
    <div className="payoff-chart">
      <svg
        viewBox="0 0 620 182"
        role="img"
        aria-label={`Debt balance projection. ${projection.months == null ? "Your payment needs to increase." : `Estimated payoff in ${projection.months} months.`}`}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#7bac91" stopOpacity=".24" />
            <stop offset="1" stopColor="#7bac91" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 65, 113, 160].map((y) => (
          <line
            key={y}
            x1="20"
            x2="600"
            y1={y}
            y2={y}
            stroke="#dddeda"
            strokeDasharray="3 5"
          />
        ))}
        <path
          d={`${path(projection.points)} L${20 + ((projection.months || 0) / maxMonths) * 580},160 L20,160 Z`}
          fill="url(#chartFill)"
        />
        <path
          d={path(baseline.points)}
          fill="none"
          stroke="#b7b5a9"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <path
          d={path(projection.points)}
          fill="none"
          stroke="#316b54"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="20" cy="18" r="4" fill="#316b54" />
        {projection.months != null && (
          <circle
            cx={20 + (projection.months / maxMonths) * 580}
            cy="160"
            r="5"
            fill="#c78662"
            stroke="#fff"
            strokeWidth="3"
          />
        )}
      </svg>
      <div className="chart-labels">
        <span>Today</span>
        <span>{payoffLabel(maxMonths)}</span>
      </div>
    </div>
  );
}
export default function Journey({ data, onAddDebt, onDebt, onPayment }) {
  const [extra, setExtra] = useState(0),
    [strategy, setStrategy] = useState("avalanche");
  const sum = totals(data);
  const baseline = useMemo(
      () => projectPayoff(data.accounts, 0, strategy),
      [data.accounts, strategy],
    ),
    plan = useMemo(
      () => projectPayoff(data.accounts, extra, strategy),
      [data.accounts, extra, strategy],
    );
  const monthsSaved =
    baseline.months && plan.months ? baseline.months - plan.months : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ONE STEP. THEN THE NEXT.</span>
          <h1>
            Your path to freedom<span className="clay-text">.</span>
          </h1>
          <p>Every balance has an ending. Let’s find yours.</p>
        </div>
        <Button onClick={onAddDebt}>
          <Plus size={18} />
          Add a debt
        </Button>
      </div>
      <div className="journey-stats">
        <div>
          <span>Debt behind you</span>
          <strong>{money(sum.cleared)}</strong>
          <small className="green-text">
            <ArrowUpRight size={14} />
            {Math.round(sum.percent)}% of your starting balance
          </small>
        </div>
        <div>
          <span>Ahead of you</span>
          <strong>{money(sum.remaining)}</strong>
          <small>One small step at a time</small>
        </div>
        <div>
          <span>Debts put to rest</span>
          <strong>
            {data.accounts.filter((a) => a.isPaidOff).length}
            <em> / {data.accounts.length}</em>
          </strong>
          <small>Make room for your next chapter</small>
        </div>
      </div>
      <div className="journey-grid">
        <section className="panel debt-panel">
          <SectionTitle
            title="A lighter load, one by one"
            action={
              <span className="private-label">
                <LockKeyhole size={13} />
                Only you
              </span>
            }
          />
          {data.accounts.length ? (
            <div className="debt-list">
              {[...data.accounts]
                .sort((a, b) => Number(a.isPaidOff) - Number(b.isPaidOff))
                .map((a) => {
                  const percent =
                    a.originalBalance > 0
                      ? Math.max(
                          0,
                          ((a.originalBalance - a.currentBalance) /
                            a.originalBalance) *
                            100,
                        )
                      : a.isPaidOff
                        ? 100
                        : 0;
                  return (
                    <button
                      className="debt-row"
                      key={a.id}
                      onClick={() => onDebt(a)}
                    >
                      <span className={`debt-icon ${a.type}`}>
                        <Motif name={a.type} size={22} />
                      </span>
                      <div className="debt-row-body">
                        <div>
                          <strong>{a.name}</strong>
                          <span>
                            {a.isPaidOff ? (
                              <span className="paid-label">
                                <Check size={14} />
                                Paid off
                              </span>
                            ) : (
                              money(a.currentBalance, true)
                            )}
                          </span>
                        </div>
                        <Progress
                          value={percent}
                          label={`${a.name} paid off`}
                        />
                        <div className="debt-meta">
                          <span>
                            {a.isPaidOff
                              ? "That’s one less thing."
                              : `${a.interestRate}% APR · ${money(a.minimumPayment)}/mo`}
                          </span>
                          <span>
                            {Math.round(percent)}% cleared
                            <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : (
            <Empty
              icon="footprints"
              title="A fresh start, right here."
              action={
                <Button onClick={onAddDebt}>
                  Add your first debt
                  <Plus size={17} />
                </Button>
              }
            >
              Add a balance and turn a big goal into small, visible steps.
            </Empty>
          )}
          <div className="debt-panel-foot">
            <LockKeyhole size={14} />
            Account details and balances always stay private.
          </div>
        </section>
        <section className="panel projection-panel">
          <SectionTitle eyebrow="LET’S LOOK AHEAD" title="Meet future you" />
          <div className="payoff-date">
            <strong>
              {data.accounts.length
                ? payoffLabel(plan.months)
                : "A new beginning"}
            </strong>
            <span>
              {sum.remaining > 0
                ? "your estimated debt-free chapter"
                : "good things are ahead"}
            </span>
          </div>
          {sum.remaining > 0 && (
            <>
              <PayoffChart baseline={baseline} projection={plan} />
              <div className="chart-key">
                <span>
                  <i />
                  Your plan
                </span>
                <span>
                  <i />
                  Minimum payments
                </span>
              </div>
              <div className="extra-heading">
                <label htmlFor="extra-payment">
                  What if you added a little extra?
                </label>
                <strong>
                  {money(extra)}
                  <small>/mo</small>
                </strong>
              </div>
              <input
                id="extra-payment"
                type="range"
                min="0"
                max="500"
                step="25"
                value={extra}
                onChange={(e) => setExtra(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>$0</span>
                <span>$250</span>
                <span>$500</span>
              </div>
              <div className="segmented strategy">
                <button
                  className={strategy === "avalanche" ? "selected" : ""}
                  aria-pressed={strategy === "avalanche"}
                  onClick={() => setStrategy("avalanche")}
                >
                  Highest interest first
                </button>
                <button
                  className={strategy === "snowball" ? "selected" : ""}
                  aria-pressed={strategy === "snowball"}
                  onClick={() => setStrategy("snowball")}
                >
                  Smallest balance first
                </button>
              </div>
              <p className="strategy-description">
                {strategy === "avalanche"
                  ? "Pay minimums on every debt, then focus extra money on the highest APR."
                  : "Pay minimums on every debt, then focus extra money on the smallest balance."}
              </p>
              {extra > 0 && plan.months != null && (
                <div className="savings-note">
                  <Motif name="sparkles" size={20} />
                  <span>
                    {monthsSaved > 0 ? (
                      <>
                        <strong>{monthsSaved} months sooner.</strong> About{" "}
                        {money(Math.max(0, baseline.interest - plan.interest))}{" "}
                        less in interest.
                      </>
                    ) : (
                      <>Every extra dollar reduces your remaining balance.</>
                    )}
                  </span>
                </div>
              )}
              {plan.months == null && (
                <p className="notice">
                  At these rates, this payment may not cover interest or clear
                  the balance within 50 years. Try increasing the monthly
                  payment.
                </p>
              )}
              <p className="projection-note">
                An illustration, not a lender quote. Assumes fixed APRs, monthly
                interest, no new charges, and the same total budget as each debt
                is paid off. This slider explores a plan; it does not schedule
                payments.
              </p>
            </>
          )}
        </section>
      </div>
      <section className="panel payment-history">
        <SectionTitle
          eyebrow="THE LITTLE STEPS THAT GOT YOU HERE"
          title="Your recent progress"
        />
        {data.payments.length ? (
          <div className="history-list">
            {[...data.payments]
              .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
              .slice(0, 12)
              .map((p) => (
                <div key={p.id}>
                  <span className="history-check">
                    <Check size={16} />
                  </span>
                  <span>
                    <strong>
                      {data.accounts.find((a) => a.id === p.accountId)?.name ||
                        "Archived debt"}
                    </strong>
                    <small>
                      {new Date(p.paymentDate + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                      {p.note ? ` · ${p.note}` : ""}
                    </small>
                  </span>
                  <strong className="green-text">
                    {money(p.amountPaid, true)}
                  </strong>
                </div>
              ))}
          </div>
        ) : (
          <p className="empty-inline">
            Your first logged payment will be the beginning of a very good
            story.
          </p>
        )}
      </section>
    </>
  );
}

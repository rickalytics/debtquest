import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Heart,
  Users,
  Check,
  ArrowLeft,
} from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "../db.js";
import { Brand, Button, Field, InlineError, useAction } from "./ui.jsx";
import JourneyArt from "./JourneyArt.jsx";
import { supabase } from "../supabaseClient.js";
import { LegalLinks } from "../Legal.jsx";
export function Auth() {
  const [signup, setSignup] = useState(false),
    [forgot, setForgot] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [notice, setNotice] = useState("");
  const action = useAction();
  return (
    <main className="welcome">
      <div className="welcome-story">
        <Brand />
        <div>
          <span className="eyebrow">GOOD THINGS ARE AHEAD</span>
          <h1>
            A little closer.
            <br />
            <em>Together.</em>
          </h1>
          <p>
            Turn paying off debt into a journey worth sharing. Your goals. Your
            people. A little more freedom every day.
          </p>
          <JourneyArt className="welcome-art" />
        </div>
        <span className="welcome-foot">
          <ShieldCheck size={17} /> Your balances stay yours.
        </span>
      </div>
      <div className="welcome-form">
        <div className="welcome-form-inner">
          <span className="mini-star">✳</span>
          <h2>
            {forgot
              ? "A fresh way back in."
              : signup
                ? "Your next chapter starts here."
                : "Welcome to your next chapter."}
          </h2>
          <p>
            {signup
              ? "A fresh start, with good company."
              : "Sign in to pick up where you left off."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                if (forgot) {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email.trim(),
                    {
                      redirectTo:
                        import.meta.env.VITE_PUBLIC_APP_URL || location.origin,
                    },
                  );
                  if (error) throw error;
                  setNotice(
                    "If an account matches, a reset link is on its way. Check your email.",
                  );
                  return;
                }
                const { error } = await (
                  signup ? signUpWithPassword : signInWithPassword
                )(email.trim(), password);
                if (error) throw error;
                if (signup)
                  setNotice(
                    "Check your email to confirm your account, then come back to sign in.",
                  );
              });
            }}
          >
            <Field
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!forgot && (
              <Field
                label="Password"
                type="password"
                minLength={6}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <InlineError error={action.error} />
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <Button disabled={action.busy}>
              {action.busy
                ? "One moment…"
                : forgot
                  ? "Send a reset link"
                  : signup
                    ? "Create my account"
                    : "Sign in"}
              <ArrowRight size={18} />
            </Button>
          </form>
          {!signup && (
            <button
              className="text-button welcome-switch"
              onClick={() => {
                setForgot(!forgot);
                setNotice("");
              }}
            >
              {forgot ? "Back to sign in" : "Forgot your password?"}
            </button>
          )}
          <button
            className="text-button welcome-switch"
            onClick={() => {
              setSignup(!signup);
              setForgot(false);
              setNotice("");
            }}
          >
            {signup
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          <a className="demo-link" href="/?demo=1">
            Take a look around first <ArrowRight size={15} />
          </a>
          <LegalLinks />
        </div>
      </div>
    </main>
  );
}
export function Onboarding({ data, commit }) {
  const [step, setStep] = useState(0),
    [name, setName] = useState(data.journey.name || ""),
    [why, setWhy] = useState(data.journey.why),
    [style, setStyle] = useState("couple");
  const action = useAction();
  const options = [
    "More room to breathe",
    "Our next adventure",
    "A home of our own",
    "More time together",
  ];
  return (
    <main className="onboarding">
      <Brand />
      <div className="onboarding-card">
        <div className="onboarding-art">
          <JourneyArt />
        </div>
        <span className="eyebrow">YOUR NEXT CHAPTER · {step + 1} OF 2</span>
        <h1>
          {step === 0 ? (
            <>
              Freedom looks
              <br />
              good on you.
            </>
          ) : (
            <>
              What are you
              <br />
              making room for?
            </>
          )}
        </h1>
        <p>
          {step === 0
            ? "Let’s make this journey yours. You can bring your people along whenever you’re ready."
            : "Debt payoff is the path. This is your reason to keep going."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              action.run(() => {
                throw new Error("Enter the name you’d like us to use.");
              });
              return;
            }
            if (step === 0) {
              setStep(1);
              return;
            }
            action.run(() =>
              commit({
                ...data,
                profile: { ...data.profile, name1: name.trim() },
                journey: {
                  ...data.journey,
                  name: name.trim(),
                  why,
                  style,
                  onboarded: true,
                },
              }),
            );
          }}
        >
          {step === 0 ? (
            <>
              <Field
                label="What should we call you?"
                required
                maxLength={32}
                placeholder="Your first name"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="choice-row">
                {[
                  ["couple", "As a couple", Heart],
                  ["friends", "With friends", Users],
                  ["solo", "For myself", ShieldCheck],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={style === id}
                    className={`choice ${style === id ? "selected" : ""}`}
                    onClick={() => setStyle(id)}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="why-options">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setWhy(option)}
                  className={why === option ? "selected" : ""}
                >
                  {option}
                  {why === option && <Check size={18} />}
                </button>
              ))}
            </div>
          )}
          <InlineError error={action.error} />
          <Button disabled={action.busy}>
            {action.busy
              ? "Starting…"
              : step === 0
                ? "Let’s do this"
                : "Start my journey"}
            <ArrowRight size={18} />
          </Button>
          {step === 1 && (
            <button
              className="text-button"
              type="button"
              onClick={() => setStep(0)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
        </form>
        <span className="onboarding-foot">
          <ShieldCheck size={14} /> Balances are private. Sharing is always your
          choice.
        </span>
        <a href="/?demo=1" className="demo-link">
          Explore the sample journey
        </a>
      </div>
    </main>
  );
}

export function PasswordReset({ onDone }) {
  const [password, setPassword] = useState("");
  const action = useAction();
  return (
    <main className="loading-screen">
      <Brand />
      <div className="password-reset-card">
        <h1>Your fresh start.</h1>
        <p className="form-help">
          Choose a new password, then pick up your journey.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.run(async () => {
              const { error } = await supabase.auth.updateUser({ password });
              if (error) throw error;
              onDone();
            });
          }}
        >
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <InlineError error={action.error} />
          <Button disabled={action.busy}>
            Save new password
            <ArrowRight size={18} />
          </Button>
        </form>
      </div>
    </main>
  );
}

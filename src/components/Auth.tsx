import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import type { User } from "firebase/auth";
import {
  firebaseReady,
  signInGoogle,
  signUpEmail,
  signInEmail,
  recoverPassword,
  authErrorMessage,
} from "../services/firebase";
import { privacySections, termsSections } from "../content/legal";
import { trackEvent } from "../services/analytics";
export default function Auth({
  initial = "signup",
  onPreview,
  onSuccess,
}: {
  initial?: string;
  onPreview: () => void;
  onSuccess: (user: User) => void;
}) {
  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [legal, setLegal] = useState("");
  const [pendingProvider, setPendingProvider] = useState("");
  const consentRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mode === "signup") trackEvent("signup_started");
  }, [mode]);
  async function submit(google = false) {
    if (busy) return;
    setError("");
    setMessage("");
    if (mode === "signup" && !accepted) {
      setError("Check the agreement above to continue with Google or email.");
      consentRef.current?.focus();
      return;
    }
    setBusy(true);
    setPendingProvider(google ? "google" : "email");
    try {
      let signedIn: User;
      if (google) {
        const user = await signInGoogle();
        if (!user) return;
        signedIn = user;
      }
      else if (mode === "reset") {
        await recoverPassword(email);
        setMessage(
          "If this address has an account, a recovery link is on its way. Check your inbox and spam folder.",
        );
        return;
      } else if (mode === "signup") signedIn = await signUpEmail(email, password);
      else signedIn = await signInEmail(email, password);
      trackEvent(
        google || mode === "login" ? "login_completed" : "signup_completed",
      );
      onSuccess(signedIn);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
      setPendingProvider("");
    }
  }
  return (
    <div className="auth-content">
      <div className="brand center">
        <span className="brand-icon">✳</span>AI Space
        <span className="brand-dot">.</span>
      </div>
      <span className="eyebrow">LEARN. LAUGH. MASTER.</span>
      <h2>
        {mode === "reset"
          ? "Let’s get you back in."
          : mode === "login"
            ? "Welcome back, curious mind."
            : "Your people. Your potential."}
      </h2>
      <p>
        {mode === "reset"
          ? "We’ll send a password reset link to your email."
          : "A little learning. A little laughter. A world to make your own."}
      </p>
      {!firebaseReady && (
        <div className="info-card">
          <strong>Your new world is taking shape.</strong>
          <br />
          Accounts open when Firebase is connected. You can explore and build a
          local preview agent right now.
        </div>
      )}
      {mode === "signup" && (
        <label className="check-label">
          <input
            ref={consentRef}
            type="checkbox"
            checked={accepted}
            disabled={busy}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setError("");
            }}
          />
          <span>
            I am 18 or older and agree to the{" "}
            <button type="button" className="inline-link" onClick={() => setLegal(legal === "terms" ? "" : "terms")}>Terms</button>{" "}
            and{" "}
            <button type="button" className="inline-link" onClick={() => setLegal(legal === "privacy" ? "" : "privacy")}>Privacy Policy</button>.
          </span>
        </label>
      )}
      {legal && (
        <div className="inline-legal">
          {(legal === "privacy" ? privacySections : termsSections).map((s) => (
            <section key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>
          ))}
        </div>
      )}
      {error && <p role="alert" className="error-note">{error}</p>}
      {pendingProvider === "google" && (
        <p role="status" className="info-card">Finish signing in in the Google window. If it’s hidden, check behind this window.</p>
      )}
      {mode !== "reset" && (
        <>
          <button
            className="btn google full"
            disabled={!firebaseReady || busy}
            onClick={() => submit(true)}
          >
            {pendingProvider === "google" ? <LoaderCircle size={18} aria-hidden="true" /> : <span className="google-g" aria-hidden="true">G</span>}
            {pendingProvider === "google" ? "Waiting for Google…" : "Continue with Google"}
          </button>
          <div className="divider">
            <span>or use your email</span>
          </div>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "reset" && (
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={mode === "signup" ? 12 : 1}
              required
              placeholder={
                mode === "signup" ? "At least 12 characters" : "Your password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button
          className="btn primary full"
          type="submit"
          disabled={!firebaseReady || busy || (mode === "signup" && !accepted)}
        >
          {busy
            ? "One moment…"
            : mode === "reset"
              ? "Send recovery link"
              : mode === "signup"
                ? "Create free account"
                : "Log in"}
          <ArrowRight size={18} />
        </button>
      </form>
      {message && (
        <p role="status" className="success-note">
          {message}
        </p>
      )}
      {mode === "login" && (
        <button
          className="text-button center"
          onClick={() => {
            setMode("reset");
            setError("");
          }}
        >
          Forgot your password?
        </button>
      )}
      <p className="auth-switch">
        {mode === "signup" ? "Already have an account?" : "New to AI Space?"}{" "}
        <button
          className="inline-link"
          disabled={busy}
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError("");
            setMessage("");
          }}
        >
          {mode === "signup" ? "Log in" : "Sign up free"}
        </button>
      </p>
      {mode === "reset" && (
        <button className="text-button center" onClick={() => setMode("login")}>
          Back to login
        </button>
      )}
      <button className="btn subtle full" onClick={onPreview}>
        Explore the local preview
        <ArrowRight size={16} />
      </button>
      <p className="fineprint secure">
        <ShieldCheck size={14} />
        Your email stays private. Your curiosity is welcome.
      </p>
    </div>
  );
}

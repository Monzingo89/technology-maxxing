import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Shuffle, Sparkles } from "lucide-react";
import { privacySections, termsSections } from "../content/legal";
import { HOUSES, APTITUDE, PROFESSIONS, saveLocal } from "../content/space";
import { DEFAULT_AVATAR, type AvatarConfig } from "./three/avatar";
import { callAction } from "../services/firebase";
import { setAnalyticsConsent, trackEvent } from "../services/analytics";
const AvatarPreview = lazy(() => import("./AvatarPreview"));
export default function Onboarding({
  preview,
  onComplete,
}: {
  preview: boolean;
  onComplete: (profile: any) => void;
}) {
  const [step, setStep] = useState(0);
  const [house, setHouse] = useState("claude");
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR });
  const [username, setUsername] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [time, setTime] = useState(8000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Style");
  const [analytics, setAnalytics] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const update = (key: keyof AvatarConfig, value: unknown) =>
    setAvatar((a) => ({ ...a, [key]: value }));
  useEffect(() => {
    if (step !== 2 || answers.length >= 12) return;
    const question = answers.length;
    setTime(8000);
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = 8000 - (Date.now() - started);
      setTime(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        setAnswers((a) => a.length === question ? [...a, -1] : a);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [step, answers.length]);
  function answer(value: number) {
    const question = answers.length;
    setAnswers((a) => a.length === question && question < 12 ? [...a, value] : a);
  }
  function profession() {
    const counts = PROFESSIONS.map(
      (_, i) => answers.filter((a) => a === i).length,
    );
    return PROFESSIONS[counts.indexOf(Math.max(...counts))];
  }
  async function finish() {
    if (busy || !accepted) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        username,
        house,
        avatar,
        aptitudeAnswers: answers,
        acceptTerms: true,
        acceptPrivacy: true,
        ageConfirmed: true,
        analyticsConsent: analytics,
      };
      let profile: any;
      if (preview) {
        profile = {
          uid: "preview",
          username: username.toLowerCase(),
          house,
          avatar,
          profession: profession().id,
          preview: true,
          houseChangedAt: Date.now(),
        };
        saveLocal("aispace:preview", profile);
      } else {
        const result = await callAction<{ profile: unknown }>("completeOnboarding", payload);
        profile = result.profile;
      }
      setAnalyticsConsent(analytics);
      trackEvent("onboarding_completed");
      onComplete(profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <div className="stepper">
        {["Your community", "Your agent", "Your calling", "Your name"].map(
          (s, i) => (
            <span key={s} className={i <= step ? "active" : ""}>
              <i>{i < step ? <Check size={12} /> : i + 1}</i>
              <b>{s}</b>
            </span>
          ),
        )}
      </div>
      {preview && (
        <p className="preview-note">
          Local preview · Your agent stays on this device.
        </p>
      )}
      {step === 0 ? (
        <>
          <span className="eyebrow">FIND YOUR PEOPLE</span>
          <h2>
            Different minds.
            <br />
            One shared universe.
          </h2>
          <p>
            Choose the community that feels like you. Explore every space
            together. You can change your community once every 30 days.
          </p>
          <div className="house-choices">
            {HOUSES.map((h) => (
              <button
                key={h.id}
                onClick={() => setHouse(h.id)}
                className={`house-choice ${h.className} ${house === h.id ? "selected" : ""}`}
              >
                <span className="house-mark">{h.mark}</span>
                <div>
                  <strong>{h.name}</strong>
                  <small>{h.tag}</small>
                </div>
                <i>{house === h.id && <Check size={16} />}</i>
              </button>
            ))}
          </div>
          <p className="fineprint">
            Fan communities, independently operated. Your choice doesn’t connect
            an LLM account or share your data with that provider.
          </p>
          <button className="btn primary full" onClick={() => setStep(1)}>
            Create my agent
            <ArrowRight size={18} />
          </button>
        </>
      ) : step === 1 ? (
        <>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h2>Uniquely, wonderfully you.</h2>
          <p>
            Your agent is your presence in AI Space. There’s no right way to
            look.
          </p>
          <div className="builder">
            <div className={`avatar-stage ${house}`}>
              <Suspense
                fallback={
                  <div className="loading">Bringing your agent to life…</div>
                }
              >
                <AvatarPreview config={avatar} house={house} />
              </Suspense>
              <span>
                YOUR AGENT ·{" "}
                {HOUSES.find((h) => h.id === house)?.name.toUpperCase()}
              </span>
            </div>
            <div className="builder-controls">
              <div className="segmented">
                {["Style", "Body", "Face"].map((t) => (
                  <button
                    className={tab === t ? "active" : ""}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Style" ? (
                <>
                  <label>
                    Skin tone
                    <div className="swatches">
                      {[
                        "#f3d2b3",
                        "#dbaf88",
                        "#b88460",
                        "#8b5b43",
                        "#573a30",
                        "#9c6cff",
                      ].map((c) => (
                        <button
                          aria-label={`Skin ${c}`}
                          aria-pressed={avatar.skin === c}
                          key={c}
                          className={avatar.skin === c ? "selected" : ""}
                          style={{ background: c }}
                          onClick={() => update("skin", c)}
                        />
                      ))}
                    </div>
                  </label>
                  <label>
                    Outfit color
                    <div className="swatches">
                      {[
                        "#f2c766",
                        "#7d4dff",
                        "#21113d",
                        "#0b0813",
                        "#ffe3a0",
                        "#9c6cff",
                      ].map((c) => (
                        <button
                          aria-label={`Outfit ${c}`}
                          aria-pressed={avatar.outfit === c}
                          key={c}
                          className={avatar.outfit === c ? "selected" : ""}
                          style={{ background: c }}
                          onClick={() => update("outfit", c)}
                        />
                      ))}
                    </div>
                  </label>
                  <label>
                    Hair style
                    <select
                      aria-label="Hair style"
                      value={avatar.hairStyle}
                      onChange={(e) => update("hairStyle", e.target.value)}
                    >
                      <option value="crop">Classic crop</option>
                      <option value="waves">Soft waves</option>
                      <option value="bun">Top bun</option>
                      <option value="mohawk">Mohawk</option>
                    </select>
                  </label>
                  <label>
                    Hair color
                    <input
                      type="color"
                      value={avatar.hair}
                      onChange={(e) => update("hair", e.target.value)}
                    />
                  </label>
                </>
              ) : tab === "Body" ? (
                <>
                  <label>
                    Presentation
                    <select
                      aria-label="Presentation"
                      value={avatar.presentation}
                      onChange={(e) => update("presentation", e.target.value)}
                    >
                      {["androgynous", "feminine", "masculine"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  {(["height", "weight"] as const).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        aria-label={k}
                        type="range"
                        min="0"
                        max="100"
                        value={avatar[k]}
                        onChange={(e) => update(k, +e.target.value)}
                      />
                    </label>
                  ))}
                  {(
                    [
                      ["body", ["balanced", "athletic", "soft"]],
                      ["legs", ["classic", "long", "robotic"]],
                      ["feet", ["sneakers", "boots", "hover"]],
                    ] as const
                  ).map(([k, opts]) => (
                    <label key={k}>
                      {k}
                      <select
                        aria-label={k}
                        value={avatar[k]}
                        onChange={(e) => update(k, e.target.value)}
                      >
                        {opts.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </>
              ) : (
                <>
                  {(["eyes", "nose", "mouth"] as const).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="range"
                        aria-label={k}
                        min="0"
                        max="100"
                        value={avatar[k]}
                        onChange={(e) => update(k, +e.target.value)}
                      />
                    </label>
                  ))}
                  <p className="fineprint">
                    Little details, a lot of personality.
                  </p>
                </>
              )}
              <button
                className="text-button"
                onClick={() =>
                  setAvatar((a) => ({
                    ...a,
                    height: Math.floor(Math.random() * 100),
                    weight: Math.floor(Math.random() * 100),
                    eyes: Math.floor(Math.random() * 100),
                    hairStyle: ["crop", "waves", "bun", "mohawk"][
                      Math.floor(Math.random() * 4)
                    ] as AvatarConfig["hairStyle"],
                  }))
                }
              >
                <Shuffle size={15} />
                Surprise me
              </button>
            </div>
          </div>
          <div className="row between">
            <button className="btn subtle" onClick={() => setStep(0)}>
              <ArrowLeft size={16} />
              Back
            </button>
            <button className="btn primary" onClick={() => setStep(2)}>
              Find my calling
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : step === 2 ? (
        answers.length < 12 ? (
          <>
            <div className="row between">
              <span className="eyebrow">
                YOUR INSTINCTS · {answers.length + 1} / 12
              </span>
              <span className="timer">{Math.ceil(time / 1000)}s</span>
            </div>
            <h2>{APTITUDE[answers.length]}</h2>
            <p>
              Go with your instinct. This suggests a learning path, not a
              real-world qualification.
            </p>
            <div className="aptitude-choices">
              {PROFESSIONS.map((p, i) => (
                <button key={p.id} onClick={() => answer(i)}>
                  {p.verb}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => answer(-1)}
            >
              Skip this question
            </button>
          </>
        ) : (
          <>
            <div className="large-symbol lime">
              <Sparkles />
            </div>
            <span className="eyebrow">YOUR FIRST CHAPTER</span>
            <h2>Hello, {profession().name.toLowerCase()}.</h2>
            <p>
              Your answers suggest an interest in{" "}
              {profession().name.toLowerCase()} skills. Your path can evolve:
              visit the School, complete a new course, and change your practice.
            </p>
            <div className="info-card">
              This is a playful starting point, not an intelligence, career, or
              aptitude diagnosis.
            </div>
            <button className="btn primary full" onClick={() => setStep(3)}>
              Give my agent a name
              <ArrowRight size={16} />
            </button>
          </>
        )
      ) : (
        <>
          <span className="eyebrow">ONE LAST LITTLE THING</span>
          <h2>What should we call you?</h2>
          <p>A unique name for your place in the universe.</p>
          <label>
            Username
            <div className="username-field">
              <span>@</span>
              <input
                aria-label="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="curious_cosmonaut"
                pattern="[a-z0-9_]{3,20}"
                maxLength={20}
              />
            </div>
          </label>
          <p className="fineprint">
            3–20 lowercase letters, numbers, or underscores.{" "}
            {preview
              ? "Preview names are not reserved globally."
              : "Your name is reserved securely when you finish."}
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I am 18 or older and agree to the Terms and Privacy Policy below.
          </label>
          <details className="policy-disclosure">
            <summary>Read Terms and Privacy Policy</summary>
            <div className="inline-legal">
              {[...termsSections, ...privacySections].map((s, i) => (
                <section key={i}>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </section>
              ))}
            </div>
          </details>
          <label className="check-label">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Optional: share limited usage signals to improve AI Space.
          </label>
          <button
            className="btn primary full"
            disabled={busy || !accepted || !/^[a-z0-9_]{3,20}$/.test(username)}
            onClick={finish}
          >
            {busy ? "Creating your space…" : "Enter AI Space"}
            <ArrowRight size={18} />
          </button>
          {error && (
            <p className="error-note" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

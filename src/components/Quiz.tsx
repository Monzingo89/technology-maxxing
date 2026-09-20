import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Sparkles, Trophy } from "lucide-react";
import { PRACTICE, CATEGORIES, saveLocal, readLocal } from "../content/space";
import { callAction } from "../services/firebase";
import { trackEvent } from "../services/analytics";
type Question = {
  nonce: string;
  prompt: string;
  options: { token: string; text: string }[];
  deadline: number;
  number: number;
  total: number;
};
export default function Quiz({
  ranked,
  category,
  onClose,
}: {
  ranked: boolean;
  category: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"ready" | "playing" | "done">("ready");
  const [q, setQ] = useState<Question | null>(null);
  const [session, setSession] = useState("");
  const [remaining, setRemaining] = useState(5000);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [relaxed, setRelaxed] = useState(false);
  const lock = useRef(false);
  const offset = useRef(0);
  const startTime = useRef(0);
  function localQuestion(i: number): Question {
    return {
      nonce: String(i),
      prompt: PRACTICE[i].prompt,
      options: PRACTICE[i].options.map((text, j) => ({
        text,
        token: String(j),
      })),
      number: i + 1,
      total: 5,
      deadline: Date.now() + (relaxed ? 60000 : 5000),
    };
  }
  async function start() {
    setBusy(true);
    setError("");
    try {
      if (ranked) {
        const r: any = await callAction("startDailyQuiz", { category });
        offset.current = r.serverNow - Date.now();
        setSource(r.source);
        setSession(r.sessionId);
        if (r.complete) {
          setResult(r.result);
          setStage("done");
          return;
        }
        setQ(r.question);
      } else setQ(localQuestion(0));
      startTime.current = Date.now();
      setStage("playing");
      trackEvent("quiz_started", { category });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answer(token: string | null) {
    if (!q || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (ranked) {
        const r: any = await callAction("answerDailyQuiz", {
          sessionId: session,
          nonce: q.nonce,
          optionToken: token,
        });
        if (r.serverNow) offset.current = r.serverNow - Date.now();
        if (r.complete) {
          setResult(r.result);
          setStage("done");
          trackEvent("quiz_completed", { category });
        } else setQ(r.question);
      } else {
        const correct =
          token === String(PRACTICE[q.number - 1].answer) &&
          Date.now() <= q.deadline;
        const nextScore = score + (correct ? 1 : 0);
        setScore(nextScore);
        if (q.number === 5) {
          setStage("done");
          saveLocal("aispace:practice", {
            score: nextScore,
            date: new Date().toISOString(),
          });
          trackEvent("quiz_completed", { category });
        } else setQ(localQuestion(q.number));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    if (stage !== "playing" || !q) return;
    const tick = () => {
      const left = Math.max(0, q.deadline - Date.now() - offset.current);
      setRemaining(left);
      if (left === 0 && !lock.current && !error) void answerRef.current(null);
    };
    tick();
    const t = setInterval(tick, 50);
    const onHide = () => {
      if (document.hidden && ranked && !lock.current)
        void answerRef.current(null);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [stage, q, error, ranked]);
  return (
    <div className="quiz-content">
      {stage === "ready" ? (
        <>
          <div className="large-symbol lime">
            <Sparkles />
          </div>
          <span className="eyebrow">
            {ranked ? "TODAY’S RANKED CHALLENGE" : "UNRANKED PRACTICE"}
          </span>
          <h2>
            Small challenge.
            <br />
            Big brain energy.
          </h2>
          <p>
            Five questions. Five seconds each. A little more knowledge than you
            came with.
          </p>
          <div className="quiz-rules">
            <span>
              <Clock3 size={18} />5 seconds per question
            </span>
            <span>
              <Trophy size={18} />
              {ranked
                ? "One ranked attempt per UTC day"
                : "Practice freely, at your pace"}
            </span>
            <span>
              <Check size={18} />
              {ranked
                ? "Answers and scoring checked by the server"
                : "Results stay on this device"}
            </span>
          </div>
          {!ranked && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={relaxed}
                onChange={(e) => setRelaxed(e.target.checked)}
              />
              Relaxed mode · 60 seconds per question
            </label>
          )}
          {ranked && (
            <p className="fineprint">
              Stay in this tab. Leaving submits the current question unanswered.
              A started attempt counts for today, even if you leave.
            </p>
          )}
          <button className="btn primary full" disabled={busy} onClick={start}>
            {busy ? "Preparing your challenge…" : "Let’s do this"}
            <ArrowRight size={18} />
          </button>
        </>
      ) : stage === "playing" && q ? (
        <>
          <div className="row between">
            <span className="eyebrow">
              QUESTION {q.number} / {q.total}
            </span>
            <span className={`timer ${remaining < 2000 ? "urgent" : ""}`}>
              <Clock3 size={16} />
              {(remaining / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="timer-track">
            <div
              style={{
                width: `${remaining / (relaxed && !ranked ? 600 : 50)}%`,
              }}
            />
          </div>
          <h2>{q.prompt}</h2>
          <div className="answers">
            {q.options.map((a, i) => (
              <button
                className="answer"
                key={a.token}
                disabled={busy || remaining === 0}
                onClick={() => answer(a.token)}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {a.text}
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
          {ranked && (
            <p className="fineprint">
              {source === "ai-generated-reviewed"
                ? "AI-authored · reviewed before play"
                : "Reviewed starter questions"}
            </p>
          )}
          <p className="fineprint">
            {busy
              ? "Locking in your answer…"
              : ranked
                ? "Your first answer is final."
                : "Learning beats perfection."}
          </p>
        </>
      ) : (
        <>
          <div className="large-symbol lime">
            <Trophy />
          </div>
          <span className="eyebrow">A LITTLE BETTER EVERY DAY</span>
          <h2>
            {ranked
              ? "Challenge complete!"
              : `${score} out of 5. Nicely explored.`}
          </h2>
          <p>
            {ranked
              ? `Your ${CATEGORIES.find((c) => c.id === category)?.name} result has been recorded.`
              : "This was a practice round. Your global ranking is unchanged."}
          </p>
          {ranked && result && (
            <div className="score-card">
              <strong>
                {result.dailyCorrect ??
                  result.correct ??
                  result.score ??
                  "Complete"}
              </strong>
              <span>
                Correct answers ·{" "}
                {result.elo
                  ? `${result.elo} Elo`
                  : "view your ranking on the leaderboard"}
              </span>
            </div>
          )}
          {!ranked && (
            <div className="review-list">
              {PRACTICE.map((x) => (
                <p key={x.prompt}>
                  <strong>{x.options[x.answer]}</strong>
                  <br />
                  {x.explanation}
                </p>
              ))}
            </div>
          )}
          <button className="btn primary full" onClick={onClose}>
            Keep exploring
            <ArrowRight size={18} />
          </button>
        </>
      )}
      {error && (
        <div role="alert" className="error-note">
          {error}
          {stage === "playing" && (
            <button className="text-button" onClick={() => answer(null)}>
              Retry submitting
            </button>
          )}
        </div>
      )}
    </div>
  );
}

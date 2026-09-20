import { useEffect, useState } from "react";
import { Check, RefreshCw, ShieldCheck, X } from "lucide-react";
import { callAction } from "../services/firebase";
export default function Operations() {
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState(
    new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  );
  async function load() {
    setBusy(true);
    setError("");
    try {
      setData(await callAction("operationsOverview"));
      const r: any = await callAction("reviewMetrics", { day });
      setMetrics(r.recommendations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function run(name: string, payload: any) {
    setBusy(true);
    setError("");
    try {
      await callAction(name, payload);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="operations">
      <div className="large-symbol lime">
        <ShieldCheck />
      </div>
      <span className="eyebrow">MODERATOR WORKSPACE</span>
      <h2>A healthy space, by design.</h2>
      <p>
        Review community content, question accuracy, and observed learning
        patterns. All actions require a server-verified moderator account.
      </p>
      <div className="row between">
        <label>
          Review date
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button className="btn outline" disabled={busy} onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <h3>Behavior and improvement review</h3>
      {metrics.length ? (
        metrics.map((m, i) => (
          <article className="info-card" key={i}>
            <strong>{m.destination}</strong>
            <p>
              {m.views} opens · {m.observedReturns} observed returns ·{" "}
              {m.completions} completions
            </p>
            <p>{m.reason}</p>
            <span className="pill">{m.action}</span>
          </article>
        ))
      ) : (
        <p className="info-card">
          No aggregate events for this date. Only consented events are counted;
          no action is inferred from missing observations.
        </p>
      )}
      <h3>Prompts awaiting review</h3>
      {data?.gallery?.length ? (
        data.gallery.map((p: any) => (
          <article className="info-card" key={p.id}>
            <strong>
              {p.title} · @{p.username}
            </strong>
            <p>{p.prompt}</p>
            <div className="row">
              <button
                className="btn primary small"
                disabled={busy}
                onClick={() =>
                  run("moderateGallery", { postId: p.id, status: "published" })
                }
              >
                <Check size={14} />
                Publish
              </button>
              <button
                className="btn outline small"
                disabled={busy}
                onClick={() =>
                  run("moderateGallery", { postId: p.id, status: "rejected" })
                }
              >
                <X size={14} />
                Reject
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="fineprint">No pending prompts.</p>
      )}
      <h3>AI-authored quiz drafts</h3>
      {data?.banks?.length ? (
        data.banks.map((b: any) => (
          <article className="info-card" key={b.id}>
            <strong>
              {b.day} · {b.model}
            </strong>
            <details>
              <summary>Review all 25 questions and evidence</summary>
              {b.questions.map((q: any, i: number) => (
                <section className="review-question" key={i}>
                  <strong>
                    {q.category}: {q.prompt}
                  </strong>
                  <ol>
                    {q.options.map((o: string, j: number) => (
                      <li key={j}>
                        {o}
                        {j === q.answer ? " ✓" : ""}
                      </li>
                    ))}
                  </ol>
                  <p>
                    Evidence ({q.sourceId}): {q.evidence}
                  </p>
                </section>
              ))}
            </details>
            <button
              className="btn primary small"
              disabled={busy}
              onClick={() => run("approveDailyBank", { day: b.day })}
            >
              Approve reviewed bank
            </button>
          </article>
        ))
      ) : (
        <p className="fineprint">
          No AI drafts awaiting review. The reviewed seed bank is used when
          authoring is disabled or a draft is unapproved.
        </p>
      )}
      <h3>Community reports</h3>
      {data?.reports?.length ? (
        data.reports.map((r: any) => (
          <article className="info-card" key={r.id}>
            <strong>{r.reason}</strong>
            <p>{r.postId ? `Post: ${r.postId}` : `Agent: ${r.targetUid}`}</p>
            <button
              className="btn outline small"
              disabled={busy}
              onClick={() => run("resolveReport", { reportId: r.id })}
            >
              Mark reviewed
            </button>
          </article>
        ))
      ) : (
        <p className="fineprint">No open reports.</p>
      )}
      <p className="fineprint">
        Showing up to 50 pending records per queue. Account enforcement and
        appeals require an operating moderation process. Aggregate signals
        propose review; they never delete catalog entries automatically.
      </p>
    </div>
  );
}

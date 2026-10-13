import { useState } from "react";
import { benchmarks } from "./benchmarkData";
import "./workbench.css";
export default function Benchmarks() {
  const [area, setArea] = useState("All");
  const [id, setId] = useState(benchmarks[0].id);
  const [access, setAccess] = useState("All");
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(0);
  const [cohort, setCohort] = useState("All");
  const available = benchmarks.filter((b) => area === "All" || b.area === area);
  const benchmark = available.find((b) => b.id === id) || available[0];
  const results = benchmark.results
    .filter(
      (r) =>
        (access === "All" || r.access === access) &&
        (cohort === "All" || r.cohort === cohort) &&
        r.model.toLowerCase().includes(query.toLowerCase()) &&
        r.score >= minimum,
    )
    .sort((a, b) => b.score - a.score);
  return (
    <section
      className="workbench benchmark-explorer"
      aria-label="Benchmark explorer"
    >
      <p className="wb-kicker">SOURCE-BACKED COMPARISONS</p>
      <h1>Top Benchmarks</h1>
      <p>
        Find strong results for your task. These are dated evidence
        snapshots—not a live or exhaustive leaderboard. Higher is better within
        the selected metric; scores from different benchmarks are not
        interchangeable.
      </p>
      <div className="benchmark-filters">
        <label>
          Area
          <select
            aria-label="Area"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setCohort("All");
            }}
          >
            {["All", "Coding", "Research", "Math", "Knowledge"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Benchmark
          <select
            aria-label="Benchmark"
            value={benchmark.id}
            onChange={(e) => {
              setId(e.target.value);
              setCohort("All");
            }}
          >
            {available.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name} · {b.results[0].date}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="model-methodology">
        <summary>Filter models & scores</summary>
        <div className="benchmark-filters">
          <label>
            Model access
            <select
              aria-label="Model access"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
            >
              {["All", "Open weights", "Hosted"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Report / configuration group
            <select
              aria-label="Report / configuration group"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
            >
              {["All", ...new Set(benchmark.results.map((r) => r.cohort))].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Find a model
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Model name"
            />
          </label>
          <label>
            Minimum score: {minimum}%
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minimum}
              onChange={(e) => setMinimum(Number(e.target.value))}
            />
          </label>
        </div>
      </details>
      <button
        className="benchmark-reset"
        onClick={() => {
          setArea("All");
          setId(benchmarks[0].id);
          setAccess("All");
          setCohort("All");
          setQuery("");
          setMinimum(0);
        }}
      >
        Reset filters
      </button>
      <h2>{benchmark.name}</h2>
      <p>{benchmark.description}</p>
      <p role="status">
        {results.length} results · {benchmark.metric} · full 0–100 scale
      </p>
      <details className="model-methodology">
        <summary>How to compare scores fairly</summary>
        <p>
          Publisher reports may use different prompts, token budgets, tools or
          task exclusions. GPU, OS and quantization comparisons need
          measurements not available in these reports. Missing measurements are
          not zero scores.
        </p>
      </details>
      <ol className="benchmark-bars" aria-label={`${benchmark.name} scores`}>
        {results.map((r) => (
          <li key={`${r.model}-${r.date}`}>
            <div className="benchmark-label">
              <strong>{r.model}</strong>
              <span>{r.score.toFixed(1)}%</span>
            </div>
            <div className="benchmark-track" aria-hidden="true">
              <div style={{ width: `${r.score}%` }} />
            </div>
            <small>
              {r.access} · Report: {r.date}
            </small>
            <details>
              <summary>Test conditions & source</summary>
              <p>{r.config}</p>
              <a href={r.source} target="_blank" rel="noopener noreferrer">
                Read the published result ↗
              </a>
            </details>
          </li>
        ))}
      </ol>
      {!results.length && (
        <p>
          No results match these filters. Try a lower minimum or reset the
          filters.
        </p>
      )}
    </section>
  );
}

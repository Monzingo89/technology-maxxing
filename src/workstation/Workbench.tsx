import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Layers,
  Monitor,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import chatgpt from "../../data/chatgpt-integrations.json";
import claude from "../../data/claude-integrations.json";
import openModels from "../../data/open-models.json";
import frontier from "../../data/frontier-models.json";
import { hardware, money, amazonSearch } from "./hardware";
import { planBuild, type BuildPlan, type Preferences } from "./planner";
import "./workbench.css";
import CategoryPicks from "./CategoryPicks";
import { learningLogin } from "../services/learningGate";
const DeskScene = lazy(() => import("./DeskScene"));
type Pane =
  "build" | "models" | "integrations" | "hardware" | "guide" | "picks";
type Model = {
  priceNote?: string;
  priceSource?: string;
  launchSource?: string;
  id: string;
  name: string;
  provider: string;
  description: string;
  source: string;
  verifiedAt: string;
  snapshots: string[];
  reasoning: string[];
  inputModalities: string[];
  outputModalities: string[];
  context: number | null;
  input: number | null;
  output: number | null;
  cached: number | null;
  releaseDate: string | null;
  launchInput: number | null;
  launchOutput: number | null;
  benchmark: {
    name: string;
    score: number;
    unit: string;
    config: string;
    date: string;
    source: string;
  }[];
  deployment: string;
  status: string;
};
const models = (frontier as Model[]).sort((a, b) => {
  const featured = [
    "gpt-6-astra",
    "gpt-6.1-sol",
    "claude-opus-5-5",
    "claude-fable-5-1",
    "gemini-3.8-flash",
    "grok-4.7",
  ];
  return (
    (featured.includes(a.id) ? featured.indexOf(a.id) : 99) -
    (featured.includes(b.id) ? featured.indexOf(b.id) : 99)
  );
});
const slug = (id: string) =>
  "ai_" +
  id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_$/, "");
const external = { target: "_blank", rel: "noopener noreferrer" };
const rate = (v: number | null) =>
  v === null
    ? "Not verified"
    : `$${v.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
const starters = [
  "Refactor a large codebase locally on Windows with Open WebUI",
  "Run a 70B model with image, video and audio tools on a Mac",
  "Build a private, affordable 8B assistant for my documents",
];
export default function Workbench({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  const learnLink = (id: string) =>
    signedIn ? `learn/${slug(id)}/` : learningLogin(`learn/${slug(id)}/`);
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const [pane, setPane] = useState<Pane>(
    params.has("compare") ? "hardware" : "build",
  );
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [limit, setLimit] = useState(24);
  const [prefs, setPrefs] = useState<Preferences>({
    os: "auto",
    bits: 4,
    context: 8192,
    budget: 5000,
    local: true,
  });
  const editor = useRef<HTMLDivElement>(null);
  const [task, setTask] = useState("");
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [stage, setStage] = useState(0);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Model | null>(null);
  const [cart, setCart] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [compare, setCompare] = useState(params.get("compare") || "rtx5090");
  const [against, setAgainst] = useState(params.get("with") || "m5max");
  const [effort, setEffort] = useState("low");
  const [speed, setSpeed] = useState("Standard");
  const [inputTokens, setInputTokens] = useState(10000);
  const [outputTokens, setOutputTokens] = useState(2000);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => {
    if (pane === "build" && editor.current) editor.current.innerText = task;
  }, [pane]);
  useEffect(() => {
    setLimit(24);
  }, [query, family, pane]);
  useEffect(() => {
    if (detail || cart) dialog.current?.showModal();
    else dialog.current?.close();
  }, [detail, cart]);
  const switchPane = (next: Pane) => {
    setPane(next);
    setQuery("");
    setFamily("all");
  };
  function fill(value: string) {
    setTask(value);
    if (editor.current) editor.current.innerText = value;
  }
  function build() {
    const value = editor.current?.innerText.trim() || task.trim();
    if (!value) {
      setError("Describe what you want to do first.");
      editor.current?.focus();
      return;
    }
    if (value.length > 4000) {
      setError("Keep your brief under 4,000 characters.");
      return;
    }
    clearInterval(timer.current);
    setError("");
    try {
      setPlan(planBuild(value, prefs));
    } catch {
      setError("Check your budget and memory settings.");
      return;
    }
    setStage(0);
    setBuilding(true);
    let next = 0;
    timer.current = setInterval(
      () => {
        next++;
        setStage(next);
        if (next === 5) {
          clearInterval(timer.current);
          setBuilding(false);
        }
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 550,
    );
  }
  const integrations = useMemo(
    () => [
      ...chatgpt.map((x) => ({
        ...x,
        platform: "ChatGPT",
        kind: "plugin",
        popularity: null as number | null,
      })),
      ...claude.map((x) => ({ ...x, platform: "Claude" })),
    ],
    [],
  );
  const matchedIntegrations = integrations.filter(
    (x) =>
      (family === "all" || x.platform === family) &&
      `${x.name} ${x.description} ${x.kind}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const matchedModels = models.filter(
    (x) =>
      (family === "all" || family === "frontier" || x.provider === family) &&
      `${x.name} ${x.id} ${x.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const matchedOpen = openModels.filter((x) =>
    `${x.name} ${x.publisher} ${x.task}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plan?.prompt || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard unavailable. Select and copy the prompt below.");
    }
  };
  const selected = [
    hardware.find((h) => h.id === compare)!,
    hardware.find((h) => h.id === against)!,
  ].filter(Boolean);
  const [sceneSelection, setSceneSelection] = useState("");
  return (
    <section className="workbench">
      <div className="wb-topline">
        <span>
          <span className="wb-dot" /> THE AI WORKBENCH
        </span>
        <span>Explore. Configure. Make it real.</span>
      </div>
      <nav className="wb-nav" aria-label="Workbench sections">
        {(
          [
            ["build", "Build a workstation", Box],
            ["models", "Model atlas", Sparkles],
            ["picks", "Top 10 by category", Layers],
            ["integrations", "Plugins & skills", Layers],
            ["hardware", "Hardware lab", Cpu],
            ["guide", "Field guide", Monitor],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            className={pane === id ? "selected" : ""}
            onClick={() => switchPane(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      {pane === "build" && (
        <>
          <div className="wb-heading">
            <div>
              <p className="wb-kicker">FROM AN IDEA TO YOUR DESK</p>
              <h1>
                What will you
                <br />
                <em>build next?</em>
              </h1>
              <p>
                Your models. Your tools. A workspace that fits.
                <br />
                Describe the work, then explore the machine behind it.
              </p>
            </div>
            <div className="wb-step-label">
              <span>01 — 05</span>
              <span>AN INTERACTIVE BUILD STUDY</span>
            </div>
          </div>
          <div className="wb-build-grid">
            <div className="wb-brief">
              <label id="brief-label">I want to…</label>
              <div className="wb-format" aria-label="Brief formatting">
                <button
                  aria-label="Bold text"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => document.execCommand("bold")}
                >
                  B
                </button>
                <button
                  aria-label="Italic text"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => document.execCommand("italic")}
                >
                  <i>I</i>
                </button>
                <button
                  aria-label="Bullet list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => document.execCommand("insertUnorderedList")}
                >
                  ≡
                </button>
                <span>A few sentences is enough</span>
              </div>
              <div
                ref={editor}
                className="wb-editor"
                contentEditable
                role="textbox"
                aria-labelledby="brief-label"
                aria-multiline="true"
                data-placeholder="Run a 70B model privately, connect Open WebUI, and build agents that help me code…"
                onInput={(e) => setTask(e.currentTarget.innerText)}
                onPaste={(e) => {
                  e.preventDefault();
                  document.execCommand(
                    "insertText",
                    false,
                    e.clipboardData.getData("text/plain"),
                  );
                }}
              />
              <div className="wb-presets">
                {starters.map((s, i) => (
                  <button key={s} onClick={() => fill(s)}>
                    {["Code locally", "70B + media", "Private assistant"][i]}{" "}
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
              <div className="wb-options">
                <label>
                  Operating system
                  <select
                    value={prefs.os}
                    onChange={(e) => setPrefs({ ...prefs, os: e.target.value })}
                  >
                    {["auto", "macOS", "Linux", "Windows / WSL2"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantization
                  <select
                    value={prefs.bits}
                    onChange={(e) =>
                      setPrefs({ ...prefs, bits: +e.target.value })
                    }
                  >
                    {[4, 5, 8, 16].map((n) => (
                      <option key={n} value={n}>
                        {n}-bit
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Context
                  <select
                    value={prefs.context}
                    onChange={(e) =>
                      setPrefs({ ...prefs, context: +e.target.value })
                    }
                  >
                    {[8192, 32768, 131072].map((n) => (
                      <option key={n} value={n}>
                        {n.toLocaleString()} tokens
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget (USD)
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    value={prefs.budget}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        budget: Math.max(0, +e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className="wb-toggle">
                <input
                  type="checkbox"
                  checked={prefs.local}
                  onChange={(e) =>
                    setPrefs({ ...prefs, local: e.target.checked })
                  }
                />{" "}
                Keep model inference on my computer
              </label>
              <button
                className="wb-build-button"
                onClick={build}
                disabled={building}
              >
                {building ? "Assembling your proposal…" : "Build"}{" "}
                <ArrowUpRight size={20} />
              </button>
              <small>
                Runs in your browser. Your brief is not sent to a model
                provider.
              </small>
              {error && (
                <p role="alert" className="wb-warning">
                  {error}
                </p>
              )}
            </div>
            <div className="wb-stage">
              <div className="wb-stage-top">
                <span>{plan ? plan.os : "YOUR FUTURE WORKSPACE"}</span>
                <span className="wb-live">
                  {building
                    ? "ASSEMBLING"
                    : plan
                      ? "BUILD STUDY"
                      : "3D PREVIEW"}
                </span>
              </div>
              <Suspense
                fallback={
                  <div className="desk-scene wb-scene-loading">
                    Preparing the desk…
                  </div>
                }
              >
                <DeskScene
                  stage={plan ? stage : 5}
                  mac={plan?.accelerator.kind === "mac"}
                  desktop={plan?.accelerator.id.includes("ultra")}
                  cloud={!!plan && !plan.local}
                  office={!!plan && /agent/i.test(plan.task)}
                  onSelect={setSceneSelection}
                />
              </Suspense>
              <div className="wb-stage-bottom">
                <span>
                  {sceneSelection
                    ? `Selected: ${sceneSelection}. Explore the parts below.`
                    : "Drag to orbit · Scroll to zoom · Tap a component"}
                </span>
                <span>↗</span>
              </div>
              {plan?.local &&
                ["gpu", "computer", "laptop", "studio"].includes(
                  sceneSelection,
                ) && (
                  <div className="wb-note" aria-live="polite">
                    <strong>{plan.accelerator.name}</strong>
                    <p>
                      {plan.accelerator.priceKind}:{" "}
                      {money(plan.accelerator.price)}
                    </p>
                    <div className="wb-links">
                      <a href={plan.accelerator.source} {...external}>
                        Manufacturer / configuration ↗
                      </a>
                      <a
                        href={amazonSearch(plan.accelerator.name)}
                        {...external}
                      >
                        Find on Amazon ↗
                      </a>
                      <a
                        href={`#builder?compare=${plan.accelerator.id}&with=${plan.accelerator.kind === "mac" ? "rtxpro6000" : "m5max"}`}
                        {...external}
                      >
                        Compare this component ↗
                      </a>
                    </div>
                  </div>
                )}
              <div className="wb-progress">
                <div
                  role="progressbar"
                  aria-label="Build assembly"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={stage * 20}
                >
                  <span style={{ width: `${stage * 20}%` }} />
                </div>
                <p role="status">
                  {building
                    ? plan?.steps[Math.min(stage, 4)]
                    : plan
                      ? "Your build proposal is ready"
                      : "A little space for a big idea."}
                  <b>{plan ? `${stage * 20}%` : "01"}</b>
                </p>
              </div>
            </div>
          </div>
          {plan && !building && (
            <div className="wb-results">
              <div className="wb-result-heading">
                <div>
                  <p className="wb-kicker">YOUR BUILD PROPOSAL</p>
                  <h2>{plan.model}</h2>
                  <p>{plan.runtime}</p>
                </div>
                <div>
                  <strong>
                    {!plan.completePrice && plan.estimated === 0
                      ? "Quote required"
                      : money(plan.estimated)}
                  </strong>
                  <small>
                    {plan.completePrice
                      ? "Estimated component subtotal"
                      : "Partial planning estimate · additional quotes required"}
                  </small>
                </div>
              </div>
              <div className="wb-metrics">
                <div>
                  <span>Raw model weights</span>
                  <b>{plan.weights.toFixed(1)} GB</b>
                </div>
                <div>
                  <span>Estimated working memory</span>
                  <b>{plan.memory} GB</b>
                </div>
                <div>
                  <span>Selected device capacity</span>
                  <b>
                    {plan.local
                      ? `${plan.accelerator.memory} GB`
                      : "Not required"}
                  </b>
                </div>
                <div>
                  <span>Operating system</span>
                  <b>{plan.os}</b>
                </div>
              </div>
              {plan.budgetExceeded && (
                <p className="wb-warning">
                  The planning estimate exceeds your budget. Try a smaller local
                  model or hosted inference.
                </p>
              )}
              <div className="wb-parts">
                {plan.parts.map((p, i) => (
                  <article key={p.name}>
                    <span className="wb-part-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <small>{p.category}</small>
                      <h3>{p.name}</h3>
                      <p>{p.note}</p>
                      <div className="wb-links">
                        <a href={p.url} {...external}>
                          Source / configure <ArrowUpRight size={13} />
                        </a>
                        {p.price !== 0 && (
                          <a href={amazonSearch(p.name)} {...external}>
                            Find on Amazon <ArrowUpRight size={13} />
                          </a>
                        )}
                        {i === 0 && plan.local && (
                          <a
                            href={`#builder?compare=${plan.accelerator.id}&with=${plan.accelerator.kind === "mac" ? "rtxpro6000" : "m5max"}`}
                            {...external}
                          >
                            Compare tradeoffs <ArrowUpRight size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                    <strong>{money(p.price)}</strong>
                  </article>
                ))}
              </div>
              <div className="wb-actions">
                <button className="wb-primary" onClick={() => setCart(true)}>
                  <ShoppingBag size={17} /> Review entire workstation
                </button>
                <button
                  onClick={() => {
                    const b = new Blob([JSON.stringify(plan, null, 2)], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(b);
                    a.download = "my-workstation.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                  }}
                >
                  Export build
                </button>
              </div>
              <details className="wb-notes" open>
                <summary>Why this configuration?</summary>
                {plan.notes.map((n) => (
                  <p key={n}>{n}</p>
                ))}
              </details>
              <div className="wb-prompt">
                <div>
                  <h3>A focused prompt for your agent</h3>
                  <button onClick={copy}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre>{plan.prompt}</pre>
              </div>
              {/agent/i.test(plan.task) && (
                <aside className="wb-note">
                  <h3>Your agent office</h3>
                  <p>
                    The three desk agents visualize planner → implementer →
                    reviewer roles. This is a build preview, not running agents.
                    To execute work, connect a local agent runtime with a
                    project folder, approved tools, event logs and cancellation.
                    The website never receives unrestricted computer access.
                  </p>
                </aside>
              )}
            </div>
          )}
        </>
      )}
      {pane !== "build" && (
        <div className="wb-catalog-heading">
          <p className="wb-kicker">THE CONNECTED KNOWLEDGE LIBRARY</p>
          <h1>
            {pane === "models"
              ? "Find your intelligence."
              : pane === "integrations"
                ? "Give your AI new skills."
                : pane === "hardware"
                  ? "Know your compute."
                  : "A better way to build."}
          </h1>
          <p>
            {pane === "models"
              ? "Versioned models, sourced prices, local alternatives, and honest unknowns."
              : pane === "integrations"
                ? "100 ChatGPT integrations and 100 Claude connectors and plugins. Explore capabilities, sources and relationships."
                : pane === "hardware"
                  ? "Memory, software support, power and price — the tradeoffs that actually matter."
                  : "Practical configurations and prompts, without treating benchmarks as universal winners."}
          </p>
        </div>
      )}
      {(pane === "models" || pane === "integrations") && (
        <div className="wb-search">
          <Search size={18} />
          <input
            aria-label="Search workbench catalog"
            placeholder="Search names, capabilities, or tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter catalog"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            {(pane === "models"
              ? [
                  "all",
                  "OpenAI",
                  "Anthropic",
                  "Google",
                  "xAI",
                  "DeepSeek",
                  "open",
                ]
              : ["all", "ChatGPT", "Claude"]
            ).map((x) => (
              <option value={x} key={x}>
                {x === "all"
                  ? "All"
                  : x === "open"
                    ? "Open / specialist models"
                    : x}
              </option>
            ))}
          </select>
        </div>
      )}
      {pane === "integrations" && (
        <>
          <p className="wb-catalog-note">
            ChatGPT: curated from its current plugin directory; no public
            popularity ranking supplied. Claude: directory popularity scores
            plus featured plugins; metrics differ and are not cross-platform
            rankings. Shared products retain separate platform records.
          </p>
          <div className="wb-cards">
            {matchedIntegrations.slice(0, limit).map((x) => (
              <article key={x.id}>
                <span className="wb-tag">
                  {x.platform} · {x.kind}
                </span>
                <h3>{x.name}</h3>
                <p>{x.description}</p>
                <div className="wb-card-footer">
                  <a href={learnLink(x.id)}>Learn & connect</a>
                  <a
                    href={x.source}
                    {...external}
                    aria-label={`Official source for ${x.name}`}
                  >
                    <ArrowUpRight size={18} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <CatalogMore
            total={matchedIntegrations.length}
            limit={limit}
            more={() => setLimit(limit + 24)}
          />
        </>
      )}
      {pane === "models" && (
        <>
          <p className="wb-catalog-note">
            API prices are USD per million tokens, checked on the record’s date.
            Unverified launch prices, dates and benchmark scores are explicitly
            unavailable. This is a sourced catalog, not an exhaustive claim
            about every private model or variant.
          </p>
          {family !== "open" && (
            <details className="wb-note">
              <summary>
                Historical benchmark evidence · not a universal leaderboard
              </summary>
              <p>
                Only recorded observations are shown. Scores from different
                tests, harnesses, effort levels and dates must not be ranked
                together.
              </p>
              {matchedModels
                .flatMap((m) =>
                  m.benchmark.map((b) => ({ ...b, model: m.name, id: m.id })),
                )
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((b) => (
                  <article key={`${b.id}-${b.name}-${b.date}`}>
                    <h3>
                      {b.date} · {b.model}
                    </h3>
                    <p>
                      <strong>
                        {b.name}: {b.score}
                        {b.unit}
                      </strong>{" "}
                      — {b.config}
                    </p>
                    <a href={b.source} {...external}>
                      Original evaluation evidence ↗
                    </a>
                  </article>
                ))}
              {!matchedModels.some((m) => m.benchmark.length) && (
                <p>No verified observations for this selection.</p>
              )}
            </details>
          )}
          {family !== "open" && (
            <div className="wb-cards">
              {matchedModels.slice(0, limit).map((m) => (
                <article key={m.id}>
                  <span className="wb-tag">
                    {m.provider} · {m.deployment}
                  </span>
                  <h3>{m.name}</h3>
                  <p>{m.description}</p>
                  <div className="wb-rate">
                    <span>
                      Input <b>{rate(m.input)}</b>
                    </span>
                    <span>
                      Output <b>{rate(m.output)}</b>
                    </span>
                  </div>
                  <div className="wb-card-footer">
                    <button
                      onClick={() => {
                        setDetail(m);
                        setEffort(m.reasoning[0] || "default");
                        setSpeed("Standard");
                      }}
                    >
                      Versions & evidence <ChevronRight size={14} />
                    </button>
                    <a href={learnLink(m.id)} aria-label={`Learn ${m.name}`}>
                      <ArrowUpRight size={18} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
          {family === "open" && (
            <>
              <p className="wb-catalog-note">
                100 downloadable models selected by Hugging Face downloads
                within 11 task categories. Downloads are a popularity proxy, not
                quality or proof of suitability. Some were frontier models at
                release; “open / specialist” is a deployment grouping.
              </p>
              <div className="wb-cards">
                {matchedOpen.slice(0, limit).map((m) => (
                  <article key={m.id}>
                    <span className="wb-tag">{m.task}</span>
                    <h3>{m.name}</h3>
                    <p>{m.description}</p>
                    <small>
                      {m.publisher} · {m.downloads.toLocaleString()} downloads ·{" "}
                      {m.license}
                    </small>
                    <div className="wb-card-footer">
                      <a href={learnLink(m.id)}>Learn & connect</a>
                      <a href={m.source} {...external}>
                        Model card ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <CatalogMore
            total={
              family === "open" ? matchedOpen.length : matchedModels.length
            }
            limit={limit}
            more={() => setLimit(limit + 24)}
          />
        </>
      )}
      {pane === "hardware" && (
        <>
          <div className="wb-comparison-select">
            <label>
              Compare
              <select
                value={compare}
                onChange={(e) => setCompare(e.target.value)}
              >
                {hardware.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <span>with</span>
            <label>
              Alternative
              <select
                value={against}
                onChange={(e) => setAgainst(e.target.value)}
              >
                {hardware.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="wb-comparison">
            {selected.map((h, i) => (
              <article key={i}>
                <span className="wb-tag">
                  {h.maker} ·{" "}
                  {h.kind === "mac" ? "Unified memory" : "Discrete accelerator"}
                </span>
                <h2>{h.name}</h2>
                <strong>{h.memory} GB</strong>
                <p>
                  {h.kind === "mac"
                    ? "Family maximum; configure the exact Mac"
                    : "Device memory for the named SKU"}
                </p>
                <dl>
                  <dt>System support</dt>
                  <dd>{h.os.join(" / ")}</dd>
                  <dt>Runtime options</dt>
                  <dd>{h.runtime}</dd>
                  <dt>Power</dt>
                  <dd>
                    {h.watts
                      ? `${h.watts}W GPU rating; system draw is higher`
                      : "SKU / system dependent"}
                  </dd>
                  <dt>Price evidence</dt>
                  <dd>
                    {money(h.price)} · {h.priceKind}
                  </dd>
                </dl>
                <p>{h.meaning}</p>
                <p>{h.tradeoff}</p>
                <div className="wb-links">
                  <a href={h.source} {...external}>
                    Manufacturer ↗
                  </a>
                  <a href={amazonSearch(h.name)} {...external}>
                    Amazon search ↗
                  </a>
                  <a href={learnLink(h.id)}>Learning page ↗</a>
                </div>
              </article>
            ))}
          </div>
          <div className="wb-note">
            <h3>Read the memory number first</h3>
            <p>
              GPU VRAM and Apple unified memory are different budgets. An Apple
              machine reserves memory for the OS; a desktop also needs CPU RAM.
              Quantization compresses model weights, not every runtime buffer.
              Multi-GPU memory is not automatically pooled, and TOPS across
              different precisions are not comparable.
            </p>
          </div>
        </>
      )}
      {pane === "guide" && <FieldGuide />}
      {pane === "picks" && <CategoryPicks signedIn={signedIn} />}
      <dialog
        ref={dialog}
        className="wb-dialog"
        onCancel={() => {
          setDetail(null);
          setCart(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setDetail(null);
            setCart(false);
          }
        }}
      >
        <button
          className="wb-close"
          aria-label="Close details"
          onClick={() => {
            setDetail(null);
            setCart(false);
          }}
        >
          <X />
        </button>
        {detail && (
          <>
            <p className="wb-kicker">
              {detail.provider} · CHECKED {detail.verifiedAt}
            </p>
            <h2>{detail.name}</h2>
            <p>{detail.description}</p>
            <dl>
              <dt>Release date</dt>
              <dd>
                {detail.releaseDate ||
                  "Not verified; snapshot dates are not necessarily announcement dates"}
              </dd>
              <dt>Deployment</dt>
              <dd>
                {detail.deployment}; {detail.status}
              </dd>
              <dt>Modalities</dt>
              <dd>
                Input: {detail.inputModalities.join(", ") || "See source"} →
                Output: {detail.outputModalities.join(", ") || "See source"}
              </dd>
              <dt>Context</dt>
              <dd>
                {detail.context?.toLocaleString() || "Not verified"} tokens
              </dd>
              <dt>Published snapshots / aliases</dt>
              <dd>{detail.snapshots.join(", ")}</dd>
            </dl>
            <div className="wb-scroll">
              <table>
                <caption>
                  USD per 1M tokens · base text rates where available
                </caption>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>At launch</th>
                    <th>Latest verified</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Input</th>
                    <td>{rate(detail.launchInput)}</td>
                    <td>{rate(detail.input)}</td>
                  </tr>
                  <tr>
                    <th>Output</th>
                    <td>{rate(detail.launchOutput)}</td>
                    <td>{rate(detail.output)}</td>
                  </tr>
                  <tr>
                    <th>Cached input</th>
                    <td>Not verified</td>
                    <td>{rate(detail.cached)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Reasoning tokens may be billed as output; they are not an extra
              flat-priced token category. Rates for image, audio, long context,
              tools and regional processing can differ. Check the provider’s
              billing rules.
            </p>
            <h3>Configuration explorer</h3>
            {detail.priceNote && <p>{detail.priceNote}</p>}
            <div className="wb-links">
              {detail.priceSource && (
                <a href={detail.priceSource} {...external}>
                  Pricing source ↗
                </a>
              )}
              {detail.launchSource && (
                <a href={detail.launchSource} {...external}>
                  Launch evidence ↗
                </a>
              )}
            </div>
            <div className="wb-options">
              <label>
                Reasoning
                <select
                  aria-label="Reasoning"
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                >
                  {(detail.reasoning.length
                    ? detail.reasoning
                    : ["default"]
                  ).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              {detail.id === "gpt-6-astra" && (
                <label>
                  Service tier
                  <select
                    aria-label="Service tier"
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                  >
                    {["Standard", "Fast", "Batch / Flex"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Input tokens
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  value={inputTokens}
                  onChange={(e) => setInputTokens(Math.max(0, +e.target.value))}
                />
              </label>
              <label>
                Billable output + reasoning
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  value={outputTokens}
                  onChange={(e) =>
                    setOutputTokens(Math.max(0, +e.target.value))
                  }
                />
              </label>
            </div>
            <p className="wb-cost">
              Estimated token cost:{" "}
              {detail.input !== null && detail.output !== null
                ? `$${(((inputTokens * detail.input * (detail.id === "gpt-6-astra" && inputTokens > 272000 ? 2 : 1) + outputTokens * detail.output * (detail.id === "gpt-6-astra" && inputTokens > 272000 ? 1.5 : 1)) / 1000000) * (speed === "Fast" ? 2 : speed === "Batch / Flex" ? 0.5 : 1)).toFixed(4)}`
                : "Unavailable without verified prices"}
            </p>
            <small>
              Excludes cache writes, tool calls and taxes. Lower effort can
              reduce latency but does not guarantee a speed or quality result.
            </small>
            <h3>Benchmark history</h3>
            {detail.benchmark.length ? (
              <div className="wb-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Benchmark</th>
                      <th>Score</th>
                      <th>Configuration / date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.benchmark.map((b, i) => (
                      <tr key={i}>
                        <td>
                          <a href={b.source} {...external}>
                            {b.name} ↗
                          </a>
                        </td>
                        <td>
                          {b.score}
                          {b.unit}
                        </td>
                        <td>
                          {b.config} · {b.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                No verified benchmark observation is stored for this version.
                Missing is not zero. Do not compare scores across different
                benchmark revisions or harnesses.
              </p>
            )}
            <div className="wb-note">
              <h3>Prompt this model</h3>
              <p>
                {detail.reasoning.length
                  ? "Specify the outcome, constraints, relevant evidence and acceptance tests. Set effort using the supported API field. Ask for a concise conclusion and test evidence rather than a hidden chain-of-thought transcript."
                  : "Give clear instructions, bounded context, an output format and one representative example. Use the model’s own chat template for open weights."}
              </p>
              <p>
                For coding: identify the repository, runtime and failing
                behavior; inspect, plan, patch and test in small steps. A hosted
                model has no quantization setting or OS-specific intelligence
                score.
              </p>
            </div>
            <a className="wb-source" href={detail.source} {...external}>
              Open official model documentation ↗
            </a>
          </>
        )}
        {cart && plan && (
          <>
            <p className="wb-kicker">YOUR WORKSTATION SHOPPING LIST</p>
            <h2>Review your entire build.</h2>
            <p>
              Choose exact SKUs and verify current prices before checkout.
              Generic component allowances are not a compatibility-certified
              shopping cart.
            </p>
            {plan.parts.map((p) => (
              <div className="wb-cart-row" key={p.name}>
                <span>
                  {p.name}
                  <small>{p.note}</small>
                </span>
                <a href={p.url} {...external}>
                  {money(p.price)} ↗
                </a>
              </div>
            ))}
            <div className="wb-note">
              <h3>Retailer checkout</h3>
              <p>
                Automatic Amazon cart transfer is not available for this
                proposal: exact ASINs, sellers and current offers have not been
                verified. The links open each product search or manufacturer
                configuration. No items have been added to an external cart.
              </p>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
function CatalogMore({
  total,
  limit,
  more,
}: {
  total: number;
  limit: number;
  more: () => void;
}) {
  return (
    <div className="wb-more">
      <span>
        {Math.min(total, limit)} of {total} entries
      </span>
      {total > limit && (
        <button onClick={more}>
          Show 24 more <ChevronRight size={15} />
        </button>
      )}
      {!total && <p>No matching entries. Try another task or name.</p>}
    </div>
  );
}
function FieldGuide() {
  return (
    <div className="wb-guide">
      {[
        [
          "Start with the task, not a leaderboard",
          "For refactoring, evaluate a representative change in your own repository: passing tests, correctness, review effort, latency and total cost. Record model snapshot, effort, agent harness, OS, tools and quantization. A benchmark winner is not proof of the best Mac or Windows workflow.",
        ],
        [
          "Mac: capacity and a quiet integrated system",
          "MLX is designed for Apple silicon; llama.cpp uses Metal. A high-memory Max or Ultra can fit weights larger than consumer GPU VRAM, but shared memory bandwidth and supported operators limit throughput. An Ultra Mac Studio is a desktop, not an Ultra MacBook.",
        ],
        [
          "Linux: a common choice for GPU serving",
          "CUDA, vLLM and container workflows make Linux a practical starting point for NVIDIA serving. Check driver, CUDA and runtime versions against the actual GPU. A100, H100 SXM and B200 server modules require specific platforms, power and cooling.",
        ],
        [
          "Windows: native apps with a Linux toolchain",
          "WSL2 offers Linux development with supported NVIDIA CUDA drivers while keeping Windows applications. Keep Linux project files inside the WSL filesystem for Linux tooling. Verify your extension and runtime support; WSL does not make every Linux GPU stack compatible.",
        ],
        [
          "4-bit, 8-bit, 16-bit: a capacity tradeoff",
          "A dense 70B model has roughly 35GB of raw 4-bit weights, 70GB at 8-bit or 140GB at 16-bit. Metadata, KV cache, activations and the operating system add memory. Quality loss depends on the method and model. MoE active parameters affect compute, but all resident expert weights still need storage.",
        ],
        [
          "Plan, execute, review",
          "Planner: define acceptance checks and scope. Implementer: inspect relevant files and make focused changes. Reviewer: run tests and challenge the diff. Start with a single agent; add parallel workers when tasks are independent. Share artifacts and concise evidence instead of duplicating whole contexts.",
        ],
        [
          "Token-efficient prompting",
          "Use: Goal; Environment; Inputs; Constraints; Acceptance checks; Output. Give file paths and errors instead of pasting a repository. Reuse stable prefixes for supported caching. Ask for targeted inspection and compact diffs. More reasoning or a longer prompt does not automatically improve the outcome.",
        ],
        [
          "One interface, multiple modalities",
          "Open WebUI is an interface and orchestration layer, not an omni model. Pair a supported text/vision endpoint with speech recognition, speech synthesis, image and video tools when needed. Verify each model’s actual input/output modalities and license.",
        ],
        [
          "Computer access is a separate capability",
          "Models need a runner and tools to edit files or operate a computer. Start with a selected project directory and permissioned commands. Keep secrets outside model context. Use logs, cancellation and review for external actions. A 3D office should display real runtime events when connected, not invented activity.",
        ],
      ].map(([title, body], i) => (
        <article key={title}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          <div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        </article>
      ))}
      <div className="wb-links">
        <a href="https://github.com/ml-explore/mlx" {...external}>
          MLX ↗
        </a>
        <a href="https://github.com/ggml-org/llama.cpp" {...external}>
          llama.cpp ↗
        </a>
        <a
          href="https://docs.nvidia.com/cuda/wsl-user-guide/index.html"
          {...external}
        >
          CUDA on WSL ↗
        </a>
        <a href="https://docs.openwebui.com/" {...external}>
          Open WebUI ↗
        </a>
        <a href="https://docs.vllm.ai/en/latest/" {...external}>
          vLLM ↗
        </a>
      </div>
    </div>
  );
}

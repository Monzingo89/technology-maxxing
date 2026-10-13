import { useEffect, useState } from "react";
import { pickCategories, pickModels, pickSource } from "./modelRecommendations";
import { learningLogin } from "../services/learningGate";
import { fetchHubMetadata, type HubMetadata } from "./hubMetadata";
import "./workbench.css";
import LicenseLink from "./LicenseLink";
export default function CategoryPicks({
  signedIn,
  categoryId,
}: {
  signedIn: boolean;
  categoryId?: string;
}) {
  const [selected, setSelected] = useState(pickCategories[0].id);
  const category =
    pickCategories.find((c) => c.id === (categoryId || selected)) ||
    pickCategories[0];
  const [metadata, setMetadata] = useState<
    Record<string, HubMetadata | string>
  >({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setMetadata({});
    const timeout = setTimeout(() => controller.abort(), 12000);
    const requests = category.picks.map(async ([key]) => {
      const id = pickModels[key][0];
      try {
        const value = await fetchHubMetadata(id, controller.signal);
        if (active) setMetadata((current) => ({ ...current, [id]: value }));
      } catch (error) {
        if (active)
          setMetadata((current) => ({
            ...current,
            [id]: controller.signal.aborted
              ? "Request timed out. Retry when connected."
              : error instanceof Error
                ? error.message
                : "Metadata unavailable.",
          }));
      }
    });
    void Promise.all(requests).finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [category.id, attempt]);
  return (
    <section
      className="model-picks"
      aria-label="Top 10 open models by category"
    >
      <p className="wb-kicker">
        10 CATEGORIES · 10 PICKS EACH · CHECKED OCT 13, 2026
      </p>
      <h2>Top 10 open models by task</h2>
      <details className="model-methodology">
        <summary>How these recommendations are selected</summary>
        <p>
          Editorial trial order, not a benchmark leaderboard. We balance
          documented capabilities, specialization and deployment size within a
          curated candidate pool. Category suitability is our inference, not a
          measured score. Models can appear in several lists.
        </p>
        <p>
          “Open” means downloadable weights, including gated and custom-license
          models—not necessarily unrestricted open source. Check every model
          card and license before use.
        </p>
      </details>
      {!categoryId && (
        <label>
          Choose a category{" "}
          <select
            aria-label="Model recommendation category"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {pickCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <h3>{category.name}</h3>
      <p>{category.scope}</p>
      <p role="status">
        {Object.keys(metadata).length < 10
          ? "Loading current Hugging Face metadata…"
          : "Hugging Face metadata requests complete."}
      </p>
      <details className="model-methodology">
        <summary>About the live Hugging Face data</summary>
        <p>
          Fetched from the public Hugging Face Hub API when you choose a
          category; successful results are cached in memory for five minutes.
          Your browser contacts Hugging Face directly. Downloads and likes are
          popularity signals, not category performance scores.
        </p>
      </details>
      {Object.values(metadata).some((value) => typeof value === "string") && (
        <button
          className="metadata-retry"
          onClick={() => setAttempt((a) => a + 1)}
        >
          Retry unavailable metadata
        </button>
      )}
      <aside className="wb-note">
        <strong>Before you use these models</strong>
        <p>{category.caution}</p>
        <p>Evaluate: {category.checks}</p>
      </aside>
      <div className="wb-cards">
        {category.picks.map(([key, why], index) => {
          const [id, license, limit] = pickModels[key];
          const path =
            "ai_" +
            id
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/_$/, "");
          const learn = `learn/${path}/`;
          const live = metadata[id];
          return (
            <article key={key} data-testid="category-model">
              <span className="wb-tag">#{index + 1} · Editorial pick</span>
              <h3>{id.split("/")[1]}</h3>
              <p>{why}</p>
              <p>{limit}</p>
              <small>
                License: <LicenseLink license={license} signedIn={signedIn} />
              </small>
              {live && typeof live !== "string" ? (
                <div className="wb-note" data-testid="hub-metadata">
                  <p>
                    Downloads:{" "}
                    {live.downloads?.toLocaleString() ?? "Not supplied"} ·
                    Likes: {live.likes?.toLocaleString() ?? "Not supplied"}
                  </p>
                  <p>
                    Hub task: {live.task} · Hub license:{" "}
                    <LicenseLink license={live.license} signedIn={signedIn} />
                  </p>
                  <small>
                    Repository updated:{" "}
                    {live.modified
                      ? live.modified.slice(0, 10)
                      : "Not supplied"}
                    . Retrieved: {new Date(live.fetchedAt).toLocaleString()}.
                  </small>
                </div>
              ) : (
                <p>
                  {typeof live === "string"
                    ? `${live} Showing the saved editorial recommendation; no live metrics available.`
                    : "Loading Hub metadata…"}
                </p>
              )}
              <div className="wb-card-footer">
                <a href={signedIn ? learn : learningLogin(learn)}>Learn</a>
                <a
                  href={pickSource(key)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official model card ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

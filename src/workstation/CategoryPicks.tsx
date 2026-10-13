import { useState } from "react";
import { pickCategories, pickModels, pickSource } from "./modelRecommendations";
import { learningLogin } from "../services/learningGate";
export default function CategoryPicks({ signedIn }: { signedIn: boolean }) {
  const [selected, setSelected] = useState(pickCategories[0].id);
  const category = pickCategories.find((c) => c.id === selected)!;
  return (
    <section aria-label="Top 10 open models by category">
      <p className="wb-kicker">
        10 CATEGORIES · 10 PICKS EACH · CHECKED OCT 13, 2026
      </p>
      <h2>Top 10 open models by task</h2>
      <p>
        Editorial trial order, not a benchmark leaderboard. We balance
        documented capabilities, specialization and deployment size within a
        curated candidate pool. Category suitability is our inference, not a
        measured score. Models can appear in several lists.
      </p>
      <p>
        “Open” means downloadable weights, including gated and custom-license
        models—not necessarily unrestricted open source. Check every model card
        and license before use.
      </p>
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
      <h3>{category.name}</h3>
      <p>{category.scope}</p>
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
          return (
            <article key={key} data-testid="category-model">
              <span className="wb-tag">#{index + 1} · Editorial pick</span>
              <h3>{id.split("/")[1]}</h3>
              <p>{why}</p>
              <p>{limit}</p>
              <small>License: {license}</small>
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

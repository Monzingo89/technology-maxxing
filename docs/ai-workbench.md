# AI Workbench

## Main-menu model discovery and live Hub metadata

`/#models` replaces the main navigation buttons with ten category buttons and a Back action. Category deep links use `/#models?category=front-end` (and the other category IDs). Selecting a category requests public model metadata directly from Hugging Face, with omitted credentials, a 12-second timeout, canceled obsolete requests and five-minute in-memory caching. Downloads, likes, task, license, repository update time and retrieval time are shown separately from the saved editorial rationale. Network/rate-limit failures retain explicitly labeled saved recommendations and support retry. These requests do not run model inference or dynamically establish a benchmark ranking.

No API key is needed for the public metadata used here. No token is stored in the browser or repository. If traffic later needs authenticated access, add a server-side proxy and configure a least-privilege Hugging Face token as a server-only environment variable, never a `VITE_` variable. Gated weight downloads and paid inference are separate workflows and may require permissions or credentials.

## Category recommendations and account entry points (October 13, 2026)

The “Top 10 by category” tab provides ten distinct model picks for each of the ten requested categories (100 recommendation slots; models may recur between categories). `modelRecommendations.ts` stores editorial trial order, task-specific rationale, licensing notes, evaluation criteria and professional-use cautions. This is a curated candidate pool, not a current universal performance ranking. Publisher model cards and Hugging Face metadata were checked on October 13, 2026. Suitability within a category is explicitly an editorial inference; no benchmark score was invented.

Learn/Study links and assessment entry points now route signed-out users to the existing login/create-account dialog. A restricted local destination in the hash survives switching auth modes and is resumed after authentication. Canceling clears the destination. Only `learn/<topic>/` and topic identifiers are accepted, preventing open redirects. Signed-in users proceed directly. Generated learning-page assessment CTAs, the static library index, model cards, hardware learning links and graph Learn/Assess tabs use the gate. Public learning pages remain indexable: this is a navigation gate, not server-side content authorization. Legacy guest APIs are unchanged, but the current app no longer automatically checks guest allowance when browsing. Production login requires the existing configured Firebase service.

Entry point: `/#builder`. This adds a lazy-loaded workstation planning surface; it preserves the AI Space homepage, linked Knowledge Library and existing assessments.

## Run and verify

```sh
npm run dev
npm test
npm run build
npx playwright test tests/workbench.spec.ts
```

The browser tests expect the dev server on port 5173. No model API key is needed: planning runs locally in the browser, and the progress bar describes proposal/scene assembly, not a live benchmark, price search or agent execution.

## Catalog provenance

- `data/chatgpt-integrations.json`: 100 curated current directory entries, not an independently measured top-100 ranking. The directory does not supply comparable popularity statistics. Shared products have separate platform records. This snapshot was collected through the ChatGPT plugin directory connector; the public refresh command does not refresh it.
- `data/claude-integrations.json`: 100 official directory entries combining featured plugins with connectors sorted by the directory's popularity score. Install counts and popularity scores are not equivalent. This is not a list of 100 independently verified agent skills.
- `data/open-models.json`: 100 Hugging Face entries stratified across 11 tasks and selected by downloads. Open weights do not imply an unrestricted license, proven quality or non-frontier historical status.
- `data/frontier-models.json`: published provider catalog entries, aliases/snapshots and selected historical research predecessors. The atlas also includes specialist provider models, not only frontier language models. It is not a complete census of every model ever released.
- `data/model-evidence.json`: manually reviewed historical launch prices and benchmark observations. Every score carries a source, report date and configuration caveat. Unknown values remain `null`, never zero. Historical API prices are not substituted for current prices; retired models may have no current offer.
- `src/workstation/hardware.ts`: documented device SKUs and Apple chip families. Family maximum memory is not the memory in a base-price computer. Launch MSRP is not a live retailer quote.

Sources and verification dates appear in the application. Provider pricing may change after the snapshot; qualifiers such as long-context tiers, promotional pricing, cached input, service tiers, media billing and regional pricing require checking the original source. Reasoning tokens are included in billable output where documented, not universally charged as an additional separate token class. Supported API reasoning settings are not inferred from internal agent model names.

```sh
# Explicit network refresh; review diffs and test before committing.
npm run catalog:ai:refresh
# Regenerate linked topics and assessments from checked-in snapshots offline.
npm run catalog:ai
```

Refresh stages can succeed independently. An incomplete OpenAI fetch will not overwrite the previous frontier snapshot; failed later stages may leave earlier snapshots updated. Review all snapshot diffs after a failed refresh. HTML schema changes should fail closed, not silently establish model IDs from arbitrary page headings. The Google importer extracts code-formatted endpoint IDs, not navigation fragments.

## Recommendation contract

The planner is a deterministic heuristic, not an LLM or a measured performance optimizer. It uses a small set of named reference text models and conservative single-device memory planning. A request for a different parameter size is sized at least as large as the reference. Dense raw weight storage is `parameters × bits / 8`; runtime overhead, KV cache and media allowances are estimates, not architecture-specific measurements. Multi-GPU capacity is not automatically pooled.

Mac recommendations use unified-memory/Metal/MLX guidance; Linux and Windows/WSL2 guidance concerns runtime support, not model intelligence. An Apple Ultra configuration is a desktop, not a MacBook. Datacenter GPUs require integrator-qualified platforms. Desktop platform/RAM/storage/power allowances are not a socket-, power-, cooling- and clearance-validated bill of materials. Budget checks cannot certify affordability when quotes are missing.

Media proposals list separate vision/speech, image and video models. A text-only 70B model does not acquire those native capabilities through quantization or Open WebUI. Pipelines need model-specific adapters and independent memory checks; concurrent media execution is not promised.

The scene is a procedural Three.js assembly preview, with WebGL fallback, reduced motion, mobile controls, capped pixel ratio and resource disposal. The office figures represent planner/implementer/reviewer roles. They are **not live agents** and never receive filesystem permissions. Real execution would require a separately configured authenticated local runtime, scoped tools, cancellation, event streaming and explicit approvals for destructive actions.

## Shopping boundary and remaining integration

Per-part links open manufacturer configurations or Amazon searches; comparisons open a new tab. Build export and the complete shopping review work without credentials. No checkout or purchase is performed.

One-click whole-workstation cart transfer is **not implemented**. The current catalog lacks verified exact product IDs, seller offers, inventory and current prices, and the desktop proposals contain generic allowances. Legacy Amazon cart-form documentation requires an access key and product identifiers; it is not evidence of a currently supported anonymous universal cart API. Do not add fake ASINs, expose account secrets, or label a search URL as a populated cart.

To enable checkout, select a supported retailer integration/account, obtain its current product/offer API and cart contract, replace estimates with compatible exact SKUs, and verify the retailer cart in a sandbox or user-authorized session. Tests should cover stale offers, unavailable parts, changed totals, currency/region, quantities, seller identity and rollback. The website must still require the user's final checkout confirmation.

## Scope not claimed complete

Public sources do not establish a universal top-100 ranking, exhaustive model/version history, every historical token price or benchmark, or the best model/configuration on every OS. Missing evidence is visible. This feature is a source-backed catalog and planning implementation, not proof that these exhaustive research or commerce requirements have been completed. Source changes, production deployment, authenticated local agents and retailer checkout are separate delivery claims.

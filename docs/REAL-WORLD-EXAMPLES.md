# Documentation-grounded real-world examples

Each published example is a hypothetical business scenario, not a verified
customer story or measured benchmark. The low-cost model is Gemini 3.1 Flash-Lite.
Pricing checked October 17, 2026: $0.25/M input tokens, $1.50/M output tokens:
https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite

The user approved a maximum of $25 for this generation task. The cumulative
ledger at `.cache/real-world/budget.json` reserves a conservative maximum before
each request, including in-flight requests, and stops before exceeding the cap.
Usage cost is an estimate from returned tokens, not a provider invoice. Failed
or unreported requests retain their full reservation. No paid search grounding
or video API calls are used. One lock prevents simultaneous generator processes.

## Generate or resume

Run `npm run build` first to refresh `public/knowledge.json`. The generator uses
the existing Firebase CLI login to read `GEMINI_API_KEY` from Secret Manager,
only in memory. No client API keys or new secrets are needed.

```sh
REAL_WORLD_BUDGET_USD=25 npm run lessons:generate
# Or a specific subset:
REAL_WORLD_BUDGET_USD=25 npm run lessons:generate -- react docker sql
node scripts/recover-real-world.mjs
npm run build
npm test
npm run audit:assessments
```

Only run generation with approval for the stated cumulative cap. Cached valid
examples are reused. Source text, raw responses, budget and reports stay in the
ignored `.cache/real-world/` directory. Published data lives under
`data/real-world-examples/`. An interrupted process may leave `running.lock`;
confirm no generator is running before removing only that stale lock.

Documentation fetching accepts public HTTPS catalog links, checks redirect
destinations, sets time and size limits, and does not send credentials. Blocked,
unreadable or insufficient sources produce a blocked result, never a fabricated
fallback. Model quota/billing/access errors stop further new calls. Reruns keep
successful work. The generator does not schedule automatic paid retries.

## Publication and assessments

The static builder validates each example and adds its section at the bottom of
the lesson, immediately before the assessment link. All prose, code and diagram
labels are escaped; model output cannot inject HTML, scripts or executable chart
syntax. Code is illustrative and explicitly marked as not executed. Diagrams
have labeled connections and readable textual descriptions.

Each complete example adds exactly two distinct questions with four choices,
answer explanations and exact evidence passages from the lesson. Five existing
core questions remain intact; the two example questions are last. Lessons and
questions are built in the same release, so users are not tested on unpublished
material. Until an example passes validation, that topic retains its five core
questions. The UI displays the actual count, never promises seven when only five
are available. Passing remains 70% (five correct out of seven).

All topic questions allow 20 seconds; the last three seconds remain urgent.
Starting an assessment focuses and centers the first question without a smooth
scroll animation consuming answer time. The existing 10-minute overall limit,
five-day failure lock, and owner-only video permissions are unchanged.

Schema validation is not expert validation of every technical claim. Spot-check
generated lessons against their sources before relying on version-specific APIs.

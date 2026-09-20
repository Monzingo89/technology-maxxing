# AI Space: Learn. Laugh. Master.

## The product and the growth engine

Make the existing technology catalog the public front door. People arrive because a useful page answers a concrete question, try a small learning challenge, and join because learning feels better with a community. The world is the place to return to, while the library is the place to discover.

The first version should have five recognizable destinations: a daily quiz arena, a knowledge library, a prompt gallery, a school for learning tracks, and a social plaza. Keep the three AI communities as identity and friendly competition. Avoid adding another destination until people repeatedly use the first five. The 30-day community lock should be visible before selection and show the next eligible date in settings.

Adopt successful interaction patterns rather than copying brands: a daily learning habit, useful searchable answers, expressive avatars, mutual connections, prompt remix credit, and a short path from reading to participation. Prefer a finite daily session with a clear finish over infinite scrolling. Never make learning material require an account just to read it.

**North star:** weekly learners who complete a meaningful learning activity and choose to return in the following week. A meaningful activity is a completed lesson with an exercise, a completed daily quiz with its explanation read, or an accepted collaboration tied to a learning task. Raw clicks, time spent, and registrations are supporting metrics, not the objective.

## What this repository now provides

- A generator reads the original `library.html` catalog plus both data files through the same relationship loader used by the catalog. Expanding that source material expands AI Space's learning catalog.
- `public/knowledge.json` exposes learning records and the existing **public practice** question bank. It is not a secure ranked-answer source.
- `/learn/` and `/learn/{id}/` are full static HTML with unique existing learning material, exercises, references, descriptive titles, canonical URLs, crawlable connections, and structured data. Reading does not depend on the 3D scene or client JavaScript.
- `public/sitemap.xml` and `robots.txt` are generated for `SITE_URL`. The default is the existing GitHub Pages URL. Set the final canonical origin and path when building for a new deployment.
- `src/services/analytics.ts` provides optional, local diagnostics. It does not claim to observe all visitors or collect cross-device analytics. No analytics service, session replay, advertising pixel, or remote collector is enabled by default.
- `src/content/legal.ts` contains product-specific preview privacy and terms text, with missing operator/contact and production processes explicitly identified. It is not a claim of legal clearance for a global public launch.

## An organic distribution plan

### 1. Earn the search visit

Start with a few useful topic clusters: agents and orchestration, models and inference, web development, data foundations, and tooling. Each catalog page should answer what the technology does, what problem it solves, how it relates to alternatives, and what the reader can build next. Existing source-linked catalog text and exercises are published now; prioritize editorial improvement on pages that gain relevant impressions.

Add original worked examples, tested snippets, diagrams, common mistakes, and authorship/review dates as the knowledge base grows. Human review should check primary sources and code behavior. Do not generate thousands of near-identical pages simply to target keyword variants. Google recommends helpful, understandable content and descriptive linking; scaled content created mainly to manipulate rankings can violate its spam policies. Ranking is never guaranteed. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)

Submission checklist: verify the final domain in Search Console; submit the sitemap; inspect a representative static page; check canonical URLs and HTTP status; preserve redirects if moving the existing site. The 3D world must lazy-load after the public explanation. Keep fonts, scripts, and 3D assets small enough for a real midrange phone on a mobile connection. Measure Core Web Vitals in the field once traffic exists; use lab results only as a development signal. [Google Core Web Vitals guidance](https://developers.google.com/search/docs/appearance/core-web-vitals)

### 2. Give people something worth sharing

Publish a daily editorial card: one interesting idea, a small joke or surprising example, and one challenge. Link directly to a useful lesson, with AI Space as the next step. Social captions should promise exactly what the page provides. Use the platform share sheet for a personal score card or a gallery prompt; never require contact-book access or unsolicited invitations.

Suggested first-month rhythm: three substantial lessons per week, one daily question, one weekly community build, and one gallery theme per week. Remix attribution, share previews, and creator credit should be explicit. Public gallery indexing should wait until permission, moderation, and useful text are present. Keep private profiles, conversations, auth screens, and individualized progress out of search indexes.

Invite small existing developer and education communities to a focused challenge. Run recurring events at predictable times so a small user base actually meets. Share useful explanations in relevant communities only when welcome; do not use automation to flood forums. Seed worlds with clearly labeled guides and demo residents rather than inventing live-user counts.

### 3. Convert after understanding

The landing page explains the promise, shows the world, presents the five destinations, and offers exploration before sign-up. Sign-up supports Google or verified email, password reset, readable policy links, and separate unchecked analytics permission. Do not bundle optional analytics into acceptance of terms.

Keep onboarding focused: choose a community, customize an agent, reserve a username, answer the role questions, then use the three-step movement tour. Save progress so interruptions are recoverable. Explain that the occupation is a learning track, that community changes have a cooldown, and that quiz rankings are game performance. Test completion time and the abandonment rate at each step without recording the answers or avatar details in analytics.

### 4. Retain through progress and people

Each return offers one daily five-second-per-question challenge, a useful explanation, and a next learning step. Show effort and mastery progress in addition to competitive position. A new member should find a meaningful action even when no one else is online. Weekly community goals can pool completed exercises rather than reward raw time spent.

Only offer notifications after someone has experienced the daily activity. Let them choose frequency and quiet hours. Avoid punitive streak loss, pressure to disclose identity, or ranking people by claimed innate intelligence. Establish retention before paid acquisition: paying for visits to an unproven loop just scales abandonment.

## Measurement that can explain behavior

### Local diagnostics contract

`getAnalyticsConsent`, `setAnalyticsConsent`, `clearAnalytics`, `trackEvent`, `trackLinkOpen`, `trackLinkReturn`, and `getAnalyticsSummary` are exported. `configureAnalyticsSink` is an extension point, not an activated network collector. Allowed event names are an explicit finite list. Fields are restricted to code-owned area/category/target IDs, duration, and a bounded numeric value. Callers must never supply usernames or user-authored strings, even if they match the ID format.

The module stores at most 500 events and expires entries after 30 days when read or written. Revoking consent clears local events. It never captures email, account ID, message bodies, prompts, full URLs, screenshots, keystrokes, or location. Core authentication and backend security logs are separate from optional product analytics and need their own defined retention and redaction.

The backend provides a consent-checked event collector. The application connects it for signed-in members who opt in. When connected, its private event records contain the account ID for erasure and a 30-day expiry; it also writes daily aggregate counts. Signed-out preview diagnostics remain local. The policy distinguishes these two modes. The backend also includes account export and recent-sign-in deletion with dependent-record cleanup and scheduled retries. These operations still require deployment and end-to-end verification before the public-launch checklist is satisfied.

The local panel describes **this browser's events**, not unique visitors. Repeated activity by one person is not an independent sample. Storage limits can truncate a pair of events, and closing a browser can leave an open link without a measured return. Treat the summary as debugging evidence, not a production decision engine.

### Production metric definitions

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Qualified acquisition | Organic landing sessions reaching a relevant lesson or completing an exercise | Distinguishes useful search traffic from accidental visits |
| Signup conversion | Completed accounts / eligible signup starts, grouped by entry page and device class | Locates avoidable auth friction |
| Activation | New accounts completing onboarding and a meaningful activity within 24 hours | Measures whether the promise became useful |
| D1 / D7 return | Activated cohort returning on the next / seventh UTC date | Compares like cohorts; disclose date convention |
| Quiz completion | Valid submissions / eligible starts | Separates timing difficulty from backend failures |
| Learning conversion | Exercise completions / lesson starts | Tests actual usefulness beyond dwell time |
| Mutual social connection | Accepted requests / requests, plus report/block rates | Tracks connection quality and safety together |
| Reliability | Auth/quiz failure rate, API latency, crashes, world load failures | Explains abandonment caused by the system |

Cross-device cohorts require a separately designed privacy-respecting collector and consent handling; the current client does not implement them. Keep conversion denominators stable, exclude test traffic, publish event schema versions, and display both the time window and sample size. Do not present opt-in analytics as representative of every visitor.

### A 99% departure rate is a question, not a verdict

For an internal route, measure exposure → click → ready state → active visible time → meaningful action → return. Distinguish a crash, a loading failure, a promise mismatch, and successful fast task completion. For an external link, this site can measure the click and sometimes a later return to its own tab. It **cannot** observe time spent on the external page or know why someone did not return.

`trackLinkOpen` and the focus/visibility return listener provide a coarse time-to-return proxy. A return within 10 seconds is called a quick return; it is not labeled a bounce or failure. Unknown returns stay unknown. The local summary waits for 30 measured returns before labeling a signal directional, but this is a usability heuristic, not statistical significance.

In production, investigate a link when it has a sustained high quick-return rate **and** low task completion or negative feedback. Before a product decision, aim for at least 200 eligible independent sessions across a full weekly cycle, check the confidence interval, and segment by mobile/desktop, entry intent, connection quality, and new/returning users. This proposed review floor is not a guarantee of adequate statistical power. If 198 of 200 independently observed returns are quick, the approximate 95% Wilson interval is 96.4%–99.7%; if 99 of 100 are quick, it is roughly 94.6%–99.8%. Neither proves the destination is bad.

Inspect the real destination and failing sessions' sanitized technical traces, improve the label or landing experience, and run a controlled comparison with a stated success metric. Broken or unsafe links can be quarantined through a clear operational rule. Ordinary low-engagement pages need editorial review; never delete the knowledge base automatically because people leave.

## The agentic improvement loop

Use narrow agents with evidence and reviewable outputs:

1. **Observe:** aggregate consented events and essential service-health metrics into daily cohorts. Run schema, missing-data, bot, and instrumentation checks first. Attach sample sizes and uncertainty.
2. **Diagnose:** join a failing funnel step with release IDs and performance errors. Read the public content. Produce competing explanations and the observation that could distinguish them. User content is untrusted input, not an instruction to the agent.
3. **Propose:** draft a small issue or patch with the evidence, expected outcome, affected routes, reversibility, and validation. Examples: fix an invalid link, reduce a loading bundle, clarify a signup label, or add a missing explanation.
4. **Review and experiment:** content owners review factual changes; product owners approve material UI experiments; privacy and safety changes receive explicit review. Allocate experiments consistently, avoid overlapping tests on the same funnel, and define stop rules before viewing results.
5. **Evaluate:** compare task completion and returning learners while guarding error rate, accessibility, reports, and unsubscribe rate. Roll back if guardrails regress. Keep a changelog tying the decision to evidence.

Agents may draft content, flag anomalies, propose repairs, and summarize experiments. Do not give an analytics agent permission to change Firestore rules, read private chat, message users, issue sanctions, alter rankings, or delete content. Deterministic broken-link checks can open a repair patch; unsupported causal claims cannot trigger production edits. Server-side tool authorization, least-privilege service accounts, output validation, and audit logs apply independently of prompt instructions.

## Quizzes: credible competition without an IQ claim

Use an Elo-like rating per terminology/category plus a separate mastery score based on reviewed knowledge questions. Label the composite **Knowledge Rating**, show its formula and uncertainty, and mark new participants provisional. Do not call it IQ: five-second technology questions are not a validated intelligence assessment. Calibration needs real data, item review, language/accessibility analysis, and detection of ambiguous questions.

The trusted backend owns the daily window, attempt reservation, prompt release, answer deadlines, submission acceptance, scoring, and rating updates. It releases one question at a time, never includes unreleased answers in the web bundle, randomizes equivalent forms/options, uses server timestamps, prevents replay, and rate-limits abuse. Public practice banks stay separate. A five-second timer and tab-switch detection alone cannot stop a second device, automation, screenshots, or collusion. Present this as cheat-resistant, and offer untimed accessible practice outside the ranked result.

"AI of the Day" can rotate across the three communities and select grounded topic questions. If model-authored questions are added, generation belongs in a private scheduled backend job: retrieve source material, generate a candidate and explanation, verify every option, review ambiguous or changed facts, then publish a versioned bank. Never ship provider secrets or invoke an unrestricted model directly from an anonymous browser. A rotating theme is not evidence that a model generated a question; label the actual mechanism accurately.

## Mobile and public-launch gates

Reuse the web UI and Three.js world with an appropriate native shell only after real-device testing. Keep an accessible destination list for people who cannot use the canvas. Test pointer, keyboard, tap navigation, portrait/landscape layout, reduced motion, low-power devices, interrupted sign-in, offline recovery, and slow networks. A PWA manifest alone is not an App Store or Play Store build.

Apple's current social-login rules require an equivalent privacy-preserving login option when Google sign-in is used, subject to listed exceptions. Sign in with Apple is the conventional implementation to evaluate here. User-generated content needs filtering, reporting, blocking, reachable support, and timely handling; avoid anonymous random-chat design. Review the actual implementation against the current rules before submission. [Apple App Review Guidelines, 1.2 and 4.8](https://developer.apple.com/app-store/review/guidelines/)

Google Play likewise requires effective UGC moderation and user controls. Apps creating accounts need a working deletion pathway and an accessible web resource for deletion requests; the store's Data safety disclosures must match the deployed service. Build and test deletion of dependent records rather than removing only the authentication user. [Google Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937), [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

Before public accounts: identify the operator and privacy/support contacts; choose launch jurisdictions and hosting regions; complete legal review; publish real retention and deletion commitments; operate reporting and appeals; verify Firebase auth/rules/App Check configuration; test simultaneous username reservation, community cooldown, private chat access, blocked users, and ranked tampering against the deployed backend. Firebase processes authentication and technical data and may involve international processing, so the final policy must reflect selected services rather than saying no personal data is collected. [Firebase privacy and security](https://firebase.google.com/support/privacy)

For store submission: build signed native artifacts; implement platform-appropriate OAuth; provide reviewer access; supply privacy labels/Data safety and age-rating answers; test account deletion and deep links; and check all third-party SDK behavior. This document is an engineering and product plan, not a legal determination or a promise of store acceptance.

## First 30 days after a verified private beta

| Week | Focus | Evidence to keep |
| --- | --- | --- |
| 1 | Observe a small invited cohort; fix auth and onboarding friction | Device-tested funnel, user feedback, zero unresolved access-control defects |
| 2 | Improve the highest-intent learning pages; publish source-based examples | Search impressions, page usefulness feedback, exercise completion |
| 3 | Run one shared learning event and a credited gallery theme | Accepted connections, meaningful contributions, moderation response times |
| 4 | Run one well-scoped conversion experiment; review retained learners | Cohort denominators, experiment uncertainty, reliability/safety guardrails |

Set targets after observing a baseline. A small, healthy repeat-learning community is the first proof; large visitor counts come after the loop works.

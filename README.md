# AI Space — Learn. Laugh. Master.

AI Space is a React + TypeScript social learning app built around this repository’s technology catalog. Three.js renders its explorable island and customizable agents. Firebase provides the account and multiplayer backend. Capacitor projects under `ios/` and `android/` reuse the web app.

## Run locally

```bash
npm install
npm run build
npm run dev
```

Open **http://127.0.0.1:5173**. Choose **Take a look around** to create a local preview agent. Preview data stays on this device; it is never presented as a real account, global ranking, or live population. Empty Firebase settings intentionally keep registration disabled.

Existing `.env` settings were preserved and new Firebase placeholders appended. `.env` is ignored by Git. [`.env.example`](.env.example) documents the public web configuration. Do not overwrite an existing `.env` or put service-account credentials in a `VITE_` variable.

## What is implemented

- A responsive discovery homepage, mobile navigation, accessible dialogs, Google/email authentication integration, verification, recovery, logout, export, and recent-sign-in account deletion.
- Claude, OpenAI, and Gemini fan communities with a server-enforced 30-day switch cooldown.
- A Three.js agent builder: skin/hair/outfit, height/weight, presentation, body, leg/foot styles, and face proportions. Twelve timed interest questions suggest a fictional learning practice; the School unlocks changes.
- A walkable isometric world with right-click/tap/keyboard movement, obstacle-aware paths, a three-step tutorial, five destinations, live presence, and a navigable fallback when WebGL is unavailable.
- Once-daily UTC ranked quizzes, five-second server deadlines, opaque randomized answer tokens, replay protection, transactional scoring, and per-topic Elo + knowledge leaderboards. Unranked practice has an optional relaxed timer. Scores are **not IQ**. No client quiz can guarantee prevention of outside assistance.
- Atomic case-insensitive usernames; mutual team invitations before chat; blocking/reporting; prompts moderated before publication; moderator-only operations.
- Daily, catalog-grounded AI question drafting with validated evidence and human approval before ranked use. Without a configured server key or approved daily bank, the reviewed starter bank is explicitly identified.
- 285 source-linked, indexable learning pages, canonical URLs, structured data, sitemap, public knowledge index, and the preserved original technology map.
- Opt-in usage diagnostics, restricted event fields, bounded local retention, consent-checked cloud events, aggregate link-return/completion metrics, and review recommendations. Unknown exits are never treated as measured dissatisfaction. Recommendations do not automatically delete material.
- Product-specific preview privacy policy and terms, accessible before signup. Fill in the legal operator/contact and finalize launch policies before public registration.

The initial gallery shares **prompts**; image generation is not connected. The browser preview has no invented users or fabricated leaderboard results. Native folders are maintainable project shells, not signed or store-approved releases.

## Connect your Firebase project

Follow [Firebase setup](docs/FIREBASE-SETUP.md) to connect your existing project, fill in any missing `.env` values, enable the providers, and deploy rules/functions. Create a project only if you do not already have one. A web configuration alone does not deploy a backend.

The web app uses these public values:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_APPCHECK_SITE_KEY=
```

Restart Vite after changing them. Production callables require App Check. Google sign-in must be enabled and the hostname authorized. Email accounts must verify their address before onboarding, ranked play, or social features.

`VITE_FIREBASE_DATABASE_URL` is optional. Copy the exact URL from **Firebase Console → Realtime Database → Data** (under **Build** or **Databases & Storage**, depending on the console layout), or the web app SDK configuration's `databaseURL` after enabling Realtime Database. It has the form `https://DATABASE_NAME.firebaseio.com` or `https://DATABASE_NAME.REGION.firebasedatabase.app`. AI Space still stores profiles, chat, and rankings in **Cloud Firestore**; adding this URL does not migrate them. See [Firebase's Realtime Database setup](https://firebase.google.com/docs/database/web/start).

For AI drafting, `OPENAI_API_KEY` is a **server-only secret**; it never belongs in the web configuration. Configure `AI_SPACE_ENABLE_AI_AUTHOR=true` at function deployment and a supported `AI_SPACE_AUTHOR_MODEL`. Disabled authoring makes no model API calls.

## Verify

```bash
npm test                 # Catalog + backend logic tests
npm run build            # Generate learning pages, type-check, production build
npm run test:e2e          # Desktop/mobile Chrome checks; dev server must be running
npm run test:emulators    # Isolated demo-ai-space auth/Firestore/functions integration tests
npm --prefix functions run check
npm run native:sync      # Build + copy web assets + sync both native projects
```

Emulator tests require Firebase CLI and Java. Install backend dependencies first with `npm --prefix functions ci`. Tests refuse to execute outside emulators. Browser tests use installed Chrome and create isolated contexts. Authentication with real Google accounts, production App Check, and signed native devices still need live verification after configuration.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/App.tsx`, `src/styles.css` | Product screens and responsive visual system |
| `src/components/` | Auth, onboarding, quiz, moderator workspace, 3D world and avatar |
| `src/services/` | Firebase integration and privacy-conscious analytics |
| `src/content/legal.ts` | Preview terms and privacy policy |
| `functions/` | Server-authoritative accounts, quiz, community, moderation and diagnostics |
| `firestore.rules`, `firestore.indexes.json` | Access controls and query indexes |
| `library.html` | Original IoT technology map, including its original saved progress key |
| `data/` | Existing catalog records; preserved |
| `scripts/build-knowledge.mjs` | Generates `public/knowledge.json`, `public/learn/`, and sitemap |
| `ios/`, `android/`, `capacitor.config.ts` | Native project shells |
| `docs/AI-SPACE-STRATEGY.md` | Growth, SEO, analytics, improvement process, and launch roadmap |

Generated knowledge output is ignored by Git and rebuilt from the catalog. The original catalog continues to use `techweb:progress:v1`; the new preview uses separate `aispace:*` keys.

## Existing daily technology workflow

The existing daily workflow and catalog generation remain in place. `scripts/daily-agent.mjs` now reads **`library.html`**, since AI Space owns `index.html`. Existing catalog source records were not modified.

```bash
DAILY_AGENT_DRY_RUN=true FORCE_TECH_ID=python node scripts/daily-agent.mjs
DAILY_AGENT_DRY_RUN=true DAILY_AGENT_COUNT=1 node scripts/run-daily-batch.mjs
```

At implementation time, the seed queue had one unused entry. Add seeds before expecting the existing scheduled batch of ten to complete. `npm run build` regenerates the public learning pages after catalog updates. The backend’s catalog snapshot is regenerated by its deploy hook.

## Hosting and mobile

Use `dist/` as the hosting output. Firebase Hosting configuration is included. GitHub Pages needs **GitHub Actions** as its source, not the previous root-file publishing mode, because TypeScript source must be built. The included workflow builds on pushes and on completion of the daily catalog workflow; no deployment has been made by this implementation.

```bash
npm run native:sync
npx cap open ios
npx cap open android
```

See [mobile release notes](docs/MOBILE.md) for native authentication, App Check, signing, and actual store release prerequisites. The package identifier `com.aispace.community` is provisional and should be confirmed before registering store apps.

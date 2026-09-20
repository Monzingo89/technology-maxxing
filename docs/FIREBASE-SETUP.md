# AI Space Firebase setup

## Connect the project and web application

1. Open your existing project in the [Firebase console](https://console.firebase.google.com/), or create a project if needed.
2. Open your registered Web app, or add one if needed. Fill in any missing `.env` values using its public `firebaseConfig` values, preserving settings already entered. Leave server credentials out of browser code. Restart `npm run dev`.
3. Enable Authentication **Email/Password** and **Google**. Configure a support email, verification/reset templates, a password policy, and email-enumeration protection. Authorize the actual deployment domain plus local development hosts. `localhost` may require manual addition for new projects.
4. Ensure Cloud Firestore is configured; if creating it, use production mode and select an appropriate region before storing user data. Do not use permissive test rules.
5. Register web App Check using **reCAPTCHA v3**, matching `ReCaptchaV3Provider` in the adapter. In **Firebase Console → App Check → Apps → your web app → Register → reCAPTCHA v3**, paste the reCAPTCHA **secret key** and save. Put the corresponding public **site key** in `.env` as `VITE_FIREBASE_APPCHECK_SITE_KEY`, then restart Vite. Never put the secret key in a `VITE_` variable or browser code. Functions enforce App Check outside emulators. See [Firebase's App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-provider).
6. Set up the Firebase CLI and select your project. Backend deployment can require the Blaze billing plan even though AI Space is free for members. Set budgets and quotas before provisioning.

### Optional Realtime Database URL

If you have enabled Realtime Database, copy its exact URL from **Firebase Console → Realtime Database → Data** (under **Build** or **Databases & Storage**, depending on the console layout) into `VITE_FIREBASE_DATABASE_URL` in `.env`. You can also find it as `databaseURL` in the web app's SDK configuration after enabling the database.

The URL format depends on its region: `https://DATABASE_NAME.firebaseio.com` or `https://DATABASE_NAME.REGION.firebasedatabase.app`. Copy the console value rather than constructing it from the project ID, then restart Vite. See [Firebase's Realtime Database setup](https://firebase.google.com/docs/database/web/start).

This setting is optional. AI Space currently uses **Cloud Firestore** for profiles, chat, and rankings; configuring a Realtime Database URL does not migrate that data or replace Firestore setup.

### Deploy to the selected project

To publish only Firestore rules and indexes, use an explicit project ID that matches `VITE_FIREBASE_PROJECT_ID`:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

The canonical index configuration also applies `expiresAt` cleanup policies for presence, quiz sessions, analytics events, and rate limits. These TTL policies require billing to be enabled. For a project with billing disabled, publish an index configuration with the `ttl` properties omitted; retain all index definitions. Index creation and cleanup-policy activation can take time. Cloud Functions and hosting are separate deployments; the app's server-authoritative write actions require its functions to be deployed.

For a full backend and Firebase Hosting deployment:

```bash
firebase login
firebase use --add
npm ci
npm --prefix functions ci
npm run build
firebase deploy --only firestore,functions,hosting
```

Verify the exact selected project with `firebase use` or an explicit `--project` before deployment. Firestore rules and indexes have been published to `ai-space-f1d31`; see [deployment verification](FIRESTORE-DEPLOYMENT.md). Billing remains disabled, and the production Cloud Functions and website have not been deployed by this work.

## Production checks

- Google popup consent and email signup, verification, reset, login/logout.
- Two users racing for the same normalized username.
- Exactly one daily ranked attempt, server deadline, replay and direct database-write denial.
- Mutual invitations, private chat membership, block/report and moderation queues.
- App Check failures rejected, legitimate web requests accepted.
- Consent revocation stops optional events; recent-auth deletion removes dependent records.
- Test all query indexes against the deployed database.
- Finish the policy operator/contact fields and operate moderation before inviting real members.

Security rules deny **all client writes** to authoritative collections. Callable functions validate inputs and apply transactions. `accounts/` is private, public profiles do not contain email, and quiz answer data is inaccessible through client Firestore reads.

## AI of the Day

`generateDailyQuestions` runs at 00:10 UTC, drafting the following day’s questions. `functions/build-catalog.mjs` rebuilds the server’s reference snapshot from the repository at deployment. The author receives catalog facts, not user profiles, chats, or prompts.

- Default: no secret binding and no model calls; use the explicitly reviewed seed bank.
- To enable: create the Firebase secret `OPENAI_API_KEY`, set server `AI_SPACE_ENABLE_AI_AUTHOR=true`, choose `AI_SPACE_AUTHOR_MODEL`, and redeploy functions. Never prefix this key with `VITE_`.
- Generated questions need exact supporting catalog excerpts, valid answer schemas, and moderator approval. A missing, invalid, or unapproved bank falls back to reviewed starter questions.
- The Claude/OpenAI/Gemini community spotlight is a rotating visual theme. Current optional authoring uses the configured OpenAI model; there is no claim that all three providers generated the questions.

## Moderator access

Set a `moderator: true` custom claim for an authorized Firebase Auth UID using the trusted Admin SDK in your operator environment. Do not allow clients to set claims. Log in again to refresh claims. **Settings → Open moderator workspace** appears only for a moderator, and every privileged endpoint checks the claim independently.

The workspace exposes pending gallery prompts, quiz drafts with evidence and correct answers, reports, and aggregate metric recommendations. It does not invent traffic data or automatically remove catalog pages. Reports marked reviewed still need an actual operator response when required. Store launches need reachable support and a staffed moderation/appeals process.

## Local backend development

Use the isolated `demo-ai-space` project. Do not point automated tests at production.

```bash
npm --prefix functions ci
npm run test:emulators
```

For interactive emulator UI testing, create `.env.local` with public dummy config and `VITE_USE_FIREBASE_EMULATORS=true`, run `firebase emulators:start --project demo-ai-space`, and start Vite. Use `localhost` as the dummy auth domain. Only the development build honors the emulator switch. Remove the override when testing production.

The emulator suite checks verification, atomic username conflicts, denied writes, question secrecy, deadlines, replay, daily limits, messaging consent, blocking, pending-post privacy, analytics consent, school completion, and deletion. It does not prove native OAuth, real email delivery, production quotas, or live App Check.

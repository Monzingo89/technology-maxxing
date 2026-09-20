# Guest assessment allowance

The IoT app uses four callable Firebase Functions: `getGuestAllowance`,
`startGuestAssessment`, `completeGuestAssessment`, and `clearGuestAllowance`.
They are implemented in `functions/src/guest-quota.js` and exported by
`functions/src/index.js`.

The application stores an HMAC of a normalized network IP as the document key
in the server-only `guestAllowances` collection. A document contains a random
generation ID, at most five completed attempt IDs, and one active attempt with
an expiry. No raw IP, answers, email, or account ID is stored in this collection.
The default-deny Firestore rules prevent all client reads and writes.

A transaction reserves one attempt per network for 35 minutes. Starting or
abandoning an assessment does not count as completing it. Completion is
idempotent and capped at five. Counts have no time reset or TTL: they remain
until account authentication deletes them or an applicable deletion request is
fulfilled. Expired reservations are ignored/replaced on the next attempt.

On successful email or Google authentication (including an unverified new email
account), the frontend requests deletion. The server checks that the account
still exists and is enabled. It deletes the current network record and any prior
network record identified by a signed browser receipt. Receipts include a random
record generation so an old receipt cannot delete a newer record on a different
network. The browser retains receipts on failure and shows a deletion retry;
cleanup runs again on the next signed-in visit. No guest identifier is copied to
an account. Provider security/access logs and backups are outside this deletion.

## Configure and publish

Frontend edits alone do not enable IP enforcement on a static host. Deploy the
four functions, server secret, rules, and updated frontend to the intended
Firebase project/site. Check the selected project before deploying. Existing
setup is documented in [FIREBASE-SETUP.md](FIREBASE-SETUP.md).

1. Configure Firebase Authentication, Firestore, and production App Check. The
   frontend needs the `VITE_FIREBASE_*` configuration and
   `VITE_FIREBASE_APPCHECK_SITE_KEY` at build time. Production callables enforce
   App Check. A billed Firebase plan is required for deploying Functions.
2. Create the server-only `GUEST_IP_HASH_KEY` secret with at least 32 random bytes.
   Use Firebase Secret Manager, never a `VITE_` variable or committed file. For
   example, with the verified target project substituted:

   ```bash
   openssl rand -hex 32 | firebase functions:secrets:set GUEST_IP_HASH_KEY --data-file=- --project YOUR_PROJECT_ID
   ```

   Keep this secret stable: replacing it changes IP identifiers and resets lookup
   of existing allowances. Plan migration/deletion before rotation; otherwise
   old records become orphaned. There is no production fallback secret.
3. Run `npm test`, `npm run build`, and `npm --prefix functions run check`.
4. Deploy the four functions and Firestore rules to the explicit project:

   ```bash
   firebase deploy --only functions:getGuestAllowance,functions:startGuestAssessment,functions:completeGuestAssessment,functions:clearGuestAllowance,firestore:rules --project YOUR_PROJECT_ID
   ```

   Publish the generated `dist/` frontend through the configured hosting workflow.
   `index.html` is the Vite source entry; do not replace it with generated HTML
   pointing at an older root `assets/` bundle.
5. Verify from two actual networks that returning visits and private browsing
   retain the count, the sixth completion is refused, signup deletes the matching
   records, unauthenticated deletion is refused, and the web App Check requests
   succeed. A production network/proxy test remains necessary after deployment.

Unconfigured development (`npm run dev`) retains a clearly marked local-only
preview. Production builds with missing Firebase configuration disable guest
assessments; configured builds never fall back to a browser-only allowance if a
server request fails.

## Network trust boundary and limitations

These callables are invoked **directly by the Firebase Functions SDK**, without a
Firebase Hosting rewrite, custom CDN, or additional load balancer. IP extraction
uses the final address in the managed ingress's `X-Forwarded-For` chain, not an
arbitrary client-supplied first address. Missing or invalid addresses fail closed.
Verify that this address is the client network at the actual deployed endpoint;
changing the proxy topology requires revisiting the trusted suffix. See
[Google's request header documentation](https://docs.cloud.google.com/functions/docs/reference/headers).

IP addresses identify networks, not people. Shared networks share five attempts;
VPNs/changing IPs may bypass recognition. Deleting the IP record upon account
creation intentionally prevents a permanent IP block after registration. Local
browser counts may still remember that the visitor used five attempts. Question
banks/scoring remain browser-side, so this is an allowance control, not secure
exam proctoring or a guarantee against modified clients.

## Local verification

Use only the `demo-ai-space` emulators. Set an emulator-only key of 32+ characters
in the ignored `functions/.secret.local` file:

```text
GUEST_IP_HASH_KEY=guest-quota-emulator-only-not-a-production-secret
```

```bash
firebase emulators:start --project demo-ai-space --only auth,firestore,functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node functions/test/guest-emulator.mjs
```

The integration script clears only the demo emulator's guest collection and
creates a disposable emulator account. It tests concurrent completions, the
five-completion cap, returning requests, forbidden direct reads, anonymous delete
rejection, and deletion by a newly created unverified account. Unit tests cover
IPv6 normalization, forged/stale receipts, expiry, failed auth and cleanup races.

## Policy references

The policies at `/#privacy` and `/#terms` explain current essential processing,
local progress, the not-for-profit purpose, IP quota retention/deletion, and
notice/consent for material future changes. They avoid a false "we collect
nothing" claim and do not promise deletion of independent provider logs. Sources:
[Firebase privacy and retention](https://firebase.google.com/support/privacy) and
[FTC guidance on changes to data use](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/02/ai-other-companies-quietly-changing-your-terms-service-could-be-unfair-or-deceptive).

For the browser workflow checks, start a separate Vite preview against the demo
emulators (the original local preview can remain running):

```bash
VITE_FIREBASE_API_KEY=emulator-only-key VITE_FIREBASE_PROJECT_ID=demo-ai-space VITE_FIREBASE_APP_ID=demo-app VITE_FIREBASE_AUTH_DOMAIN=localhost VITE_FIREBASE_APPCHECK_SITE_KEY= VITE_USE_FIREBASE_EMULATORS=true npm run dev -- --port 5174 --strictPort
GUEST_EMULATOR_TESTS=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 npx playwright test tests/iot-guest.spec.ts tests/iot-policy.spec.ts
```

The quota browser tests require the explicit emulator flag and exact local URL;
they are skipped in ordinary browser runs. They test five completed assessments,
a fresh browser retaining zero allowance, idempotent recovery from a lost
completion response, signup deletion, server outage blocking, and expired
attempt recovery. Policy/form/new-tab checks cover desktop and mobile.

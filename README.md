# TECHWEB — technology-maxxing

A single-file, zero-dependency web of technologies. Browse nodes, hop connections,
self-rate your level 1–5 per tech, and ✓ off challenges as you complete them.

- `index.html` — the whole app (content in `DATA`, render functions, cloud-sync module)
- `data/` — JSON written by the daily agent (`scripts/daily-agent.mjs`)
- Progress = per-tech score + per-challenge ✓, stored in localStorage key
  `techweb:progress:v1`, and synced to Firestore when signed in with Google.

## Daily technology workflow

`.github/workflows/daily-technology-agent.yml` runs every day at **5:00 PM
America/Chicago**. Each scheduled run:

1. Enriches the next existing technology that does not have an extension yet.
2. Adds exactly **10 new technologies** using the remaining entries in
   `.daily-agent/new-technologies-seed.json` first, then asks the model to fill
   any open slots from the map's missing relationship frontier.
3. Writes the generated structures to `data/`, updates
   `.daily-agent/state.json`, commits the results, and pushes them to `main`.

The agent only needs to add structured technology content; `index.html` already
loads and renders both `data/generated-technologies.json` and
`data/technology-extensions.json`.

The workflow requires the repository secret
`OPENAI_TECH_MAXXING_API_KEY`. A manual dry run validates planning without API
calls or file changes:

```bash
gh workflow run daily-technology-agent.yml \
  -f dryRun=true \
  -f newTechCount=10
```

A live manual run uses the same 10-technology path as the daily schedule:

```bash
gh workflow run daily-technology-agent.yml \
  -f dryRun=false \
  -f newTechCount=10
```

## Google login setup (one-time, ~10 minutes)

The site works fully without login (progress stays in the browser's localStorage).
Enabling Google sign-in makes progress follow the user across devices. It uses
Firebase Auth + Firestore — free tier, no backend server needed, works on GitHub Pages.

1. **Create a Firebase project** at <https://console.firebase.google.com>
   (any name, Analytics not needed).
2. **Add a Web app** (Project settings → General → "Your apps" → `</>` icon).
   Copy the `firebaseConfig` object it shows you.
3. **Enable Google sign-in**: Build → Authentication → Get started →
   Sign-in method → Google → Enable (pick your support email) → Save.
4. **Create the database**: Build → Firestore Database → Create database →
   Production mode → any region.
5. **Set security rules** (Firestore Database → Rules) so each user can only
   read/write their own progress doc:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

6. **Authorize your domains**: Authentication → Settings → Authorized domains.
   `localhost` is pre-authorized; add `monzingo89.github.io` (or wherever the
   site is hosted).
7. **Paste the config** into `index.html`: find `const FIREBASE_CONFIG = null;`
   in the cloud-sync module at the bottom and replace `null` with the config
   object from step 2. The config is public app metadata, not a secret — it is
   safe to commit.

Reload the site: a **SIGN IN** button appears in the header. Signed in, it shows
the user's Google avatar; tapping it signs out.

### How sync behaves

- Signed out: progress saves to localStorage only.
- On sign-in: local and cloud progress are **merged** (higher score wins,
  ✓ marks are unioned), so nothing is ever lost, then written back to
  `users/<uid>` in Firestore.
- Every change while signed in is mirrored to Firestore (debounced 400 ms).
- Signing out keeps progress both locally and in the cloud.

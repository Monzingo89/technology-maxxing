# Topic videos: activation and operation

The default `#videos` page is public. Nothing is generated on a visitor request.
After scrolling past the last available clip, signed-out visitors go to `#home`
with login and signup buttons. Empty or failed feeds do not redirect. Signed-in
viewers go to `#library` after the final clip. On mobile, published clips fill
the viewport with vertical scroll snapping; an overlay Library link exits the
feed, and owners can switch to Manage videos for private draft review.
Only the verified **vcv@robertjmonzingo.com** Google account can reserve jobs,
generate, stage uploads, review drafts, or publish. Existing Firebase moderators
do not receive this permission. Email/password login, even for that email, does
not qualify: use **Continue with Google**.

## Keys and runtime settings

The frontend remains on Vercel. Processing, storage and authorization run on
Firebase; putting provider keys in Vercel or a `VITE_` variable will not configure
this backend. Never commit keys.

1. Reauthenticate Firebase: `firebase login --reauth`.
2. Use the existing Firebase project whose ID matches `VITE_FIREBASE_PROJECT_ID`.
   Enable billing (Blaze), Firestore, Google Authentication and Cloud Storage.
   Set `VITE_FIREBASE_STORAGE_BUCKET` to that project's actual default bucket.
3. Copy `functions/.env.example` to ignored `functions/.env`. It contains the
   model names, voice ID, generation switch, and daily limit (3).
4. Set the two **production secrets** interactively:

   ```sh
   firebase functions:secrets:set GEMINI_API_KEY --project YOUR_PROJECT_ID
   firebase functions:secrets:set ELEVENLABS_API_KEY --project YOUR_PROJECT_ID
   ```

   Alternatively, fill the two placeholders in ignored `functions/.secret.local`
   (copy the example first on a fresh checkout), then run:

   ```sh
   npm run video:secrets -- --project ai-space-f1d31
   ```

   `ai-space-f1d31` is the current checkout's configured Firebase project. The
   helper passes values through stdin, never command arguments or console output.
   It rejects blank placeholders before making any API requests. The helper does
   not deploy functions; continue with the deployment below.

   Google AI Studio must have paid API access to Gemini Omni Flash. ElevenLabs
   needs speech credits and a suitable license for your use. A consumer Gemini
   subscription alone is not the API billing setup.
5. Configure Firebase App Check using the existing
   `VITE_FIREBASE_APPCHECK_SITE_KEY` public setting and authorized production
   domain. Production video callables require App Check, in addition to Auth.
6. Install and build:

   ```sh
   npm ci
   npm --prefix functions ci
   npm run build
   node scripts/build-video-catalog.mjs
   ```

   The Functions build must allow the pinned `ffmpeg-static` installation script
   to download its platform binary. The package is used only in backend media
   processing. `ffprobe-static` supplies the media validation binary.
7. Deploy rules and only the new video functions, using the explicit project ID:

   For this project's isolated video deployment, run `npm run video:deploy`.
   It stages a video-only entry point under ignored `.firebase/video-functions`
   so unrelated assessment and email secrets are not required. The command
   explicitly selects the six video functions; it does not deploy or delete
   other functions. `functions/.env` must exist; secrets are never staged.
   For another project, use the equivalent command below with
   `--config firebase.video.json` added.

   ```sh
   firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,storage,functions:ai-space:videoOwnerStatus,functions:ai-space:requestTopicVideo,functions:ai-space:generateTopicVideo,functions:ai-space:processVideoUpload,functions:ai-space:publishTopicVideo,functions:ai-space:discardTopicVideo
   ```

   Accept Firebase's requested cross-service permission for Storage rules to
   check Firestore upload reservations. Storage/Eventarc and service-agent
   provisioning may be required on a new project. The default bucket's location
   must support the worker's `us-central1` region; adjust the worker region to
   match if your existing bucket requires it.
8. Set bucket CORS for authenticated draft previews. Inspect existing CORS and
   merge `storage.cors.json` origins if the bucket serves other applications;
   do not blindly replace their configuration. With a dedicated bucket:

   ```sh
   gcloud storage buckets update gs://YOUR_STORAGE_BUCKET --cors-file=storage.cors.json
   ```

9. Rebuild the Vercel frontend after changing any public Firebase configuration.
   Sign in with Google, open Videos, generate React/Docker/Agentic RAG, play each
   private draft, and select **Publish reviewed video**. The public feed updates
   automatically. Every Library topic without a video has the owner controls.

For emulator-only keys, copy `functions/.secret.local.example` to ignored
`functions/.secret.local` and fill the two blank values. That file is **not** a
production secret deployment mechanism. There are no real keys in the templates.

## Behavior and safeguards

- Published MP4s are persistent per-topic assets, not generated on playback.
  Each version has a unique storage URL and one-year immutable public browser
  cache headers. Cache eviction may download the same MP4 again, but never calls
  Gemini or ElevenLabs. Storage/bandwidth charges still apply. Cached public
  downloads cannot be recalled from viewers' devices.

- One published video per catalog topic. Transactions reject duplicates and
  simultaneous jobs. Daily limits include failed generations; there are no
  automatic paid retries. Three scenes are generated for each request.
- Owner verification includes the Google sign-in provider, verified email,
  current account record, disabled state, and token revocation timestamp.
- Firestore browser writes are denied, including for the owner. Staging uploads
  need a server-created reservation; only a fresh MP4 object up to 40 MB is
  accepted. Upload URLs, arbitrary prompts, scripts and model IDs from clients
  are never accepted. Storage overwrite and unexpected custom metadata are denied.
  The upload processor removes SDK-issued staging download tokens before processing.
- Private media is probed and transcoded with external media protocols disabled.
  Uploaded videos must be portrait, contain audio and run 29.5–30.5 seconds.
  Published output is normalized to 720×1280 H.264/AAC MP4 and 30 seconds.
- Generated videos combine Gemini Omni visuals and Eleven v4 narration through
  the Text to Dialogue API. Set `VIDEO_VOICE_MODEL=eleven_v3` for the older TTS
  endpoint if needed; there is no automatic paid fallback. The
  three starter scripts are authored in source; other scripts are based on the
  server's catalog snapshot. Captions and transcript accompany generated videos.
  Uploaded videos should have captions burned in by the owner.
- Review is mandatory before public publication. Model output can be inaccurate;
  unwanted drafts can be discarded so a new request can be made within the daily limit.
  review facts, narration, diagrams and pacing. Short generated scenes can loop
  to fill their ten-second segment. No quality claim is implied by a successful
  API response.
- Only reviewed media gets a public playback token. Published videos are public
  and downloadable by design. Draft previews use authenticated Storage access.
- Feed pages load six at a time. Only the visible clip plays, offscreen clips
  release their source, hidden tabs pause, reduced-motion users start manually,
  and audio is muted until enabled.
- Abandoned reservations expire after 20 minutes; review locks last 24 hours.
  Generation workers do not retry events to avoid duplicate provider charges.
  If a worker is killed, wait for its lease to expire before retrying. Review
  drafts promptly before a new job supersedes their lock.
- Provider errors do not expose keys or response bodies. Provider credentials
  never enter browser bundles. Admin SDK/IAM operators remain trusted: these
  application rules cannot restrict a Google Cloud project administrator.

Configure bucket lifecycle retention for `video-staging/` (1 day) and
`video-drafts/` (7 days) if desired; preserve `published-videos/`. No deletion
policy is silently applied to an existing bucket.

## Verification

```sh
npm test
npm run build
npm --prefix functions run check
npm run test:video-security
npm run test:video-media
npm run dev
npx playwright test tests/videos.spec.ts tests/video-playback.spec.ts tests/discovery.spec.ts
```

Before calling the service live, verify a real owner sign-in, rejection of a
different Google user, one paid generation, one upload, private preview, publish,
and public mobile playback in the deployed Firebase project. These require valid
Firebase authentication, deployed rules/functions, configured App Check and keys.

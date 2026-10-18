# Video views and the one-minute migration

Views start at zero; historical watches are not reconstructed. The player reports
after three seconds of visible, advancing playback, excluding pauses and seeks.
The count is approximate: one browser/topic/UTC day, not unique people. Clearing
storage can reset a browser identity. App Check is enforced; a transactional
receipt prevents duplicate reports and a 200-report network/day cap limits abuse.
No client writes are granted. `VIDEO_VIEW_HASH_KEY` is a random server-only Secret
Manager value, separate from the paid provider keys. Receipts live in `videoViewReceipts`
with a two-day expiry, removed asynchronously by Firestore TTL on `expiresAt`. Aggregate views are
stored on `topicVideos` and updated by the realtime feed listener.

## October 17, 2026, 7 PM America/Chicago

A one-time local macOS launchd job, `com.monzingo.technology-minute-videos`, resumes
the four replacements after the Google quota reset. This is not a cloud cron:
the Mac must be powered on, logged in, and online. If asleep it can run on wake
within 12 hours. The job prevents idle sleep while running, not before it starts.
It does not rerun nightly and never automatically retries paid failures.

Local configuration: `~/Library/LaunchAgents/com.monzingo.technology-minute-videos.plist`.
Artifacts/logs: `~/Library/Application Support/TechnologyMaxxing/minute-2026-10-17/`.
`schedule.log` records progress; `scheduled-result.json` records success/failure.
`scheduled-attempt.json` prevents another automatic attempt even after failure.
Secrets are obtained in memory through the existing Firebase CLI login; do not
copy authentication files or provider keys into the repository or scheduler.

The runner executes `prepare`, `validate`, then `publish` using
`scripts/regenerate-minute-videos.mjs`. Successful provider responses are cached
to avoid paying twice; the already prepared React video is reused. New UTC budget
documents are initialized safely. All four must pass 59-second, portrait, audio,
intro, and script checks before publication. Original files stay available for
rollback. All public pointers switch in a transaction that preserves view counts
and refuses to overwrite a changed video URL. No owner generation permissions
are expanded. The existing owner Generate button already uses the same format.

Check the schedule without spending credits:

```sh
node scripts/run-minute-migration-once.mjs "/absolute/artifact/directory" 2026-10-18T00:00:00.000Z --check
launchctl print gui/501/com.monzingo.technology-minute-videos
```

If generation fails, investigate the log and obtain approval before another paid
attempt. Do not erase the cache or reset daily budget counters. The scheduled job
starting at 7 PM does not mean the replacements finish at 7 PM.

## Approved retry: October 18, 2026, 7:01 PM America/Chicago

The October 17 attempt failed at 7:00:33 PM with Google's daily-quota HTTP 429.
No published video was replaced. The user approved one retry at least 24 hours
later. `com.monzingo.technology-minute-videos-retry` is installed locally for
October 18 at 7:01 PM CDT (`2026-10-19T00:01:00.000Z`). The same Mac availability
requirements and one-attempt/12-hour expiry safeguards apply.

Retry artifacts: `~/Library/Application Support/TechnologyMaxxing/minute-2026-10-18-retry/`.
Completed media and successful provider responses were copied from the original
attempt, without its attempt lock or budget reservation. Original failure logs
remain intact. The retry reserves the new day's budget without resetting counters.
Quota availability is not guaranteed; another provider failure stops the job.

## Learn-to-start playback

The feed stays paused until the visitor taps the centered Learn control. That
real gesture unmutes and starts the persistent player; subsequent swipes reuse
it with sound enabled. Clips loop until the visitor scrolls, and tapping a clip
still pauses/resumes playback. No synthetic click or autoplay-policy bypass is used.

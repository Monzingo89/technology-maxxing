// Tier 1: $10 per rolling 10 minutes. Reserve one entire ~$6 video
// with margin; drain the window after the last request. Shared by all workers.
export const GOOGLE_WINDOW_MS = 600000;
export const GOOGLE_REQUEST_GAP_MS = 60000;
export const GOOGLE_VIDEO_RESERVE_USD = 7.5;
export const GOOGLE_VIDEO_DAILY_LIMIT = 20;
export const googleQuotaDay = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
export function nextGoogleQuotaDay(now) {
  const day = googleQuotaDay(now);
  let low = now,
    high = now + 27 * 3600000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (googleQuotaDay(mid) === day) low = mid;
    else high = mid;
  }
  return high;
}
export const googleBudgetRef = (db) =>
  db.collection("videoProviderBudgets").doc("google-video");
export function videoReservation(current, now, jobId) {
  if (current?.billingBlocked)
    throw Error(
      "Google video generation is paused because prepay credits are depleted. Add credits in Google AI Studio, then resume generation.",
    );
  if (
    current?.dailyDay === googleQuotaDay(now) &&
    Number(current.dailyVideoRequests || 0) + 6 > GOOGLE_VIDEO_DAILY_LIMIT
  ) {
    const error = Error(
      "Google's 20-video-request daily allowance has insufficient room for six scenes. No provider request was sent.",
    );
    error.retryAt = nextGoogleQuotaDay(now);
    throw error;
  }
  if (Number(current?.nextStartAt || 0) > now) {
    const error = Error(
      `Google generation is cooling down. Next start: ${new Date(current.nextStartAt).toISOString()}. No provider request was sent.`,
    );
    error.retryAt = current.nextStartAt;
    throw error;
  }
  return {
    jobId,
    reservedUsd: GOOGLE_VIDEO_RESERVE_USD,
    startedAt: now,
    nextStartAt: now + 540000 + GOOGLE_WINDOW_MS,
  };
}
export function retryAfterMs(value, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Math.max(0, Number.isFinite(delay) ? delay : 0);
}
export function googleRateControls(
  db,
  jobId,
  progress = async () => {},
  options = {},
) {
  const now = options.now || Date.now;
  const sleep =
    options.sleep ||
    ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const ref = googleBudgetRef(db);
  return {
    async beforeGoogleRequest(url = "") {
      const wait = await db.runTransaction(async (tx) => {
        const current = (await tx.get(ref)).data();
        if (current?.jobId !== jobId)
          throw Error("Google generation reservation was lost.");
        if (current?.billingBlocked)
          throw Error("Google generation is paused for depleted credits.");
        const dailyDay = googleQuotaDay(now());
        const dailyVideoRequests =
          current?.dailyDay === dailyDay
            ? Number(current.dailyVideoRequests || 0)
            : 0;
        if (url.includes("/interactions")) {
          if (dailyVideoRequests >= GOOGLE_VIDEO_DAILY_LIMIT)
            throw Error(
              "Google's daily video request allowance is exhausted. No request was sent.",
            );
          tx.set(
            ref,
            { dailyDay, dailyVideoRequests: dailyVideoRequests + 1 },
            { merge: true },
          );
        }
        const at = Math.max(now(), Number(current.nextRequestAt || 0));
        tx.set(
          ref,
          { nextRequestAt: at + GOOGLE_REQUEST_GAP_MS },
          { merge: true },
        );
        return Math.max(0, at - now());
      });
      if (wait) {
        await progress(
          `Waiting ${Math.ceil(wait / 1000)} seconds for the Google request allowance.`,
        );
        await sleep(wait);
      }
    },
    async finish(error) {
      await db.runTransaction(async (tx) => {
        const current = (await tx.get(ref)).data();
        if (current?.jobId !== jobId) return;
        tx.set(
          ref,
          {
            nextStartAt:
              now() + Math.max(GOOGLE_WINDOW_MS, error?.retryAfterMs || 0),
            finishedAt: now(),
            ...(error?.status === 429 ? { lastRateLimitedAt: now() } : {}),
            ...(error?.status === 402 ? { billingBlocked: true } : {}),
          },
          { merge: true },
        );
      });
    },
  };
}

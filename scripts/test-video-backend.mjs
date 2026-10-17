import assert from "node:assert/strict";
import { createRequire } from "node:module";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw Error("Emulators required; never run against production.");
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
initializeApp({
  projectId: "demo-video-security",
  storageBucket: "demo-video-security.appspot.com",
});
process.env.VIDEO_GENERATION_ENABLED = "true";
process.env.VIDEO_DAILY_LIMIT = "3";
process.env.VIDEO_VIEW_HASH_KEY = "test-only-key-not-a-production-secret-1234567890";
const {
  requestTopicVideo,
  publishTopicVideo,
  discardTopicVideo,
  videoOwnerStatus,
  recordVideoView,
} = await import("../functions/src/videos.js");
const account = await getAuth().createUser({
  email: "vcv@robertjmonzingo.com",
  emailVerified: true,
});
await getAuth().updateUser(account.uid, {
  providerToLink: {
    providerId: "google.com",
    uid: "google-owner",
    email: account.email,
  },
});
const token = {
  email: account.email,
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
  auth_time: Math.floor(Date.now() / 1000) + 1,
};
const auth = { uid: account.uid, token };
const call = (fn, data, identity = auth) => fn.run({ auth: identity, data });
assert.deepEqual(await call(videoOwnerStatus, {}), { owner: true });
await assert.rejects(
  call(requestTopicVideo, { topicId: "react", mode: "generate" }, null),
  { code: "unauthenticated" },
);
await assert.rejects(
  call(
    requestTopicVideo,
    { topicId: "react", mode: "generate" },
    { ...auth, token: { ...token, email: "other@gmail.com" } },
  ),
  { code: "permission-denied" },
);
await assert.rejects(
  call(
    requestTopicVideo,
    { topicId: "react", mode: "generate" },
    {
      ...auth,
      token: { ...token, firebase: { sign_in_provider: "password" } },
    },
  ),
  { code: "permission-denied" },
);
await assert.rejects(
  call(requestTopicVideo, { topicId: "../react", mode: "generate" }),
  { code: "invalid-argument" },
);
const races = await Promise.allSettled(
  Array.from({ length: 3 }, () =>
    call(requestTopicVideo, { topicId: "react", mode: "generate" }),
  ),
);
assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(
  races.filter(
    (r) => r.status === "rejected" && r.reason.code === "already-exists",
  ).length,
  2,
);
await call(requestTopicVideo, { topicId: "docker", mode: "generate" });
await call(requestTopicVideo, { topicId: "agentic_rag", mode: "generate" });
await assert.rejects(
  call(requestTopicVideo, { topicId: "python", mode: "generate" }),
  { code: "resource-exhausted" },
);
const jobId = races.find((r) => r.status === "fulfilled").value.jobId;
const db = getFirestore(),
  bucket = getStorage().bucket();
const objectPath = `video-drafts/${account.uid}/${jobId}.mp4`;
await bucket
  .file(objectPath)
  .save(Buffer.from("Test-only draft; no provider calls."));
await db
  .collection("videoJobs")
  .doc(jobId)
  .update({ status: "review", objectPath });
const publishRace = await Promise.allSettled([
  call(publishTopicVideo, { jobId }),
  call(publishTopicVideo, { jobId }),
]);
assert.equal(publishRace.filter((r) => r.status === "fulfilled").length, 1);
const published = (
  await db.collection("topicVideos").doc("react").get()
).data();
assert.ok(published.url.includes("alt=media"));
const view = (visitorId, topicId = "react") => recordVideoView.run({
  data: { topicId, visitorId }, rawRequest: { headers: { "x-forwarded-for": "192.0.2.1" } },
});
const visitorId = "00000000-0000-4000-8000-000000000001";
const views = await Promise.all([view(visitorId), view(visitorId), view(visitorId)]);
assert.equal(views.filter((v) => v.counted).length, 1);
assert.equal((await db.collection("topicVideos").doc("react").get()).data().views, 1);
await view("00000000-0000-4000-8000-000000000002");
assert.equal((await db.collection("topicVideos").doc("react").get()).data().views, 2);
await assert.rejects(view("bad"), { code: "invalid-argument" });
await assert.rejects(view(visitorId, "unpublished"), { code: "not-found" });
await assert.rejects(view(visitorId, "../react"), { code: "invalid-argument" });
const budgets = await db.collection("videoViewReceipts").get();
const ipBudget = budgets.docs.find((doc) => doc.id.startsWith("video-view-ip-"));
assert.ok(ipBudget);
await ipBudget.ref.update({ count: 200 });
await assert.rejects(view("00000000-0000-4000-8000-000000000003"), { code: "resource-exhausted" });
assert.deepEqual(await view(visitorId), { counted: false });
assert.ok(budgets.docs.every((doc) => doc.data().expiresAt && !JSON.stringify(doc.data()).includes("192.0.2.1")));
const [metadata] = await bucket
  .file(`published-videos/react/${jobId}.mp4`)
  .getMetadata();
assert.equal(metadata.cacheControl, "public, max-age=31536000, immutable");
assert.equal(
  new URL(published.url).searchParams.get("token"),
  metadata.metadata.firebaseStorageDownloadTokens,
);
await assert.rejects(
  call(requestTopicVideo, { topicId: "react", mode: "upload" }),
  { code: "already-exists" },
);
await assert.rejects(
  call(requestTopicVideo, { topicId: "react", mode: "generate" }),
  { code: "already-exists" },
);
assert.equal(
  (await db.collection("topicVideos").doc("react").get()).data().url,
  published.url,
);
await assert.rejects(call(discardTopicVideo, { jobId }), {
  code: "permission-denied",
});
const draft = await call(requestTopicVideo, {
  topicId: "python",
  mode: "upload",
});
await db.collection("videoJobs").doc(draft.jobId).update({ status: "review" });
await call(discardTopicVideo, { jobId: draft.jobId });
assert.equal(
  (await db.collection("videoLocks").doc("python").get()).exists,
  false,
);
await getAuth().updateUser(account.uid, { disabled: true });
await assert.rejects(call(videoOwnerStatus, {}), { code: "permission-denied" });
console.log(
  "Backend passed: Google owner, anonymous/other-provider rejection, concurrent job deduplication, daily cap, publish race, matching playback token, duplicate publication prevention, draft discard, disabled account rejection. No paid calls.",
);

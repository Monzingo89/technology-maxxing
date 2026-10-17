import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { defineSecret } from "firebase-functions/params";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID, createHash, createHmac } from "node:crypto";
import { requestIp } from "./guest-quota.js";
import {
  canStartVideo,
  isVideoOwner,
  validTopicId,
  JOB_LEASE_MS,
  MAX_UPLOAD_BYTES,
  videoBudgetWindow,
  videoLimitMessage,
  VIDEO_DURATION,
  VIDEO_FORMAT,
} from "./video-policy.js";
import { generateVideo, normalizeUpload, probe } from "./video-media.js";

const gemini = defineSecret("GEMINI_API_KEY");
const eleven = defineSecret("ELEVENLABS_API_KEY");
const viewIpKey = defineSecret("VIDEO_VIEW_HASH_KEY");
const options = {
  region: "us-central1",
  maxInstances: 2,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true",
};
const workerOptions = {
  region: "us-central1",
  maxInstances: 1,
  concurrency: 1,
  memory: "2GiB",
  cpu: 2,
  timeoutSeconds: 540,
  retry: false,
};
const catalog = () =>
  JSON.parse(
    readFileSync(new URL("./video-catalog.json", import.meta.url), "utf8"),
  );
const jobs = () => getFirestore().collection("videoJobs");
// Public playback never needs sign-in. App Check and server-side deduplication
// protect this analytics-only endpoint; clients cannot write counts or videos.
export const recordVideoView = onCall({ ...options, secrets: [viewIpKey] }, async (request) => {
  const { topicId, visitorId } = request.data || {};
  if (!validTopicId(topicId) || typeof visitorId !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitorId))
    throw new HttpsError("invalid-argument", "Invalid view.");
  let ip;
  try { ip = requestIp(request.rawRequest, process.env.FUNCTIONS_EMULATOR === "true"); }
  catch { throw new HttpsError("invalid-argument", "Missing request origin."); }
  const key = viewIpKey.value();
  if (!key || key.length < 32) throw new HttpsError("unavailable", "View reporting unavailable.");
  const db = getFirestore(), day = new Date().toISOString().slice(0, 10);
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const receipt = db.collection("videoViewReceipts").doc(`video-view-${hash(`${day}:${topicId}:${visitorId}`)}`);
  const budget = db.collection("videoViewReceipts").doc(`video-view-ip-${createHmac("sha256", key).update(`video:${day}:${ip}`).digest("hex")}`);
  const video = db.collection("topicVideos").doc(topicId);
  // Firestore TTL removes expired receipts. Never persist raw IPs or browser
  // IDs; receipts expire after two days (physical deletion is asynchronous).
  const expiresAt = new Date(Date.now() + 2 * 86400000);
  return db.runTransaction(async (tx) => {
    const [published, seen, daily] = await Promise.all([tx.get(video), tx.get(receipt), tx.get(budget)]);
    if (!published.exists) throw new HttpsError("not-found", "Video not found.");
    if (seen.exists) return { counted: false };
    if ((daily.data()?.count || 0) >= 200)
      throw new HttpsError("resource-exhausted", "View reporting limit reached.");
    tx.create(receipt, { expiresAt });
    tx.set(budget, { count: (daily.data()?.count || 0) + 1, expiresAt });
    tx.update(video, { views: FieldValue.increment(1) });
    return { counted: true };
  });
});
async function owner(request) {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in with Google.");
  let account;
  try {
    account = await getAuth().getUser(request.auth.uid);
  } catch {
    throw new HttpsError("permission-denied", "Owner access required.");
  }
  if (!isVideoOwner(request.auth.token, account))
    throw new HttpsError(
      "permission-denied",
      "Only the verified site owner can manage videos.",
    );
  return request.auth.uid;
}
export const videoOwnerStatus = onCall(options, async (request) => {
  await owner(request);
  return { owner: true };
});
export const requestTopicVideo = onCall(options, async (request) => {
  const uid = await owner(request);
  const { topicId, mode } = request.data || {};
  if (!validTopicId(topicId) || !["generate", "upload"].includes(mode))
    throw new HttpsError(
      "invalid-argument",
      "Choose a catalog topic and action.",
    );
  const topic = catalog().find((t) => t.id === topicId);
  if (!topic) throw new HttpsError("not-found", "Topic not found.");
  if (mode === "generate" && process.env.VIDEO_GENERATION_ENABLED !== "true")
    throw new HttpsError(
      "failed-precondition",
      "Video generation is not configured yet.",
    );
  const db = getFirestore(),
    job = jobs().doc(),
    now = Date.now();
  const lock = db.collection("videoLocks").doc(topicId);
  const { day, resetsAt } = videoBudgetWindow(now);
  const budget = db
    .collection("videoBudgets")
    .doc(day);
  const cap = Math.min(
    20,
    Math.max(1, Number(process.env.VIDEO_DAILY_LIMIT) || 10),
  );
  await db.runTransaction(async (tx) => {
    const [published, current, daily] = await Promise.all([
      tx.get(db.collection("topicVideos").doc(topicId)),
      tx.get(lock),
      tx.get(budget),
    ]);
    if (!canStartVideo(published.exists, current.data(), now))
      throw new HttpsError(
        "already-exists",
        "This topic already has a video or an active job.",
      );
    const counter = mode === "generate" ? "generations" : "uploads";
    const limit = mode === "generate" ? cap : 20;
    if ((daily.data()?.[counter] || 0) >= limit)
      throw new HttpsError("resource-exhausted", videoLimitMessage(mode, limit, resetsAt), {
        reason: "daily-video-limit", limit, resetsAt,
      });
    tx.set(
      budget,
      { [counter]: (daily.data()?.[counter] || 0) + 1 },
      { merge: true },
    );
    tx.set(lock, { jobId: job.id, expiresAt: now + JOB_LEASE_MS });
    tx.create(job, {
      topicId,
      uid,
      mode,
      topic,
      status: mode === "generate" ? "queued" : "uploading",
      createdAt: now,
      expiresAt: now + JOB_LEASE_MS,
    });
  });
  return {
    jobId: job.id,
    uploadPath: mode === "upload" ? `video-staging/${uid}/${job.id}.mp4` : null,
  };
});

async function claim(ref, expected, next = "processing") {
  return getFirestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (
      !snapshot.exists ||
      snapshot.data().status !== expected ||
      (expected !== "review" && snapshot.data().expiresAt < Date.now())
    )
      return null;
    tx.update(ref, { status: next, startedAt: Date.now() });
    return snapshot.data();
  });
}
async function activeOwner(uid) {
  const account = await getAuth().getUser(uid);
  return isVideoOwner(
    {
      email: account.email,
      email_verified: account.emailVerified,
      firebase: { sign_in_provider: "google.com" },
      auth_time: Date.now() / 1000,
    },
    account,
  );
}
async function fail(ref) {
  // Deliberately do not expose provider responses, tokens, scripts or uploaded bytes in logs.
  await getFirestore().runTransaction(async (tx) => {
    const job = (await tx.get(ref)).data();
    if (!job) return;
    const lock = getFirestore().collection("videoLocks").doc(job.topicId);
    const current = await tx.get(lock);
    tx.update(ref, {
      status: "failed",
      error:
        "Video processing failed. Check provider access, credits and media format, then retry.",
      finishedAt: Date.now(),
    });
    if (current.data()?.jobId === ref.id) tx.delete(lock);
  });
}
async function saveDraft(ref, job, output, extra = {}) {
  const info = await probe(output);
  if (Math.abs(Number(info.format.duration) - VIDEO_DURATION) > 0.2)
    throw Error("Output duration verification failed");
  const objectPath = `video-drafts/${job.uid}/${ref.id}.mp4`;
  await getStorage()
    .bucket()
    .upload(output, {
      destination: objectPath,
      metadata: { contentType: "video/mp4", cacheControl: "private, no-store" },
    });
  await getFirestore().runTransaction(async (tx) => {
    const lock = getFirestore().collection("videoLocks").doc(job.topicId);
    const current = await tx.get(lock);
    if (current.data()?.jobId !== ref.id) throw Error("Job superseded");
    tx.update(ref, {
      status: "review",
      objectPath,
      duration: VIDEO_DURATION,
      format: VIDEO_FORMAT,
      ...extra,
      finishedAt: Date.now(),
    });
    tx.update(lock, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  });
}
export const generateTopicVideo = onDocumentCreated(
  {
    ...workerOptions,
    document: "videoJobs/{jobId}",
    secrets: [gemini, eleven],
  },
  async (event) => {
    if (event.data?.data().mode !== "generate") return;
    const ref = event.data.ref,
      job = await claim(ref, "queued");
    if (!job) return;
    let dir;
    try {
      if (
        process.env.VIDEO_GENERATION_ENABLED !== "true" ||
        !(await activeOwner(job.uid)) ||
        !gemini.value() ||
        !eleven.value()
      )
        throw Error("Generation unavailable");
      dir = await mkdtemp(path.join(tmpdir(), "topic-video-"));
      const result = await generateVideo(job.topic, dir, {
        gemini: gemini.value(),
        eleven: eleven.value(),
      });
      await saveDraft(ref, job, result.output, {
        script: result.script,
        captions: result.captions,
        analogy: result.analogy,
      });
    } catch {
      await fail(ref);
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  },
);
export const processVideoUpload = onObjectFinalized(
  workerOptions,
  async (event) => {
    const match = /^video-staging\/([^/]+)\/([a-zA-Z0-9]+)\.mp4$/.exec(
      event.data.name || "",
    );
    if (!match) return;
    const [, uid, jobId] = match,
      ref = jobs().doc(jobId);
    const file = getStorage()
      .bucket(event.data.bucket)
      .file(event.data.name, { generation: event.data.generation });
    const job = await claim(ref, "uploading");
    if (!job) {
      await file.delete({ ignoreNotFound: true });
      return;
    }
    let dir;
    try {
      if (
        job.uid !== uid ||
        job.mode !== "upload" ||
        Number(event.data.size) > MAX_UPLOAD_BYTES ||
        event.data.contentType !== "video/mp4" ||
        !(await activeOwner(uid))
      )
        throw Error("Invalid upload");
      // Strip SDK-issued staging download capabilities before processing.
      await file.setMetadata({
        metadata: { firebaseStorageDownloadTokens: null },
      });
      dir = await mkdtemp(path.join(tmpdir(), "topic-upload-"));
      const input = path.join(dir, "upload.mp4"),
        output = path.join(dir, "final.mp4");
      await file.download({ destination: input });
      await normalizeUpload(input, output);
      await saveDraft(ref, job, output);
    } catch {
      await fail(ref);
    } finally {
      await file.delete({ ignoreNotFound: true });
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  },
);

export const publishTopicVideo = onCall(
  { ...options, timeoutSeconds: 120, memory: "512MiB" },
  async (request) => {
    const uid = await owner(request),
      jobId = request.data?.jobId;
    if (typeof jobId !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(jobId))
      throw new HttpsError("invalid-argument", "Invalid video job.");
    const ref = jobs().doc(jobId);
    const currentJob = (await ref.get()).data();
    if (!currentJob || currentJob.uid !== uid)
      throw new HttpsError("permission-denied", "Owner access required.");
    const job = await claim(ref, "review", "publishing");
    if (!job)
      throw new HttpsError(
        "failed-precondition",
        "Review a completed video first.",
      );
    const db = getFirestore(),
      bucket = getStorage().bucket();
    // A private copy is created first; download tokens are granted only after the owner reviews it.
    const token = randomUUID(),
      objectPath = `published-videos/${job.topicId}/${jobId}.mp4`;
    const dest = bucket.file(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    try {
      await bucket.file(job.objectPath).copy(dest);
      await dest.setMetadata({
        contentType: "video/mp4",
        // Versioned object paths are never overwritten. Watching a topic reuses
        // this persisted asset and its browser cache, not a generation endpoint.
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { firebaseStorageDownloadTokens: token },
      });
      await db.runTransaction(async (tx) => {
        const videoRef = db.collection("topicVideos").doc(job.topicId),
          lock = db.collection("videoLocks").doc(job.topicId);
        const [existing, current, fresh] = await Promise.all([
          tx.get(videoRef),
          tx.get(lock),
          tx.get(ref),
        ]);
        if (
          existing.exists ||
          current.data()?.jobId !== jobId ||
          fresh.data()?.status !== "publishing"
        )
          throw new HttpsError(
            "already-exists",
            "This video was published or superseded.",
          );
        tx.create(videoRef, {
          topicId: job.topicId,
          title: job.topic.name,
          category: job.topic.category,
          url,
          script: job.script || "",
          captions: job.captions || "",
          generated: job.mode === "generate",
          duration: job.duration || 30,
          format: job.format || "legacy-30",
          ...(job.analogy ? { analogy: job.analogy } : {}),
          publishedAt: FieldValue.serverTimestamp(),
        });
        tx.update(ref, { status: "published" });
        tx.delete(lock);
      });
    } catch (error) {
      // Do not remove a published object if a concurrent publish of this job won.
      const published = await db
        .collection("topicVideos")
        .doc(job.topicId)
        .get();
      if (
        !published.exists ||
        !published.data().url.includes(encodeURIComponent(objectPath))
      )
        await dest.delete({ ignoreNotFound: true });
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (fresh.data()?.status === "publishing")
          tx.update(ref, { status: "review" });
      });
      throw error;
    }
    return { topicId: job.topicId };
  },
);

export const discardTopicVideo = onCall(options, async (request) => {
  const uid = await owner(request),
    jobId = request.data?.jobId;
  if (typeof jobId !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(jobId))
    throw new HttpsError("invalid-argument", "Invalid video job.");
  const db = getFirestore(),
    ref = jobs().doc(jobId);
  await db.runTransaction(async (tx) => {
    const job = (await tx.get(ref)).data();
    if (!job || job.uid !== uid || job.status === "published")
      throw new HttpsError(
        "permission-denied",
        "This draft cannot be discarded.",
      );
    if (
      !["review", "failed"].includes(job.status) &&
      job.expiresAt > Date.now()
    )
      throw new HttpsError(
        "failed-precondition",
        "Wait for processing to finish before discarding.",
      );
    const lock = db.collection("videoLocks").doc(job.topicId);
    const current = await tx.get(lock);
    tx.update(ref, { status: "discarded", finishedAt: Date.now() });
    if (current.data()?.jobId === jobId) tx.delete(lock);
  });
  await getStorage()
    .bucket()
    .file(`video-drafts/${uid}/${jobId}.mp4`)
    .delete({ ignoreNotFound: true });
  return { discarded: true };
});

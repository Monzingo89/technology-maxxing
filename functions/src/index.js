import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createHash } from "node:crypto";
import {
  InputError,
  requireValue,
  cleanText,
  validateOnboarding,
  pick,
  HOUSES,
  CATEGORIES,
  PROFESSIONS,
  POLICY_VERSION,
  DAY,
  canSwitchHouse,
  dayKey,
  shuffle,
  prepareQuestion,
  publicQuestion,
  checkAnswer,
  updateRating,
  pairId,
  boundedPosition,
  recommendation,
} from "./core.js";
import { QUESTION_BANK, COURSES } from "./questions.js";
import { authorDailyBank } from "./author.js";

initializeApp();
const db = getFirestore();
const options = {
  region: "us-central1",
  maxInstances: 10,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true",
  memory: "256MiB",
};
const ref = (collection, id) => db.collection(collection).doc(id);
const callable = (handler, verified = true) =>
  onCall(options, async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in to continue.");
    if (verified && request.auth.token.email_verified !== true)
      throw new HttpsError(
        "failed-precondition",
        "Verify your email, then refresh your account.",
      );
    try {
      // The callable token can outlive account deletion. Check the current record too.
      const account = await getAuth().getUser(request.auth.uid);
      if (account.disabled)
        throw new HttpsError(
          "permission-denied",
          "This account is unavailable.",
        );
      if (verified && !account.emailVerified)
        throw new HttpsError(
          "failed-precondition",
          "Verify your email before continuing.",
        );
      return await handler(request.auth.uid, request.data || {}, request);
    } catch (error) {
      if (error instanceof InputError)
        throw new HttpsError("invalid-argument", error.message);
      if (error instanceof HttpsError) throw error;
      if (error?.code === "auth/user-not-found")
        throw new HttpsError("unauthenticated", "Sign in to continue.");
      // Do not emit payloads, private messages, email addresses, or prompts to logs.
      console.error("AI Space callable failed", {
        code: error?.code || "unknown",
      });
      throw new HttpsError(
        "internal",
        "The request could not be completed. Please retry.",
      );
    }
  });

async function member(uid) {
  const profile = await ref("profiles", uid).get();
  if (!profile.exists)
    throw new HttpsError("failed-precondition", "Create your agent first.");
  const privateDoc = await ref("accounts", uid).get();
  if (privateDoc.data()?.deletionState)
    throw new HttpsError(
      "failed-precondition",
      "Account deletion is in progress.",
    );
  return profile.data();
}
async function rateLimit(uid, action, max, duration = 60_000) {
  const now = Date.now();
  const target = ref("rateLimits", `${uid}_${action}`);
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(target)).data();
    const fresh = !current || now - current.startedAt >= duration;
    if (!fresh && current.count >= max)
      throw new HttpsError(
        "resource-exhausted",
        "Please wait before trying again.",
      );
    tx.set(target, {
      uid,
      startedAt: fresh ? now : current.startedAt,
      count: fresh ? 1 : current.count + 1,
      expiresAt: new Date(now + duration * 2),
    });
  });
}
async function safePair(uid, other) {
  const id = pairId(uid, other);
  const docs = await db.getAll(
    ref("profiles", other),
    ref("blocks", `${uid}~${other}`),
    ref("blocks", `${other}~${uid}`),
  );
  if (!docs[0].exists || docs[1].exists || docs[2].exists)
    throw new HttpsError("permission-denied", "This agent is unavailable.");
  return id;
}
function quizResponse(session, now = Date.now()) {
  return session.complete
    ? {
        sessionId: session.id,
        complete: true,
        result: session.result,
        source: session.source,
        serverNow: now,
      }
    : {
        sessionId: session.id,
        complete: false,
        category: session.category,
        source: session.source,
        question: publicQuestion(
          session.current,
          session.index,
          session.questions.length,
        ),
        serverNow: now,
      };
}

export const completeOnboarding = callable(async (uid, data) => {
  const input = validateOnboarding(data);
  const now = Date.now();
  await rateLimit(uid, "onboard", 8);
  const profile = {
    uid,
    ...input,
    createdAt: now,
    houseChangedAt: now,
    policyVersion: POLICY_VERSION,
  };
  delete profile.analyticsConsent;
  await db.runTransaction(async (tx) => {
    const profileRef = ref("profiles", uid),
      usernameRef = ref("usernames", input.username);
    const [existing, name] = await Promise.all([
      tx.get(profileRef),
      tx.get(usernameRef),
    ]);
    if (existing.exists)
      throw new HttpsError("already-exists", "Your agent already exists.");
    if (name.exists)
      throw new HttpsError(
        "already-exists",
        "This username is taken. Try another.",
      );
    tx.create(usernameRef, { uid });
    tx.create(profileRef, profile);
    tx.set(ref("accounts", uid), {
      analyticsConsent: input.analyticsConsent,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      ageConfirmedAt: now,
      policyVersion: POLICY_VERSION,
    });
  });
  return { profile };
});

export const changeHouse = callable(async (uid, data) => {
  await member(uid);
  const house = pick(data.house, HOUSES, "house");
  const target = ref("profiles", uid),
    now = Date.now();
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(target)).data();
    if (current.house === house) return;
    if (!canSwitchHouse(current.houseChangedAt, now))
      throw new HttpsError(
        "failed-precondition",
        "You can change your house once every 30 days.",
        { availableAt: current.houseChangedAt + 30 * DAY },
      );
    tx.update(target, { house, houseChangedAt: now });
  });
  return { house };
});

export const startDailyQuiz = callable(async (uid, data) => {
  await member(uid);
  await rateLimit(uid, "quizStart", 12);
  const category = pick(data.category, CATEGORIES, "quiz category"),
    now = Date.now();
  const id = `${uid}_${dayKey(now)}`,
    target = ref("quizSessions", id);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(target);
    if (existing.exists) return quizResponse(existing.data(), now);
    const authored = (await tx.get(ref("dailyBanks", dayKey(now)))).data();
    const aiQuestions =
      authored?.status === "approved"
        ? authored.questions?.filter(
            (question) => question.category === category,
          )
        : [];
    const generated = aiQuestions.length >= 5;
    const questions = shuffle(
      generated ? aiQuestions : QUESTION_BANK[category],
    ).slice(0, 5);
    const session = {
      id,
      uid,
      category,
      source: generated ? "ai-generated-reviewed" : "reviewed-seed",
      day: dayKey(now),
      questions,
      index: 0,
      responses: [],
      current: prepareQuestion(questions[0], now),
      complete: false,
      createdAt: now,
      expiresAt: new Date(now + 30 * DAY),
    };
    tx.create(target, session);
    return quizResponse(session, now);
  });
});

export const answerDailyQuiz = callable(async (uid, data) => {
  const profile = await member(uid);
  const id = cleanText(data.sessionId, 1, 160);
  requireValue(
    id.startsWith(`${uid}_`) && !id.includes("/"),
    "Invalid quiz session.",
  );
  await rateLimit(uid, "quizAnswer", 30);
  return db.runTransaction(async (tx) => {
    const target = ref("quizSessions", id),
      saved = await tx.get(target),
      now = Date.now();
    if (!saved.exists || saved.data().uid !== uid)
      throw new HttpsError("not-found", "Quiz session not found.");
    const session = saved.data();
    if (session.complete) return quizResponse(session, now);
    requireValue(
      session.day === dayKey(now),
      "This daily challenge has ended.",
    );
    const answer = checkAnswer(
      session.current,
      data.nonce,
      data.optionToken ?? null,
      now,
    );
    session.responses.push({
      ...answer,
      difficulty: session.current.difficulty,
    });
    session.index++;
    if (session.index === session.questions.length) {
      const ranking = db
        .collection("leaderboards")
        .doc(session.category)
        .collection("entries")
        .doc(uid);
      const previous = (await tx.get(ranking)).data();
      const rating = updateRating(previous, session.responses);
      session.complete = true;
      session.result = {
        ...rating,
        dailyCorrect: session.responses.filter((item) => item.correct).length,
        total: session.responses.length,
        category: session.category,
      };
      tx.set(ranking, {
        ...rating,
        uid,
        username: profile.username,
        house: profile.house,
        updatedAt: now,
      });
    } else
      session.current = prepareQuestion(session.questions[session.index], now);
    tx.set(target, session);
    return quizResponse(session, now);
  });
});

export const heartbeat = callable(async (uid, data) => {
  const profile = await member(uid);
  await rateLimit(uid, "presence", 20);
  const now = Date.now();
  await ref("presence", uid).set({
    uid,
    username: profile.username,
    house: profile.house,
    avatar: profile.avatar,
    x: boundedPosition(data.x),
    z: boundedPosition(data.z),
    updatedAt: now,
    expiresAt: new Date(now + 120_000),
  });
  return { updatedAt: now };
});
export const leaveSpace = callable(async (uid) => {
  await ref("presence", uid).delete();
  return { ok: true };
});

export const inviteTeam = callable(async (uid, data) => {
  const sender = await member(uid);
  await rateLimit(uid, "invites", 10, DAY);
  const targetUid = cleanText(data.targetUid, 1, 128),
    id = await safePair(uid, targetUid);
  const receiver = (await ref("profiles", targetUid).get()).data();
  await db.runTransaction(async (tx) => {
    const invite = ref("invites", id),
      team = ref("teams", id);
    const [existing, teamDoc, outgoingBlock, incomingBlock] = await Promise.all(
      [
        tx.get(invite),
        tx.get(team),
        tx.get(ref("blocks", `${uid}~${targetUid}`)),
        tx.get(ref("blocks", `${targetUid}~${uid}`)),
      ],
    );
    if (outgoingBlock.exists || incomingBlock.exists)
      throw new HttpsError("permission-denied", "This agent is unavailable.");
    if (teamDoc.data()?.active)
      throw new HttpsError("already-exists", "You are already teammates.");
    if (existing.data()?.status === "pending")
      throw new HttpsError(
        "already-exists",
        "A team invitation is already pending.",
      );
    tx.set(invite, {
      id,
      from: uid,
      to: targetUid,
      fromUsername: sender.username,
      toUsername: receiver.username,
      participants: [uid, targetUid],
      status: "pending",
      createdAt: Date.now(),
    });
  });
  return { inviteId: id };
});

export const respondInvite = callable(async (uid, data) => {
  await member(uid);
  const id = cleanText(data.inviteId, 1, 260);
  requireValue(!id.includes("/"), "Invalid invitation.");
  return db.runTransaction(async (tx) => {
    const inviteRef = ref("invites", id),
      saved = await tx.get(inviteRef),
      invite = saved.data();
    if (!invite || invite.to !== uid || invite.status !== "pending")
      throw new HttpsError("permission-denied", "Invitation is unavailable.");
    const [a, b] = await Promise.all([
      tx.get(ref("blocks", `${invite.from}~${uid}`)),
      tx.get(ref("blocks", `${uid}~${invite.from}`)),
    ]);
    if (a.exists || b.exists)
      throw new HttpsError("permission-denied", "This agent is unavailable.");
    const accept = data.accept === true;
    tx.update(inviteRef, {
      status: accept ? "accepted" : "declined",
      respondedAt: Date.now(),
    });
    if (accept)
      tx.set(ref("teams", id), {
        id,
        members: invite.participants,
        active: true,
        createdAt: Date.now(),
      });
    return { accepted: accept, teamId: accept ? id : null };
  });
});

export const sendMessage = callable(async (uid, data) => {
  const sender = await member(uid);
  await rateLimit(uid, "messages", 30);
  const id = cleanText(data.teamId, 1, 260),
    text = cleanText(data.text, 1, 1000);
  requireValue(!id.includes("/"), "Invalid team.");
  return db.runTransaction(async (tx) => {
    const team = (await tx.get(ref("teams", id))).data();
    if (!team?.active || !team.members.includes(uid))
      throw new HttpsError(
        "permission-denied",
        "Accept a team invitation before messaging.",
      );
    const other = team.members.find((value) => value !== uid);
    const [a, b] = await Promise.all([
      tx.get(ref("blocks", `${uid}~${other}`)),
      tx.get(ref("blocks", `${other}~${uid}`)),
    ]);
    if (a.exists || b.exists)
      throw new HttpsError(
        "permission-denied",
        "This conversation is unavailable.",
      );
    const message = ref("teams", id).collection("messages").doc();
    tx.create(message, {
      id: message.id,
      uid,
      username: sender.username,
      text,
      createdAt: Date.now(),
    });
    return { messageId: message.id };
  });
});

export const blockUser = callable(async (uid, data) => {
  await member(uid);
  await rateLimit(uid, "block", 20);
  const other = cleanText(data.targetUid, 1, 128),
    id = pairId(uid, other);
  await db.runTransaction(async (tx) => {
    const team = ref("teams", id),
      invite = ref("invites", id);
    const [teamDoc, inviteDoc] = await Promise.all([
      tx.get(team),
      tx.get(invite),
    ]);
    tx.set(ref("blocks", `${uid}~${other}`), {
      uid,
      targetUid: other,
      createdAt: Date.now(),
    });
    if (teamDoc.exists) tx.update(team, { active: false });
    if (inviteDoc.exists) tx.update(invite, { status: "blocked" });
  });
  return { blocked: true };
});

export const reportContent = callable(async (uid, data) => {
  await member(uid);
  await rateLimit(uid, "report", 10, DAY);
  const reason = cleanText(data.reason, 5, 1000);
  const targetUid = data.targetUid ? cleanText(data.targetUid, 1, 128) : null;
  const postId = data.postId ? cleanText(data.postId, 1, 128) : null;
  requireValue(targetUid || postId, "Select an agent or post to report.");
  const target = db.collection("reports").doc();
  await target.create({
    uid,
    targetUid,
    postId,
    reason,
    status: "open",
    createdAt: Date.now(),
  });
  return { reportId: target.id };
});

export const publishGallery = callable(async (uid, data) => {
  const profile = await member(uid);
  await rateLimit(uid, "gallery", 5, DAY);
  const prompt = cleanText(data.prompt, 10, 1500),
    title = cleanText(data.title, 3, 80);
  const target = db.collection("gallery").doc();
  await target.create({
    id: target.id,
    uid,
    username: profile.username,
    house: profile.house,
    prompt,
    title,
    status: "pending",
    createdAt: Date.now(),
  });
  return {
    postId: target.id,
    status: "pending",
    message:
      "Your prompt is awaiting moderation before appearing in the gallery.",
  };
});

export const moderateGallery = callable(async (uid, data, request) => {
  if (request.auth.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access is required.");
  const id = cleanText(data.postId, 1, 128);
  requireValue(!id.includes("/"), "Invalid post.");
  const status = pick(data.status, ["published", "rejected"], "status");
  await ref("gallery", id).update({
    status,
    reviewedAt: Date.now(),
    reviewedBy: uid,
  });
  return { status };
});

function schoolResponse(session) {
  if (session.complete)
    return {
      sessionId: session.id,
      complete: true,
      profession: session.profession,
    };
  const lesson = COURSES[session.profession][session.index];
  return {
    sessionId: session.id,
    complete: false,
    profession: session.profession,
    lesson: {
      number: session.index + 1,
      total: 3,
      text: lesson[0],
      question: lesson[1],
      options: session.options.map(({ token, text }) => ({ token, text })),
      availableAt: session.availableAt,
    },
  };
}
function schoolOptions(lesson) {
  return shuffle(
    lesson[2].map((text, index) => ({
      token: createHash("sha256")
        .update(`${Math.random()}-${Date.now()}-${text}`)
        .digest("hex")
        .slice(0, 24),
      text,
      correct: index === 0,
    })),
  );
}
export const startSchool = callable(async (uid, data) => {
  await member(uid);
  await rateLimit(uid, "school", 10);
  const profession = pick(data.profession, PROFESSIONS, "practice track"),
    id = `${uid}_${profession}`;
  return db.runTransaction(async (tx) => {
    const target = ref("schoolSessions", id),
      current = await tx.get(target);
    if (current.exists) return schoolResponse(current.data());
    const session = {
      id,
      uid,
      profession,
      index: 0,
      options: schoolOptions(COURSES[profession][0]),
      availableAt: Date.now() + 8000,
      complete: false,
      createdAt: Date.now(),
    };
    tx.create(target, session);
    return schoolResponse(session);
  });
});
export const answerSchool = callable(async (uid, data) => {
  await member(uid);
  await rateLimit(uid, "schoolAnswer", 20);
  const id = cleanText(data.sessionId, 1, 160);
  requireValue(
    id.startsWith(`${uid}_`) && !id.includes("/"),
    "Invalid course.",
  );
  return db.runTransaction(async (tx) => {
    const target = ref("schoolSessions", id),
      session = (await tx.get(target)).data();
    if (!session || session.uid !== uid)
      throw new HttpsError("not-found", "Course not found.");
    if (session.complete) return schoolResponse(session);
    if (Date.now() < session.availableAt)
      throw new HttpsError(
        "failed-precondition",
        "Read the lesson before continuing.",
      );
    const choice = session.options.find(
      (option) => option.token === data.answer,
    );
    requireValue(choice, "Choose an answer.");
    if (!choice.correct)
      throw new HttpsError(
        "invalid-argument",
        "Review the lesson and try again.",
      );
    session.index++;
    if (session.index === 3) {
      session.complete = true;
      session.completedAt = Date.now();
      tx.set(
        ref("accounts", uid).collection("courses").doc(session.profession),
        { profession: session.profession, completedAt: Date.now(), version: 1 },
      );
    } else {
      session.options = schoolOptions(
        COURSES[session.profession][session.index],
      );
      session.availableAt = Date.now() + 8000;
    }
    tx.set(target, session);
    return schoolResponse(session);
  });
});
export const changeProfession = callable(async (uid, data) => {
  await member(uid);
  const profession = pick(data.profession, PROFESSIONS, "practice track");
  await db.runTransaction(async (tx) => {
    const completion = await tx.get(
      ref("accounts", uid).collection("courses").doc(profession),
    );
    if (!completion.exists)
      throw new HttpsError(
        "failed-precondition",
        "Complete the school course for this practice track first.",
      );
    tx.update(ref("profiles", uid), {
      profession,
      professionChangedAt: Date.now(),
    });
  });
  return { profession };
});

export const setAnalyticsConsent = callable(async (uid, data) => {
  await member(uid);
  requireValue(typeof data.consent === "boolean", "Choose a consent setting.");
  await ref("accounts", uid).update({
    analyticsConsent: data.consent,
    analyticsConsentUpdatedAt: Date.now(),
  });
  return { consent: data.consent };
});
const EVENT_NAMES = [
  "landing_view",
  "signup_started",
  "signup_completed",
  "login_completed",
  "onboarding_completed",
  "world_entered",
  "space_entered",
  "quiz_started",
  "quiz_completed",
  "lesson_opened",
  "lesson_completed",
  "team_requested",
  "team_accepted",
  "gallery_posted",
  "link_opened",
  "link_returned",
  "error",
];
export const recordEvents = callable(async (uid, data) => {
  await member(uid);
  const account = (await ref("accounts", uid).get()).data();
  if (!account?.analyticsConsent) return { accepted: 0 };
  requireValue(
    Array.isArray(data.events) &&
      data.events.length > 0 &&
      data.events.length <= 20,
    "Send 1–20 events at a time.",
  );
  await rateLimit(uid, "telemetry", 6);
  const now = Date.now(),
    batch = db.batch();
  for (const event of data.events) {
    const name = pick(event.name, EVENT_NAMES, "event");
    const destination = cleanText(
      event.target || event.area || "ai-space",
      1,
      120,
    );
    requireValue(
      /^[a-z0-9/_-]+$/i.test(destination),
      "Use a catalog identifier, not a URL or private content.",
    );
    const dwellMs = Math.max(
      0,
      Math.min(3_600_000, Number(event.durationMs) || 0),
    );
    batch.create(db.collection("events").doc(), {
      uid,
      name,
      destination,
      dwellMs,
      createdAt: now,
      expiresAt: new Date(now + 30 * DAY),
    });
    const metricId = createHash("sha256")
      .update(`${dayKey(now)}:${destination}`)
      .digest("hex");
    batch.set(
      ref("dailyMetrics", metricId),
      {
        day: dayKey(now),
        destination,
        views: FieldValue.increment(name === "link_opened" ? 1 : 0),
        observedReturns: FieldValue.increment(name === "link_returned" ? 1 : 0),
        quickExits: FieldValue.increment(
          name === "link_returned" && dwellMs < 10_000 ? 1 : 0,
        ),
        completions: FieldValue.increment(
          name === "quiz_completed" || name === "lesson_completed" ? 1 : 0,
        ),
      },
      { merge: true },
    );
  }
  await batch.commit();
  return { accepted: data.events.length };
});
export const reviewMetrics = callable(async (uid, data, request) => {
  if (request.auth.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access is required.");
  const day = cleanText(data.day || dayKey(Date.now() - DAY), 10, 10);
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(day), "Invalid date.");
  const metrics = await db
    .collection("dailyMetrics")
    .where("day", "==", day)
    .limit(200)
    .get();
  return {
    recommendations: metrics.docs.map((doc) => ({
      ...doc.data(),
      ...recommendation(doc.data()),
      requiresHumanReview: true,
    })),
  };
});

export const exportData = callable(async (uid) => {
  await rateLimit(uid, "export", 2, DAY);
  const [profile, account, posts, events, courses, invites, reports, teams] =
    await Promise.all([
      ref("profiles", uid).get(),
      ref("accounts", uid).get(),
      db.collection("gallery").where("uid", "==", uid).limit(2000).get(),
      db.collection("events").where("uid", "==", uid).limit(10000).get(),
      ref("accounts", uid).collection("courses").get(),
      db
        .collection("invites")
        .where("participants", "array-contains", uid)
        .get(),
      db.collection("reports").where("uid", "==", uid).get(),
      db.collection("teams").where("members", "array-contains", uid).get(),
    ]);
  const conversations = await Promise.all(
    teams.docs.map(async (team) => ({
      ...team.data(),
      messages: (
        await team.ref
          .collection("messages")
          .where("uid", "==", uid)
          .limit(5000)
          .get()
      ).docs.map((doc) => doc.data()),
    })),
  );
  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data() || null,
    account: account.data() || null,
    gallery: posts.docs.map((doc) => doc.data()),
    events: events.docs.map((doc) => doc.data()),
    courses: courses.docs.map((doc) => doc.data()),
    invites: invites.docs.map((doc) => doc.data()),
    reports: reports.docs.map((doc) => doc.data()),
    conversations,
    note: "Message, event, and gallery exports are capped; contact the operator for a full large-account export.",
  };
}, false);

async function deleteQuery(query) {
  let snapshot;
  do {
    snapshot = await query.limit(200).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } while (snapshot.size === 200);
}
async function eraseAccount(uid) {
  const profile = (await ref("profiles", uid).get()).data();
  await ref("accounts", uid).set(
    { deletionState: "pending", deletionRequestedAt: Date.now() },
    { merge: true },
  );
  await ref("presence", uid).delete();
  const teams = await db
    .collection("teams")
    .where("members", "array-contains", uid)
    .get();
  for (const team of teams.docs) await db.recursiveDelete(team.ref);
  for (const collection of [
    "gallery",
    "events",
    "quizSessions",
    "schoolSessions",
    "rateLimits",
    "reports",
    "blocks",
  ])
    await deleteQuery(db.collection(collection).where("uid", "==", uid));
  await deleteQuery(db.collection("blocks").where("targetUid", "==", uid));
  await deleteQuery(
    db.collection("invites").where("participants", "array-contains", uid),
  );
  // Reports made about a deleted account remain without a target identifier for moderation trend analysis.
  const reports = await db
    .collection("reports")
    .where("targetUid", "==", uid)
    .get();
  for (const report of reports.docs)
    await report.ref.update({
      targetUid: null,
      reason: "[Removed after target account deletion]",
      targetDeleted: true,
    });
  for (const category of CATEGORIES)
    await db
      .collection("leaderboards")
      .doc(category)
      .collection("entries")
      .doc(uid)
      .delete();
  await getAuth()
    .deleteUser(uid)
    .catch((error) => {
      if (error.code !== "auth/user-not-found") throw error;
    });
  if (profile?.username) await ref("usernames", profile.username).delete();
  await ref("profiles", uid).delete();
  await db.recursiveDelete(ref("accounts", uid));
}
export const deleteAccount = callable(async (uid, data, request) => {
  if (Date.now() / 1000 - (request.auth.token.auth_time || 0) > 300)
    throw new HttpsError(
      "failed-precondition",
      "Sign in again before deleting your account.",
    );
  await eraseAccount(uid);
  return { deleted: true };
}, false);

export const cleanExpiredData = onSchedule(
  { schedule: "every 24 hours", region: "us-central1", maxInstances: 1 },
  async () => {
    for (const collection of [
      "events",
      "quizSessions",
      "rateLimits",
      "presence",
    ])
      await deleteQuery(
        db.collection(collection).where("expiresAt", "<", new Date()),
      );
    const pending = await db
      .collection("accounts")
      .where("deletionState", "==", "pending")
      .limit(100)
      .get();
    for (const account of pending.docs) {
      try {
        await eraseAccount(account.id);
      } catch (error) {
        console.error("Account erasure retry failed", {
          code: error?.code || "unknown",
        });
      }
    }
  },
);

export const generateDailyQuestions = onSchedule(
  {
    schedule: "10 0 * * *",
    timeZone: "UTC",
    region: "us-central1",
    maxInstances: 1,
    timeoutSeconds: 120,
    secrets:
      process.env.AI_SPACE_ENABLE_AI_AUTHOR === "true"
        ? ["OPENAI_API_KEY"]
        : [],
  },
  async () => {
    const day = dayKey(Date.now() + DAY),
      target = ref("dailyBanks", day);
    if ((await target.get()).exists) return;
    const bank = await authorDailyBank({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.AI_SPACE_AUTHOR_MODEL || "gpt-4.1-mini",
      day,
    });
    await target.create({ ...bank, createdAt: Date.now() });
  },
);
export const approveDailyBank = callable(async (uid, data, request) => {
  if (request.auth.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access is required.");
  const day = cleanText(data.day, 10, 10);
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(day), "Invalid date.");
  const target = ref("dailyBanks", day),
    saved = await target.get();
  if (saved.data()?.status !== "pending-review")
    throw new HttpsError(
      "failed-precondition",
      "No generated bank awaits review for this date.",
    );
  await target.update({
    status: "approved",
    reviewedBy: uid,
    reviewedAt: Date.now(),
  });
  return { approved: true, day };
});

export const operationsOverview = callable(async (_uid, _data, request) => {
  if (request.auth.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access is required.");
  const [gallery, reports, banks] = await Promise.all([
    db.collection("gallery").where("status", "==", "pending").limit(50).get(),
    db.collection("reports").where("status", "==", "open").limit(50).get(),
    db
      .collection("dailyBanks")
      .where("status", "==", "pending-review")
      .limit(10)
      .get(),
  ]);
  const rows = (snapshot) =>
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return { gallery: rows(gallery), reports: rows(reports), banks: rows(banks) };
});
export const resolveReport = callable(async (uid, data, request) => {
  if (request.auth.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access is required.");
  const id = cleanText(data.reportId, 1, 128);
  requireValue(!id.includes("/"), "Invalid report.");
  await ref("reports", id).update({
    status: "reviewed",
    reviewedBy: uid,
    reviewedAt: Date.now(),
  });
  return { reviewed: true };
});

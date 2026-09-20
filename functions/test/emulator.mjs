import assert from "node:assert/strict";
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw Error("Run only with firebase emulators:exec; never production.");
const projectId = "demo-ai-space";
initAdmin({ projectId });
const db = adminDb();
const clients = [];
async function client(id, verified = true) {
  const email = `${id}@example.test`,
    password = "OnlyEmulator123!";
  const user = await adminAuth().createUser({
    email,
    password,
    emailVerified: verified,
  });
  const app = initializeApp(
    { apiKey: "emulator-key", projectId, authDomain: "localhost" },
    id,
  );
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(auth, email, password);
  const store = getFirestore(app);
  connectFirestoreEmulator(store, "127.0.0.1", 8080);
  return { uid: user.uid, token: await auth.currentUser.getIdToken(), store };
}
async function call(user, name, data = {}) {
  const response = await fetch(
    `http://127.0.0.1:5001/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ data }),
    },
  );
  const body = await response.json();
  if (body.error) {
    const err = Error(body.error.message);
    err.code = body.error.status;
    throw err;
  }
  return body.result;
}
const avatar = {
  height: 50,
  weight: 50,
  skin: "#c89e70",
  hair: "#554433",
  outfit: "#779966",
  eyes: 50,
  nose: 50,
  mouth: 50,
  body: "balanced",
  legs: "classic",
  feet: "sneakers",
  presentation: "androgynous",
  hairStyle: "crop",
};
const onboarding = (username) => ({
  username,
  house: "claude",
  avatar,
  aptitudeAnswers: Array(12).fill(1),
  acceptTerms: true,
  acceptPrivacy: true,
  ageConfirmed: true,
  analyticsConsent: false,
});
try {
  const [a, b, u] = await Promise.all([
    client("alice"),
    client("bob"),
    client("unverified", false),
  ]);
  await assert.rejects(
    () => call(u, "completeOnboarding", onboarding("unverified")),
    /Verify your email/,
  );
  const collision = await Promise.allSettled([
    call(a, "completeOnboarding", onboarding("same_name")),
    call(b, "completeOnboarding", onboarding("SAME_NAME")),
  ]);
  assert.equal(
    collision.filter((x) => x.status === "fulfilled").length,
    1,
    "Atomic username collision",
  );
  const loser = collision[0].status === "rejected" ? a : b;
  await call(loser, "completeOnboarding", onboarding("other_name"));
  await assert.rejects(
    () => setDoc(doc(a.store, "profiles", a.uid), { house: "gemini" }),
    /permission/i,
  );
  await assert.rejects(
    () =>
      setDoc(doc(a.store, "leaderboards", "agents", "entries", a.uid), {
        elo: 99999,
      }),
    /permission/i,
  );
  await assert.rejects(
    () => call(a, "changeHouse", { house: "gemini" }),
    /30 days/,
  );
  const session = await call(a, "startDailyQuiz", { category: "agents" });
  assert.equal(session.question.total, 5);
  assert.equal(JSON.stringify(session.question).includes("correct"), false);
  await assert.rejects(
    () => getDoc(doc(a.store, "quizSessions", session.sessionId)),
    /permission/i,
  );
  const second = await call(a, "startDailyQuiz", { category: "models" });
  assert.equal(second.sessionId, session.sessionId);
  assert.equal(second.category, "agents");
  let current = session;
  for (let i = 0; i < 5; i++) {
    const saved = (
      await db.collection("quizSessions").doc(session.sessionId).get()
    ).data();
    if (i === 0)
      await db
        .collection("quizSessions")
        .doc(session.sessionId)
        .update({ "current.deadline": Date.now() - 1 });
    const answer = saved.current.options.find((x) => x.correct).token;
    const nonce = current.question.nonce;
    current = await call(a, "answerDailyQuiz", {
      sessionId: session.sessionId,
      nonce,
      optionToken: answer,
    });
    if (i === 0)
      await assert.rejects(
        () =>
          call(a, "answerDailyQuiz", {
            sessionId: session.sessionId,
            nonce,
            optionToken: answer,
          }),
        /changed/,
      );
  }
  assert.equal(current.complete, true);
  assert.equal(current.result.dailyCorrect, 4);
  assert.equal(current.result.rounds, 1);
  const repeat = await call(a, "answerDailyQuiz", {
    sessionId: session.sessionId,
    nonce: "replay",
    optionToken: "forged",
  });
  assert.equal(repeat.result.rounds, 1);
  const invite = await call(a, "inviteTeam", { targetUid: b.uid });
  await assert.rejects(
    () =>
      call(a, "sendMessage", {
        teamId: invite.inviteId,
        text: "No unsolicited messages",
      }),
    /invitation/,
  );
  await assert.rejects(
    () => call(a, "respondInvite", { inviteId: invite.inviteId, accept: true }),
    /unavailable/,
  );
  const team = await call(b, "respondInvite", {
    inviteId: invite.inviteId,
    accept: true,
  });
  await call(a, "sendMessage", {
    teamId: team.teamId,
    text: "Hello from the emulator",
  });
  const messages = await db
    .collection("teams")
    .doc(team.teamId)
    .collection("messages")
    .get();
  assert.equal(messages.size, 1);
  await call(b, "blockUser", { targetUid: a.uid });
  await assert.rejects(
    () =>
      call(a, "sendMessage", {
        teamId: team.teamId,
        text: "Should be blocked",
      }),
    /invitation|unavailable/,
  );
  await assert.rejects(
    () =>
      getDoc(
        doc(a.store, "teams", team.teamId, "messages", messages.docs[0].id),
      ),
    /permission/i,
  );
  const post = await call(a, "publishGallery", {
    title: "A kind world",
    prompt: "A miniature treehouse with warm sunlight and flowers.",
  });
  assert.equal(post.status, "pending");
  await assert.rejects(
    () => getDoc(doc(b.store, "gallery", post.postId)),
    /permission/i,
  );
  await assert.rejects(() => call(a, "operationsOverview"), /Moderator/);
  await assert.rejects(
    () =>
      call(a, "moderateGallery", { postId: post.postId, status: "published" }),
    /Moderator/,
  );
  const moderator = await client("moderator");
  await adminAuth().setCustomUserClaims(moderator.uid, { moderator: true });
  moderator.token = await getAuth(
    clients.find((app) => app.name === "moderator"),
  ).currentUser.getIdToken(true);
  assert.equal((await call(moderator, "operationsOverview")).gallery.length, 1);
  await call(moderator, "moderateGallery", {
    postId: post.postId,
    status: "published",
  });
  assert.equal(
    (await getDoc(doc(b.store, "gallery", post.postId))).data().status,
    "published",
  );
  const report = await call(b, "reportContent", {
    postId: post.postId,
    reason: "Review this example content",
  });
  await call(moderator, "resolveReport", { reportId: report.reportId });
  assert.equal(
    (await db.collection("reports").doc(report.reportId).get()).data().status,
    "reviewed",
  );
  await call(a, "recordEvents", {
    events: [{ name: "world_entered", area: "world" }],
  });
  assert.equal(
    (await db.collection("events").where("uid", "==", a.uid).get()).size,
    0,
  );
  await call(a, "setAnalyticsConsent", { consent: true });
  await call(a, "recordEvents", {
    events: [
      {
        name: "world_entered",
        area: "world",
        email: "do-not-store@example.test",
      },
    ],
  });
  const event = (
    await db.collection("events").where("uid", "==", a.uid).get()
  ).docs[0].data();
  assert.equal("email" in event, false);
  let course = await call(a, "startSchool", { profession: "teacher" });
  await assert.rejects(
    () => call(a, "changeProfession", { profession: "teacher" }),
    /Complete/,
  );
  for (let i = 0; i < 3; i++) {
    const ref = db.collection("schoolSessions").doc(course.sessionId);
    const internal = (await ref.get()).data();
    await ref.update({ availableAt: Date.now() - 1 });
    course = await call(a, "answerSchool", {
      sessionId: course.sessionId,
      answer: internal.options.find((x) => x.correct).token,
    });
  }
  assert.equal(course.complete, true);
  await call(a, "changeProfession", { profession: "teacher" });
  await call(a, "deleteAccount");
  assert.equal(
    (await db.collection("profiles").doc(a.uid).get()).exists,
    false,
  );
  assert.equal(
    (await db.collection("events").where("uid", "==", a.uid).get()).size,
    0,
  );
  assert.equal(
    (await db.collection("teams").doc(team.teamId).get()).exists,
    false,
  );
  await assert.rejects(() => call(a, "heartbeat", { x: 0, z: 0 }), /Sign in/);
  console.log(
    "PASS: live emulator contracts for verification, atomic usernames, rules, 30-day lock, once-daily quiz, deadlines, replay, invitations, blocking, moderation, consent, school, deletion.",
  );
} finally {
  await Promise.all(clients.map(deleteApp));
}

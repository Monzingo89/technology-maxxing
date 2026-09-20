import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw new Error("Run with the local demo-ai-space emulators only.");
initializeApp({ projectId: "demo-ai-space" });
const db = getFirestore();
await db.recursiveDelete(db.collection("guestAllowances"));
async function call(name, data = {}, token) {
  const response = await fetch(
    `http://127.0.0.1:5001/demo-ai-space/us-central1/${name}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
  const body = await response.json();
  if (body.error)
    throw Object.assign(new Error(body.error.message), body.error);
  return body.result;
}
let status = await call("getGuestAllowance");
assert.equal(status.remaining, 5);
for (let index = 0; index < 5; index++) {
  const attemptId = randomUUID();
  status = await call("startGuestAssessment", { attemptId });
  await assert.rejects(
    call("startGuestAssessment", { attemptId: randomUUID() }),
    (e) => e.details.reason === "active-assessment",
  );
  const completions = await Promise.all(
    Array.from({ length: 3 }, () =>
      call("completeGuestAssessment", { attemptId, receipt: status.receipt }),
    ),
  );
  assert.ok(completions.every((item) => item.completed === index + 1));
}
assert.equal((await call("getGuestAllowance")).remaining, 0);
await assert.rejects(
  call("startGuestAssessment", { attemptId: randomUUID() }),
  (e) => e.details.reason === "guest-limit",
);
await assert.rejects(
  call("clearGuestAllowance", { receipt: status.receipt }),
  (e) => e.status === "UNAUTHENTICATED",
);
const record = (await db.collection("guestAllowances").get()).docs[0];
assert.equal(record.data().completed.length, 5);
assert.equal(JSON.stringify(record.data()).includes("127.0.0.1"), false);
const denied = await fetch(
  `http://127.0.0.1:8080/v1/projects/demo-ai-space/databases/(default)/documents/guestAllowances/${record.id}`,
);
assert.equal(denied.status, 403);
const signup = await fetch(
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `quota-${randomUUID()}@example.test`,
      password: "EmulatorPassword123!",
      returnSecureToken: true,
    }),
  },
).then((response) => response.json());
assert.ok(signup.idToken);
assert.deepEqual(
  await call(
    "clearGuestAllowance",
    { receipt: status.receipt },
    signup.idToken,
  ),
  { cleared: true },
);
assert.equal((await db.collection("guestAllowances").get()).size, 0);
await assert.rejects(
  call("getGuestAllowance", {}, signup.idToken),
  (e) => e.status === "FAILED_PRECONDITION",
);
console.log(
  "Guest callable integration passed: five completions, concurrent retries, sixth denied, client reads denied, new account removes guest record.",
);

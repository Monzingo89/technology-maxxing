import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isVideoOwner,
  validTopicId,
  canStartVideo,
  validateStoryboard,
  STARTER_SCRIPTS,
  VIDEO_OWNER,
  withTopicIntro,
} from "../src/video-policy.js";
const token = {
  email: VIDEO_OWNER,
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
  auth_time: 2000,
};
test("function deployment excludes local provider secrets", () => {
  const config = JSON.parse(
    readFileSync(new URL("../../firebase.json", import.meta.url), "utf8"),
  );
  assert.ok(
    config.functions.every(
      (item) =>
        item.ignore.includes(".secret*") && item.ignore.includes(".env*"),
    ),
  );
});
const account = {
  email: VIDEO_OWNER,
  emailVerified: true,
  disabled: false,
  providerData: [{ providerId: "google.com" }],
  tokensValidAfterTime: new Date(1000 * 1000).toISOString(),
};
test("only verified Google owner with a current enabled account is authorized", () => {
  assert.equal(VIDEO_OWNER, "vcv@robertjmonzingo.com");
  assert.equal(
    isVideoOwner(
      { ...token, email: "robertjmonzingo@gmail.com" },
      { ...account, email: "robertjmonzingo@gmail.com" },
    ),
    false,
  );
  assert.equal(isVideoOwner(token, account), true);
  for (const bad of [
    null,
    {},
    { ...token, email: "other@gmail.com" },
    { ...token, email_verified: false },
    { ...token, firebase: { sign_in_provider: "password" } },
    { ...token, firebase: { sign_in_provider: "custom" } },
    { ...token, auth_time: 1 },
  ])
    assert.equal(isVideoOwner(bad, account), false);
  for (const bad of [
    null,
    { ...account, disabled: true },
    { ...account, emailVerified: false },
    { ...account, email: "other@gmail.com" },
    { ...account, providerData: [] },
  ])
    assert.equal(isVideoOwner(token, bad), false);
});
test("topic paths cannot escape the catalog document namespace", () => {
  for (const id of ["../react", "a/b", "", null, "x".repeat(101), "<script>"])
    assert.equal(validTopicId(id), false);
  assert.equal(validTopicId("agentic_rag"), true);
});
test("published videos and active reservations reject duplicate generation", () => {
  assert.equal(canStartVideo(true, null, 100), false);
  assert.equal(canStartVideo(false, { expiresAt: 200 }, 100), false);
  assert.equal(canStartVideo(false, { expiresAt: 50 }, 100), true);
  assert.equal(canStartVideo(false, null, 100), true);
});
test("all three starter storyboards fit the constrained narration schema", () => {
  for (const script of Object.values(STARTER_SCRIPTS))
    assert.equal(validateStoryboard(script), script);
  assert.throws(() => validateStoryboard({ scenes: [] }));
  const bad = structuredClone(STARTER_SCRIPTS.react);
  bad.scenes[0].narration = "<script>malicious text</script>";
  assert.throws(() => validateStoryboard(bad));
});

test("every generated storyboard gets the exact topic opener without duplication", () => {
  for (const [id, name] of [
    ["react", "React"],
    ["docker", "Docker"],
    ["agentic_rag", "Agentic RAG"],
  ]) {
    const original = structuredClone(STARTER_SCRIPTS[id]);
    const result = withTopicIntro(original, name);
    assert.ok(
      result.scenes[0].narration.startsWith(`Here is ${name} in 30 seconds.`),
    );
    assert.deepEqual(withTopicIntro(result, name), result);
    assert.deepEqual(original, STARTER_SCRIPTS[id]);
  }
  const other = structuredClone(STARTER_SCRIPTS.react);
  other.scenes[0].narration =
    "Retrieval finds relevant documents and gives them to a model to help answer questions with evidence.";
  assert.ok(
    withTopicIntro(other, "RAG").scenes[0].narration.startsWith(
      "Here is RAG in 30 seconds.",
    ),
  );
  assert.ok(
    withTopicIntro(STARTER_SCRIPTS.react, "RAG").scenes[0].narration.startsWith(
      "Here is RAG in 30 seconds. React builds",
    ),
  );
  assert.throws(() => withTopicIntro(other, "<script>"));
});

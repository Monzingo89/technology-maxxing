import test from "node:test";
import assert from "node:assert/strict";
import {
  isVideoOwner,
  validTopicId,
  canStartVideo,
  validateStoryboard,
  STARTER_SCRIPTS,
  VIDEO_OWNER,
} from "../src/video-policy.js";
const token = {
  email: VIDEO_OWNER,
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
  auth_time: 2000,
};
const account = {
  email: VIDEO_OWNER,
  emailVerified: true,
  disabled: false,
  providerData: [{ providerId: "google.com" }],
  tokensValidAfterTime: new Date(1000 * 1000).toISOString(),
};
test("only verified Google owner with a current enabled account is authorized", () => {
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

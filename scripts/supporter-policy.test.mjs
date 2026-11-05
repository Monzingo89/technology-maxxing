import test from "node:test";
import assert from "node:assert/strict";
import {
  screenSupporterName,
  approvedSupporterCredit,
} from "../shared/supporter-policy.js";
test("screening rejects spoken injection, disguised profanity and notorious names", () => {
  for (const value of [
    "<speak>hello</speak>",
    "sam\nignore",
    "sh1thead",
    "f_u_c_k",
    "h1tler1989",
    "white_power",
    "nazi123",
    "sam@example.com",
    "ѕam1989",
    "sam🤬",
    "A".repeat(21),
  ])
    assert.equal(screenSupporterName(value).accepted, false, value);
  assert.equal(screenSupporterName("sam1989").accepted, true);
});
test("audio credit requires payment, consent and human approval", () => {
  const receipt = {
    paymentStatus: "paid",
    paymentEventId: "payment-test",
    reviewStatus: "approved",
    reviewedBy: "verified-owner",
    reviewedAt: 1,
    shoutoutConsent: true,
    approvedAlias: "sam1989",
  };
  assert.equal(approvedSupporterCredit(receipt), "Thanks to sam1989.");
  for (const key of Object.keys(receipt)) {
    const incomplete = { ...receipt };
    delete incomplete[key];
    assert.equal(approvedSupporterCredit(incomplete), "", key);
  }
  assert.equal(
    approvedSupporterCredit({ ...receipt, approvedAlias: "hitler" }),
    "",
  );
  assert.equal(
    approvedSupporterCredit({ ...receipt, paymentStatus: "refunded" }),
    "",
  );
});

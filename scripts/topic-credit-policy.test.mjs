import test from "node:test";
import assert from "node:assert/strict";
import {
  contributionCents,
  topicCreditSummary,
  reserveTopicCredits,
} from "../shared/topic-credit-policy.js";
test("$20 funds three whole topics and retains $2 rather than rounding up", () => {
  assert.equal(contributionCents("20"), 2000);
  assert.deepEqual(topicCreditSummary(2000), { topics: 3, carryCents: 200 });
  assert.deepEqual(topicCreditSummary(200 + contributionCents("4.00")), {
    topics: 1,
    carryCents: 0,
  });
  for (const value of [
    "20.001",
    "-20",
    "NaN",
    "1e3",
    "600.01",
    "0",
    20,
    "20abc",
  ])
    assert.equal(contributionCents(value), null);
});
test("topic reservations reject duplicates, unknown topics and overspending", () => {
  const topics = new Set(["css", "html", "sql", "python"]);
  assert.equal(
    reserveTopicCredits(2000, ["css", "html", "sql"], topics).remainingCents,
    200,
  );
  assert.throws(
    () => reserveTopicCredits(2000, [...topics], topics),
    /Not enough/,
  );
  assert.throws(
    () => reserveTopicCredits(2000, ["css", "css"], topics),
    /distinct/,
  );
  assert.throws(
    () => reserveTopicCredits(2000, ["already-published"], topics),
    /unpublished/,
  );
  assert.throws(() => topicCreditSummary(19.99), /Invalid/);
});

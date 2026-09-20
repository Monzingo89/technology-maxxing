import test from "node:test";
import assert from "node:assert/strict";
import {
  usernameKey,
  validateOnboarding,
  validateAvatar,
  chooseProfession,
  canSwitchHouse,
  DAY,
  dayKey,
  prepareQuestion,
  publicQuestion,
  checkAnswer,
  updateRating,
  pairId,
  boundedPosition,
  recommendation,
} from "../src/core.js";
import { authorDailyBank, validateGeneratedBank } from "../src/author.js";
import { QUESTION_BANK } from "../src/questions.js";

test("username normalization prevents case collisions and path injection", () => {
  assert.equal(usernameKey("  Bright_Agent  "), "bright_agent");
  for (const value of [
    "ab",
    "a".repeat(21),
    "one/two",
    "a b",
    "Admin",
    "<script>",
    "a~b",
  ])
    assert.throws(() => usernameKey(value));
});
test("onboarding requires all policy/age agreements and twelve valid answers", () => {
  const valid = {
    username: "agent_one",
    house: "claude",
    avatar: { height: 50, body: "balanced" },
    aptitudeAnswers: Array(12).fill(1),
    acceptTerms: true,
    acceptPrivacy: true,
    ageConfirmed: true,
  };
  assert.equal(validateOnboarding(valid).profession, "developer");
  assert.equal(validateOnboarding(valid).analyticsConsent, false);
  for (const key of ["acceptTerms", "acceptPrivacy", "ageConfirmed"])
    assert.throws(() => validateOnboarding({ ...valid, [key]: false }));
  assert.throws(() => validateOnboarding({ ...valid, house: "unknown" }));
  assert.throws(() => chooseProfession([0, 1]));
  assert.throws(() => chooseProfession(Array(12).fill(6)));
  assert.throws(() => validateAvatar({ isAdmin: true }));
  assert.throws(() => validateAvatar({ height: Infinity }));
});
test("house lock uses exact elapsed time and daily key is UTC", () => {
  assert.equal(canSwitchHouse(1000, 1000 + 30 * DAY - 1), false);
  assert.equal(canSwitchHouse(1000, 1000 + 30 * DAY), true);
  assert.equal(dayKey(Date.parse("2026-09-15T23:59:59-05:00")), "2026-09-16");
});
test("public questions contain opaque answer tokens and no correctness metadata", () => {
  const privateQuestion = prepareQuestion(QUESTION_BANK.agents[0], 1000);
  const publicVersion = publicQuestion(privateQuestion, 0, 5);
  assert.equal(publicVersion.deadline, 6000);
  assert.equal(publicVersion.number, 1);
  assert.equal(publicVersion.total, 5);
  assert.equal(JSON.stringify(publicVersion).includes("correct"), false);
  assert.equal("sourceId" in publicVersion, false);
  assert.equal(
    new Set(publicVersion.options.map((option) => option.token)).size,
    4,
  );
});
test("server deadline rejects late answers and nonce/option injection", () => {
  const question = prepareQuestion(QUESTION_BANK.foundations[0], 1000);
  const correct = question.options.find((option) => option.correct).token;
  assert.equal(
    checkAnswer(question, question.nonce, correct, 6000).correct,
    true,
  );
  assert.deepEqual(checkAnswer(question, question.nonce, correct, 6001), {
    correct: false,
    timedOut: true,
  });
  assert.equal(
    checkAnswer(question, question.nonce, null, 2000).correct,
    false,
  );
  assert.throws(() =>
    checkAnswer(question, "replayed-or-stale", correct, 2000),
  );
  assert.throws(() =>
    checkAnswer(question, question.nonce, "answer-index-0", 2000),
  );
});
test("Elo and knowledge scores respond to performance with bounded knowledge", () => {
  const wins = Array.from({ length: 5 }, () => ({
    correct: true,
    difficulty: 1000,
  }));
  const losses = wins.map((value) => ({ ...value, correct: false }));
  const high = updateRating({}, wins),
    low = updateRating({}, losses);
  assert.ok(high.elo > 1000 && low.elo < 1000);
  assert.ok(
    high.knowledge > low.knowledge &&
      high.knowledge <= 100 &&
      low.knowledge >= 0,
  );
  assert.equal(high.answered, 5);
  assert.equal(high.correct, 5);
  assert.equal(updateRating(high, losses).rounds, 2);
});
test("pairs are deterministic and positions cannot inject NaN or leave world", () => {
  assert.equal(pairId("user_b", "user_a"), pairId("user_a", "user_b"));
  assert.throws(() => pairId("user", "user"));
  assert.throws(() => pairId("../user", "other"));
  assert.throws(() => boundedPosition(NaN));
  assert.equal(boundedPosition(1000), 40);
  assert.equal(boundedPosition(-1000), -40);
});
test("observability never removes links automatically or treats unknown exits as evidence", () => {
  assert.equal(
    recommendation({ views: 10000, observedReturns: 9, quickExits: 9 }).action,
    "collect-more-data",
  );
  assert.equal(
    recommendation({ views: 1000, observedReturns: 100, quickExits: 99 })
      .action,
    "review-improvement",
  );
  assert.equal(
    recommendation({ views: 1000, observedReturns: 900, quickExits: 80 })
      .action,
    "keep-observing",
  );
});
test("all reviewed seed categories contain enough short, valid questions", () => {
  for (const questions of Object.values(QUESTION_BANK)) {
    assert.ok(questions.length >= 5);
    for (const question of questions) {
      assert.equal(question.options.length, 4);
      assert.ok(question.options[question.answer]);
      assert.ok(question.prompt.length < 120);
    }
  }
});
test("AI authoring without a secret never calls an external service or claims generated status", async () => {
  let called = false;
  const bank = await authorDailyBank({
    day: "2026-09-15",
    fetcher: () => {
      called = true;
    },
  });
  assert.equal(called, false);
  assert.equal(bank.source, "reviewed-seed");
  assert.equal(bank.status, "seed-fallback");
});
test("AI authoring rejects unsupported source evidence and duplicate questions", () => {
  assert.throws(() => validateGeneratedBank({ questions: [] }, []));
  const source = {
    id: "test",
    summary: "A model processes a sequence of input tokens.",
  };
  const questions = Object.entries(QUESTION_BANK).flatMap(
    ([category, entries]) =>
      entries
        .slice(0, 5)
        .map((question) => ({
          ...question,
          category,
          sourceId: "test",
          evidence: source.summary,
        })),
  );
  assert.equal(validateGeneratedBank({ questions }, [source]).length, 25);
  assert.throws(() =>
    validateGeneratedBank(
      {
        questions: questions.map((question) => ({
          ...question,
          evidence: "A completely invented unsupported statement.",
        })),
      },
      [source],
    ),
  );
  assert.throws(() =>
    validateGeneratedBank(
      {
        questions: questions.map((question) => ({
          ...question,
          prompt: "What is the exact same repeated question?",
        })),
      },
      [source],
    ),
  );
});
test("AI authoring fails closed on API errors without retaining private error content", async () => {
  const bank = await authorDailyBank({
    apiKey: "server-secret",
    day: "2026-09-15",
    model: "test",
    sources: [],
    fetcher: async () => ({ ok: false }),
  });
  assert.equal(bank.status, "seed-fallback");
  assert.equal(JSON.stringify(bank).includes("server-secret"), false);
});

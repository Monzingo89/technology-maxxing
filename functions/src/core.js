import { randomInt, randomUUID } from "node:crypto";

export const POLICY_VERSION = "2026-09-19";
export const HOUSES = ["claude", "openai", "gemini"];
export const CATEGORIES = [
  "foundations",
  "prompting",
  "agents",
  "models",
  "safety",
];
export const PROFESSIONS = [
  "teacher",
  "developer",
  "farmer",
  "finance",
  "firefighter",
  "law",
];
export const DAY = 86_400_000;
export const QUESTION_MS = 5_000;

export class InputError extends Error {}
export function requireValue(condition, message) {
  if (!condition) throw new InputError(message);
}
export function cleanText(value, min = 1, max = 280) {
  requireValue(typeof value === "string", "Enter valid text.");
  const text = value.trim();
  requireValue(
    text.length >= min &&
      text.length <= max &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text),
    `Text must be ${min}–${max} characters.`,
  );
  return text;
}
export function usernameKey(value) {
  const username = cleanText(value, 3, 20).toLowerCase();
  requireValue(
    /^[a-z0-9_]{3,20}$/.test(username),
    "Use 3–20 letters, numbers, or underscores.",
  );
  requireValue(
    !["admin", "moderator", "support", "aispace", "system"].includes(username),
    "This username is reserved.",
  );
  return username;
}
export function pick(value, values, label) {
  requireValue(values.includes(value), `Choose a valid ${label}.`);
  return value;
}
export function validateAvatar(input) {
  requireValue(
    input && typeof input === "object" && !Array.isArray(input),
    "Choose your avatar.",
  );
  requireValue(JSON.stringify(input).length <= 3000, "Avatar is too large.");
  const ranges = new Set(["height", "weight", "eyes", "nose", "mouth"]);
  const colors = new Set(["skin", "hair", "outfit"]);
  const enums = {
    body: ["balanced", "athletic", "soft"],
    legs: ["classic", "long", "robotic"],
    feet: ["sneakers", "boots", "hover"],
    presentation: ["feminine", "masculine", "androgynous"],
    hairStyle: ["crop", "waves", "bun", "mohawk"],
  };
  const avatar = {};
  for (const [key, value] of Object.entries(input)) {
    if (ranges.has(key))
      requireValue(
        typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 100,
        "Avatar proportions must be between 0 and 100.",
      );
    else if (colors.has(key))
      requireValue(
        typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value),
        "Choose a valid avatar color.",
      );
    else
      requireValue(
        enums[key]?.includes(value),
        "Choose a supported avatar setting.",
      );
    avatar[key] = value;
  }
  return avatar;
}
export function chooseProfession(answers) {
  requireValue(
    Array.isArray(answers) &&
      answers.length === 12 &&
      answers.every((n) => Number.isInteger(n) && n >= -1 && n <= 5),
    "Complete all 12 discovery questions.",
  );
  const scores = PROFESSIONS.map(
    (_, index) => answers.filter((answer) => answer === index).length,
  );
  return PROFESSIONS[scores.indexOf(Math.max(...scores))];
}
export function validateOnboarding(data) {
  requireValue(
    data?.acceptTerms === true &&
      data.acceptPrivacy === true &&
      data.ageConfirmed === true,
    "Accept the policies and confirm you are 18 or older.",
  );
  return {
    username: usernameKey(data.username),
    house: pick(data.house, HOUSES, "house"),
    avatar: validateAvatar(data.avatar),
    profession: chooseProfession(data.aptitudeAnswers),
    analyticsConsent: data.analyticsConsent === true,
  };
}
export function canSwitchHouse(lastChangedAt, now) {
  return now - lastChangedAt >= 30 * DAY;
}
export function dayKey(now) {
  return new Date(now).toISOString().slice(0, 10);
}
export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function prepareQuestion(source, now) {
  const options = shuffle(
    source.options.map((text, index) => ({
      token: randomUUID(),
      text,
      correct: index === source.answer,
    })),
  );
  return {
    sourceId: source.id,
    prompt: source.prompt,
    nonce: randomUUID(),
    options,
    deadline: now + QUESTION_MS,
    difficulty: source.difficulty || 1000,
  };
}
export function publicQuestion(question, index, total) {
  return {
    nonce: question.nonce,
    prompt: question.prompt,
    options: question.options.map(({ token, text }) => ({ token, text })),
    deadline: question.deadline,
    number: index + 1,
    total,
  };
}
export function checkAnswer(question, nonce, optionToken, now) {
  requireValue(nonce === question.nonce, "This question has already changed.");
  requireValue(
    optionToken === null ||
      question.options.some((option) => option.token === optionToken),
    "Choose one of the provided options.",
  );
  return {
    correct:
      now <= question.deadline &&
      optionToken !== null &&
      question.options.some(
        (option) => option.token === optionToken && option.correct,
      ),
    timedOut: now > question.deadline,
  };
}
export function updateRating(previous = {}, responses) {
  let elo = Number.isFinite(previous.elo) ? previous.elo : 1000;
  for (const response of responses) {
    const expectation = 1 / (1 + 10 ** ((response.difficulty - elo) / 400));
    elo += 24 * ((response.correct ? 1 : 0) - expectation);
  }
  const answered = (previous.answered || 0) + responses.length;
  const correct =
    (previous.correct || 0) +
    responses.filter((response) => response.correct).length;
  // A smoothed quiz mastery indicator. This is not an IQ test or an intelligence measure.
  const knowledge = Math.round((100 * (correct + 2)) / (answered + 4));
  return {
    elo: Math.round(elo),
    answered,
    correct,
    knowledge,
    score: Math.round(elo * 0.8 + knowledge * 4),
    rounds: (previous.rounds || 0) + 1,
  };
}
export function pairId(a, b) {
  requireValue(
    typeof a === "string" &&
      typeof b === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(a) &&
      /^[A-Za-z0-9_-]{1,128}$/.test(b) &&
      a !== b,
    "Choose another agent.",
  );
  return [a, b].sort().join("~");
}
export function boundedPosition(value) {
  requireValue(
    typeof value === "number" && Number.isFinite(value),
    "Invalid position.",
  );
  return Math.max(-40, Math.min(40, value));
}
export function recommendation(metrics) {
  const views = Number(metrics.views) || 0;
  const observedReturns = Number(metrics.observedReturns) || 0;
  const quickExits = Number(metrics.quickExits) || 0;
  if (views < 100 || observedReturns < 100)
    return {
      action: "collect-more-data",
      reason:
        "At least 100 consented visits with observed returns are required. Unobserved departures remain unknown.",
    };
  if (quickExits / observedReturns >= 0.99)
    return {
      action: "review-improvement",
      reason:
        "99% or more of observed returns were within 10 seconds. Review destination quality and intent; external dwell and unobserved departures are unknown.",
    };
  return {
    action: "keep-observing",
    reason: "No automatic editorial action is warranted.",
  };
}

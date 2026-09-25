// Reviewed banks replace the complete five-question catalog fallback.
// Reject malformed content instead of silently publishing trivia in its place.
export function validateReviewedBanks(banks, topicIds) {
  const fail = (message) => {
    throw new Error(`Reviewed assessment: ${message}`);
  };
  const nonempty = (value) =>
    typeof value === "string" && value.trim().length > 0;
  if (!banks || typeof banks !== "object" || Array.isArray(banks))
    fail("banks must be an object keyed by topic ID");
  const known = new Set(topicIds);
  const questionIds = new Set();
  const prompts = new Set();
  for (const [topicId, bank] of Object.entries(banks)) {
    if (!known.has(topicId)) fail(`unknown topic ${topicId}`);
    if (!Number.isInteger(bank?.version) || bank.version < 1)
      fail(`${topicId} needs a positive version`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bank.reviewedAt || ""))
      fail(`${topicId} needs a review date`);
    if (!Array.isArray(bank.questions) || bank.questions.length !== 5)
      fail(`${topicId} must contain exactly five questions`);
    const skills = new Set();
    const difficulties = new Set();
    for (const q of bank.questions) {
      if (
        !nonempty(q.id) ||
        !q.id.startsWith(`${topicId}-`) ||
        questionIds.has(q.id)
      )
        fail(`${topicId} has an invalid or repeated question ID`);
      questionIds.add(q.id);
      if (!nonempty(q.question)) fail(`${q.id} needs a prompt`);
      const prompt = q.question.trim().toLowerCase().replace(/\s+/g, " ");
      if (prompts.has(prompt)) fail(`${q.id} repeats a prompt`);
      prompts.add(prompt);
      if (!nonempty(q.skill) || skills.has(q.skill.toLowerCase()))
        fail(`${q.id} must assess a distinct skill`);
      skills.add(q.skill.toLowerCase());
      if (!["foundation", "applied", "advanced"].includes(q.difficulty))
        fail(`${q.id} has an invalid difficulty`);
      difficulties.add(q.difficulty);
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every(nonempty) ||
        new Set(q.options.map((option) => option.trim().toLowerCase())).size !==
          4
      )
        fail(`${q.id} must have four distinct nonempty options`);
      if (
        !Number.isInteger(q.answerIndex) ||
        q.answerIndex < 0 ||
        q.answerIndex > 3
      )
        fail(`${q.id} has an invalid answer index`);
      if (!nonempty(q.explanation)) fail(`${q.id} needs an explanation`);
      if (!Array.isArray(q.sources) || !q.sources.length)
        fail(`${q.id} needs a supporting primary source`);
      for (const source of q.sources) {
        let url;
        try {
          url = new URL(source.url);
        } catch {
          fail(`${q.id} has an invalid source URL`);
        }
        if (
          !nonempty(source.label) ||
          url.protocol !== "https:" ||
          url.username ||
          url.password
        )
          fail(`${q.id} needs a labeled HTTPS source without credentials`);
      }
    }
    if (difficulties.size !== 3)
      fail(
        `${topicId} must cover foundation, applied, and advanced understanding`,
      );
  }
  return banks;
}

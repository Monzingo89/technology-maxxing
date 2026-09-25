# Five-question assessment revisions

Revise ten topics per batch. The active app's reviewed banks live in
`data/assessment-banks.json`, keyed by existing catalog topic IDs. Each bank has
a version, a review date, and exactly five questions. The build publishes the
whole reviewed bank; other topics retain their existing catalog-generated bank.

## What a bank should measure

Cover five distinct skills, rather than asking the same definition in five ways:

1. A foundational concept that distinguishes the topic from nearby ideas.
2. A practical decision using that concept.
3. A diagnosis of a common failure or misconception.
4. An interpretation of results, data, or an evaluation setup.
5. A meaningful limitation or tradeoff.

Aim for one foundation, three applied, and one advanced item. These are editorial
difficulty estimates, not calibrated item statistics. Five answers give a quick
sample of understanding; they do not establish comprehensive topic mastery.

## Question standard

- State enough assumptions for exactly one answer to be defensible.
- Use a short concrete scenario when it helps reveal understanding.
- Keep the stem under 39 words, each option under 17, and the displayed question
  plus all options at or below 85 words for the current 20-second timer.
- Offer four plausible choices from the same subject. Wrong choices should
  represent specific misconceptions, not unrelated technologies or absurd claims.
- Keep choices similar in style and length. Avoid grammatical clues, duplicated
  answers, negative trick wording, and "all/none of the above."
- Do not test acronym expansion, release dates, catalog wording, or source URLs.
- Explain why the answer fits and why a tempting alternative does not.
- Link each question to primary documentation or an original paper that supports
  the actual claim being tested. Avoid version-specific behavior where possible.
- Give questions stable IDs and short, concrete `skill` labels. Preserve authored
  answer positions; the app shuffles choices without changing correctness.

## Review and publish

Each question contains `id`, `skill`, `difficulty`, `question`, four `options`,
`answerIndex`, `explanation`, and `sources` (`label`, HTTPS `url`). Have a second
reviewer check technical accuracy, alternative valid answers, distractor quality,
reading load, and overlap within the bank before publication.

Run `npm run build && npm test`. The build rejects incomplete or malformed
reviewed banks. Tests verify that all five reviewed questions, correct answers,
rationales, and source links reach the generated catalog unchanged. Compare the
published banks outside the batch with the pre-edit build to catch unintended
changes. Exercise shuffled answers, scoring, and the answer review in local
development before deploying; verify the live `knowledge-index.json` afterward.

The app orders reviewed questions from foundation to advanced, randomizes items
within a level, and randomizes options. Skill-level explanations appear after the
assessment finishes, with missed or unanswered items expanded. Existing timing,
pass thresholds, and account access rules still apply.

## Batch 1 — 2026-09-25

Supervised learning, unsupervised learning, self-supervised learning,
reinforcement learning, RLHF, SFT, DPO, LLMs, Transformer architecture, and RAG.

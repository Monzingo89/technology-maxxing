# Discovery update — October 13, 2026

## Mobile model cards

The model recommendations screen now has explicit heading line-height, paragraph rhythm, card padding, wrapping model names, and expandable methodology/data notes. Metadata retry is shown only when a request fails. License labels in category picks and the 100-model catalog link through the existing learning account gate. Unknown terms lead to the model-licensing primer, not an invented license assignment. The publisher's actual model card and upstream terms remain authoritative.

## Topic organization and new content

50 topics: 30 file extensions and 20 license/terms topics. Each has a learning page, official documentation link, five authored multiple-choice questions, a practice activity, and related-topic links. File interests include data/configuration, web/source, images/3D, AI files, archives and documents. Version-specific Llama and Open RAIL topics prevent collapsing distinct agreements into one license.

The Library provides interest-area counts, category refinement, search, assessment-type filtering and a reset. Existing topic IDs, relationships and progress remain intact. `scripts/standards-topics.mjs` is the authored source; `scripts/sync-standards.mjs` materializes catalog records during the build.

## Benchmark explorer

`#benchmarks` is a lazy-loaded view with horizontal, zero-baseline 0–100 score bars and text equivalents. Filters cover task area, benchmark/report, model access, report/configuration group, model name and minimum score. Each result exposes its date, conditions and primary source. Empty filters have an explicit recovery action.

The initial dataset is a curated evidence collection, NOT a live leaderboard: six evaluations from the original January 2025 DeepSeek R1 release comparison plus the existing model atlas's MMLU, SWE-bench Verified and Terminal-Bench 4.0 evidence. Different reports remain separate series. The source report's historical dates remain visible even though URLs were checked in October 2026. OS, GPU, quantization, latency and cost filters are intentionally absent where paired measurements do not exist. Downloads are not benchmark scores. No new API credential is required.

## Assessment audit: findings and limits

Run `npm run build && npm run audit:assessments && npm test`.

The complete automated audit covers 1,372 topics / 6,860 questions. It checks question count, exact normalized prompt uniqueness, distinct options, valid answer indices, explanations, sources, skill labels and reading burden. It is not semantic or expert validation of every legacy distractor.

Fixed: the build validated authored banks but ignored them when publishing the public assessment index. Regression tests now require published authored banks to match their source exactly. Restored 30 existing authored banks and added 50. Also supplied missing official documentation for 27 base topics. Generated connection questions now describe catalog links instead of treating every relationship (including alternatives) as technical compatibility. Generated category recognition is labeled foundational, not advanced.

The remaining 1,292 generated banks are explicitly classified as catalog recall in cards, filters and the pre-assessment dialog. Their source descriptions and distractors still need topic-by-topic editorial review before being considered proficiency tests. `assessment-audit.json` records every such topic rather than reporting a blanket quality pass.

The existing 10-second timer, shuffled options and randomized ordering remain. They discourage casual lookup but cannot exclude AI assistance; the questions/answers are public client data and this is not a proctored certification system. A high-stakes assessment would require separately designed server-held pools, server-authoritative timing, accessibility accommodations, practical tasks and an explicit integrity policy. This release does not claim those protections.

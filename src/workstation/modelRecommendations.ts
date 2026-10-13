// Editorial shortlist, not a measured leaderboard. Sources checked 2026-10-13.
export const pickModels = {
  coder480: [
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "Apache-2.0",
    "Large agentic coding MoE; requires server-class memory.",
  ],
  coder30: [
    "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    "Apache-2.0",
    "Smaller coding MoE; all expert weights still need memory.",
  ],
  coder32: [
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Apache-2.0",
    "Dense coding model for generation, repair and explanation.",
  ],
  v3: [
    "deepseek-ai/DeepSeek-V3.2",
    "MIT",
    "Large reasoning and tool-use model; substantial serving requirements.",
  ],
  r1: [
    "deepseek-ai/DeepSeek-R1-0528",
    "MIT",
    "Reasoning model; longer inference can increase latency and cost.",
  ],
  instruct: [
    "Qwen/Qwen3-235B-A22B-Instruct-2507",
    "Apache-2.0",
    "Large instruction-following MoE for tool and document workflows.",
  ],
  thinking: [
    "Qwen/Qwen3-235B-A22B-Thinking-2507",
    "Apache-2.0",
    "Longer reasoning for difficult analysis; not a factuality guarantee.",
  ],
  devstral: [
    "mistralai/Devstral-Small-2505",
    "Apache-2.0",
    "24B software-engineering agent model for repository work.",
  ],
  mistral: [
    "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    "Apache-2.0",
    "24B instruction model; validate tools and task-specific quality.",
  ],
  llama: [
    "meta-llama/Llama-3.3-70B-Instruct",
    "Llama 3.3 Community License",
    "Text-only 70B model; gated weights and custom use terms.",
  ],
  gemma: [
    "google/gemma-3-27b-it",
    "Gemma terms",
    "27B instruction model; gated weights and custom terms.",
  ],
  distill: [
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "MIT; check upstream terms",
    "Smaller distilled reasoning model; not equivalent to full R1.",
  ],
  qwen32: [
    "Qwen/Qwen3-32B",
    "Apache-2.0",
    "Dense model with thinking/non-thinking modes.",
  ],
  sql: [
    "defog/sqlcoder-7b-2",
    "CC-BY-SA-4.0; check upstream terms",
    "Text-to-SQL specialist, not a general database administrator.",
  ],
  med27: [
    "google/medgemma-27b-text-it",
    "Health AI Developer Foundations terms",
    "Medical-text research model; not validated for unsupervised clinical use.",
  ],
  med4: [
    "google/medgemma-4b-it",
    "Health AI Developer Foundations terms",
    "Smaller medical text/image research model; clinical validation required.",
  ],
  law7: [
    "AdaptLLM/law-chat",
    "Llama 2 Community License",
    "Older 7B legal-domain research baseline; not a licensed legal adviser.",
  ],
  finance7: [
    "AdaptLLM/finance-chat",
    "Llama 2 Community License",
    "Older 7B finance-domain research baseline; not validated for investment decisions.",
  ],
} as const;
export type PickKey = keyof typeof pickModels;
type Pick = [PickKey, string];
export type PickCategory = {
  id: string;
  name: string;
  scope: string;
  caution: string;
  checks: string;
  picks: Pick[];
};
export const pickCategories: PickCategory[] = [
  {
    id: "front-end",
    name: "Front End Coding",
    scope: "Component implementation, browser interactions and UI tests.",
    caution:
      "Generated UI still needs real-browser accessibility, responsive-layout and security review.",
    checks:
      "Keyboard navigation, mobile overflow, visual regressions, XSS and component tests.",
    picks: [
      [
        "coder480",
        "First trial for complex UI agents with a browser test harness.",
      ],
      [
        "devstral",
        "Repository-level component changes on a smaller serving footprint.",
      ],
      [
        "coder30",
        "Practical smaller coding agent for iterative frontend work.",
      ],
      ["v3", "Cross-file application changes with tool-based verification."],
      ["coder32", "Focused React, CSS and TypeScript edits."],
      [
        "instruct",
        "Translate detailed UI acceptance criteria into implementation.",
      ],
      ["qwen32", "Local component explanations and bounded fixes."],
      ["mistral", "Smaller assistant for UI copy and implementation drafts."],
      ["llama", "Explain frontend patterns and review supplied code."],
      [
        "gemma",
        "Prototype UI-oriented instruction workflows; verify generated code.",
      ],
    ],
  },
  {
    id: "back-end",
    name: "Back End Coding",
    scope: "Services, APIs, asynchronous jobs and integration tests.",
    caution:
      "Never deploy generated endpoints without authorization, input-validation and failure-path tests.",
    checks:
      "API contracts, retries, idempotency, authorization and integration tests.",
    picks: [
      ["coder480", "Multi-file service implementation with agent tools."],
      ["v3", "Reason through service behavior and verify using tools."],
      [
        "devstral",
        "Explore repositories and implement bounded backend issues.",
      ],
      ["coder32", "Typed handlers, service functions and code repair."],
      ["coder30", "Smaller tool-driven backend coding loop."],
      [
        "instruct",
        "Convert API specifications into structured implementation plans.",
      ],
      ["r1", "Analyze difficult concurrency and failure scenarios."],
      ["thinking", "Explore distributed-system tradeoffs before coding."],
      ["qwen32", "Local service debugging and test drafting."],
      ["mistral", "Smaller endpoint scaffolding and documentation assistant."],
    ],
  },
  {
    id: "database",
    name: "Database Layer Coding",
    scope: "Schema-aware SQL, migrations and database access layers.",
    caution:
      "Use read-only credentials for exploration. Review migrations, rollback plans and query costs before execution.",
    checks:
      "Result correctness, EXPLAIN plans, transaction isolation, injection tests and migration rollback.",
    picks: [
      ["sql", "Specialist first trial for schema-grounded text-to-SQL."],
      ["coder480", "Implement repository-wide persistence-layer changes."],
      ["coder32", "SQL, ORM and migration-code drafting."],
      ["v3", "Analyze transaction behavior and query workflows."],
      ["devstral", "Trace persistence code across an existing repository."],
      ["coder30", "Smaller coding agent for database adapters."],
      [
        "instruct",
        "Map schema documentation into structured query requirements.",
      ],
      ["r1", "Reason about invariants and transaction edge cases."],
      ["qwen32", "Local schema explanations and SQL review."],
      [
        "distill",
        "Smaller reasoning alternative for relational-design exercises.",
      ],
    ],
  },
  {
    id: "architecture",
    name: "Software Architecture",
    scope:
      "Requirements, design alternatives and architectural decision records.",
    caution:
      "These are design assistants, not evidence that an architecture meets reliability or capacity requirements.",
    checks:
      "Explicit assumptions, deployment constraints, failure modes, cost estimates and prototype measurements.",
    picks: [
      [
        "r1",
        "Explore difficult design alternatives with explicit assumptions.",
      ],
      ["thinking", "Compare interacting constraints in complex systems."],
      ["v3", "Combine design reasoning with repository/tool context."],
      [
        "instruct",
        "Draft structured decision records and interface contracts.",
      ],
      ["coder480", "Ground architecture discussions in code implementation."],
      ["llama", "Review supplied design documents and tradeoffs."],
      ["qwen32", "Local architecture discussions with controlled context."],
      ["distill", "Lower-footprint reasoning for bounded design questions."],
      ["mistral", "Draft service boundaries and readable design notes."],
      ["gemma", "Summarize requirements and compare supplied proposals."],
    ],
  },
  {
    id: "refactoring",
    name: "Refactoring",
    scope: "Behavior-preserving changes to existing codebases.",
    caution:
      "No model or quantization guarantees behavior preservation; require tests before and after every change.",
    checks:
      "Small diffs, characterization tests, API compatibility, type checks and performance regressions.",
    picks: [
      ["devstral", "Repository exploration and coordinated multi-file edits."],
      ["coder480", "Larger agentic refactors with adequate serving hardware."],
      ["coder32", "Targeted repair and clear code transformations."],
      ["coder30", "Smaller agent loop for incremental refactors."],
      ["v3", "Cross-module changes with test feedback."],
      [
        "instruct",
        "Follow explicit migration constraints and acceptance criteria.",
      ],
      ["r1", "Analyze tricky invariants before changing code."],
      ["thinking", "Reason through coupling and migration sequences."],
      ["qwen32", "Local small-module refactoring assistance."],
      ["mistral", "Bounded cleanup, documentation and test drafting."],
    ],
  },
  {
    id: "security",
    name: "Security Coding",
    scope: "Defensive code review, hardening and security regression tests.",
    caution:
      "No candidate is certified to produce secure code. Use only authorized systems; combine review with SAST, dependency scanning and human assessment.",
    checks:
      "Threat models, least privilege, injection defenses, secret handling and abuse-case tests.",
    picks: [
      ["coder480", "Implement defensive fixes with repository context."],
      ["v3", "Review trust boundaries and validate findings using tools."],
      ["r1", "Reason through authentication and authorization edge cases."],
      ["devstral", "Trace vulnerable paths and patch them with tests."],
      ["coder32", "Focused secure-coding fixes and regression cases."],
      [
        "thinking",
        "Analyze threat scenarios without treating speculation as findings.",
      ],
      ["coder30", "Smaller local agent for controlled hardening tasks."],
      ["instruct", "Turn security requirements into review checklists."],
      ["qwen32", "Private review of bounded code snippets."],
      ["llama", "Explain defensive patterns and review supplied evidence."],
    ],
  },
  {
    id: "law",
    name: "Law",
    scope:
      "Supervised legal-document research, extraction and drafting experiments.",
    caution:
      "Not legal advice or a lawyer substitute. None is validated here for legal practice. Verify jurisdiction, effective dates and every citation with primary legal sources and qualified counsel.",
    checks:
      "Citation existence, jurisdiction, privilege, redaction and attorney review.",
    picks: [
      ["instruct", "Extract clauses and obligations from supplied documents."],
      ["v3", "Tool-assisted retrieval and structured document workflows."],
      ["r1", "Compare arguments against supplied legal authorities."],
      [
        "thinking",
        "Analyze complex supplied fact patterns with source checks.",
      ],
      ["llama", "Draft summaries of provided text for professional review."],
      ["qwen32", "Local document experiments where confidentiality matters."],
      ["gemma", "Summarize supplied materials under custom license terms."],
      ["mistral", "Smaller document extraction and drafting workflow."],
      ["distill", "Lower-footprint comparison of supplied arguments."],
      [
        "law7",
        "Domain-adapted legal research baseline to compare against newer generalists.",
      ],
    ],
  },
  {
    id: "medical",
    name: "Medical",
    scope:
      "Medical-text research and supervised literature workflows, not patient diagnosis.",
    caution:
      "Not medical advice or a clinical device. No unsupervised diagnosis, treatment or dosing. Use qualified clinical review, de-identified data and task-specific validation.",
    checks:
      "Clinical validation, hallucination audits, privacy controls and clinician review.",
    picks: [
      ["med27", "Medical-text specialist to evaluate for research tasks."],
      ["med4", "Smaller medical text/image research baseline."],
      ["r1", "General reasoning baseline for supervised literature analysis."],
      [
        "thinking",
        "Compare supplied research arguments; independently verify conclusions.",
      ],
      ["instruct", "Structured extraction from supplied research documents."],
      ["v3", "Tool-grounded literature workflows with human review."],
      ["llama", "General text baseline for supervised medical research."],
      ["gemma", "General instruction baseline; not medically specialized."],
      ["qwen32", "Local de-identified research-text experiments."],
      ["mistral", "Smaller general baseline for literature summarization."],
    ],
  },
  {
    id: "research",
    name: "Research",
    scope:
      "Literature synthesis, reproducible analysis and hypothesis exploration.",
    caution:
      "A fluent answer is not evidence. Retrieve original papers, verify citations, and distinguish hypotheses from measured results.",
    checks:
      "Citation verification, reproducible code, data provenance and uncertainty reporting.",
    picks: [
      ["r1", "Explore mathematical and analytical research questions."],
      ["thinking", "Longer reasoning for difficult scientific analysis."],
      ["v3", "Tool-based research and structured analysis workflows."],
      [
        "instruct",
        "Synthesize supplied papers and extract structured findings.",
      ],
      ["qwen32", "Local reasoning baseline for smaller projects."],
      ["distill", "Lower-footprint reasoning experiments."],
      ["llama", "Summarize and compare supplied literature."],
      ["gemma", "General research assistant under custom license terms."],
      ["mistral", "Smaller literature and document-processing baseline."],
      ["coder32", "Write reproducible analysis scripts and tests."],
    ],
  },
  {
    id: "finance",
    name: "Finance",
    scope:
      "Supervised financial-document extraction and reproducible analysis.",
    caution:
      "Not investment, tax or financial advice. None is validated here for trading or fiduciary decisions. Use current filings, deterministic calculations and qualified review; never promise returns.",
    checks:
      "As-of dates, reconciled statements, calculator-verified arithmetic, data licenses and expert review.",
    picks: [
      ["instruct", "Extract structured facts from supplied filings."],
      ["r1", "Analyze financial assumptions with external calculation checks."],
      ["v3", "Tool-grounded document and calculation workflows."],
      ["thinking", "Compare scenario assumptions and sensitivities."],
      ["qwen32", "Local financial-document experiments."],
      ["llama", "Summarize supplied disclosures for human review."],
      [
        "coder32",
        "Build auditable analysis code rather than trusting mental arithmetic.",
      ],
      ["distill", "Smaller reasoning baseline for supplied scenarios."],
      ["mistral", "Lower-footprint document extraction workflow."],
      [
        "finance7",
        "Domain-adapted finance research baseline to compare against newer generalists.",
      ],
    ],
  },
];
export const pickSource = (key: PickKey) =>
  `https://huggingface.co/${pickModels[key][0]}`;

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const generatedPath = path.join(root, "data/generated-technologies.json");
const generated = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
const updatedAt = "2026-09-29";
const source = (label, url) => ({ label, url });
const openai = source(
  "OpenAI Agents SDK documentation",
  "https://openai.github.io/openai-agents-python/",
);
const anthropic = source(
  "Building Effective AI Agents",
  "https://www.anthropic.com/engineering/building-effective-agents",
);

const topic = ({
  id,
  name,
  born,
  tag,
  history,
  why,
  problem,
  docs,
  rel,
}) => ({
  id,
  name,
  cat: "ai",
  born,
  tag,
  history,
  why,
  problemItSolves: problem,
  rel: { seeAlso: rel },
  challenges: [
    `Define ${name} and identify its place in an agent architecture.`,
    `Choose a task where ${name} improves an agent system.`,
    `Diagnose one failure caused by misusing ${name}.`,
    `Interpret a trace or state transition involving ${name}.`,
    `Explain one operational tradeoff of ${name}.`,
  ],
  extension: { problemItSolves: problem, docs, updatedAt },
});

const topics = [
  topic({
    id: "agent_harness",
    name: "Agent Harness",
    born: "Agent application runtime architecture",
    tag: "Wraps a model with instructions, tools, state, policies, and an execution loop",
    history:
      "An agent harness is the application layer around a model that assembles context, exposes capabilities, executes actions, records results, and decides when a run pauses or ends. The model proposes behavior; the harness owns the operational boundary.",
    why: "It turns a stateless model call into a controllable, observable system that can complete multi-step work.",
    problem: "It coordinates model reasoning with real tools, persistent state, safety checks, and termination rules.",
    docs: [openai],
    rel: ["agent_runtime", "tool_calling_agents", "agent_state", "guardrails"],
  }),
  topic({
    id: "agent_runtime",
    name: "Agent Runtime",
    born: "Agent execution infrastructure",
    tag: "Executes model turns, tool calls, handoffs, pauses, retries, and final outputs",
    history:
      "An agent runtime advances a run through model and application events. It may stream results, enforce turn limits, suspend for approvals, resume saved state, and coordinate multiple agents or tools.",
    why: "It supplies consistent lifecycle behavior so agent logic does not have to rebuild orchestration for every task.",
    problem: "It manages the changing control state of long, branching, and failure-prone agent executions.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["agent_harness", "agent_run", "durable_agent_execution"],
  }),
  topic({
    id: "agent_run",
    name: "Agent Run",
    born: "Agent lifecycle unit",
    tag: "Represents one bounded attempt to pursue a goal through one or more model turns",
    history:
      "A run begins with an input and runtime configuration, accumulates messages and actions, and finishes, pauses, fails, or reaches a limit. One run can contain many turns and tool calls, so run and model request are not synonyms.",
    why: "It gives tracing, budgets, cancellation, resumption, and results a clear operational scope.",
    problem: "It provides a boundary for managing and measuring a multi-step agent task.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["agent_runtime", "agent_turn", "agent_tracing"],
  }),
  topic({
    id: "agent_turn",
    name: "Agent Turn",
    born: "Agent loop iteration",
    tag: "Processes current context through a model and handles the resulting action or answer",
    history:
      "A turn commonly includes context assembly, a model response, and classification of that response as a tool request, handoff, or final output. Tool results are appended before the next turn.",
    why: "It provides the repeatable step from which larger agent loops are constructed.",
    problem: "It converts evolving run state into one controlled model decision at a time.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["agent_run", "tool_use_loop", "termination_condition"],
  }),
  topic({
    id: "agent_state",
    name: "Agent State",
    born: "Agent runtime data model",
    tag: "Stores the information required to continue, inspect, or resume an agent run",
    history:
      "Agent state can include conversation items, current agent, tool results, plans, checkpoints, budgets, and application metadata. Model-visible context is only one projection of this larger runtime state.",
    why: "It lets applications preserve continuity without forcing every operational detail into the model prompt.",
    problem: "It separates durable workflow facts from the limited context sent to each model call.",
    docs: [
      source(
        "OpenAI Agents SDK: Context management",
        "https://openai.github.io/openai-agents-python/context/",
      ),
    ],
    rel: ["agent_harness", "checkpointing", "context_management"],
  }),
  topic({
    id: "context_management",
    name: "Agent Context Management",
    born: "Agent information architecture",
    tag: "Selects, compacts, orders, and supplies information for each model turn",
    history:
      "Context management decides which instructions, conversation items, retrieved evidence, tool results, summaries, and state reach the model. More context is not always better because irrelevant history consumes budget and can distract decisions.",
    why: "It keeps long-running agents grounded in relevant evidence while respecting context limits and cost.",
    problem: "It prevents an expanding run history from overwhelming or confusing later model turns.",
    docs: [
      source(
        "OpenAI Agents SDK: Context management",
        "https://openai.github.io/openai-agents-python/context/",
      ),
    ],
    rel: ["agent_state", "agent_memory", "context_compaction"],
  }),
  topic({
    id: "context_compaction",
    name: "Context Compaction",
    born: "Long-running agent context technique",
    tag: "Replaces selected history with a shorter representation while retaining needed facts",
    history:
      "Compaction may summarize older turns, preserve recent or lossless items, and retain identifiers required by tools or APIs. A poor summary can silently remove constraints, provenance, or unresolved tasks.",
    why: "It extends useful run length and lowers repeated input cost when complete history no longer fits.",
    problem: "It controls context growth without simply deleting all earlier progress.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["context_management", "agent_memory", "checkpointing"],
  }),
  topic({
    id: "tool_registry",
    name: "Agent Tool Registry",
    born: "Agent capability catalog",
    tag: "Exposes named tools and their contracts to an agent for discovery and invocation",
    history:
      "A tool registry associates tool names with descriptions, input schemas, execution handlers, permissions, and error behavior. Large overlapping registries can reduce selection quality, so tools are often filtered for each task or role.",
    why: "It gives an agent a structured inventory of actions without embedding every implementation in the prompt.",
    problem: "It connects model-selected capabilities to validated application functions and services.",
    docs: [
      source(
        "OpenAI Agents SDK: Tools",
        "https://openai.github.io/openai-agents-python/tools/",
      ),
    ],
    rel: ["tool_calling_agents", "tool_schema", "mcp"],
  }),
  topic({
    id: "tool_schema",
    name: "Tool Schema",
    born: "Structured agent interface contract",
    tag: "Defines a tool's name, purpose, input fields, types, and validation rules",
    history:
      "A tool schema translates an application capability into a machine-readable contract the model can call. Clear descriptions and constrained fields reduce ambiguity, but schema validation does not establish authorization or make side effects safe.",
    why: "It improves tool selection and allows arguments to be checked before application code runs.",
    problem: "It replaces brittle free-form action parsing with an explicit typed interface.",
    docs: [
      source(
        "OpenAI function calling guide",
        "https://platform.openai.com/docs/guides/function-calling",
      ),
    ],
    rel: ["tool_registry", "function_calling", "guardrails"],
  }),
  topic({
    id: "guardrails",
    name: "Agent Guardrails",
    born: "Agent policy enforcement layer",
    tag: "Checks or constrains inputs, outputs, and tool activity at defined workflow boundaries",
    history:
      "Guardrails can validate initial input, final output, or individual tool calls. Their placement matters: an output check cannot undo an external side effect, and a parallel input check may finish after work has already started.",
    why: "They add deterministic or separately evaluated controls around probabilistic agent behavior.",
    problem: "They block or flag unsafe, invalid, irrelevant, or policy-violating behavior before the wrong boundary is crossed.",
    docs: [
      source(
        "OpenAI Agents SDK: Guardrails",
        "https://openai.github.io/openai-agents-python/guardrails/",
      ),
    ],
    rel: ["agent_harness", "tool_schema", "human_approval_loop"],
  }),
  topic({
    id: "agent_tracing",
    name: "Agent Tracing",
    born: "Agent observability technique",
    tag: "Records runs as linked spans for model calls, tools, handoffs, guardrails, and custom events",
    history:
      "Agent traces capture the ordered structure and timing of a workflow rather than only its final answer. Trace design must also control sensitive inputs, outputs, credentials, and retention.",
    why: "It makes multi-step behavior debuggable, measurable, and auditable across development and production.",
    problem: "It reveals where an agent spent time, failed, changed control, or used a tool incorrectly.",
    docs: [
      source(
        "OpenAI Agents SDK: Tracing",
        "https://openai.github.io/openai-agents-python/tracing/",
      ),
    ],
    rel: ["agent_run", "opentelemetry", "evaluation_loop"],
  }),
  topic({
    id: "sandboxed_agent_execution",
    name: "Sandboxed Agent Execution",
    born: "Agent isolation architecture",
    tag: "Runs agent-selected code or computer actions inside a constrained environment",
    history:
      "A sandbox limits filesystem, process, network, credential, and resource access around untrusted or model-generated actions. Isolation reduces blast radius but still requires explicit capability boundaries and safe artifact transfer.",
    why: "It allows useful code and computer interaction without granting unrestricted host access.",
    problem: "It contains mistakes and adversarial actions that could otherwise affect unrelated systems or data.",
    docs: [
      source(
        "OpenAI Agents SDK: Sandbox agents",
        "https://openai.github.io/openai-agents-python/sandbox/guide/",
      ),
    ],
    rel: ["computer_use_agents", "agent_harness", "human_approval_loop"],
  }),
  topic({
    id: "durable_agent_execution",
    name: "Durable Agent Execution",
    born: "Fault-tolerant workflow architecture",
    tag: "Persists progress so a long-running agent can resume after pauses, failures, or restarts",
    history:
      "Durable execution records enough state or event history to reconstruct progress. External actions need stable identifiers and idempotency because replaying orchestration must not duplicate payments, messages, or other side effects.",
    why: "It supports agent tasks that outlive one request, process, machine, or human response time.",
    problem: "It prevents transient infrastructure failures from forcing a long agent workflow to restart from the beginning.",
    docs: [
      source(
        "Temporal: Durable Execution",
        "https://docs.temporal.io/temporal",
      ),
    ],
    rel: ["agent_runtime", "checkpointing", "event_driven_agent_loop"],
  }),
  topic({
    id: "checkpointing",
    name: "Agent Checkpointing",
    born: "Agent state persistence technique",
    tag: "Saves a recoverable snapshot of workflow state at controlled boundaries",
    history:
      "A checkpoint can preserve messages, current node, pending actions, application state, and metadata. Checkpoint frequency trades storage and write overhead against the amount of work repeated after failure.",
    why: "It enables resumption, time travel for debugging, human review, and fault recovery.",
    problem: "It creates reliable restart points in workflows whose state changes across many steps.",
    docs: [
      source(
        "LangGraph persistence documentation",
        "https://docs.langchain.com/oss/python/langgraph/persistence",
      ),
    ],
    rel: ["agent_state", "durable_agent_execution", "human_approval_loop"],
  }),
  topic({
    id: "termination_condition",
    name: "Agent Termination Condition",
    born: "Agent loop control rule",
    tag: "Defines when an agent succeeds, fails, pauses, or stops because a budget is exhausted",
    history:
      "Termination can depend on a typed final output, evaluator approval, goal completion, no remaining actions, a deadline, turn count, token cost, or unrecoverable error. A model merely saying it is done is not always sufficient evidence.",
    why: "It bounds autonomy and prevents useless, repetitive, or unexpectedly expensive execution.",
    problem: "It gives every agent loop explicit exit behavior instead of relying on indefinite model judgment.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["agent_turn", "evaluation_loop", "retry_loop"],
  }),
  topic({
    id: "tool_use_loop",
    name: "Tool-Use Loop",
    born: "Core agent execution loop",
    tag: "Alternates model decisions with tool execution until the agent returns a final result",
    history:
      "In a tool-use loop, the model receives current context, emits one or more structured tool calls, receives their results, and decides again. Limits, error handling, permissions, and idempotency belong to the harness around this loop.",
    why: "It lets a model gather information and change external state over multiple grounded steps.",
    problem: "It connects reasoning with actions whose results were not available in the original prompt.",
    docs: [
      source(
        "OpenAI Agents SDK: Running agents",
        "https://openai.github.io/openai-agents-python/running_agents/",
      ),
    ],
    rel: ["tool_calling_agents", "agent_turn", "react_agents"],
  }),
  topic({
    id: "plan_execute_replan_loop",
    name: "Plan-Execute-Replan Loop",
    born: "Agent planning loop",
    tag: "Creates a task plan, performs steps, then revises the plan using observed results",
    history:
      "This loop separates higher-level task decomposition from lower-level execution. Replanning responds to missing information and failed assumptions, but excessive planning can add latency without improving simple tasks.",
    why: "It helps agents adapt multi-step work when outcomes cannot be known before tools are used.",
    problem: "It keeps an initial plan from becoming a rigid script after the environment changes.",
    docs: [anthropic],
    rel: ["tool_use_loop", "planning_horizon", "reflection_loop"],
  }),
  topic({
    id: "reflection_loop",
    name: "Reflection Loop",
    born: "Agent self-critique loop",
    tag: "Reviews a draft or trajectory, identifies shortcomings, and uses feedback for another attempt",
    history:
      "Reflection loops add a critique step after generation or action. Feedback may come from the same model, a separate model, tests, or environment signals; self-critique alone can repeat the same blind spots.",
    why: "It can improve complex outputs by making detected errors actionable in a subsequent iteration.",
    problem: "It provides a correction path when a first-pass answer or plan is incomplete.",
    docs: [
      source("Reflexion: Language Agents with Verbal Reinforcement Learning", "https://arxiv.org/abs/2303.11366"),
    ],
    rel: ["plan_execute_replan_loop", "evaluator_optimizer_loop", "agent_memory"],
  }),
  topic({
    id: "evaluator_optimizer_loop",
    name: "Evaluator-Optimizer Loop",
    born: "Iterative agent workflow",
    tag: "Alternates a generator with an evaluator that supplies criteria-based feedback",
    history:
      "One component produces or revises an artifact while another evaluates it against explicit criteria. The loop stops when quality passes or a budget is reached; weak or correlated evaluators can reward polished but incorrect work.",
    why: "It improves outputs when evaluation criteria are clearer than a one-shot generation path.",
    problem: "It turns quality feedback into repeated targeted revisions rather than a final unacted-on score.",
    docs: [anthropic],
    rel: ["reflection_loop", "evaluation_loop", "termination_condition"],
  }),
  topic({
    id: "evaluation_loop",
    name: "Agent Evaluation Loop",
    born: "Continuous agent quality process",
    tag: "Runs representative tasks, scores traces and outcomes, then feeds failures into improvements",
    history:
      "An evaluation loop samples tasks, records versions and traces, applies deterministic or judged metrics, reviews failures, and reruns after changes. Evaluating only final prose misses tool misuse, excess cost, and unsafe intermediate actions.",
    why: "It detects regressions and shows whether changes improve real task outcomes rather than isolated model responses.",
    problem: "It gives agent development a repeatable evidence cycle instead of relying on demos and anecdotes.",
    docs: [
      source(
        "OpenAI Agents SDK: Testing",
        "https://openai.github.io/openai-agents-python/testing/",
      ),
    ],
    rel: ["agent_tracing", "evaluator_optimizer_loop", "ai_red_teaming"],
  }),
  topic({
    id: "retry_loop",
    name: "Agent Retry Loop",
    born: "Failure recovery loop",
    tag: "Repeats a failed operation under bounded attempts, delay, and error-specific policy",
    history:
      "Retries should distinguish transient failures from invalid requests and permanent errors. Backoff and jitter reduce synchronized load, while idempotency prevents a repeated request from duplicating side effects.",
    why: "It recovers from temporary model, network, rate-limit, and tool failures without restarting the whole task.",
    problem: "It makes intermittent dependencies tolerable while bounding repeated cost and harm.",
    docs: [
      source(
        "Google Cloud retry strategy guidance",
        "https://cloud.google.com/storage/docs/retry-strategy",
      ),
    ],
    rel: ["agent_runtime", "durable_agent_execution", "termination_condition"],
  }),
  topic({
    id: "routing_workflow",
    name: "Agent Routing Workflow",
    born: "Agent classification and dispatch pattern",
    tag: "Classifies an input and sends it to the best specialized model, prompt, toolset, or agent",
    history:
      "Routing uses a decision step to choose among downstream paths. It works best when categories are distinct and each route has a meaningful specialization; ambiguous routing needs fallback and confidence handling.",
    why: "It keeps specialist contexts focused and can match task difficulty to cost or capability.",
    problem: "It avoids forcing one oversized agent configuration to handle every request equally.",
    docs: [anthropic],
    rel: ["multi_agent_systems", "handoff_loop", "delegation_loop"],
  }),
  topic({
    id: "prompt_chaining_workflow",
    name: "Prompt Chaining Workflow",
    born: "Sequential LLM workflow pattern",
    tag: "Passes the output of one bounded model step into the next predefined step",
    history:
      "Prompt chains decompose a task into a fixed sequence and can add programmatic gates between stages. They are more predictable than open-ended agents but less flexible when the necessary path depends on intermediate discoveries.",
    why: "It improves control and debuggability for tasks that naturally follow a stable ordered process.",
    problem: "It reduces the cognitive load and error surface of asking one model call to perform many distinct transformations.",
    docs: [anthropic],
    rel: ["routing_workflow", "plan_execute_replan_loop", "agent_harness"],
  }),
  topic({
    id: "parallel_agent_workflow",
    name: "Parallel Agent Workflow",
    born: "Concurrent agent orchestration pattern",
    tag: "Runs independent model or agent tasks concurrently and aggregates their results",
    history:
      "Parallel workflows can divide independent subtasks or sample several attempts for voting. They reduce wall-clock time but increase total work and are unsuitable when later tasks require earlier outputs.",
    why: "They accelerate independent research and broaden coverage across multiple perspectives or sources.",
    problem: "They use concurrency when a task can be partitioned without sequential dependencies.",
    docs: [anthropic],
    rel: ["multi_agent_systems", "orchestrator_worker_loop", "evaluation_loop"],
  }),
  topic({
    id: "orchestrator_worker_loop",
    name: "Orchestrator-Worker Loop",
    born: "Dynamic multi-agent workflow",
    tag: "Lets a coordinator create subtasks, assign workers, inspect results, and synthesize an answer",
    history:
      "Unlike fixed parallelization, an orchestrator determines subtasks from the input and can request additional work after reviewing results. The coordinator becomes a bottleneck and must track ownership, dependencies, and completion.",
    why: "It handles tasks whose useful decomposition cannot be fully specified before execution.",
    problem: "It dynamically divides complex work while retaining one place for integration and quality control.",
    docs: [anthropic],
    rel: ["parallel_agent_workflow", "delegation_loop", "multi_agent_systems"],
  }),
  topic({
    id: "delegation_loop",
    name: "Agent Delegation Loop",
    born: "Manager-agent orchestration loop",
    tag: "Keeps a manager in control while it invokes specialist agents as bounded tools",
    history:
      "In delegation, the manager retains the user-facing task and combines specialist results. Specialists return outputs rather than taking ownership of the conversation, which differs from a handoff.",
    why: "It uses focused expertise while preserving centralized synthesis, policy, and final-answer ownership.",
    problem: "It lets one agent obtain specialist work without transferring the entire run to that specialist.",
    docs: [
      source(
        "OpenAI Agents SDK: Agent orchestration",
        "https://openai.github.io/openai-agents-python/multi_agent/",
      ),
    ],
    rel: ["orchestrator_worker_loop", "handoff_loop", "multi_agent_systems"],
  }),
  topic({
    id: "handoff_loop",
    name: "Agent Handoff Loop",
    born: "Decentralized agent orchestration loop",
    tag: "Transfers active control and relevant context from one agent to another specialist",
    history:
      "A handoff changes which agent owns the next turn, often replacing instructions and available tools. Context filters and clear target descriptions matter because irrelevant or sensitive history should not automatically cross every boundary.",
    why: "It lets the selected specialist respond directly with a focused role and capability set.",
    problem: "It routes ownership, not merely a subtask, when another agent should continue the interaction.",
    docs: [
      source(
        "OpenAI Agents SDK: Agent orchestration",
        "https://openai.github.io/openai-agents-python/multi_agent/",
      ),
    ],
    rel: ["routing_workflow", "delegation_loop", "a2a"],
  }),
  topic({
    id: "human_approval_loop",
    name: "Human Approval Loop",
    born: "Human-in-the-loop control pattern",
    tag: "Pauses an agent before a consequential action and resumes only after a person decides",
    history:
      "An approval loop presents the proposed action and sufficient context, persists pending state, and records approval, rejection, or edits. Approval must occur before the side effect and should bind to the exact action reviewed.",
    why: "It preserves human authority for high-impact, ambiguous, or externally visible decisions.",
    problem: "It prevents autonomous execution from crossing sensitive boundaries without informed review.",
    docs: [
      source(
        "OpenAI Agents SDK: Human-in-the-loop",
        "https://openai.github.io/openai-agents-python/human_in_the_loop/",
      ),
    ],
    rel: ["guardrails", "checkpointing", "durable_agent_execution"],
  }),
  topic({
    id: "event_driven_agent_loop",
    name: "Event-Driven Agent Loop",
    born: "Asynchronous agent execution pattern",
    tag: "Advances agent work when messages, timers, tool completions, or external events arrive",
    history:
      "An event-driven loop reacts to durable events rather than holding one request open. Correlation IDs, ordering, deduplication, and idempotent handlers are needed because delivery can be delayed, repeated, or out of order.",
    why: "It supports long-running and asynchronous agents that wait on external systems or people.",
    problem: "It decouples progress from a single synchronous process and request lifetime.",
    docs: [
      source(
        "CloudEvents specification",
        "https://cloudevents.io/",
      ),
    ],
    rel: ["eventdriven", "durable_agent_execution", "human_approval_loop"],
  }),
  topic({
    id: "memory_augmented_loop",
    name: "Memory-Augmented Agent Loop",
    born: "Agent learning and recall pattern",
    tag: "Retrieves relevant stored experience before acting and writes selected outcomes after acting",
    history:
      "A memory-augmented loop separates working context from longer-lived semantic, episodic, or procedural records. Retrieval and write policies are essential because storing every trace creates noise, privacy risk, and self-reinforcing mistakes.",
    why: "It lets an agent reuse past facts and experience beyond the current context window.",
    problem: "It provides continuity across runs without replaying complete historical transcripts.",
    docs: [
      source("Generative Agents: Interactive Simulacra of Human Behavior", "https://arxiv.org/abs/2304.03442"),
    ],
    rel: ["agent_memory", "context_management", "reflection_loop"],
  }),
  topic({
    id: "ood_a_loop",
    name: "OODA Loop for Agents",
    born: "Observe-orient-decide-act control loop",
    tag: "Cycles through observation, interpretation, decision, and action as conditions change",
    history:
      "The OODA loop frames adaptive control as repeated observation, orientation, decision, and action. In agents, orientation can include state updates and retrieved context; the loop should not be treated as permission for unbounded autonomous action.",
    why: "It emphasizes repeated feedback and adaptation instead of assuming one plan remains correct.",
    problem: "It structures decisions in environments where new observations continually invalidate earlier assumptions.",
    docs: [
      source(
        "Air University: The Essence of Winning and Losing",
        "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0151_Boyd_Discourse_Winning_Losing.pdf",
      ),
    ],
    rel: ["tool_use_loop", "plan_execute_replan_loop", "world_models"],
  }),
];

const ids = new Set(topics.map(({ id }) => id));
if (ids.size !== topics.length) throw new Error("Repeated topic ID in agent batch");
for (const entry of topics) {
  const existing = generated.findIndex(({ id }) => id === entry.id);
  if (existing >= 0) generated[existing] = entry;
  else generated.push(entry);
}
generated.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(generatedPath, `${JSON.stringify(generated, null, 2)}\n`);
console.log(`Published ${topics.length} agent harness and loop topics.`);

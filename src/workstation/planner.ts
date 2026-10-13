import { hardware, type Hardware } from "./hardware.ts";
export type Preferences = {
  os: string;
  bits: number;
  context: number;
  budget: number;
  local: boolean;
};
export type Part = {
  name: string;
  category: string;
  price: number | null;
  note: string;
  url: string;
};
export type BuildPlan = {
  local: boolean;
  task: string;
  parameters: number;
  weights: number;
  memory: number;
  accelerator: Hardware;
  os: string;
  model: string;
  runtime: string;
  parts: Part[];
  notes: string[];
  prompt: string;
  steps: string[];
  media: boolean;
  estimated: number;
  completePrice: boolean;
  budgetExceeded: boolean;
};
export function planBuild(task: string, p: Preferences): BuildPlan {
  if (
    ![4, 5, 8, 16].includes(p.bits) ||
    !Number.isFinite(p.context) ||
    p.context < 1 ||
    !Number.isFinite(p.budget) ||
    p.budget < 0
  )
    throw new Error("Invalid build preferences");
  const match = task.match(/\b(\d+(?:\.\d+)?)\s*b\b/i);
  const requestedParameters = match
    ? Math.min(1000, Math.max(0.1, Number(match[1])))
    : /omni/i.test(task)
      ? 70
      : /refactor|codebase|coding/i.test(task)
        ? 32
        : 8;
  const media = /omni|image|video|audio|speech/i.test(task);
  // Never size a named reference model below its actual parameter count.
  const referenceParameters =
    requestedParameters >= 60 ? 70 : requestedParameters >= 20 ? 32 : 8;
  const parameters = Math.max(requestedParameters, referenceParameters);
  const weights = p.local ? (parameters * p.bits) / 8 : 0; // Decimal GB.
  const memory = p.local
    ? Math.ceil(weights * 1.2 + 8 + (p.context / 8192) * 4 + (media ? 8 : 0))
    : 0;
  const os =
    p.os === "auto"
      ? /mac|apple|macbook/i.test(task)
        ? "macOS"
        : /windows|wsl|\bpc\b/i.test(task)
          ? "Windows / WSL2"
          : "Linux"
      : ["macOS", "Linux", "Windows / WSL2"].includes(p.os)
        ? p.os
        : "Linux";
  const candidates = hardware.filter((h) => h.os.includes(os));
  let accelerator =
    candidates.find(
      (h) =>
        h.id ===
        (os === "macOS"
          ? memory <= 100
            ? "m5max"
            : "m5ultra"
          : memory <= 26
            ? "rtx5090"
            : "rtxpro6000"),
    ) || candidates[0];
  if (memory > accelerator.memory * 0.8)
    accelerator =
      candidates
        .filter((h) => h.memory * 0.8 >= memory)
        .sort((a, b) => a.memory - b.memory)[0] || accelerator;
  // Prefer a lower-priced, documented NVIDIA desktop card when the budget
  // cannot cover the default and its conservative memory budget still fits.
  if (
    p.local &&
    os !== "macOS" &&
    accelerator.price !== null &&
    accelerator.price + 1580 > p.budget
  ) {
    accelerator =
      candidates
        .filter(
          (h) =>
            h.id.startsWith("rtx") &&
            h.price !== null &&
            h.memory * 0.8 >= memory,
        )
        .sort((a, b) => a.price! - b.price!)[0] || accelerator;
  }
  const model = p.local
    ? parameters >= 60
      ? "Llama 3.3 70B Instruct (text only)"
      : parameters >= 20
        ? "Qwen2.5-Coder-32B-Instruct"
        : "Qwen3-8B"
    : "GPT-6 Astra via API";
  const runtime = p.local
    ? os === "macOS"
      ? "Ollama / llama.cpp with Metal; MLX when a compatible conversion exists"
      : "Ollama / llama.cpp with CUDA; vLLM for supported serving workloads"
    : "Hosted API through Open WebUI; no local GPU required";
  const parts: Part[] = p.local
    ? accelerator.kind === "mac"
      ? [
          {
            name: `Mac configured with ${accelerator.name} · at least ${memory}GB usable memory`,
            category: "Computer",
            price: null,
            note: "Select a sold memory tier above the estimate, reserve memory for macOS, and obtain the complete configured price.",
            url: accelerator.source,
          },
        ]
      : [
          {
            name: accelerator.name,
            category: "GPU",
            price: accelerator.price,
            note: accelerator.priceKind,
            url: accelerator.source,
          },
          {
            name: "Compatible workstation platform",
            category: "CPU + motherboard + case + cooling",
            price: 950,
            note: "Planning allowance, not a verified SKU bundle. Check PCIe layout, card length, airflow and CPU socket.",
            url: "https://www.amazon.com/s?k=workstation+barebone",
          },
          {
            name: `${Math.max(64, Math.ceil(memory / 32) * 32)}GB system RAM`,
            category: "Memory",
            price: 250,
            note: "Planning allowance; choose a motherboard-qualified kit.",
            url: "https://www.amazon.com/s?k=DDR5+64GB+kit",
          },
          {
            name: "2TB NVMe SSD",
            category: "Storage",
            price: 150,
            note: "Planning allowance; larger media checkpoints may require more storage.",
            url: "https://www.amazon.com/s?k=2TB+NVMe+SSD",
          },
          {
            name:
              accelerator.watts && accelerator.watts >= 450
                ? "1200W ATX 3.1 power supply"
                : "Platform-qualified power supply",
            category: "Power",
            price: 230,
            note: "Planning allowance. Verify GPU connector, total system draw and server-specific requirements.",
            url: "https://www.amazon.com/s?k=1200W+ATX+3.1+power+supply",
          },
        ]
    : [
        {
          name: "Your existing computer + hosted model",
          category: "Computer",
          price: 0,
          note: "Assumes an existing browser-capable device; API usage is billed separately.",
          url: "https://developers.openai.com/api/docs/models/gpt-6-astra",
        },
      ];
  parts.push(
    {
      name: "Open WebUI",
      category: "Software",
      price: 0,
      note: "Self-hosted software; check license and optional hosting costs.",
      url: "https://docs.openwebui.com/",
    },
    {
      name: "Agent workspace + approved tools",
      category: "Software",
      price: 0,
      note: "Use a local runner with explicitly scoped folders and tools. This website does not grant computer access.",
      url: "https://docs.openhands.dev/",
    },
  );
  if (p.local && media) {
    const mediaTools = [
      {
        name: "Qwen2.5-Omni-7B",
        category: "Multimodal understanding + speech",
        url: "https://huggingface.co/Qwen/Qwen2.5-Omni-7B",
        note: "Separate model for text, image, audio and video understanding plus speech output; not a 70B all-modal generator.",
      },
      ...(/image|omni/i.test(task)
        ? [
            {
              name: "FLUX.1-schnell",
              category: "Text to image",
              url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
              note: "Separate diffusion pipeline; follow the model card and validate runtime support and memory independently.",
            },
          ]
        : []),
      ...(/video|omni/i.test(task)
        ? [
            {
              name: "Wan2.1-T2V-14B",
              category: "Text to video",
              url: "https://huggingface.co/Wan-AI/Wan2.1-T2V-14B",
              note: "Separate video generation pipeline; resolution, frame count and offload dominate memory and speed. No performance guarantee on this build.",
            },
          ]
        : []),
    ];
    parts.push(
      ...mediaTools.map((tool) => ({
        ...tool,
        price: 0,
        note:
          tool.note +
          " Weights have no listed purchase price; review license, hosting and compute costs.",
      })),
    );
  }
  const notes = [
    ...(match && requestedParameters !== referenceParameters
      ? [
          `Requested sizing target: ${requestedParameters}B. The named ${referenceParameters}B model is a reference alternative. Local sizing uses the larger of the requested and reference sizes; choose an exact model card before purchasing.`,
        ]
      : []),
    p.local
      ? `Sizing estimate: ${weights.toFixed(1)}GB raw weights + 20% quantization/runtime allowance + 8GB base + ${((p.context / 8192) * 4).toFixed(0)}GB estimated KV cache${media ? " + 8GB media allowance" : ""}. Actual architecture, KV precision, context and concurrency can change this substantially.`
      : "Hosted inference requires no local model weights or GPU memory. API usage, networking and any local tools are separate costs; local quantization does not apply.",
    "OS fit is based on runtime support, not an unsupported claim that the same hosted model is smarter on Mac, Linux or Windows.",
    ...(media
      ? [
          "A 70B parameter count does not imply native text, image, video and audio generation. This plan uses a text model plus separate vision, speech and diffusion tools; validate each selected model card.",
          "Media tools must run sequentially with unloaded checkpoints unless separately profiled. The media allowance is not a measurement or guarantee that all pipelines fit or can run in parallel. Install model-specific adapters; Open WebUI alone does not supply these pipelines.",
        ]
      : []),
    ...(/AZ500|AX100/i.test(task)
      ? [
          "AZ-500 is an Azure certification identifier; AX100 is not a verified NVIDIA GPU in this catalog. The plan uses a documented accelerator.",
        ]
      : []),
    ...(/macbook.*ultra|ultra.*macbook/i.test(task)
      ? [
          "Apple Ultra chips in this catalog are desktop Mac Studio configurations; select Max for a MacBook Pro.",
        ]
      : []),
    ...(memory > accelerator.memory * 0.8 && p.local
      ? [
          "This request exceeds the selected device’s conservative memory budget. Use a larger server, reduce context/precision, or a hosted model; this is not a confirmed fit.",
        ]
      : []),
    ...(["a100", "h100", "h200", "b200"].includes(accelerator.id) && p.local
      ? [
          "Datacenter accelerator: replace desktop allowances with an integrator-validated server quote.",
        ]
      : []),
  ];
  const prompt = `Goal: ${task.trim()}\nEnvironment: ${os}; ${p.local ? model : "hosted GPT-6 Astra"}; ${p.bits}-bit only for locally supported weights.\nInspect only relevant files and existing instructions. State assumptions. Produce a short plan with acceptance checks, then implement it. Preserve unrelated work. Use targeted search and compact diffs. Run the relevant tests. Report changed files, evidence and unresolved issues. Ask before destructive or externally visible actions. Do not repeat the full repository or invent test results.`;
  const steps = [
    "Read the workload and constraints",
    "Estimate model and cache memory",
    "Match OS, runtime and accelerator",
    "Prepare component list and tradeoffs",
    "Assemble your desk",
  ];
  const estimated = parts.reduce((s, x) => s + (x.price ?? 0), 0);
  return {
    local: p.local,
    task,
    parameters,
    weights,
    memory,
    accelerator,
    os,
    model,
    runtime,
    parts,
    notes,
    prompt,
    steps,
    media,
    estimated,
    completePrice: parts.every((x) => x.price !== null),
    budgetExceeded: estimated > p.budget,
  };
}

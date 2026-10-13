export type Hardware = {
  id: string;
  name: string;
  maker: string;
  kind: "gpu" | "mac";
  memory: number;
  watts: number | null;
  price: number | null;
  priceKind: string;
  os: string[];
  runtime: string;
  meaning: string;
  tradeoff: string;
  source: string;
};
export const hardware: Hardware[] = [
  {
    id: "rtx5090",
    name: "GeForce RTX 5090",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 32,
    watts: 575,
    price: 1999,
    priceKind: "Launch MSRP; retailer price varies",
    os: ["Linux", "Windows / WSL2"],
    runtime: "CUDA · llama.cpp · Ollama · PyTorch",
    meaning:
      "GeForce is the consumer line; RTX includes ray-tracing hardware. 50 is the generation, 90 the high-end tier.",
    tradeoff:
      "Strong CUDA ecosystem; 32GB is too small for a fully GPU-resident dense 70B at 4-bit with runtime overhead.",
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/",
  },
  {
    id: "rtx4090",
    name: "GeForce RTX 4090",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 24,
    watts: 450,
    price: 1599,
    priceKind: "Launch MSRP; not a current quote",
    os: ["Linux", "Windows / WSL2"],
    runtime: "CUDA · llama.cpp · Ollama",
    meaning: "Ada Lovelace generation; 40-series flagship consumer GPU.",
    tradeoff:
      "24GB suits many quantized 7–32B models. Used prices and remaining warranty vary.",
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/",
  },
  {
    id: "rtxpro6000",
    name: "RTX PRO 6000 Blackwell",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 96,
    watts: 600,
    price: null,
    priceKind: "Request a workstation quote",
    os: ["Linux", "Windows / WSL2"],
    runtime: "CUDA · vLLM · llama.cpp",
    meaning:
      "RTX PRO is the professional workstation family; 6000 is a tier, not a memory capacity.",
    tradeoff:
      "96GB can hold many quantized 70B workloads on one GPU. Expensive; needs a suitable PSU, chassis and cooling.",
    source:
      "https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000/",
  },
  {
    id: "a100",
    name: "A100 80GB",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 80,
    watts: null,
    price: null,
    priceKind: "Server or cloud quote",
    os: ["Linux"],
    runtime: "CUDA · vLLM · TensorRT-LLM",
    meaning:
      "A denotes Ampere. PCIe and SXM variants have different power and interconnect requirements.",
    tradeoff:
      "Datacenter accelerator; not a plug-and-play consumer graphics card. Choose the exact 80GB SKU.",
    source: "https://www.nvidia.com/en-us/data-center/a100-gpu/",
  },
  {
    id: "h100",
    name: "H100 SXM 80GB",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 80,
    watts: null,
    price: null,
    priceKind: "Server or cloud quote",
    os: ["Linux"],
    runtime: "CUDA · vLLM · TensorRT-LLM",
    meaning:
      "H denotes Hopper; SXM is a server module, not a desktop PCIe card.",
    tradeoff:
      "High throughput for supported workloads; SXM requires a compatible server platform.",
    source: "https://www.nvidia.com/en-us/data-center/h100/",
  },
  {
    id: "h200",
    name: "H200 SXM 141GB",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 141,
    watts: null,
    price: null,
    priceKind: "Server or cloud quote",
    os: ["Linux"],
    runtime: "CUDA · vLLM",
    meaning:
      "Hopper generation with larger HBM3e memory; memory capacity is SKU-specific.",
    tradeoff:
      "Large context and batch capacity; server infrastructure and operating cost matter.",
    source: "https://www.nvidia.com/en-us/data-center/h200/",
  },
  {
    id: "b200",
    name: "B200 HGX 180GB",
    maker: "NVIDIA",
    kind: "gpu",
    memory: 180,
    watts: null,
    price: null,
    priceKind: "Integrated server quote",
    os: ["Linux"],
    runtime: "CUDA · TensorRT-LLM",
    meaning:
      "B denotes Blackwell; HGX is the integrated multi-GPU server platform.",
    tradeoff:
      "Datacenter deployment, not a desktop upgrade. Do not interchange HGX and other Blackwell SKU specifications.",
    source:
      "https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-gpus.html",
  },
  {
    id: "r9700",
    name: "Radeon AI PRO R9700",
    maker: "AMD",
    kind: "gpu",
    memory: 32,
    watts: 300,
    price: null,
    priceKind: "Check retailer",
    os: ["Linux", "Windows / WSL2"],
    runtime: "ROCm on supported OS/runtime versions · Vulkan",
    meaning:
      "Radeon AI PRO targets professional AI workloads; R9700 uses RDNA 4.",
    tradeoff:
      "32GB VRAM; confirm the exact ROCm, OS and model support matrix before purchase. CUDA-only extensions need alternatives.",
    source:
      "https://www.amd.com/en/products/graphics/workstations/radeon-ai-pro/ai-9000-series/amd-radeon-ai-pro-r9700.html",
  },
  {
    id: "b580",
    name: "Arc B580",
    maker: "Intel",
    kind: "gpu",
    memory: 12,
    watts: 190,
    price: 249,
    priceKind: "Launch MSRP; retailer price varies",
    os: ["Linux", "Windows / WSL2"],
    runtime: "OpenVINO · supported Vulkan/SYCL backends",
    meaning:
      "Arc is Intel graphics; B is Battlemage and 580 identifies its product tier.",
    tradeoff:
      "Budget option for small models; 12GB and backend compatibility constrain larger workloads.",
    source:
      "https://www.intel.com/content/www/us/en/newsroom/news/intel-launches-arc-b-series-graphics-cards.html",
  },
  ...(
    [
      [
        "m3",
        "M3",
        24,
        "Base third-generation Apple silicon; integrated CPU, GPU and unified memory.",
        "https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/",
      ],
      [
        "m3pro",
        "M3 Pro",
        36,
        "Pro tier expands compute and memory over base M3.",
        "https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/",
      ],
      [
        "m3max",
        "M3 Max",
        128,
        "Max tier has more GPU cores and memory bandwidth; maximum memory depends on CPU/GPU variant.",
        "https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/",
      ],
      [
        "m3ultra",
        "M3 Ultra",
        512,
        "Ultra joins two Max-class dies; available in Mac Studio, not MacBook Pro.",
        "https://www.apple.com/newsroom/2025/03/apple-reveals-m3-ultra-taking-apple-silicon-to-a-new-extreme/",
      ],
      [
        "m4",
        "M4",
        32,
        "Fourth-generation base chip. Capacity depends on the Mac configuration.",
        "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/",
      ],
      [
        "m4pro",
        "M4 Pro",
        64,
        "Pro tier of the fourth generation.",
        "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/",
      ],
      [
        "m4max",
        "M4 Max",
        128,
        "Fourth-generation Max tier; high-bandwidth unified memory.",
        "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/",
      ],
      [
        "m5",
        "M5",
        32,
        "Fifth-generation base chip with GPU Neural Accelerators.",
        "https://www.apple.com/macbook-pro/specs/",
      ],
      [
        "m5pro",
        "M5 Pro",
        64,
        "Fifth-generation Pro tier for portable professional workflows.",
        "https://www.apple.com/macbook-pro/specs/",
      ],
      [
        "m5max",
        "M5 Max",
        128,
        "Fifth-generation Max tier; MacBook Pro and Mac Studio options.",
        "https://www.apple.com/macbook-pro/specs/",
      ],
      [
        "m5ultra",
        "M5 Ultra",
        512,
        "Two M5 Max dies joined into an Ultra SoC; Mac Studio, not a MacBook Pro.",
        "https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/",
      ],
    ] as [string, string, number, string, string][]
  ).map(([id, name, memory, meaning, source]): Hardware => ({
    id,
    name: `Apple ${name}`,
    maker: "Apple",
    kind: "mac",
    memory,
    watts: null,
    price: null,
    priceKind: "Configure memory at Apple for an exact system quote",
    os: ["macOS"],
    runtime: "MLX · Metal · llama.cpp · Ollama",
    meaning,
    tradeoff:
      "Memory is shared with macOS and apps, and cannot be upgraded. Capacity shown is a family maximum, not every machine. Neural Engine TOPS do not predict LLM speed.",
    source,
  })),
];
export const money = (n: number | null) =>
  n === null
    ? "Quote required"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
export const amazonSearch = (name: string) =>
  `https://www.amazon.com/s?k=${encodeURIComponent(name)}`;

export const HOUSES = [
  {
    id: "claude",
    name: "Claude",
    tag: "Think deeply. Create thoughtfully.",
    description:
      "A home for thoughtful explorers, big questions, and a little unexpected creativity.",
    color: "#f2c766",
    mark: "✳",
    className: "claude",
  },
  {
    id: "openai",
    name: "OpenAI",
    tag: "Experiment. Build. Repeat.",
    description:
      "Meet curious makers who turn a what-if into something worth sharing.",
    color: "#7d4dff",
    mark: "◎",
    className: "openai",
  },
  {
    id: "gemini",
    name: "Gemini",
    tag: "Connect ideas. Discover more.",
    description:
      "A space for many perspectives, surprising connections, and fresh possibilities.",
    color: "#9c6cff",
    mark: "✦",
    className: "gemini",
  },
] as const;
export const CATEGORIES = [
  { id: "foundations", name: "AI foundations" },
  { id: "prompting", name: "Prompt engineering" },
  { id: "agents", name: "Agentic systems" },
  { id: "models", name: "Language models" },
  { id: "safety", name: "Responsible AI" },
];
export const PROFESSIONS = [
  {
    id: "teacher",
    name: "Teacher",
    verb: "Explain it so everyone understands",
  },
  { id: "developer", name: "Developer", verb: "Build a tool to solve it" },
  {
    id: "farmer",
    name: "Farmer",
    verb: "Care for resources and living systems",
  },
  {
    id: "finance",
    name: "Financial analyst",
    verb: "Measure the costs and tradeoffs",
  },
  {
    id: "firefighter",
    name: "First responder",
    verb: "Act quickly to keep people safe",
  },
  {
    id: "law",
    name: "Legal researcher",
    verb: "Check the rules and protect fairness",
  },
];
export const APTITUDE = [
  "Your community faces a new problem. Where do you start?",
  "A new technology arrives in town. What interests you most?",
  "Your team is working under pressure. How do you help?",
  "You have an afternoon to volunteer. What would you choose?",
  "A project has limited resources. What do you focus on?",
  "Someone brings you a confusing report. What is your instinct?",
  "Your neighborhood is planning its future. How do you contribute?",
  "You are learning to use AI. What would you try first?",
  "A teammate makes a mistake. What should happen next?",
  "You can improve one part of a city. What draws you in?",
  "What kind of question do you most enjoy exploring?",
  "At the end of a good day, what matters most to you?",
];
export const PRACTICE = [
  {
    prompt: "What does LLM stand for?",
    options: [
      "Large language model",
      "Local learning machine",
      "Linked logic method",
      "Linear language map",
    ],
    answer: 0,
    explanation:
      "A large language model learns patterns in language from training data.",
  },
  {
    prompt: "What does an AI agent use to take actions?",
    options: [
      "Only a profile photo",
      "Tools and instructions",
      "A leaderboard",
      "A longer username",
    ],
    answer: 1,
    explanation:
      "Agents use tools to act on instructions, with appropriate limits and oversight.",
  },
  {
    prompt: "What helps make a prompt more useful?",
    options: [
      "More exclamation marks",
      "Hiding the goal",
      "Clear context and a goal",
      "Always using capitals",
    ],
    answer: 2,
    explanation:
      "Specific goals and relevant context help a model produce useful responses.",
  },
  {
    prompt: "What is an AI hallucination?",
    options: [
      "A guaranteed citation",
      "A type of encryption",
      "A hardware upgrade",
      "A plausible but false output",
    ],
    answer: 3,
    explanation:
      "Model outputs can sound confident and still be incorrect. Verify important claims.",
  },
  {
    prompt: "What does retrieval add to a model response?",
    options: [
      "Relevant source material",
      "A new password",
      "Unlimited accuracy",
      "Human consciousness",
    ],
    answer: 0,
    explanation:
      "Retrieval can supply relevant information, but the response still needs evaluation.",
  },
];
export const GALLERY_EXAMPLES = [
  {
    id: "example-1",
    title: "A softer kind of future",
    prompt:
      "A tiny glass greenhouse on a floating island, soft morning light, miniature clay world, moss green and warm cream, isometric view.",
    style: "botanical",
    category: "World building",
  },
  {
    id: "example-2",
    title: "When the model needs coffee",
    prompt:
      "A friendly little robot working in a sunlit café, its coffee cup bigger than its head, playful editorial illustration, warm peach palette.",
    style: "coffee",
    category: "A little laughter",
  },
  {
    id: "example-3",
    title: "Ideas in full bloom",
    prompt:
      "An impossible flower with translucent geometric petals, each petal a different constellation, lavender and cobalt, dreamy studio lighting.",
    style: "bloom",
    category: "Creative experiments",
  },
];
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* browsing still works if storage is unavailable */
  }
}

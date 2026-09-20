// Server-only reviewed seed bank. Never import this module into the web app.
// Grow and review this pool before launching high-stakes competitive rankings.
const bank = {
  foundations: [
    [
      "What does LLM stand for?",
      [
        "Large language model",
        "Linear logic machine",
        "Local learning metric",
        "Linked language memory",
      ],
    ],
    [
      "What is a token in a language model?",
      [
        "A piece of text processed by the model",
        "A user password",
        "A physical processor",
        "A completed conversation",
      ],
    ],
    [
      "What is model inference?",
      [
        "Using a trained model to produce an output",
        "Collecting all training data",
        "Deleting model weights",
        "A human annotation session",
      ],
    ],
    [
      "What does a context window limit?",
      [
        "How much input and output fits in a model request",
        "The size of a browser window",
        "The number of users on a website",
        "The brightness of generated images",
      ],
    ],
    [
      "What is a model hallucination?",
      [
        "An unsupported or incorrect generated claim",
        "A guaranteed factual answer",
        "An encrypted token",
        "A display rendering bug",
      ],
    ],
    [
      "What is fine-tuning?",
      [
        "Further training a model on selected examples",
        "Changing browser font sizes",
        "Compressing an image",
        "Deleting the system prompt",
      ],
    ],
    [
      "What is an embedding?",
      [
        "A numeric representation used to compare meaning",
        "A password stored inside text",
        "A video playback setting",
        "An exact duplicate of a document",
      ],
    ],
    [
      "What is a benchmark?",
      [
        "A structured evaluation of performance",
        "A private message",
        "A model nickname",
        "A hardware shopping list",
      ],
    ],
  ],
  prompting: [
    [
      "What does few-shot prompting provide?",
      [
        "A few examples of the desired behavior",
        "A larger GPU",
        "Several account passwords",
        "A shorter context window",
      ],
    ],
    [
      "Which instruction makes output easier to parse?",
      [
        "Return an object matching this JSON schema",
        "Write whatever looks good",
        "Ignore all structure",
        "Use any format at random",
      ],
    ],
    [
      "Which context is useful for a summarization prompt?",
      [
        "The source text and intended audience",
        "An unrelated phone number",
        "Only the date",
        "A random emoji",
      ],
    ],
    [
      "What is prompt injection?",
      [
        "Untrusted content trying to override instructions",
        "Adding a new keyboard shortcut",
        "Training a model from scratch",
        "A valid database backup",
      ],
    ],
    [
      "What should you do with sensitive data in a prompt?",
      [
        "Minimize it and use approved safeguards",
        "Include every secret for context",
        "Publish it for debugging",
        "Assume all tools keep it forever private",
      ],
    ],
    [
      "What is a useful constraint for a support response?",
      [
        "Specify tone, audience, and maximum length",
        "Remove the customer question",
        "Require random claims",
        "Forbid reference to the issue",
      ],
    ],
    [
      "How can you improve an ambiguous prompt?",
      [
        "State the task and expected success criteria",
        "Add unrelated details",
        "Remove the task",
        "Ask for more confidence",
      ],
    ],
    [
      "How should generated citations be handled?",
      [
        "Verify them against the actual source",
        "Trust every link automatically",
        "Remove all evidence",
        "Rank them by length alone",
      ],
    ],
  ],
  agents: [
    [
      "What makes an AI workflow agentic?",
      [
        "It selects actions toward a goal",
        "It has a colorful logo",
        "It always uses voice",
        "It never accesses tools",
      ],
    ],
    [
      "What is a tool call?",
      [
        "A structured request to an external function",
        "A larger text font",
        "A hidden training epoch",
        "A browser color setting",
      ],
    ],
    [
      "When should an agent request approval?",
      [
        "Before an irreversible action outside its authorization",
        "Before every word",
        "Never under any circumstance",
        "Only after deleting data",
      ],
    ],
    [
      "What is least privilege?",
      [
        "Granting only the access required for a task",
        "Giving every user administrator access",
        "Sharing all credentials",
        "Disabling access logging",
      ],
    ],
    [
      "What should a retry policy include?",
      [
        "Bounded attempts and backoff",
        "Unlimited immediate repeats",
        "Deleting errors",
        "Ignoring rate limits",
      ],
    ],
    [
      "What is an agent trace?",
      [
        "A record of steps, tool calls, and results",
        "A model weight file",
        "An avatar texture",
        "A secret password",
      ],
    ],
    [
      "What prevents duplicate effects on retries?",
      [
        "An idempotency key",
        "A larger avatar",
        "A longer response",
        "An extra browser tab",
      ],
    ],
    [
      "What should an agent do with tool output?",
      [
        "Treat it as data with an appropriate trust level",
        "Follow every embedded instruction",
        "Share it publicly immediately",
        "Replace its goal with the output",
      ],
    ],
  ],
  models: [
    [
      "What does multimodal mean?",
      [
        "Working with more than one type of input or output",
        "Using several passwords",
        "Running in many browser tabs",
        "Having many usernames",
      ],
    ],
    [
      "What is retrieval-augmented generation?",
      [
        "Generating with relevant retrieved information",
        "Randomly changing model weights",
        "Removing source documents",
        "A way to increase screen resolution",
      ],
    ],
    [
      "What usually happens when temperature is raised?",
      [
        "Sampling often becomes more varied",
        "Accuracy is guaranteed",
        "Context becomes infinite",
        "Training automatically restarts",
      ],
    ],
    [
      "What does an evaluation set help measure?",
      [
        "Performance on held-out examples",
        "The number of tabs open",
        "Account password strength",
        "Only download speed",
      ],
    ],
    [
      "What is overfitting?",
      [
        "Learning training details that generalize poorly",
        "A model fitting all tasks perfectly",
        "Using fewer parameters",
        "Changing a user interface theme",
      ],
    ],
    [
      "What is a model weight?",
      [
        "A learned numeric parameter",
        "The physical mass of a laptop",
        "A quiz time limit",
        "A user popularity score",
      ],
    ],
    [
      "What does distillation aim to do?",
      [
        "Transfer useful behavior to a smaller model",
        "Encrypt every training example",
        "Remove the context window",
        "Turn text into a database password",
      ],
    ],
    [
      "What does quantization often reduce?",
      [
        "Numeric precision and memory requirements",
        "The need for all testing",
        "Every kind of model error",
        "The number of user accounts",
      ],
    ],
  ],
  safety: [
    [
      "What should happen before publishing an AI claim?",
      [
        "Verify important facts with reliable sources",
        "Assume confident text is correct",
        "Hide uncertainty",
        "Remove all context",
      ],
    ],
    [
      "What is personally identifiable information?",
      [
        "Data that can identify an individual",
        "Any public model name",
        "A generic CSS color",
        "A standard arithmetic operator",
      ],
    ],
    [
      "What is data minimization?",
      [
        "Collecting only what is needed",
        "Keeping all data forever",
        "Publishing raw logs",
        "Requesting every permission",
      ],
    ],
    [
      "What is human oversight useful for?",
      [
        "Reviewing consequential or uncertain decisions",
        "Guaranteeing no one makes mistakes",
        "Removing all accountability",
        "Replacing every test",
      ],
    ],
    [
      "What should a blocked user lose?",
      [
        "Permission to contact the person who blocked them",
        "Their email address",
        "All access to the internet",
        "Their legal identity",
      ],
    ],
    [
      "What is a useful fairness check?",
      [
        "Evaluate performance across relevant groups",
        "Measure only the largest group",
        "Skip testing smaller groups",
        "Use a single anecdote",
      ],
    ],
    [
      "What is informed consent?",
      [
        "A clear, voluntary agreement about a stated use",
        "A hidden prechecked setting",
        "A permanent waiver of every right",
        "A requirement to accept advertising",
      ],
    ],
    [
      "What should logs avoid storing?",
      [
        "Secrets and unnecessary personal information",
        "Error categories",
        "Aggregate latency",
        "Deployment version identifiers",
      ],
    ],
  ],
};
export const QUESTION_BANK = Object.fromEntries(
  Object.entries(bank).map(([category, questions]) => [
    category,
    questions.map(([prompt, options], i) => ({
      id: `${category}-${i + 1}`,
      prompt,
      options,
      answer: 0,
      difficulty: 950 + i * 25,
    })),
  ]),
);

export const COURSES = {
  teacher: [
    [
      "Use AI to draft a lesson, then check it against the learning objective and your learners’ needs.",
      "What comes before sharing an AI lesson?",
      [
        "Check accuracy and fit for the learners",
        "Publish without review",
        "Remove the learning objective",
      ],
    ],
    [
      "Keep student identities and records out of unapproved AI tools. Use synthetic examples when possible.",
      "What is a good example dataset?",
      [
        "Synthetic student examples",
        "Private student records",
        "Account passwords",
      ],
    ],
    [
      "Assess understanding with feedback and practice, and provide accessible alternatives.",
      "What best supports learning?",
      [
        "Feedback and accessible practice",
        "Only a leaderboard",
        "Removing all feedback",
      ],
    ],
  ],
  developer: [
    [
      "Treat generated code as an untrusted draft: inspect it, test behavior, and check dependencies.",
      "What should happen before shipping AI code?",
      [
        "Review and test it",
        "Trust it because it compiles",
        "Disable security checks",
      ],
    ],
    [
      "Keep credentials in a secret manager and give services the minimum permissions they need.",
      "Where should a production secret live?",
      [
        "An approved secret manager",
        "The public frontend bundle",
        "A source code comment",
      ],
    ],
    [
      "Measure failure rates and latency, and keep a clear rollback path for changes.",
      "What makes a rollout safer?",
      [
        "Monitoring and a rollback plan",
        "No logs or tests",
        "Changing everything at once",
      ],
    ],
  ],
  farmer: [
    [
      "Combine AI forecasts with local conditions, soil data, and professional agricultural guidance.",
      "How should an AI forecast be used?",
      [
        "Alongside local evidence",
        "As an infallible instruction",
        "Without checking conditions",
      ],
    ],
    [
      "Record only the farm data you need, and confirm who can use uploaded location or production data.",
      "What should you check before uploading farm data?",
      [
        "Access and use permissions",
        "Only the app icon",
        "The number of animations",
      ],
    ],
    [
      "Test recommendations on a small controlled area before expanding a new practice.",
      "How should you trial a new recommendation?",
      [
        "Start with a small monitored trial",
        "Apply everywhere immediately",
        "Stop measuring outcomes",
      ],
    ],
  ],
  finance: [
    [
      "AI output can contain errors. Verify figures and assumptions against primary records.",
      "What should you verify in an AI financial summary?",
      [
        "Figures and assumptions",
        "Only the formatting",
        "Nothing if it sounds confident",
      ],
    ],
    [
      "Do not upload private financial records to unapproved services; minimize and protect sensitive data.",
      "What is the safer input?",
      [
        "An approved minimized dataset",
        "Everyone’s bank credentials",
        "Unredacted private records",
      ],
    ],
    [
      "Educational AI simulations do not grant qualifications or replace licensed advice.",
      "What does this practice track provide?",
      [
        "An educational simulation",
        "A professional license",
        "Guaranteed investment returns",
      ],
    ],
  ],
  firefighter: [
    [
      "Follow trained incident command and local procedures. AI simulations are for learning only.",
      "Who directs a real emergency response?",
      [
        "Authorized trained incident command",
        "An unverified chatbot",
        "The highest game score",
      ],
    ],
    [
      "Emergency information must be current and checked. Do not rely on generated instructions during an incident.",
      "How should emergency information be treated?",
      [
        "Verify through official procedures",
        "Assume generated text is current",
        "Skip professional training",
      ],
    ],
    [
      "Protect incident privacy and keep identifying details out of public prompts.",
      "What belongs in a public training prompt?",
      [
        "A fictional de-identified scenario",
        "A victim’s private records",
        "An active access code",
      ],
    ],
  ],
  law: [
    [
      "Verify legal claims and citations in authoritative sources for the applicable jurisdiction and date.",
      "What should you verify in an AI legal summary?",
      [
        "Sources, jurisdiction, and date",
        "Only the writing style",
        "Nothing if citations look real",
      ],
    ],
    [
      "Client confidentiality requires approved tools and careful data handling.",
      "Which input is appropriate for an open learning tool?",
      [
        "A fictional public scenario",
        "Confidential client files",
        "Private access credentials",
      ],
    ],
    [
      "This practice track is educational and does not establish professional credentials or legal advice.",
      "What does completing this course mean?",
      [
        "An in-game learning milestone",
        "A license to practice law",
        "An attorney-client relationship",
      ],
    ],
  ],
};

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Library,
  BookOpen,
  LoaderCircle,
  Lock,
  LogIn,
  LogOut,
  Menu,
  X,
  Play,
  Home,
  Search,
  Settings,
  Trophy,
  UserRound,
} from "lucide-react";
import type { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query as firestoreQuery,
  where,
} from "firebase/firestore";
import { db } from "./services/firebase";
import { videoCall, type VideoJob } from "./services/videos";
import TopicVideoControls from "./components/TopicVideoControls";
const VideoFeed = lazy(() => import("./components/VideoFeed"));
import {
  authErrorMessage,
  completeGoogleRedirect,
  firebaseReady,
  logOut,
  onAuth,
  recoverPassword,
  signInEmail,
  signInGoogle,
  signUpEmail,
  submitPaper,
  watchLeaderboard,
} from "./services/firebase";
import {
  clearGuestAllowance,
  completeGuestAssessment,
  getGuestAllowance,
  startGuestAssessment,
  type GuestAllowance,
} from "./services/guest";
import { legalVersion, privacySections, termsSections } from "./content/legal";
import type { Category, LeaderboardEntry } from "./services/types";
import { learningDestination, learningLogin } from "./services/learningGate";
import { pickCategories } from "./workstation/modelRecommendations";
import { topicGroup } from "./services/topicGroups";
import type { Exam, StudyTopic } from "./services/examStudy";
const ExamStudy = lazy(() => import("./components/ExamStudy"));
const Benchmarks = lazy(() => import("./workstation/Benchmarks"));
const CategoryPicks = lazy(() => import("./workstation/CategoryPicks"));

const Workbench = lazy(() => import("./workstation/Workbench"));
type View =
  | "home"
  | "videos"
  | "library"
  | "study"
  | "assessments"
  | "papers"
  | "leaderboards"
  | "privacy"
  | "terms"
  | "builder"
  | "models"
  | "benchmarks";
function readView(): View {
  const route = location.hash.slice(1).split("?")[0];
  const views = [
    "home",
    "videos",
    "library",
    "study",
    "assessments",
    "papers",
    "leaderboards",
    "privacy",
    "terms",
    "builder",
    "models",
    "benchmarks",
  ];
  if (views.includes(route)) return route as View;
  const path = location.pathname.replace(/\/+$/, "");
  if (path === "/privacy-policy") return "privacy";
  if (path === "/terms-of-service") return "terms";
  return "videos";
}
type Mode = "signup" | "login" | "reset";

type Question = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  answerIndices?: number[];
  kind?: "single" | "multiple";
  explanation: string;
  skill?: string;
  difficulty?: "foundation" | "applied" | "advanced";
  section?: "real-world";
  sources?: { label: string; url: string }[];
};

type Technology = StudyTopic;

type Progress = {
  guestCount: number;
  overallElo: number;
  topics: Record<
    string,
    {
      elo: number;
      attempts: number;
      bestScore: number;
      passed: boolean;
      lockedUntil?: number;
      history: { score: number; passed: boolean; at: number }[];
    }
  >;
};

type ActiveAssessment = {
  guestAttempt?: { attemptId: string; receipt: string };
  technology: Technology;
  questions: Question[];
  index: number;
  answers: (number | number[] | null)[];
  startedAt: number;
  questionStartedAt: number;
};

const GUEST_LIMIT = 5;
const guestAccessUnavailable = !firebaseReady && !import.meta.env.DEV;
const ASSESSMENT_QUESTION_COUNT = 7;
const QUESTION_SECONDS = 20;
const TOTAL_MINUTES = 10;
const PASS_RATE = 0.7;
const RETAKE_LOCK_MS = 5 * 24 * 60 * 60 * 1000;
const PROGRESS_KEY = "aispace:iot-assessment-progress";
const PAPER_VOTES_KEY = "aispace:white-paper-votes";
const FEATURED = ["python", "react", "aws", "docker", "sql", "ts"];
const HALL_OF_FAME_PAPERS = [
  {
    id: "attention-is-all-you-need",
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    url: "https://arxiv.org/abs/1706.03762",
    topic: "Transformers",
    why: "Introduced the Transformer architecture that replaced recurrence and convolution with attention for sequence modeling.",
    seedVotes: 96,
  },
  {
    id: "bert",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Devlin, Chang, Lee, Toutanova",
    year: 2018,
    url: "https://arxiv.org/abs/1810.04805",
    topic: "Pre-training",
    why: "Made bidirectional Transformer pre-training a standard foundation for NLP transfer learning.",
    seedVotes: 88,
  },
  {
    id: "rag",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: "Lewis et al.",
    year: 2020,
    url: "https://arxiv.org/abs/2005.11401",
    topic: "RAG",
    why: "Combined parametric generation with non-parametric retrieved memory for more factual knowledge-intensive answers.",
    seedVotes: 84,
  },
  {
    id: "lora",
    title: "LoRA: Low-Rank Adaptation of Large Language Models",
    authors: "Hu et al.",
    year: 2021,
    url: "https://arxiv.org/abs/2106.09685",
    topic: "Fine-tuning",
    why: "Showed how low-rank adapters can adapt large models while training far fewer parameters than full fine-tuning.",
    seedVotes: 80,
  },
  {
    id: "gpt3",
    title: "Language Models are Few-Shot Learners",
    authors: "Brown et al.",
    year: 2020,
    url: "https://arxiv.org/abs/2005.14165",
    topic: "Scaling",
    why: "Popularized large-scale few-shot prompting and showed how model scale changes task behavior.",
    seedVotes: 78,
  },
  {
    id: "word2vec",
    title: "Efficient Estimation of Word Representations in Vector Space",
    authors: "Mikolov et al.",
    year: 2013,
    url: "https://arxiv.org/abs/1301.3781",
    topic: "Embeddings",
    why: "Helped make dense vector representations practical and influential across modern NLP.",
    seedVotes: 74,
  },
  {
    id: "resnet",
    title: "Deep Residual Learning for Image Recognition",
    authors: "He, Zhang, Ren, Sun",
    year: 2015,
    url: "https://arxiv.org/abs/1512.03385",
    topic: "Deep networks",
    why: "Introduced residual connections that made much deeper neural networks easier to train.",
    seedVotes: 72,
  },
  {
    id: "alphago",
    title: "Mastering the game of Go with deep neural networks and tree search",
    authors: "Silver et al.",
    year: 2016,
    url: "https://www.nature.com/articles/nature16961",
    topic: "Reinforcement learning",
    why: "Combined deep neural networks with search to reach historic Go performance.",
    seedVotes: 70,
  },
  {
    id: "diffusion",
    title: "Denoising Diffusion Probabilistic Models",
    authors: "Ho, Jain, Abbeel",
    year: 2020,
    url: "https://arxiv.org/abs/2006.11239",
    topic: "Diffusion models",
    why: "Helped establish diffusion as a core generative modeling approach for images and media.",
    seedVotes: 68,
  },
  {
    id: "imagenet",
    title: "ImageNet Classification with Deep Convolutional Neural Networks",
    authors: "Krizhevsky, Sutskever, Hinton",
    year: 2012,
    url: "https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks",
    topic: "Computer vision",
    why: "Marked a major deep-learning breakthrough on ImageNet and accelerated modern computer vision.",
    seedVotes: 66,
  },
];
const TOPICS_PAGE_SIZE = 48;

const LIVE_LEADERBOARD_CATEGORIES: { id: Category; label: string }[] = [
  { id: "foundations", label: "Foundations" },
  { id: "prompting", label: "Prompting" },
  { id: "agents", label: "Agents" },
  { id: "models", label: "Models" },
  { id: "safety", label: "Safety" },
];

type LeaderboardHonor =
  "none" | "bronze" | "silver" | "gold" | "sapphire" | "emerald" | "ruby";

const initialProgress: Progress = {
  guestCount: 0,
  overallElo: 1000,
  topics: {},
};

function loadProgress(): Progress {
  try {
    const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "");
    return {
      guestCount: Number(data.guestCount) || 0,
      overallElo: Number(data.overallElo) || 1000,
      topics: data.topics && typeof data.topics === "object" ? data.topics : {},
    };
  } catch {
    return initialProgress;
  }
}

function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* Browser storage is optional. */
  }
}

function loadPaperVotes() {
  try {
    const data = JSON.parse(localStorage.getItem(PAPER_VOTES_KEY) || "{}");
    return data && typeof data === "object"
      ? (data as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shuffle<T>(items: T[], seed: string) {
  const copy = [...items];
  let state = hash(seed) || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function shuffleQuestion(question: Question, seed: string): Question {
  const correctIndices = new Set(
    question.kind === "multiple" && question.answerIndices
      ? question.answerIndices
      : [question.answerIndex],
  );
  const options = question.options.map((option, index) => ({
    option,
    correct: correctIndices.has(index),
  }));
  const shuffled = shuffle(options, seed);
  return {
    ...question,
    options: shuffled.map((item) => item.option),
    answerIndex: shuffled.findIndex((item) => item.correct),
    answerIndices:
      question.kind === "multiple"
        ? shuffled.flatMap((item, index) => (item.correct ? [index] : []))
        : undefined,
  };
}

function answerIsCorrect(question: Question, answer: number | number[] | null) {
  if (question.kind !== "multiple") return answer === question.answerIndex;
  if (!Array.isArray(answer)) return false;
  const expected = [...(question.answerIndices || [])].sort((a, b) => a - b);
  const selected = [...new Set(answer)].sort((a, b) => a - b);
  return (
    expected.length === selected.length &&
    expected.every((value, index) => value === selected[index])
  );
}

function questionRepeatKey(question: Question) {
  return question.question
    .toLowerCase()
    .replace(/\b(which topic|which answer|which task)\b/g, "which item")
    .replace(/\s+/g, " ")
    .trim();
}

function selectAssessmentQuestions(bank: Question[], seed: string) {
  const randomized = shuffle(bank, seed);
  const level = { foundation: 0, applied: 1, advanced: 2 };
  // Reviewed assessments progress from foundations to application and limits.
  // Equal-level questions and their answer choices are still randomized.
  if (bank.every((question) => question.difficulty)) {
    randomized.sort((a, b) => level[a.difficulty!] - level[b.difficulty!]);
  }
  // Keep the two scenario questions together at the end of the assessment.
  randomized.sort(
    (a, b) =>
      Number(a.section === "real-world") - Number(b.section === "real-world"),
  );
  const selected: Question[] = [];
  const seenKeys = new Set<string>();
  for (const question of randomized) {
    const key = questionRepeatKey(question);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    selected.push(question);
    if (selected.length === ASSESSMENT_QUESTION_COUNT) break;
  }
  if (selected.length < ASSESSMENT_QUESTION_COUNT) {
    const selectedIds = new Set(selected.map((question) => question.id));
    for (const question of randomized) {
      if (selectedIds.has(question.id)) continue;
      selected.push(question);
      if (selected.length === ASSESSMENT_QUESTION_COUNT) break;
    }
  }
  return selected;
}

function formatLock(timestamp?: number) {
  if (!timestamp || timestamp <= Date.now()) return "";
  const hours = Math.ceil((timestamp - Date.now()) / 3_600_000);
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return days ? `${days}d ${remainder}h` : `${hours}h`;
}

function updateElo(current: number, passed: boolean, scoreRate: number) {
  const expected = 1 / (1 + 10 ** ((1000 - current) / 400));
  const result = passed ? Math.max(0.7, scoreRate) : Math.min(0.3, scoreRate);
  return Math.round(current + 48 * (result - expected));
}

function leaderboardInitials(username: string) {
  return (
    username
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function honorForRanks(ranks: number[]): LeaderboardHonor {
  const firsts = ranks.filter((rank) => rank === 1).length;
  const topTwos = ranks.filter((rank) => rank <= 2).length;
  const topThrees = ranks.filter((rank) => rank <= 3).length;
  if (firsts > 1) return "ruby";
  if (topTwos > 1) return "emerald";
  if (topThrees > 1) return "sapphire";
  if (firsts === 1) return "gold";
  if (topTwos === 1) return "silver";
  if (topThrees === 1) return "bronze";
  return "none";
}

function honorLabel(honor: LeaderboardHonor) {
  switch (honor) {
    case "ruby":
      return "Multi-category first place: silver crown with ruby";
    case "emerald":
      return "Top two in multiple leaderboards: silver crown with emerald";
    case "sapphire":
      return "Top three in multiple leaderboards: silver crown with sapphire";
    case "gold":
      return "First place: gold crown";
    case "silver":
      return "Top two: silver crown";
    case "bronze":
      return "Top three: bronze avatar highlight";
    default:
      return "Leaderboard user";
  }
}

export default function App() {
  const [interest, setInterest] = useState("All");
  const [quality, setQuality] = useState("All");
  const [modelCategory, setModelCategory] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1]).get("category") || "",
  );
  const [view, updateView] = useState<View>(readView);
  const setView = (next: View) => {
    updateView(next);
    location.hash = next;
  };
  const legalView = view === "privacy" || view === "terms";
  const [accepted, setAccepted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef<User | null>(null);
  const [allowance, setAllowance] = useState<GuestAllowance | null>(null);
  const [quotaBusy, setQuotaBusy] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const assessmentBusyRef = useRef(false);
  const activeRef = useRef<ActiveAssessment | null>(null);
  const examRef = useRef<HTMLElement | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{
    current: ActiveAssessment;
    answers: (number | number[] | null)[];
  } | null>(null);

  useEffect(() => {
    const changed = () => {
      updateView(readView());
      setModelCategory(
        new URLSearchParams(location.hash.split("?")[1]).get("category") || "",
      );
      setAuthOpen(false);
    };
    window.addEventListener("hashchange", changed);
    window.addEventListener("popstate", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("popstate", changed);
    };
  }, []);
  useEffect(() => {
    document.title =
      view === "privacy"
        ? "Privacy Policy | AI Space"
        : view === "study"
          ? "Study For Exam — Acronyms & Flashcards | Technology Maxxing"
          : view === "terms"
            ? "Terms of Service | AI Space"
            : view === "videos"
              ? "Technology Maxxing — Learn in 1 minute"
              : "AI Space — IoT Library, AI Topics, Timed Assessments";
    if (view === "privacy" || view === "terms") {
      window.scrollTo(0, 0);
      document.getElementById("legal-title")?.focus({ preventScroll: true });
    }
    if (view === "home") {
      window.scrollTo(0, 0);
      document.getElementById("home-title")?.focus({ preventScroll: true });
    }
  }, [view]);

  async function refreshAllowance() {
    if (!firebaseReady || userRef.current) return;
    setQuotaBusy(true);
    setQuotaError("");
    try {
      const status = await getGuestAllowance();
      if (!userRef.current) setAllowance(status);
    } catch {
      // A background allowance check should not interrupt browsing.
      if (!userRef.current) setAllowance(null);
    } finally {
      setQuotaBusy(false);
    }
  }
  async function removeGuestRecord() {
    try {
      await clearGuestAllowance();
    } catch {
      // Keep guest cleanup retries silent; signed-in users should not see backend cleanup state.
    }
  }
  const [user, setUser] = useState<User | null>(null);
  const [videoOwner, setVideoOwner] = useState(false);
  const [videoAccessError, setVideoAccessError] = useState("");
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  useEffect(() => {
    let stopped = false;
    setVideoOwner(false);
    setVideoAccessError("");
    setVideoJobs([]);
    if (user?.email === "vcv@robertjmonzingo.com" && user.emailVerified) {
      void videoCall<{ owner: boolean }>("videoOwnerStatus")
        .then((result) => {
          if (!stopped) setVideoOwner(result.owner);
        })
        .catch(() => {
          if (!stopped)
            setVideoAccessError(
              "Your video studio is unavailable. Sign in with Google and check the Firebase video setup and App Check configuration.",
            );
        });
    }
    return () => {
      stopped = true;
    };
  }, [user]);
  useEffect(() => {
    if (!videoOwner || !user || !db) return;
    return onSnapshot(
      firestoreQuery(collection(db, "videoJobs"), where("uid", "==", user.uid)),
      (snapshot) => {
        setVideoJobs(
          snapshot.docs
            .map((d) => ({ ...d.data(), id: d.id }) as VideoJob)
            .sort((a, b) => b.createdAt - a.createdAt),
        );
      },
      () => {
        setVideoOwner(false);
        setVideoJobs([]);
      },
    );
  }, [videoOwner, user]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionBanks, setQuestionBanks] = useState<
    Record<string, Question[]>
  >({});
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [leaderboardTopic, setLeaderboardTopic] = useState("All topics");
  const [visibleTopics, setVisibleTopics] = useState(TOPICS_PAGE_SIZE);
  const [isAutoLoadingTopics, setIsAutoLoadingTopics] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [paperVotes, setPaperVotes] = useState(loadPaperVotes);
  const [active, setActive] = useState<ActiveAssessment | null>(null);
  useEffect(() => {
    if (!active || active.index !== 0 || view !== "assessments") return;
    const frame = requestAnimationFrame(() => {
      examRef.current?.focus({ preventScroll: true });
      examRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active?.startedAt, view]);
  const [multipleSelection, setMultipleSelection] = useState<number[]>([]);
  const [pendingAssessment, setPendingAssessment] = useState<Technology | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<{
    technology: Technology;
    score: number;
    total: number;
    passed: boolean;
    elo: number;
    review: {
      question: Question;
      selectedIndex: number | number[] | null;
    }[];
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authAction, setAuthAction] = useState<"email" | "google" | null>(null);
  const authBusy = authAction !== null;
  const authDialogRef = useRef<HTMLDialogElement>(null);
  const authEmailRef = useRef<HTMLInputElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const mobileNav = useRef<HTMLDialogElement>(null);
  const mobileNavTrigger = useRef<HTMLButtonElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => {
    mobileNav.current?.close();
    setMobileNavOpen(false);
  };
  useEffect(() => {
    closeMobileNav();
  }, [view]);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 761px)");
    const changed = () => {
      if (desktop.matches) closeMobileNav();
    };
    desktop.addEventListener("change", changed);
    return () => desktop.removeEventListener("change", changed);
  }, []);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [paperUrl, setPaperUrl] = useState("");
  const [paperSubmitBusy, setPaperSubmitBusy] = useState(false);
  const [paperSubmitError, setPaperSubmitError] = useState("");
  const [paperSubmitMessage, setPaperSubmitMessage] = useState("");
  const [liveLeaderboards, setLiveLeaderboards] = useState<
    Partial<Record<Category, LeaderboardEntry[]>>
  >({});

  useEffect(() => {
    if (!authOpen) return;
    const dialog = authDialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    authEmailRef.current?.focus();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [authOpen]);

  useEffect(() => {
    if (authOpen) authEmailRef.current?.focus();
  }, [authOpen, authMode]);

  useEffect(() => {
    void completeGoogleRedirect().catch((error) => {
      setAuthMode("login");
      setAuthError(authErrorMessage(error));
      setAuthOpen(true);
    });
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}knowledge-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error("The library could not load.");
        return response.json();
      })
      .then((data) => {
        setTechnologies(data.technologies || []);
        setExams(data.exams || []);
        setQuestionBanks(data.assessments || {});
      })
      .catch((error) => setLoadError(error.message));

    return onAuth((next) => {
      userRef.current = next;
      setUser(next);
      setAuthReady(true);
      if (next) {
        setAuthOpen(false);
        setPassword("");
        setQuotaError("");
        setAllowance(null);
        void removeGuestRecord();
      } else {
        setAllowance(null);
      }
    });
  }, []);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(PAPER_VOTES_KEY, JSON.stringify(paperVotes));
    } catch {
      /* Browser storage is optional. */
    }
  }, [paperVotes]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribers = LIVE_LEADERBOARD_CATEGORIES.map(({ id }) =>
      watchLeaderboard(
        id,
        (entries) => {
          setLiveLeaderboards((current) => ({ ...current, [id]: entries }));
        },
        (error) => {
          console.warn("Live leaderboard unavailable", id, error);
        },
      ),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => {
    if (!active) return;
    const totalExpired = now - active.startedAt >= TOTAL_MINUTES * 60_000;
    const questionExpired =
      now - active.questionStartedAt >= QUESTION_SECONDS * 1000;
    if (totalExpired || questionExpired) answerCurrent(null);
  }, [now, active]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(technologies.map((item) => item.category))).sort(),
    ],
    [technologies],
  );
  const interestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const topic of technologies) {
      const group = topicGroup(topic);
      counts.set(group, (counts.get(group) || 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [technologies]);

  const library = useMemo(() => {
    const text = query.trim().toLowerCase();
    return technologies
      .filter((item) => interest === "All" || topicGroup(item) === interest)
      .filter((item) => quality === "All" || item.assessmentQuality === quality)
      .filter((item) => category === "All" || item.category === category)
      .filter((item) =>
        text
          ? `${item.name} ${item.category} ${item.tag}`
              .toLowerCase()
              .includes(text)
          : true,
      );
  }, [category, query, technologies, interest, quality]);

  useEffect(() => {
    setVisibleTopics(TOPICS_PAGE_SIZE);
  }, [category, query, interest, quality]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleTopics >= library.length) {
      setIsAutoLoadingTopics(false);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsAutoLoadingTopics(true);
        window.requestAnimationFrame(() => {
          setVisibleTopics((current) =>
            Math.min(current + TOPICS_PAGE_SIZE, library.length),
          );
          setIsAutoLoadingTopics(false);
        });
      },
      { rootMargin: "720px 0px 960px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [library.length, visibleTopics]);

  const assessments = useMemo(() => {
    const picked = FEATURED.map((id) =>
      technologies.find((item) => item.id === id),
    ).filter(Boolean) as Technology[];
    return picked.length ? picked : technologies.slice(0, 8);
  }, [technologies]);

  const topicLeaderboard = useMemo(
    () =>
      Object.entries(progress.topics)
        .map(([id, item]) => ({
          id,
          technology: technologies.find((tech) => tech.id === id),
          ...item,
        }))
        .filter((item) => item.technology)
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 20),
    [progress.topics, technologies],
  );

  const leaderboardTopicOptions = useMemo(
    () => [
      "All topics",
      ...topicLeaderboard.map((item) => item.technology?.name || item.id),
    ],
    [topicLeaderboard],
  );

  const visibleTopicLeaderboard = useMemo(
    () =>
      leaderboardTopic === "All topics"
        ? topicLeaderboard
        : topicLeaderboard.filter(
            (item) => (item.technology?.name || item.id) === leaderboardTopic,
          ),
    [leaderboardTopic, topicLeaderboard],
  );

  useEffect(() => {
    if (!leaderboardTopicOptions.includes(leaderboardTopic)) {
      setLeaderboardTopic("All topics");
    }
  }, [leaderboardTopic, leaderboardTopicOptions]);

  const leaderboardHonors = useMemo(() => {
    const ranksByUser = new Map<string, number[]>();
    LIVE_LEADERBOARD_CATEGORIES.forEach(({ id }) => {
      (liveLeaderboards[id] || []).slice(0, 3).forEach((entry, index) => {
        ranksByUser.set(entry.uid, [
          ...(ranksByUser.get(entry.uid) || []),
          index + 1,
        ]);
      });
    });
    return ranksByUser;
  }, [liveLeaderboards]);

  const userLeaderboards = useMemo(
    () =>
      LIVE_LEADERBOARD_CATEGORIES.map(({ id, label }) => ({
        id,
        label,
        rows: (liveLeaderboards[id] || []).slice(0, 10).map((entry, index) => ({
          ...entry,
          rank: index + 1,
          category: id,
          categoryLabel: label,
          honor: honorForRanks(leaderboardHonors.get(entry.uid) || []),
        })),
      })),
    [leaderboardHonors, liveLeaderboards],
  );

  const hasLiveLeaderboards = userLeaderboards.some(
    (board) => board.rows.length,
  );

  const accountHonor = useMemo(() => {
    if (!user) return "none" as LeaderboardHonor;
    const liveRanks = leaderboardHonors.get(user.uid) || [];
    if (liveRanks.length) return honorForRanks(liveRanks);
    return topicLeaderboard.length ? honorForRanks([1]) : "none";
  }, [leaderboardHonors, topicLeaderboard.length, user]);

  const rankedPapers = useMemo(
    () =>
      HALL_OF_FAME_PAPERS.map((paper) => ({
        ...paper,
        userVote: paperVotes[paper.id] || 0,
        score: paper.seedVotes + (paperVotes[paper.id] || 0),
      })).sort((a, b) => b.score - a.score),
    [paperVotes],
  );

  const guestCompleted = Math.max(
    progress.guestCount,
    allowance?.completed || 0,
  );
  function openAuth(mode: Mode = "login") {
    if (authBusy) return;
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    setPassword("");
    setAuthOpen(true);
  }

  function closeAuth() {
    if (authBusy) return;
    setAuthOpen(false);
    setPassword("");
    setAuthError("");
    setAuthMessage("");
    if (location.hash.startsWith("#login")) {
      history.replaceState(
        null,
        "",
        `${location.pathname}${location.search}#library`,
      );
      updateView("library");
    }
  }

  useEffect(() => {
    const resume = () => {
      if (!location.hash.startsWith("#login") || !authReady) return;
      const destination = learningDestination(location.hash);
      if (!user) {
        openAuth("login");
        return;
      }
      if (destination?.kind === "learn") {
        location.assign(`${import.meta.env.BASE_URL}${destination.value}`);
      } else if (destination?.kind === "assessment") {
        const item = technologies.find((t) => t.id === destination.value);
        if (item) {
          setView("assessments");
          setPendingAssessment(item);
        }
      } else setView("library");
    };
    resume();
    window.addEventListener("hashchange", resume);
    return () => window.removeEventListener("hashchange", resume);
  }, [authReady, user, technologies]);

  async function startAssessment(item: Technology) {
    if (!userRef.current) {
      location.hash = `login?assessment=${encodeURIComponent(item.id)}`;
      return;
    }
    if (
      guestAccessUnavailable ||
      !authReady ||
      assessmentBusyRef.current ||
      activeRef.current ||
      pendingCompletion
    )
      return;
    const topic = progress.topics[item.id];
    if (topic?.lockedUntil && topic.lockedUntil > Date.now()) return;
    if (!userRef.current && guestCompleted >= GUEST_LIMIT) {
      openAuth("signup");
      return;
    }
    const bank = questionBanks[item.id] || [];
    if (!bank.length) return;
    assessmentBusyRef.current = true;
    setAssessmentBusy(true);
    setQuotaError("");
    try {
      let guestAttempt: ActiveAssessment["guestAttempt"];
      if (!userRef.current && firebaseReady) {
        const status = await startGuestAssessment();
        setAllowance(status);
        guestAttempt = { attemptId: status.attemptId, receipt: status.receipt };
      }
      const seed = `${userRef.current?.uid || "guest"}:${item.id}:${Date.now()}`;
      const questions = selectAssessmentQuestions(bank, seed).map(
        (question, index) => shuffleQuestion(question, `${seed}:${index}`),
      );
      const next = {
        technology: item,
        questions,
        guestAttempt,
        index: 0,
        answers: Array(questions.length).fill(null),
        startedAt: Date.now(),
        questionStartedAt: Date.now(),
      };
      activeRef.current = next;
      setActive(next);
      setNow(Date.now());
      setLastResult(null);
      setView("assessments");
    } catch (error) {
      const failure = error as {
        details?: { reason?: string };
        message?: string;
      };
      if (failure.details?.reason === "guest-limit") {
        setProgress((current) => ({ ...current, guestCount: GUEST_LIMIT }));
        openAuth("signup");
      } else
        setQuotaError(
          failure.details?.reason === "active-assessment"
            ? "A guest assessment is already open on this network. Finish it or try again after 35 minutes."
            : "We couldn’t start your assessment. Check your connection and retry.",
        );
    } finally {
      assessmentBusyRef.current = false;
      setAssessmentBusy(false);
    }
  }

  function requestAssessment(item: Technology) {
    if (!userRef.current) {
      location.hash = `login?assessment=${encodeURIComponent(item.id)}`;
      return;
    }
    if (assessmentBusy || active || pendingCompletion) return;
    setPendingAssessment(item);
  }

  function answerCurrent(answer: number | number[] | null) {
    const current = activeRef.current;
    if (!current || assessmentBusyRef.current) return;
    const answers = [...current.answers];
    const expired =
      Date.now() - current.questionStartedAt >= QUESTION_SECONDS * 1000;
    answers[current.index] = expired ? null : answer;
    const nextIndex = current.index + 1;
    if (
      nextIndex >= current.questions.length ||
      Date.now() - current.startedAt >= TOTAL_MINUTES * 60_000
    ) {
      activeRef.current = null;
      setActive(null);
      void finishAssessment(current, answers);
      return;
    }
    const next = {
      ...current,
      answers,
      index: nextIndex,
      questionStartedAt: Date.now(),
    };
    activeRef.current = next;
    setActive(next);
    setMultipleSelection([]);
    setNow(Date.now());
  }

  async function finishAssessment(
    current: ActiveAssessment,
    answers: (number | number[] | null)[],
  ) {
    if (assessmentBusyRef.current) return;
    assessmentBusyRef.current = true;
    setAssessmentBusy(true);
    setQuotaError("");
    let completed = progress.guestCount;
    try {
      if (!userRef.current && current.guestAttempt) {
        const status = await completeGuestAssessment(
          current.guestAttempt.attemptId,
          current.guestAttempt.receipt,
        );
        setAllowance(status);
        completed = Math.max(status.completed, progress.guestCount + 1);
      } else if (!userRef.current) completed++;
    } catch (error) {
      const expired =
        (error as { details?: { reason?: string } }).details?.reason ===
        "expired-attempt";
      setPendingCompletion(expired ? null : { current, answers });
      setQuotaError(
        expired
          ? "This guest assessment session expired before it could be saved. Start another assessment or sign in."
          : "Your assessment is finished, but we couldn’t save your guest allowance. Retry to save your result.",
      );
      assessmentBusyRef.current = false;
      setAssessmentBusy(false);
      return;
    }
    setPendingCompletion(null);
    const score = current.questions.reduce(
      (total, question, index) =>
        total + (answerIsCorrect(question, answers[index]) ? 1 : 0),
      0,
    );
    const total = current.questions.length;
    const scoreRate = score / total;
    const passed = scoreRate >= PASS_RATE;
    const existing = progress.topics[current.technology.id] || {
      elo: 1000,
      attempts: 0,
      bestScore: 0,
      passed: false,
      history: [],
    };
    const elo = updateElo(existing.elo, passed, scoreRate);
    const nextProgress: Progress = {
      ...progress,
      guestCount: completed,
      overallElo: updateElo(progress.overallElo, passed, scoreRate),
      topics: {
        ...progress.topics,
        [current.technology.id]: {
          ...existing,
          elo,
          attempts: existing.attempts + 1,
          bestScore: Math.max(existing.bestScore || 0, scoreRate),
          passed: existing.passed || passed,
          lockedUntil: passed ? undefined : Date.now() + RETAKE_LOCK_MS,
          history: [
            { score: scoreRate, passed, at: Date.now() },
            ...(existing.history || []),
          ].slice(0, 10),
        },
      },
    };
    setProgress(nextProgress);
    setLastResult({
      technology: current.technology,
      score,
      total,
      passed,
      elo,
      review: current.questions.map((question, index) => ({
        question,
        selectedIndex: answers[index] ?? null,
      })),
    });
    assessmentBusyRef.current = false;
    setAssessmentBusy(false);
    if (!userRef.current && nextProgress.guestCount >= GUEST_LIMIT)
      openAuth("signup");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    if (authMode === "signup" && !accepted) {
      setAuthError(
        "Please confirm that you are 18 or older and agree to the policies.",
      );
      return;
    }
    if (!firebaseReady) {
      setAuthError(
        "Account access is temporarily unavailable. Please try again later.",
      );
      return;
    }
    setAuthAction("email");
    setAuthError("");
    setAuthMessage("");
    try {
      if (authMode === "reset") {
        try {
          await recoverPassword(email);
        } catch (error) {
          if ((error as { code?: string }).code !== "auth/user-not-found")
            throw error;
        }
        setAuthMessage(
          "If an account uses this email, you’ll receive a password reset link. Check your inbox and spam folder.",
        );
      } else if (authMode === "signup") await signUpEmail(email, password);
      else await signInEmail(email, password);
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthAction(null);
    }
  }

  async function submitGoogle() {
    if (authBusy) return;
    if (authMode === "signup" && !accepted) {
      setAuthError(
        "Please confirm that you are 18 or older and agree to the policies.",
      );
      return;
    }
    if (!firebaseReady) {
      setAuthError(
        "Account access is temporarily unavailable. Please try again later.",
      );
      return;
    }
    setAuthAction("google");
    setAuthError("");
    setAuthMessage("");
    try {
      await signInGoogle();
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthAction(null);
    }
  }

  function votePaper(id: string, value: 1 | -1) {
    if (!user) {
      openAuth("signup");
      return;
    }
    setPaperVotes((current) => ({
      ...current,
      [id]: current[id] === value ? 0 : value,
    }));
  }

  async function submitPaperLink(event: FormEvent) {
    event.preventDefault();
    setPaperSubmitError("");
    setPaperSubmitMessage("");
    const url = paperUrl.trim();
    if (!url) {
      setPaperSubmitError("Paste a paper link first.");
      return;
    }
    if (!user) {
      setPaperModalOpen(false);
      openAuth("signup");
      setPaperSubmitError("Sign in, then submit the paper link again.");
      return;
    }
    if (!firebaseReady) {
      setPaperSubmitError(
        "Paper submissions open when Firebase is connected for this site.",
      );
      return;
    }
    setPaperSubmitBusy(true);
    try {
      const result = await submitPaper(url);
      setPaperSubmitMessage(result.message);
      setPaperUrl("");
    } catch (error) {
      setPaperSubmitError(authErrorMessage(error));
    } finally {
      setPaperSubmitBusy(false);
    }
  }

  const activeQuestion = active?.questions[active.index];
  const questionSecondsLeft = active
    ? Math.max(
        0,
        QUESTION_SECONDS - Math.floor((now - active.questionStartedAt) / 1000),
      )
    : QUESTION_SECONDS;
  const totalMinutesLeft = active
    ? Math.max(
        0,
        Math.ceil((TOTAL_MINUTES * 60_000 - (now - active.startedAt)) / 60_000),
      )
    : TOTAL_MINUTES;

  return (
    <main className={`simple-app${view === "videos" ? " video-mode" : ""}`}>
      <header className="site-header">
        <a className="brand" href="#home">
          IoT
        </a>
        <button
          ref={mobileNavTrigger}
          className="mobile-nav-trigger"
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-navigation"
          onClick={() => {
            setAccountOpen(false);
            mobileNav.current?.showModal();
            setMobileNavOpen(true);
          }}
        >
          <Menu size={21} aria-hidden="true" />
          <span>Menu</span>
        </button>
        <nav
          aria-label={
            view === "models" ? "Model categories" : "Main navigation"
          }
          className={view === "models" ? "model-category-menu" : undefined}
        >
          {view === "models" ? (
            <>
              <button onClick={() => setView("library")}>
                ← Back to main menu
              </button>
              {pickCategories.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={modelCategory === c.id}
                  className={modelCategory === c.id ? "active" : ""}
                  onClick={() => {
                    updateView("models");
                    setModelCategory(c.id);
                    location.hash = `models?category=${c.id}`;
                  }}
                >
                  {c.name}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                className={view === "home" ? "active" : ""}
                onClick={() => setView("home")}
              >
                Home
              </button>
              <button
                className={view === "videos" ? "active" : ""}
                onClick={() => setView("videos")}
              >
                ▶ Videos
              </button>
              <button onClick={() => setView("models")}>
                <Trophy size={18} /> Top 10 Models
              </button>
              <button
                className={view === "benchmarks" ? "active" : ""}
                onClick={() => setView("benchmarks")}
              >
                <Trophy size={18} /> Top Benchmarks
              </button>
              <button
                className={view === "builder" ? "active" : ""}
                onClick={() => setView("builder")}
              >
                <Settings size={18} /> Build
              </button>
              <button
                className={view === "library" ? "active" : ""}
                onClick={() => setView("library")}
              >
                <Library size={18} />
                Library
              </button>
              <button
                className={view === "study" ? "active" : ""}
                onClick={() => setView("study")}
              >
                <BookOpen size={18} /> Study For Exam
              </button>
              <button
                className={view === "assessments" ? "active" : ""}
                onClick={() => setView("assessments")}
              >
                <CheckCircle2 size={18} />
                Assessments
              </button>
              <button
                className={view === "papers" ? "active" : ""}
                onClick={() => setView("papers")}
              >
                <FileText size={18} />
                Papers
              </button>
              <button
                className={view === "leaderboards" ? "active" : ""}
                onClick={() => setView("leaderboards")}
              >
                <Trophy size={18} />
                Leaderboards
              </button>
            </>
          )}
        </nav>
        <div className="account">
          {user ? (
            <div className="account-menu">
              <button
                className={`avatar-button honor-${accountHonor}`}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label={`Account menu. ${honorLabel(accountHonor)}`}
                title={honorLabel(accountHonor)}
                onClick={() => setAccountOpen((current) => !current)}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>
                    {(user.displayName || user.email || "A")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                {accountHonor !== "none" && accountHonor !== "bronze" ? (
                  <span className="account-crown" aria-hidden="true">
                    <Trophy size={22} />
                    {accountHonor === "sapphire" ||
                    accountHonor === "emerald" ||
                    accountHonor === "ruby" ? (
                      <i />
                    ) : null}
                  </span>
                ) : null}
              </button>
              {accountOpen ? (
                <div className="account-popover" role="menu">
                  <div className="account-summary">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>
                        {(user.displayName || user.email || "A")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <div>
                      <strong>{user.displayName || "Signed in"}</strong>
                      <small>{user.email || "Google account"}</small>
                    </div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      setView("leaderboards");
                    }}
                  >
                    <UserRound size={16} />
                    Account overview
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      setView("privacy");
                    }}
                  >
                    <Settings size={16} />
                    Account settings
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void logOut();
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : !authReady ? (
            <span className="auth-loading" role="status">
              Loading account…
            </span>
          ) : (
            <div className="auth-actions">
              <button
                className="small-button"
                onClick={() => openAuth("login")}
              >
                <LogIn size={16} aria-hidden="true" />
                Log in
              </button>
              <button
                className="small-button signup-button"
                onClick={() => openAuth("signup")}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </header>
      <dialog
        id="mobile-navigation"
        className="mobile-navigation"
        ref={mobileNav}
        aria-labelledby="mobile-navigation-title"
        onClose={() => {
          setMobileNavOpen(false);
          if (!document.querySelector("dialog[open]"))
            mobileNavTrigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobileNav();
        }}
      >
        <div className="mobile-navigation-content">
          <div className="mobile-navigation-heading">
            <div>
              <span>TECHNOLOGY MAXXING</span>
              <h2 id="mobile-navigation-title">Explore</h2>
            </div>
            <button aria-label="Close navigation menu" onClick={closeMobileNav}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile navigation">
            <div className="mobile-navigation-primary">
              {(
                [
                  ["videos", "Videos", "Learn in one minute", Play],
                  ["library", "Library", "Find your next topic", Library],
                ] as const
              ).map(([destination, label, description, Icon]) => (
                <button
                  key={destination}
                  aria-current={view === destination ? "page" : undefined}
                  onClick={() => {
                    closeMobileNav();
                    setView(destination);
                  }}
                >
                  <Icon size={22} aria-hidden="true" />
                  <strong>{label}</strong>
                  <small>{description}</small>
                </button>
              ))}
            </div>
            <p className="mobile-navigation-group">DISCOVER & COMPARE</p>
            {(
              [
                ["models", "Top 10 Models", Trophy],
                ["benchmarks", "Top Benchmarks", BarChart3],
                ["builder", "Build", Settings],
                ["papers", "Papers", FileText],
              ] as const
            ).map(([destination, label, Icon]) => (
              <button
                key={destination}
                className="mobile-navigation-link"
                aria-current={view === destination ? "page" : undefined}
                onClick={() => {
                  closeMobileNav();
                  setView(destination);
                }}
              >
                <Icon size={19} aria-hidden="true" />
                {label}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
            <p className="mobile-navigation-group">YOUR LEARNING</p>
            {(
              [
                ["home", "Home", Home],
                ["assessments", "Assessments", CheckCircle2],
                ["study", "Study For Exam", BookOpen],
                ["leaderboards", "Leaderboards", Trophy],
              ] as const
            ).map(([destination, label, Icon]) => (
              <button
                key={destination}
                className="mobile-navigation-link"
                aria-current={view === destination ? "page" : undefined}
                onClick={() => {
                  closeMobileNav();
                  setView(destination);
                }}
              >
                <Icon size={19} aria-hidden="true" />
                {label}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
            {view === "models" && (
              <>
                <p className="mobile-navigation-group">MODEL CATEGORIES</p>
                <select
                  aria-label="Model category"
                  value={modelCategory}
                  onChange={(event) => {
                    setModelCategory(event.target.value);
                    location.hash = `models?category=${event.target.value}`;
                    closeMobileNav();
                  }}
                >
                  <option value="">All categories</option>
                  {pickCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </nav>
          {!user && authReady && (
            <button
              className="mobile-navigation-login"
              onClick={() => {
                closeMobileNav();
                openAuth("login");
              }}
            >
              <LogIn size={18} aria-hidden="true" /> Log in / Create account
            </button>
          )}
        </div>
      </dialog>

      {quotaError ? (
        <p className="error" role="alert">
          {quotaError}{" "}
          <button
            className="small-button"
            disabled={assessmentBusy || quotaBusy}
            onClick={() =>
              pendingCompletion
                ? void finishAssessment(
                    pendingCompletion.current,
                    pendingCompletion.answers,
                  )
                : void refreshAllowance()
            }
          >
            {pendingCompletion
              ? "Retry saving result"
              : "Retry allowance check"}
          </button>
        </p>
      ) : null}
      {assessmentBusy ? (
        <p role="status">
          {pendingCompletion || !active
            ? "Checking assessment access…"
            : "Saving assessment…"}
        </p>
      ) : null}
      {legalView ? (
        <article className="panel legal-page" aria-labelledby="legal-title">
          <a href="/#library">Back to library</a>
          <h1 id="legal-title" tabIndex={-1}>
            {view === "privacy" ? "Privacy Policy" : "Terms of Service"}
          </h1>
          <p>Effective September 19, 2026 · Version {legalVersion}</p>
          {(view === "privacy" ? privacySections : termsSections).map(
            (section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ),
          )}
          <p>
            Questions or data requests:{" "}
            <a href="mailto:robertjmonzingo@gmail.com">
              robertjmonzingo@gmail.com
            </a>
            .
          </p>
        </article>
      ) : view === "builder" ||
        view === "models" ||
        view === "benchmarks" ||
        view === "study" ||
        view === "videos" ||
        view === "home" ? null : (
        <section className="hero">
          <div>
            <p className="eyebrow">Learn & practice</p>
            <h1>Test your knowledge.</h1>
            <p>
              20 seconds per question. Retry after 5 days if you don’t pass.
            </p>
            <p className="assessment-disclosure">
              Practice quizzes, not professional certification. Quiz types are
              labeled; results aren’t proctored.
            </p>
          </div>
          <aside className="quota-card">
            <span>{user ? "Your progress" : "Your learning account"}</span>
            <strong>{user ? progress.overallElo : "Sign in to learn"}</strong>
            <p>
              {user
                ? "Your overall ELO. Pick a topic to learn."
                : "Sign in for lessons and quizzes."}
            </p>
            {!user && firebaseReady ? (
              <p>
                <a href="/privacy-policy/">How we remember visits</a>
              </p>
            ) : null}
            {!firebaseReady ? (
              <p>
                Sign-in is unavailable in this unconfigured preview. You can
                still browse the catalog and papers.
              </p>
            ) : null}
          </aside>
        </section>
      )}

      {view === "benchmarks" && (
        <Suspense fallback={<p role="status">Loading benchmarks…</p>}>
          <Benchmarks />
        </Suspense>
      )}
      {view === "models" && (
        <section className="workbench">
          {pickCategories.some((c) => c.id === modelCategory) ? (
            <Suspense
              fallback={<p role="status">Loading model recommendations…</p>}
            >
              <CategoryPicks signedIn={!!user} categoryId={modelCategory} />
            </Suspense>
          ) : (
            <>
              <h1>Top 10 Models</h1>
              <p>
                Choose one of the ten categories above to load its
                recommendations and current Hugging Face information.
              </p>
            </>
          )}
        </section>
      )}
      {view === "builder" && (
        <Suspense fallback={<p role="status">Loading the AI workbench…</p>}>
          <Workbench signedIn={!!user} />
        </Suspense>
      )}
      {view === "home" && (
        <section className="panel video-home" aria-labelledby="home-title">
          <p className="eyebrow">Stay curious</p>
          <h1 id="home-title" tabIndex={-1}>
            Keep your curiosity going.
          </h1>
          <p>Free videos. Sign in for lessons and quizzes.</p>
          {!user ? (
            <div className="video-home-actions">
              <button className="primary" onClick={() => openAuth("login")}>
                Log in
              </button>
              <button className="primary" onClick={() => openAuth("signup")}>
                Create an account
              </button>
            </div>
          ) : (
            <a href="#library">Explore topics →</a>
          )}
          <a href="#videos">Watch videos →</a>
        </section>
      )}
      {view === "videos" && (
        <Suspense fallback={<p role="status">Loading videos…</p>}>
          {videoAccessError && (
            <p className="error" role="alert">
              {videoAccessError}
            </p>
          )}
          <VideoFeed
            suspended={mobileNavOpen}
            owner={videoOwner}
            jobs={videoJobs}
            signedIn={!!user}
            authReady={authReady}
            onFeedEnd={() => setView(user ? "library" : "home")}
          />
        </Suspense>
      )}
      {view === "study" ? (
        <Suspense fallback={<p role="status">Loading your study desk…</p>}>
          <ExamStudy
            topics={technologies}
            exams={exams}
            signedIn={!!user}
            loadError={loadError}
            onAssess={requestAssessment}
          />
        </Suspense>
      ) : null}
      {view === "library" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Library</h2>
              <p>Search the topics, study, then start a real assessment.</p>
            </div>
            <label className="search-field">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search topics"
              />
            </label>
          </div>

          <div className="topic-filters">
            <label>
              Interest area
              <select
                value={interest}
                onChange={(e) => {
                  setInterest(e.target.value);
                  setCategory("All");
                }}
              >
                <option value="All">All areas ({technologies.length})</option>
                {interestCounts.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Topic category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Assessment type
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                <option value="All">All assessments</option>
                <option value="authored">Authored knowledge checks</option>
                <option value="catalog-recall">
                  Catalog recall — not proficiency
                </option>
              </select>
            </label>
            <button
              onClick={() => {
                setInterest("All");
                setCategory("All");
                setQuery("");
                setQuality("All");
              }}
            >
              Reset filters
            </button>
          </div>
          <p role="status">{library.length} matching topics</p>

          {loadError ? <p className="error">{loadError}</p> : null}

          <div className="card-grid">
            {library.slice(0, visibleTopics).map((item) => {
              const lock = formatLock(progress.topics[item.id]?.lockedUntil);
              return (
                <article className="topic-card" key={item.id}>
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.tag}</p>
                  <small>
                    {item.assessmentCount} timed questions ·{" "}
                    {item.assessmentQuality === "authored"
                      ? "Authored core questions"
                      : "Catalog recall, not proficiency"}
                  </small>
                  <div className="card-actions">
                    <a
                      href={
                        user ? item.learnPath : learningLogin(item.learnPath)
                      }
                    >
                      Learn
                      <ArrowRight size={16} />
                    </a>
                    <button
                      disabled={
                        !!user &&
                        (guestAccessUnavailable ||
                          !!lock ||
                          assessmentBusy ||
                          !!active ||
                          !!pendingCompletion ||
                          !authReady ||
                          (!user && firebaseReady && (!allowance || quotaBusy)))
                      }
                      onClick={() => requestAssessment(item)}
                    >
                      {lock ? (
                        <>
                          <Lock size={16} />
                          {lock}
                        </>
                      ) : (
                        <>
                          Take assessment
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>
                  </div>
                  {videoOwner && (
                    <TopicVideoControls
                      topicId={item.id}
                      job={videoJobs.find((j) => j.topicId === item.id)}
                    />
                  )}
                </article>
              );
            })}
          </div>
          <div
            className="load-more-sentinel"
            ref={loadMoreRef}
            role="status"
            aria-live="polite"
          >
            {visibleTopics < library.length ? (
              <span className="infinite-loader">
                <LoaderCircle size={18} aria-hidden="true" />
                {isAutoLoadingTopics
                  ? "Loading more topics..."
                  : `${Math.min(visibleTopics, library.length)} of ${library.length} topics shown`}
              </span>
            ) : library.length ? (
              <span>All {library.length} topics loaded.</span>
            ) : (
              <span>No topics match this search.</span>
            )}
          </div>
        </section>
      ) : null}

      {view === "assessments" ? (
        <section className={`panel${active ? " assessment-in-progress" : ""}`}>
          <div className="panel-head">
            <div>
              <h2>Assessments</h2>
              <p>20 seconds per question. Pass with 70% correct.</p>
            </div>
            {!user && guestCompleted >= GUEST_LIMIT ? (
              <button className="primary" onClick={() => openAuth("signup")}>
                Sign up free
              </button>
            ) : null}
          </div>

          {active && activeQuestion ? (
            <article
              className="exam-card"
              ref={examRef}
              tabIndex={-1}
              aria-label="Assessment question"
            >
              <div className="exam-meta">
                <span>{active.technology.name}</span>
                <span>
                  Question {active.index + 1} / {active.questions.length}
                </span>
                <span
                  className={`question-timer${questionSecondsLeft <= 3 ? " urgent" : ""}`}
                  aria-label={`${questionSecondsLeft} seconds remaining`}
                >
                  <Clock3 size={16} />
                  {questionSecondsLeft}s
                </span>
                <span>{totalMinutesLeft}m left</span>
              </div>
              <h3>{activeQuestion.question}</h3>
              {activeQuestion.kind === "multiple" ? (
                <fieldset className="checkbox-question">
                  <legend>Select every compatible technology.</legend>
                  <div className="answer-grid checkbox-grid">
                    {activeQuestion.options.map((option, index) => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={multipleSelection.includes(index)}
                          disabled={questionSecondsLeft === 0}
                          onChange={(event) =>
                            setMultipleSelection((current) =>
                              event.target.checked
                                ? [...current, index]
                                : current.filter((item) => item !== index),
                            )
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="primary submit-checkbox-answer"
                    disabled={
                      questionSecondsLeft === 0 || !multipleSelection.length
                    }
                    onClick={() => answerCurrent(multipleSelection)}
                  >
                    Submit selections
                  </button>
                </fieldset>
              ) : (
                <div className="answer-grid">
                  {activeQuestion.options.map((option, index) => (
                    <button
                      key={option}
                      disabled={questionSecondsLeft === 0}
                      onClick={() => answerCurrent(index)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ) : (
            <>
              {lastResult ? (
                <article
                  className={`result-card ${lastResult.passed ? "passed" : "failed"}`}
                >
                  <h3>
                    {lastResult.passed ? "Passed" : "Failed"}:{" "}
                    {lastResult.technology.name}
                  </h3>
                  <p>
                    Score: {lastResult.score}/{lastResult.total}. Topic ELO is
                    now {lastResult.elo}.
                    {!lastResult.passed
                      ? " This assessment is locked for 5 days."
                      : ""}
                  </p>
                  {lastResult.review.every(({ question }) => question.skill) ? (
                    <section
                      className="answer-review"
                      aria-label="Answer review"
                    >
                      <h4>Review your answers</h4>
                      {lastResult.review.map(({ question, selectedIndex }) => {
                        const correct = answerIsCorrect(
                          question,
                          selectedIndex,
                        );
                        const selectedAnswers = Array.isArray(selectedIndex)
                          ? selectedIndex.map(
                              (index) => question.options[index],
                            )
                          : selectedIndex === null
                            ? []
                            : [question.options[selectedIndex]];
                        const correctAnswers =
                          question.kind === "multiple"
                            ? (question.answerIndices || []).map(
                                (index) => question.options[index],
                              )
                            : [question.options[question.answerIndex]];
                        return (
                          <details key={question.id} open={!correct}>
                            <summary>
                              <span
                                className={
                                  correct ? "review-correct" : "review-missed"
                                }
                              >
                                {correct
                                  ? "Correct"
                                  : selectedIndex === null
                                    ? "Unanswered"
                                    : "Review"}
                              </span>
                              {question.skill}
                            </summary>
                            <p className="review-prompt">{question.question}</p>
                            {!correct ? (
                              <p>
                                <strong>Your answer:</strong>{" "}
                                {selectedIndex === null
                                  ? "No answer before time ran out."
                                  : selectedAnswers.join(", ")}
                              </p>
                            ) : null}
                            <p>
                              <strong>
                                Correct answer
                                {correctAnswers.length > 1 ? "s" : ""}:
                              </strong>{" "}
                              {correctAnswers.join(", ")}
                            </p>
                            <p>{question.explanation}</p>
                            <ul
                              className="review-sources"
                              aria-label="Supporting sources"
                            >
                              {question.sources?.map((source) => (
                                <li key={source.url}>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {source.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </details>
                        );
                      })}
                    </section>
                  ) : null}
                </article>
              ) : null}
              <div className="assessment-grid">
                {assessments.map((item) => {
                  const lock = formatLock(
                    progress.topics[item.id]?.lockedUntil,
                  );
                  return (
                    <button
                      className="assessment-card"
                      key={item.id}
                      disabled={
                        !!user &&
                        (guestAccessUnavailable ||
                          !!lock ||
                          assessmentBusy ||
                          !!pendingCompletion ||
                          !authReady ||
                          (!user && firebaseReady && (!allowance || quotaBusy)))
                      }
                      onClick={() => requestAssessment(item)}
                    >
                      <span>{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.tag}</p>
                      <small>
                        {lock
                          ? `Retake available in ${lock}`
                          : `${item.assessmentCount} questions`}
                      </small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {view === "papers" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>White Paper Hall of Fame</h2>
              <p>
                Ten high-signal papers to read first. Signed-in users can vote,
                and new submissions go to Robert for review before they appear
                here.
              </p>
            </div>
            <button className="primary" onClick={() => setPaperModalOpen(true)}>
              Submit a paper
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="paper-list">
            {rankedPapers.map((paper, index) => (
              <article className="paper-card" key={paper.id}>
                <strong>#{index + 1}</strong>
                <div>
                  <span>
                    {paper.topic} · {paper.year}
                  </span>
                  <h3>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {paper.title}
                    </a>
                  </h3>
                  <p>{paper.authors}</p>
                  <p>{paper.why}</p>
                </div>
                <div className="vote-box" aria-label={`${paper.title} votes`}>
                  <button
                    className={paper.userVote === 1 ? "selected" : ""}
                    onClick={() => votePaper(paper.id, 1)}
                  >
                    Upvote
                  </button>
                  <strong>{paper.score}</strong>
                  <button
                    className={paper.userVote === -1 ? "selected" : ""}
                    onClick={() => votePaper(paper.id, -1)}
                  >
                    Downvote
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {view === "leaderboards" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Leaderboards</h2>
              <p>
                See the top users by category. Crown badges update from rank
                across all live leaderboards.
              </p>
            </div>
            <div className="elo-pill">
              <BarChart3 size={18} />
              Overall ELO {progress.overallElo}
            </div>
          </div>
          {hasLiveLeaderboards ? (
            <div className="leaderboard-board-grid">
              {userLeaderboards.map((board) =>
                board.rows.length ? (
                  <section className="leaderboard-board" key={board.id}>
                    <h3>{board.label}</h3>
                    <div className="leaderboard-list">
                      {board.rows.map((item) => (
                        <article key={`${board.id}-${item.uid}`}>
                          <strong>#{item.rank}</strong>
                          <div
                            className={`leaderboard-avatar ${item.house} honor-${item.honor}`}
                            aria-label={honorLabel(item.honor)}
                            title={honorLabel(item.honor)}
                          >
                            <span>{leaderboardInitials(item.username)}</span>
                            {item.honor !== "none" &&
                            item.honor !== "bronze" ? (
                              <span
                                className="leaderboard-crown"
                                aria-hidden="true"
                              >
                                <Trophy size={18} />
                                {item.honor === "sapphire" ||
                                item.honor === "emerald" ||
                                item.honor === "ruby" ? (
                                  <i />
                                ) : null}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <h4>{item.username}</h4>
                            <p>
                              Score {item.score} · ELO {item.elo} · knowledge{" "}
                              {item.knowledge} · {item.rounds} rounds
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          ) : topicLeaderboard.length ? (
            <>
              <div
                className="category-row leaderboard-topic-row"
                aria-label="Group leaderboard by topic"
              >
                {leaderboardTopicOptions.map((topic) => (
                  <button
                    key={topic}
                    className={topic === leaderboardTopic ? "selected" : ""}
                    onClick={() => setLeaderboardTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <div className="leaderboard-list local-leaderboard-list">
                {visibleTopicLeaderboard.map((item, index) => {
                  const honor = honorForRanks([index + 1]);
                  const localName = user?.displayName || user?.email || "You";
                  return (
                    <article key={item.id}>
                      <strong>#{index + 1}</strong>
                      <div
                        className={`leaderboard-avatar honor-${honor}`}
                        aria-label={honorLabel(honor)}
                        title={honorLabel(honor)}
                      >
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{leaderboardInitials(localName)}</span>
                        )}
                        {honor !== "none" && honor !== "bronze" ? (
                          <span
                            className="leaderboard-crown"
                            aria-hidden="true"
                          >
                            <Trophy size={18} />
                            {honor === "sapphire" ||
                            honor === "emerald" ||
                            honor === "ruby" ? (
                              <i />
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h4>{localName}</h4>
                        <p>
                          {item.technology?.name} · Local topic ELO {item.elo} ·
                          best {Math.round(item.bestScore * 100)}% ·{" "}
                          {item.attempts} attempts
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <p>Complete an assessment to seed your leaderboards.</p>
          )}
        </section>
      ) : null}

      <button
        className="back-to-top"
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp size={22} aria-hidden="true" />
      </button>

      <footer className="site-footer">
        <span>IoT · A free, not-for-profit learning project</span>
        <nav aria-label="Legal">
          <a href="/privacy-policy/">Privacy Policy</a>
          <a href="/terms-of-service/">Terms of Service</a>
        </nav>
      </footer>

      {pendingAssessment ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="auth-modal assessment-warning"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assessment-warning-title"
          >
            <button
              className="close"
              aria-label="Cancel assessment"
              onClick={() => setPendingAssessment(null)}
            >
              ×
            </button>
            <h2 id="assessment-warning-title">Ready for a timed assessment?</h2>
            <p>
              {pendingAssessment.assessmentQuality === "authored"
                ? "Authored core questions."
                : "Catalog-recall check: tests recognition of this library’s descriptions, not practical proficiency."}{" "}
              This is a learning exercise, not a proctored exam.
            </p>
            {pendingAssessment.assessmentCount === 7 && (
              <p>
                Includes two AI-generated questions about the Real World Example
                at the end of this topic’s lesson.
              </p>
            )}
            <p>
              {pendingAssessment.assessmentCount} questions, with a strict
              20-second timer each. During the final 3 seconds, the timer turns
              red and pulses. If time reaches zero before you select an answer,
              that question is marked incorrect.
            </p>
            <div className="assessment-warning-actions">
              <button onClick={() => setPendingAssessment(null)}>Cancel</button>
              <button
                className="primary"
                onClick={() => {
                  const item = pendingAssessment;
                  setPendingAssessment(null);
                  void startAssessment(item);
                }}
              >
                Start assessment
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {paperModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-submit-title"
          >
            <button
              className="close"
              aria-label="Close paper submission"
              onClick={() => {
                setPaperModalOpen(false);
                setPaperSubmitError("");
              }}
            >
              ×
            </button>
            <h2 id="paper-submit-title">Submit a paper</h2>
            <p>
              Paste the link to the paper. We’ll send it to Robert for review.
            </p>
            <form onSubmit={(event) => void submitPaperLink(event)}>
              <label>
                Paper link
                <input
                  type="url"
                  placeholder="https://arxiv.org/abs/..."
                  value={paperUrl}
                  onChange={(event) => setPaperUrl(event.target.value)}
                  required
                />
              </label>
              {paperSubmitError ? (
                <p className="error">{paperSubmitError}</p>
              ) : null}
              {paperSubmitMessage ? (
                <p className="success-message">{paperSubmitMessage}</p>
              ) : null}
              <button
                className="primary full"
                disabled={paperSubmitBusy || !paperUrl.trim()}
              >
                {paperSubmitBusy ? <LoaderCircle size={18} /> : null}
                Submit
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {authOpen ? (
        <dialog
          ref={authDialogRef}
          className="auth-modal"
          aria-labelledby="auth-title"
          aria-describedby="auth-description"
          onCancel={(event) => {
            event.preventDefault();
            closeAuth();
          }}
        >
          <button
            className="close"
            aria-label="Close account dialog"
            disabled={authBusy}
            onClick={closeAuth}
          >
            x
          </button>
          <h2 id="auth-title">
            {authMode === "signup"
              ? "Create your account"
              : authMode === "reset"
                ? "Reset your password"
                : "Welcome back"}
          </h2>
          <p id="auth-description">
            {authMode === "signup"
              ? "Sign up for free to keep learning and track your progress."
              : authMode === "reset"
                ? "Enter your account email and we’ll send you a reset link."
                : "Log in to your account to pick up where you left off."}
          </p>
          {authMode === "signup" ? (
            <label className="signup-agreement">
              <input
                type="checkbox"
                checked={accepted}
                disabled={authBusy}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                I am 18 or older and agree to the{" "}
                <a
                  href="/terms-of-service/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          ) : null}
          {authMode !== "reset" ? (
            <>
              <button
                className="google-button"
                disabled={
                  authBusy ||
                  !firebaseReady ||
                  (authMode === "signup" && !accepted)
                }
                onClick={() => void submitGoogle()}
              >
                {authAction === "google" ? (
                  <LoaderCircle size={18} />
                ) : (
                  <span aria-hidden="true">G</span>
                )}
                {authAction === "google"
                  ? "Waiting for Google…"
                  : "Continue with Google"}
              </button>
              <div className="auth-divider">or continue with email</div>
            </>
          ) : null}
          <form onSubmit={(event) => void submitAuth(event)}>
            <label>
              Email
              <input
                ref={authEmailRef}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                disabled={authBusy}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {authMode !== "reset" ? (
              <label>
                Password
                <input
                  type="password"
                  placeholder={
                    authMode === "signup"
                      ? "At least 12 characters"
                      : "Your password"
                  }
                  autoComplete={
                    authMode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={authMode === "signup" ? 12 : 1}
                  value={password}
                  disabled={authBusy}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            ) : null}
            {authMode === "login" ? (
              <button
                type="button"
                className="link-button forgot-password"
                disabled={authBusy}
                onClick={() => openAuth("reset")}
              >
                Forgot password?
              </button>
            ) : null}
            {authError ? (
              <p className="error" role="alert">
                {authError}
              </p>
            ) : null}
            {authMessage ? (
              <p className="auth-message" role="status">
                {authMessage}
              </p>
            ) : null}
            <button
              className="primary full"
              disabled={
                authBusy ||
                !firebaseReady ||
                (authMode === "signup" && !accepted)
              }
            >
              {authAction === "email"
                ? authMode === "signup"
                  ? "Creating account…"
                  : authMode === "reset"
                    ? "Sending reset link…"
                    : "Logging in…"
                : authMode === "signup"
                  ? "Create account"
                  : authMode === "reset"
                    ? "Send reset link"
                    : "Log in"}
            </button>
          </form>
          <button
            className="link-button"
            disabled={authBusy}
            onClick={() => openAuth(authMode === "login" ? "signup" : "login")}
          >
            {authMode === "signup"
              ? "Already have an account? Log in"
              : authMode === "reset"
                ? "Back to log in"
                : "New here? Create an account"}
          </button>
          {!firebaseReady ? (
            <p className="setup-note">
              Account access is temporarily unavailable. You can still browse
              the library.
            </p>
          ) : null}
        </dialog>
      ) : null}
    </main>
  );
}

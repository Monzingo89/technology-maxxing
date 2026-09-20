import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Library,
  LoaderCircle,
  Lock,
  LogIn,
  LogOut,
  Search,
  Trophy,
} from "lucide-react";
import type { User } from "firebase/auth";
import {
  authErrorMessage,
  firebaseReady,
  logOut,
  onAuth,
  signInEmail,
  signInGoogle,
  signUpEmail,
} from "./services/firebase";
import {
  clearGuestAllowance,
  completeGuestAssessment,
  getGuestAllowance,
  startGuestAssessment,
  type GuestAllowance,
} from "./services/guest";
import { legalVersion, privacySections, termsSections } from "./content/legal";

type View =
  "library" | "assessments" | "papers" | "leaderboards" | "privacy" | "terms";
function readView(): View {
  const route = location.hash.slice(1);
  return ["assessments", "papers", "leaderboards", "privacy", "terms"].includes(
    route,
  )
    ? (route as View)
    : "library";
}
type Mode = "signup" | "login";

type Question = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type Technology = {
  id: string;
  name: string;
  category: string;
  tag: string;
  challengeCount: number;
  assessmentCount: number;
  learnPath: string;
};

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
  answers: (number | null)[];
  startedAt: number;
  questionStartedAt: number;
};

const GUEST_LIMIT = 5;
const guestAccessUnavailable = !firebaseReady && !import.meta.env.DEV;
const ASSESSMENT_QUESTION_COUNT = 10;
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
  const options = question.options.map((option, index) => ({
    option,
    correct: index === question.answerIndex,
  }));
  const shuffled = shuffle(options, seed);
  return {
    ...question,
    options: shuffled.map((item) => item.option),
    answerIndex: shuffled.findIndex((item) => item.correct),
  };
}

function questionRepeatKey(question: Question) {
  return question.question
    .toLowerCase()
    .replace(/\b(which topic|which answer|which task)\b/g, "which item")
    .replace(/\s+/g, " ")
    .trim();
}

function questionDifficulty(question: Question) {
  const text = `${question.question} ${question.explanation}`.toLowerCase();
  if (text.includes("task") || text.includes("assess knowledge")) return 5;
  if (text.includes("why would someone learn")) return 4;
  if (text.includes("historical note") || text.includes("origin")) return 3;
  if (text.includes("source") || text.includes("verify")) return 2;
  if (text.includes("description") || text.includes("connected")) return 1;
  return 0;
}

function selectAssessmentQuestions(bank: Question[], seed: string) {
  const randomized = shuffle(bank, seed)
    .map((question, index) => ({
      question,
      order: index,
      difficulty: questionDifficulty(question),
    }))
    .sort((a, b) => b.difficulty - a.difficulty || a.order - b.order);
  const selected: Question[] = [];
  const seenKeys = new Set<string>();
  for (const item of randomized) {
    const key = questionRepeatKey(item.question);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    selected.push(item.question);
    if (selected.length === ASSESSMENT_QUESTION_COUNT) break;
  }
  if (selected.length < ASSESSMENT_QUESTION_COUNT) {
    const selectedIds = new Set(selected.map((question) => question.id));
    for (const item of randomized) {
      if (selectedIds.has(item.question.id)) continue;
      selected.push(item.question);
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

export default function App() {
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
  const [cleanupError, setCleanupError] = useState("");
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const assessmentBusyRef = useRef(false);
  const activeRef = useRef<ActiveAssessment | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{
    current: ActiveAssessment;
    answers: (number | null)[];
  } | null>(null);

  useEffect(() => {
    const changed = () => {
      updateView(readView());
      setAuthOpen(false);
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    document.title =
      view === "privacy"
        ? "Privacy Policy | IoT"
        : view === "terms"
          ? "Terms of Service | IoT"
          : "IoT | Knowledge assessments";
    if (view === "privacy" || view === "terms") {
      window.scrollTo(0, 0);
      document.getElementById("legal-title")?.focus({ preventScroll: true });
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
      if (!userRef.current)
        setQuotaError(
          "We couldn’t check your guest allowance. Please retry before starting an assessment.",
        );
    } finally {
      setQuotaBusy(false);
    }
  }
  async function removeGuestRecord() {
    setCleanupError("");
    try {
      await clearGuestAllowance();
    } catch {
      setCleanupError(
        "You’re signed in, but your guest network record has not been removed yet. Retry to finish deleting it.",
      );
    }
  }
  const [user, setUser] = useState<User | null>(null);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [questionBanks, setQuestionBanks] = useState<
    Record<string, Question[]>
  >({});
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [visibleTopics, setVisibleTopics] = useState(TOPICS_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [paperVotes, setPaperVotes] = useState(loadPaperVotes);
  const [active, setActive] = useState<ActiveAssessment | null>(null);
  const [lastResult, setLastResult] = useState<{
    technology: Technology;
    score: number;
    total: number;
    passed: boolean;
    elo: number;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}knowledge-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error("The library could not load.");
        return response.json();
      })
      .then((data) => {
        setTechnologies(data.technologies || []);
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
        setCleanupError("");
        setAllowance(null);
        void refreshAllowance();
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

  const library = useMemo(() => {
    const text = query.trim().toLowerCase();
    return technologies
      .filter((item) => category === "All" || item.category === category)
      .filter((item) =>
        text
          ? `${item.name} ${item.category} ${item.tag}`
              .toLowerCase()
              .includes(text)
          : true,
      );
  }, [category, query, technologies]);

  useEffect(() => {
    setVisibleTopics(TOPICS_PAGE_SIZE);
  }, [category, query]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleTopics >= library.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleTopics((current) =>
            Math.min(current + TOPICS_PAGE_SIZE, library.length),
          );
        }
      },
      { rootMargin: "720px 0px" },
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
  const guestRemaining = user
    ? "unlimited"
    : !authReady || guestAccessUnavailable || (firebaseReady && !allowance)
      ? "—"
      : Math.max(0, GUEST_LIMIT - guestCompleted);

  function openAuth(mode: Mode = "signup") {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  }

  async function startAssessment(item: Technology) {
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
      const questions = selectAssessmentQuestions(bank, seed)
        .map((question, index) =>
          shuffleQuestion(question, `${seed}:${index}`),
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

  function answerCurrent(answer: number | null) {
    const current = activeRef.current;
    if (!current || assessmentBusyRef.current) return;
    const answers = [...current.answers];
    answers[current.index] = answer;
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
    setNow(Date.now());
  }

  async function finishAssessment(
    current: ActiveAssessment,
    answers: (number | null)[],
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
        total + (answers[index] === question.answerIndex ? 1 : 0),
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
      setAuthError("Signup opens when Firebase is connected for this site.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "signup") await signUpEmail(email, password);
      else await signInEmail(email, password);
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
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
      setAuthError("Signup opens when Firebase is connected for this site.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInGoogle();
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
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
    <main className="simple-app">
      <header className="site-header">
        <a className="brand" href="#library">
          IoT
        </a>
        <nav aria-label="Main navigation">
          <button
            className={view === "library" ? "active" : ""}
            onClick={() => setView("library")}
          >
            <Library size={18} />
            Library
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
        </nav>
        <div className="account">
          {user ? (
            <>
              <span>{user.email || "Signed in"}</span>
              <button className="small-button" onClick={() => void logOut()}>
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <button className="small-button" onClick={() => openAuth("signup")}>
              <LogIn size={16} />
              Sign up free
            </button>
          )}
        </div>
      </header>

      {cleanupError ? (
        <p className="error" role="alert">
          {cleanupError}{" "}
          <button
            className="small-button"
            onClick={() => void removeGuestRecord()}
          >
            Retry deletion
          </button>
        </p>
      ) : null}
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
          <a href="#library">Back to library</a>
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
      ) : (
        <section className="hero">
          <div>
            <p className="eyebrow">IoT knowledge assessments</p>
            <h1>Prove what you know, topic by topic.</h1>
            <p>
              Every assessment is a 10-question multiple-choice run from a
              larger bank. Questions are randomized per user, capped at 20
              seconds each, and failed attempts lock that topic for 5 days.
            </p>
          </div>
          <aside className="quota-card">
            <span>Guest assessments left</span>
            <strong>{guestRemaining}</strong>
            <p>
              Overall ELO: {progress.overallElo}. Free signup unlocks more
              attempts.
            </p>
            {!user && firebaseReady ? (
              <p>
                Five completed guest assessments per network.{" "}
                <a href="#privacy">How we remember visits</a>
              </p>
            ) : null}
            {!firebaseReady ? (
              <p>
                {guestAccessUnavailable
                  ? "Guest assessments are temporarily unavailable. You can still browse the library and papers."
                  : "Local preview: this browser’s allowance only."}
              </p>
            ) : null}
          </aside>
        </section>
      )}

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

          <div className="category-row" aria-label="Categories">
            {categories.map((item) => (
              <button
                key={item}
                className={item === category ? "selected" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

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
                    {ASSESSMENT_QUESTION_COUNT} assessment questions
                  </small>
                  <div className="card-actions">
                    <a href={item.learnPath}>
                      Study
                      <ArrowRight size={16} />
                    </a>
                    <button
                      disabled={
                        guestAccessUnavailable ||
                        !!lock ||
                        assessmentBusy ||
                        !!active ||
                        !!pendingCompletion ||
                        !authReady ||
                        (!user && firebaseReady && (!allowance || quotaBusy))
                      }
                      onClick={() => void startAssessment(item)}
                    >
                      {lock ? (
                        <>
                          <Lock size={16} />
                          {lock}
                        </>
                      ) : (
                        <>
                          Assess
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="load-more-sentinel" ref={loadMoreRef}>
            {visibleTopics < library.length ? (
              <button
                className="small-button"
                onClick={() =>
                  setVisibleTopics((current) =>
                    Math.min(current + TOPICS_PAGE_SIZE, library.length),
                  )
                }
              >
                Load more topics
              </button>
            ) : library.length ? (
              <span>All {library.length} topics loaded.</span>
            ) : (
              <span>No topics match this search.</span>
            )}
          </div>
        </section>
      ) : null}

      {view === "assessments" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Assessments</h2>
              <p>
                10 harder randomized questions. 20 seconds per question. 70%
                passes.
              </p>
            </div>
            {!user && guestCompleted >= GUEST_LIMIT ? (
              <button className="primary" onClick={() => openAuth("signup")}>
                Sign up free
              </button>
            ) : null}
          </div>

          {active && activeQuestion ? (
            <article className="exam-card">
              <div className="exam-meta">
                <span>{active.technology.name}</span>
                <span>
                  Question {active.index + 1} / {active.questions.length}
                </span>
                <span>
                  <Clock3 size={16} />
                  {questionSecondsLeft}s
                </span>
                <span>{totalMinutesLeft}m left</span>
              </div>
              <h3>{activeQuestion.question}</h3>
              <div className="answer-grid">
                {activeQuestion.options.map((option, index) => (
                  <button key={option} onClick={() => answerCurrent(index)}>
                    {option}
                  </button>
                ))}
              </div>
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
                        guestAccessUnavailable ||
                        !!lock ||
                        assessmentBusy ||
                        !!pendingCompletion ||
                        !authReady ||
                        (!user && firebaseReady && (!allowance || quotaBusy))
                      }
                      onClick={() => void startAssessment(item)}
                    >
                      <span>{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.tag}</p>
                      <small>
                        {lock
                          ? `Retake available in ${lock}`
                          : `${ASSESSMENT_QUESTION_COUNT} questions`}
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
            <a
              className="primary"
              href="mailto:robertjmonzingo@gmail.com?subject=White%20Paper%20Hall%20of%20Fame%20Submission&body=Paper%20title%3A%0APaper%20URL%3A%0AWhy%20it%20belongs%3A%0ASubmitted%20by%3A"
            >
              Submit a paper
              <ArrowRight size={16} />
            </a>
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
                Local ELO is live now. Once accounts are connected, these same
                fields can back overall and per-topic global boards.
              </p>
            </div>
            <div className="elo-pill">
              <BarChart3 size={18} />
              Overall ELO {progress.overallElo}
            </div>
          </div>
          <div className="leaderboard-list">
            {topicLeaderboard.length ? (
              topicLeaderboard.map((item, index) => (
                <article key={item.id}>
                  <strong>#{index + 1}</strong>
                  <div>
                    <h3>{item.technology?.name}</h3>
                    <p>
                      ELO {item.elo} · best {Math.round(item.bestScore * 100)}%
                      · {item.attempts} attempts
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p>Complete an assessment to seed your leaderboards.</p>
            )}
          </div>
        </section>
      ) : null}

      <footer className="site-footer">
        <span>IoT · A free, not-for-profit learning project</span>
        <nav aria-label="Legal">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </nav>
      </footer>

      {authOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              className="close"
              aria-label="Close signup"
              onClick={() => setAuthOpen(false)}
            >
              x
            </button>
            <h2 id="auth-title">
              {authMode === "signup" ? "Create a free account" : "Log in"}
            </h2>
            <p>Keep going after five guest assessments. There is no charge.</p>
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
                  <a href="#terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            ) : null}
            <button
              className="google-button"
              disabled={
                authBusy ||
                !firebaseReady ||
                (authMode === "signup" && !accepted)
              }
              onClick={() => void submitGoogle()}
            >
              {authBusy ? <LoaderCircle size={18} /> : <span>G</span>}
              Continue with Google
            </button>
            <form onSubmit={(event) => void submitAuth(event)}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
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
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {authError ? <p className="error">{authError}</p> : null}
              <button
                className="primary full"
                disabled={
                  authBusy ||
                  !firebaseReady ||
                  (authMode === "signup" && !accepted)
                }
              >
                {authMode === "signup" ? "Sign up free" : "Log in"}
              </button>
            </form>
            <button
              className="link-button"
              onClick={() =>
                setAuthMode(authMode === "signup" ? "login" : "signup")
              }
            >
              {authMode === "signup"
                ? "Already have an account? Log in"
                : "Need an account? Sign up free"}
            </button>
            {!firebaseReady ? (
              <p className="setup-note">
                Firebase is not configured in this local preview yet, so account
                creation is disabled until the site has real Firebase keys.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

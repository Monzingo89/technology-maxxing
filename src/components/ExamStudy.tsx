import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import type { Exam, StudyTopic } from "../services/examStudy";
import { learningLogin } from "../services/learningGate";
import "./exam-study.css";

type Recall = Record<string, "known" | "review">;
const STORAGE_KEY = "technology-maxxing:acronym-recall:v1";
function readRecall(): Recall {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      saved?.version !== 1 ||
      !saved.topics ||
      typeof saved.topics !== "object"
    )
      return {};
    return Object.fromEntries(
      Object.entries(saved.topics).filter(
        ([, value]) => value === "known" || value === "review",
      ),
    ) as Recall;
  } catch {
    return {};
  }
}

function Flashcard({
  topic,
  onRate,
}: {
  topic: StudyTopic;
  onRate: (rating: "known" | "review") => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const study = topic.acronymStudy!;
  return (
    <article
      className="exam-flashcard"
      aria-label={`Flashcard for ${study.term}`}
    >
      <p className="eyebrow">
        {study.group} · Batch {study.batch}
      </p>
      <h3>{study.term}</h3>
      <p>Say the full name and describe what it does.</p>
      <button
        className="primary"
        aria-expanded={revealed}
        aria-controls={`answer-${topic.id}`}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed ? "Hide answer" : "Reveal answer"}
      </button>
      <div id={`answer-${topic.id}`} hidden={!revealed} className="exam-answer">
        <h4>{study.expansion}</h4>
        <p>{study.meaning}</p>
        {study.ports ? (
          <p>
            <strong>Usual logical ports:</strong> {study.ports}. These are
            defaults; services can be configured differently.
          </p>
        ) : null}
        <p>
          <strong>Memory aid:</strong> {study.mnemonic}
        </p>
        <p>
          <strong>Remember the difference:</strong> {study.distinction}
        </p>
        <p className="exam-muted">
          The memory aid is a cue, not the official expansion.
        </p>
        <p className="exam-muted">
          References:{" "}
          {study.sources.map((source, index) => (
            <span key={source.url}>
              {index ? " · " : ""}
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>
            </span>
          ))}
        </p>
        <div className="exam-actions">
          <button onClick={() => onRate("review")}>
            <RotateCcw size={16} aria-hidden="true" /> Review again
          </button>
          <button onClick={() => onRate("known")}>
            <Check size={16} aria-hidden="true" /> I remembered
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ExamStudy({
  topics,
  exams,
  signedIn,
  loadError,
  onAssess,
}: {
  topics: StudyTopic[];
  exams: Exam[];
  signedIn: boolean;
  loadError: string;
  onAssess: (topic: StudyTopic) => void;
}) {
  const [examId, setExamId] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1]).get("exam") ||
      "aplus-core1",
  );
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [batch, setBatch] = useState("all");
  const [content, setContent] = useState("acronyms");
  const [recallFilter, setRecallFilter] = useState("all");
  const [recall, setRecall] = useState<Recall>(readRecall);
  const [position, setPosition] = useState(0);
  const [seed, setSeed] = useState(0);
  const [visible, setVisible] = useState(40);
  const [storageError, setStorageError] = useState("");
  const selectedExam = exams.find((exam) => exam.id === examId);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const topic of topics)
      for (const mapping of topic.examMappings || [])
        result.set(mapping.examId, (result.get(mapping.examId) || 0) + 1);
    return result;
  }, [topics]);
  const areas = useMemo(
    () =>
      [
        ...new Set(
          topics.flatMap((topic) =>
            topic.acronymStudy ? [topic.acronymStudy.group] : [],
          ),
        ),
      ].sort(),
    [topics],
  );
  const batches = useMemo(
    () =>
      [
        ...new Set(
          topics.flatMap((topic) =>
            topic.acronymStudy ? [topic.acronymStudy.batch] : [],
          ),
        ),
      ].sort((a, b) => a - b),
    [topics],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return topics.filter((topic) => {
      const study = topic.acronymStudy;
      if (content === "acronyms" && !study) return false;
      if (
        examId === "unmapped"
          ? topic.examMappings?.length
          : examId !== "all" &&
            !topic.examMappings?.some((mapping) => mapping.examId === examId)
      )
        return false;
      if (area !== "all" && study?.group !== area) return false;
      if (batch !== "all" && study?.batch !== Number(batch)) return false;
      if (recallFilter === "review" && recall[topic.id] !== "review")
        return false;
      if (recallFilter === "new" && recall[topic.id]) return false;
      if (recallFilter === "known" && recall[topic.id] !== "known")
        return false;
      return (
        !search ||
        `${topic.name} ${topic.tag} ${topic.category} ${study?.expansion || ""} ${study?.term || ""} ${study?.mnemonic || ""}`
          .toLowerCase()
          .includes(search)
      );
    });
  }, [topics, query, examId, area, batch, content, recallFilter, recall]);
  const deck = useMemo(() => {
    const cards = filtered.filter((topic) => topic.acronymStudy);
    if (!seed) return cards;
    const shuffled = [...cards];
    let state = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const j = (state >>> 0) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [filtered, seed]);
  const index = deck.length ? position % deck.length : 0;
  const card = deck[index];
  const resetPosition = () => {
    setPosition(0);
    setVisible(40);
  };
  const rate = (rating: "known" | "review") => {
    if (!card) return;
    const next = { ...recall, [card.id]: rating };
    setRecall(next);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, topics: next }),
      );
      setStorageError("");
    } catch {
      setStorageError(
        "Recall marks are available for this visit; browser storage is unavailable.",
      );
    }
    // A filtered review deck removes this card immediately, so keep its index.
    if (recallFilter === "all" || recallFilter === rating)
      setPosition((value) => value + 1);
  };
  const totalAcronyms = topics.filter((topic) => topic.acronymStudy).length;
  return (
    <section className="panel exam-study" aria-labelledby="exam-study-title">
      <p className="eyebrow">
        <BookOpen size={17} aria-hidden="true" /> Your exam study desk
      </p>
      <h1 id="exam-study-title">Study For Exam</h1>
      <p>
        Build recall one acronym at a time. {totalAcronyms} acronym topics,
        organized in checked batches of 100.
      </p>
      <div className="exam-filters">
        <label>
          Exam
          <select
            value={examId}
            onChange={(event) => {
              setExamId(event.target.value);
              resetPosition();
            }}
          >
            <option value="all">All supported exams</option>
            <option value="unmapped">Topics without an exam mapping</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
                {exam.code ? ` · ${exam.code}` : ""} ({counts.get(exam.id) || 0}{" "}
                topics){exam.status === "retired" ? " · retired" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search acronyms and topics
          <input
            type="search"
            value={query}
            placeholder="USB-C, LCD, DNS, Azure…"
            onChange={(event) => {
              setQuery(event.target.value);
              resetPosition();
            }}
          />
        </label>
        <label>
          Study area
          <select
            value={area}
            onChange={(event) => {
              setArea(event.target.value);
              resetPosition();
            }}
          >
            <option value="all">All study areas</option>
            {areas.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Batch
          <select
            value={batch}
            onChange={(event) => {
              setBatch(event.target.value);
              resetPosition();
            }}
          >
            <option value="all">All batches</option>
            {batches.map((number) => (
              <option key={number} value={number}>
                Batch {number} · 100 entries
              </option>
            ))}
          </select>
        </label>
        <label>
          Content
          <select
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              resetPosition();
            }}
          >
            <option value="acronyms">Acronym topics</option>
            <option value="all">All library topics</option>
          </select>
        </label>
        <label>
          Recall
          <select
            value={recallFilter}
            onChange={(event) => {
              setRecallFilter(event.target.value);
              resetPosition();
            }}
          >
            <option value="all">All recall states</option>
            <option value="new">Not studied yet</option>
            <option value="review">Review again</option>
            <option value="known">Remembered</option>
          </select>
        </label>
      </div>
      <div className="exam-summary">
        {selectedExam ? (
          <>
            <h2>
              {selectedExam.name}
              {selectedExam.code ? ` · ${selectedExam.code}` : ""}
            </h2>
            <p>{selectedExam.scope}</p>
            <a
              href={selectedExam.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official exam objectives and availability ↗
            </a>
            {selectedExam.status === "retired" ? (
              <p className="error">
                This exam is retired. Use the current replacement when planning
                a new exam.
              </p>
            ) : null}
          </>
        ) : (
          <h2>
            {examId === "unmapped"
              ? "No exam mapping yet"
              : "Explore the study catalog"}
          </h2>
        )}
        <p className="exam-muted">
          Mappings show study relevance, not guaranteed exam questions or
          complete exam coverage. Related topics use catalog rules; curated
          acronym mappings use their study area. Check the official objectives
          for your exam date. Exam catalog reviewed October 20, 2026.
        </p>
      </div>
      {loadError ? (
        <p role="alert" className="error">
          {loadError}
        </p>
      ) : !topics.length ? (
        <p role="status">Loading study topics…</p>
      ) : null}
      <p role="status">
        {filtered.length} matching topics · {deck.length} flashcards ·{" "}
        {Object.values(recall).filter((value) => value === "known").length}{" "}
        remembered overall
      </p>
      {card ? (
        <>
          <div className="exam-deck-toolbar">
            <h2>Recall practice</h2>
            <span>
              Card {index + 1} of {deck.length}
            </span>
            <button
              onClick={() => {
                setSeed((value) => value + 1);
                setPosition(0);
              }}
            >
              <Shuffle size={16} aria-hidden="true" /> Shuffle cards
            </button>
          </div>
          <Flashcard
            key={`${card.id}:${seed}:${position}:${examId}:${area}:${batch}:${query}`}
            topic={card}
            onRate={rate}
          />
          <div className="exam-actions">
            <button
              onClick={() =>
                setPosition((value) => (value + deck.length - 1) % deck.length)
              }
            >
              <ArrowLeft size={16} aria-hidden="true" /> Previous card
            </button>
            <button onClick={() => setPosition((value) => value + 1)}>
              Next card <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : topics.length ? (
        <p>
          No flashcards match these filters. Try another exam, study area, or
          recall state.
        </p>
      ) : null}
      {storageError ? <p role="status">{storageError}</p> : null}
      <p className="exam-muted">
        Recall marks stay in this browser. They are self-reported practice,
        separate from assessment scores.
      </p>
      <details className="exam-topic-list">
        <summary>Browse matching topics ({filtered.length})</summary>
        <div className="card-grid">
          {filtered.slice(0, visible).map((topic) => {
            const study = topic.acronymStudy;
            const mapping = topic.examMappings?.find(
              (item) => item.examId === examId,
            );
            return (
              <article className="topic-card" key={topic.id}>
                <span>{study?.group || topic.category}</span>
                <h3>{topic.name}</h3>
                <p>{topic.tag}</p>
                {study ? (
                  <>
                    <p>
                      <strong>Memory aid:</strong> {study.mnemonic}
                    </p>
                    <p>{study.distinction}</p>
                  </>
                ) : null}
                <p className="exam-muted">
                  {mapping
                    ? `${mapping.basis === "curated" ? "Curated relevance" : "Related background"}: ${mapping.reason}`
                    : topic.examMappings?.length
                      ? `Relevant study for ${topic.examMappings.length} supported exams.`
                      : "No exam relevance assigned yet."}
                </p>
                {study ? (
                  <details>
                    <summary>
                      All exam mappings ({topic.examMappings?.length || 0})
                    </summary>
                    <ul>
                      {topic.examMappings?.map((item) => {
                        const exam = exams.find(
                          (candidate) => candidate.id === item.examId,
                        );
                        return exam ? (
                          <li key={item.examId}>
                            <a
                              href={exam.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {exam.name}
                              {exam.code ? ` (${exam.code})` : ""}
                            </a>{" "}
                            ·{" "}
                            {item.basis === "curated"
                              ? "Curated relevance"
                              : "Related background"}
                            {exam.status === "retired" ? " · retired" : ""}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </details>
                ) : null}
                {study ? (
                  <details>
                    <summary>Primary references</summary>
                    <ul>
                      {study.sources.map((source) => (
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
                ) : null}
                <div className="card-actions">
                  <a
                    href={
                      signedIn
                        ? topic.learnPath
                        : learningLogin(topic.learnPath)
                    }
                  >
                    Learn <ArrowRight size={16} aria-hidden="true" />
                  </a>
                  <button onClick={() => onAssess(topic)}>
                    Take assessment
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {visible < filtered.length ? (
          <button onClick={() => setVisible((value) => value + 40)}>
            Show 40 more topics
          </button>
        ) : null}
      </details>
      {!filtered.length && topics.length ? (
        <button
          onClick={() => {
            setExamId("all");
            setArea("all");
            setBatch("all");
            setQuery("");
            setRecallFilter("all");
            resetPosition();
          }}
        >
          Clear study filters
        </button>
      ) : null}
    </section>
  );
}

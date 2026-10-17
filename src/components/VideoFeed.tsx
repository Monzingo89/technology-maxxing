import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  draftBlob,
  videoCall,
  type TopicVideo,
  type VideoJob,
} from "../services/videos";
import TopicVideoControls from "./TopicVideoControls";
import "./videos.css";

function VideoSlide({
  video,
  root,
}: {
  video: TopicVideo;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const player = useRef<HTMLVideoElement>(null),
    slide = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false),
    [muted, setMuted] = useState(true),
    [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [failed, setFailed] = useState(false);
  const [captions, setCaptions] = useState("");
  useEffect(() => {
    if (!video.captions) return;
    const url = URL.createObjectURL(
      new Blob([video.captions], { type: "text/vtt" }),
    );
    setCaptions(url);
    return () => URL.revokeObjectURL(url);
  }, [video.captions]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setActive(entries[0].isIntersecting),
      { root: root.current, threshold: 0.65 },
    );
    if (slide.current) observer.observe(slide.current);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    const sync = () => {
      if (active && !paused && !document.hidden)
        void player.current?.play().catch(() => setPaused(true));
      else player.current?.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [active, paused]);
  return (
    <article
      ref={slide}
      className="video-slide"
      aria-label={`${video.title}, 30-second explanation`}
    >
      <video
        ref={player}
        src={active ? video.url : undefined}
        muted={muted}
        loop
        playsInline
        preload="none"
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
        onPlay={() => setPaused(false)}
      >
        {captions && (
          <track
            kind="captions"
            src={captions}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>
      <div className="video-topline">
        <span>{video.category}</span>
        <span>30 seconds</span>
      </div>
      <div className="video-overlay">
        <span className="video-eyebrow">
          {video.generated ? "AI-generated explanation" : "Topic explanation"}
        </span>
        <h2>{video.title}</h2>
        {failed && (
          <p role="alert">This video could not load. Try refreshing.</p>
        )}
        <div className="video-buttons">
          <button
            onClick={() => {
              if (player.current?.paused) {
                setPaused(false);
                void player.current.play().catch(() => setPaused(true));
              } else {
                setPaused(true);
                player.current?.pause();
              }
            }}
          >
            {paused ? "Play" : "Pause"}
          </button>
          <button aria-pressed={!muted} onClick={() => setMuted(!muted)}>
            {muted ? "Sound on" : "Mute"}
          </button>
          <a href={`learn/${encodeURIComponent(video.topicId)}/`}>
            Explore topic →
          </a>
        </div>
        {video.script && (
          <details>
            <summary>Read transcript</summary>
            <p>{video.script}</p>
          </details>
        )}
      </div>
    </article>
  );
}

function ReviewJob({ job }: { job: VideoJob }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false,
      local = "";
    if (job.status === "review" && job.objectPath)
      void draftBlob(job.objectPath)
        .then((blob) => {
          if (!disposed) {
            local = URL.createObjectURL(blob);
            setUrl(local);
          }
        })
        .catch(() =>
          setError(
            "Preview unavailable. Check Storage access and CORS configuration.",
          ),
        );
    return () => {
      disposed = true;
      if (local) URL.revokeObjectURL(local);
    };
  }, [job.status, job.objectPath]);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await videoCall("publishTopicVideo", { jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  }
  async function discard() {
    setBusy(true);
    setError("");
    try {
      await videoCall("discardTopicVideo", { jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not discard draft.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="video-job">
      <strong>{job.topicId}</strong>
      <span>{job.status}</span>
      {url && <video src={url} controls playsInline preload="metadata" />}
      {job.script && <p>{job.script}</p>}
      {job.status === "review" && (
        <button disabled={busy || !url} onClick={() => void publish()}>
          {busy ? "Publishing…" : "Publish reviewed video"}
        </button>
      )}
      {job.status === "failed" && <p>{job.error}</p>}
      {(["review", "failed"].includes(job.status) ||
        job.expiresAt < Date.now()) && (
        <button disabled={busy} onClick={() => void discard()}>
          Discard unpublished draft
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

export default function VideoFeed({
  owner,
  jobs,
  signedIn = false,
  authReady = true,
  onFeedEnd,
}: {
  owner: boolean;
  jobs: VideoJob[];
  signedIn?: boolean;
  authReady?: boolean;
  onFeedEnd?: () => void;
}) {
  const [videos, setVideos] = useState<TopicVideo[]>([]),
    [count, setCount] = useState(6),
    [loading, setLoading] = useState(!!db),
    [error, setError] = useState("");
  const feed = useRef<HTMLDivElement>(null),
    sentinel = useRef<HTMLDivElement>(null);
  const endHandled = useRef(false);
  const [manage, setManage] = useState(false);
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    return onSnapshot(
      query(
        collection(db, "topicVideos"),
        orderBy("publishedAt", "desc"),
        limit(count),
      ),
      (snapshot) => {
        setVideos(snapshot.docs.map((d) => d.data() as TopicVideo));
        setLoading(false);
        setError("");
      },
      () => {
        setError("Videos are temporarily unavailable. Please try again later.");
        setLoading(false);
      },
    );
  }, [count]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && videos.length >= count)
          setCount((n) => n + 6);
      },
      { root: feed.current, rootMargin: "400px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, videos.length, count]);
  useEffect(() => {
    // Prefetching and finishing are separate: never redirect while the last
    // video is still being watched, or while auth/data is loading or unavailable.
    if (
      !authReady ||
      loading ||
      error ||
      !videos.length ||
      videos.length >= count ||
      !onFeedEnd
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !endHandled.current) {
          endHandled.current = true;
          onFeedEnd();
        }
      },
      { root: feed.current, threshold: 0.65 },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [authReady, signedIn, loading, error, videos.length, count, onFeedEnd]);
  return (
    <section
      className={`video-page${videos.length && !manage ? " immersive-feed" : ""}`}
      aria-label="Topic videos"
    >
      {!!videos.length && (
        <nav className="video-feed-nav" aria-label="Video navigation">
          <a href="#library">← Library</a>
          {owner && (
            <button onClick={() => setManage(!manage)}>
              {manage ? "Watch videos" : "Manage videos"}
            </button>
          )}
        </nav>
      )}
      <div className="video-page-heading">
        <div>
          <span className="video-eyebrow">TECHNOLOGY, ONE IDEA AT A TIME</span>
          <h1>Learn in 30 seconds.</h1>
        </div>
        <a href="#library">Browse all topics →</a>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!videos.length ? (
        <div className="video-empty">
          <div className="video-empty-art" aria-hidden="true">
            ▶
          </div>
          <h2>
            {loading
              ? "Loading videos…"
              : "The first explanations are on their way."}
          </h2>
          <p>
            React. Docker. Agentic RAG. Three ideas, brought to life in 30
            seconds each.
          </p>
          <a href="#library">Explore the library</a>
        </div>
      ) : (
        <>
          <p className="video-scroll-hint">
            Scroll or swipe for the next idea. Tap Sound on to listen.
          </p>
          <div
            className="video-feed"
            ref={feed}
            tabIndex={0}
            aria-label="Swipeable video feed"
          >
            {videos.map((v) => (
              <VideoSlide key={v.topicId} video={v} root={feed} />
            ))}
            <div
              ref={sentinel}
              className={`video-feed-end${!loading && videos.length < count ? " video-feed-finished" : ""}`}
              role="status"
            >
              {loading ? (
                "Loading…"
              ) : videos.length < count ? (
                signedIn ? (
                  <>
                    <h2>You’re caught up.</h2>
                    <a href="#library">Explore more topics →</a>
                  </>
                ) : (
                  <>
                    <h2>Keep your curiosity going.</h2>
                    <p>Head home to log in or create your free account.</p>
                    <a href="#home">Continue to home →</a>
                  </>
                )
              ) : (
                <button onClick={() => setCount((n) => n + 6)}>
                  Load more videos
                </button>
              )}
            </div>
          </div>
        </>
      )}
      {owner && (
        <section className="video-studio" aria-label="Owner video studio">
          <h2>Your video studio</h2>
          <p>
            Generate or upload a 30-second portrait MP4, review it, then publish
            to the feed. Generated videos use your paid API accounts.
          </p>
          <div className="video-starter-grid">
            {[
              ["react", "React"],
              ["docker", "Docker"],
              ["agentic_rag", "Agentic RAG"],
            ].map(([id, name]) => (
              <article key={id}>
                <h3>{name}</h3>
                <TopicVideoControls
                  topicId={id}
                  job={jobs.find((j) => j.topicId === id)}
                />
              </article>
            ))}
          </div>
          {jobs
            .filter((j) => !["published", "discarded"].includes(j.status))
            .map((job) => (
              <ReviewJob key={job.id} job={job} />
            ))}
          <a href="#library">Generate a video for another topic →</a>
        </section>
      )}
    </section>
  );
}

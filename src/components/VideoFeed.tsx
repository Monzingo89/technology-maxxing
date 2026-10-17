import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Play,
  Settings2,
  VolumeX,
} from "lucide-react";
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
  active,
  paused,
  unlocked,
  failed,
  playbackProgress,
  onActivate,
  onToggle,
}: {
  video: TopicVideo;
  root: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  paused: boolean;
  unlocked: boolean;
  failed: boolean;
  playbackProgress: number;
  onActivate: (id: string) => void;
  onToggle: () => void;
}) {
  const slide = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onActivate(video.topicId);
      },
      { root: root.current, threshold: 0.65 },
    );
    if (slide.current) observer.observe(slide.current);
    return () => observer.disconnect();
  }, [root, video.topicId, onActivate]);
  return (
    <article
      ref={slide}
      className="video-slide"
      aria-label={`${video.title}, 30-second explanation`}
    >
      <button
        className="video-tap-surface"
        aria-label={
          !unlocked
            ? `Enable sound for video feed`
            : `${paused ? "Play" : "Pause"} ${video.title} video`
        }
        tabIndex={active ? 0 : -1}
        onClick={() => {
          if (active) onToggle();
        }}
      >
        {!unlocked && active ? (
          <VolumeX className="video-mute-prompt" size={44} aria-hidden="true" />
        ) : (
          paused &&
          active && (
            <Play className="video-paused-icon" size={36} aria-hidden="true" />
          )
        )}
      </button>
      <div className="video-overlay">
        <span className="video-eyebrow">
          {video.generated ? "AI-generated" : "Topic explanation"}
        </span>
        <h2>{video.title}</h2>
        {failed && active && (
          <p role="alert">This video could not load. Try refreshing.</p>
        )}
        <a
          className="video-topic-link"
          href={`learn/${encodeURIComponent(video.topicId)}/`}
          aria-label={`Explore ${video.title}`}
          title="Explore topic"
        >
          <ArrowUpRight size={20} aria-hidden="true" />
        </a>
        {video.script && (
          <details>
            <summary aria-label="Read transcript" title="Read transcript">
              <FileText size={18} aria-hidden="true" />
            </summary>
            <p>{video.script}</p>
          </details>
        )}
      </div>
      <progress
        className="video-progress"
        max={1}
        value={active ? playbackProgress : 0}
        aria-label={`${video.title} playback progress`}
      />
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
  // Keep this media element mounted across clips: Safari grants audio permission
  // per element, not just per page. Replacing it would require another gesture.
  const player = useRef<HTMLVideoElement>(null);
  const captionTrack = useRef<HTMLTrackElement>(null);
  const unlockedRef = useRef(false),
    selectedRef = useRef("");
  const [unlocked, setUnlocked] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [failed, setFailed] = useState(false),
    [playbackProgress, setPlaybackProgress] = useState(0);
  const [captions, setCaptions] = useState("");
  const [activeCaption, setActiveCaption] = useState("");
  const syncCaption = useCallback(() => {
    const cues = captionTrack.current?.track.activeCues;
    setActiveCaption(
      Array.from(cues || [])
        .map((cue) => (cue as VTTCue).text)
        .join(" "),
    );
  }, []);
  useEffect(() => {
    const track = captionTrack.current?.track;
    if (!track) return;
    track.mode = "hidden";
    track.addEventListener("cuechange", syncCaption);
    return () => track.removeEventListener("cuechange", syncCaption);
  }, [captions, syncCaption]);
  const [inView, setInView] = useState(true);
  const activeVideo = videos.find((v) => v.topicId === activeId) || videos[0];
  const activate = useCallback((id: string) => {
    if (selectedRef.current === id) return;
    selectedRef.current = id;
    setActiveId(id);
    setPlaybackProgress(0);
    setFailed(false);
    setPaused(
      !unlockedRef.current &&
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (feed.current) observer.observe(feed.current);
    return () => observer.disconnect();
  }, [!!videos.length]);
  useEffect(() => {
    setActiveCaption("");
    if (!activeVideo?.captions) {
      setCaptions("");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([activeVideo.captions], { type: "text/vtt" }),
    );
    setCaptions(url);
    return () => URL.revokeObjectURL(url);
  }, [activeVideo?.captions]);
  useEffect(() => {
    let disposed = false;
    const sync = () => {
      const media = player.current;
      if (!media) return;
      if (!paused && inView && !document.hidden) {
        void media.play().catch((error: DOMException) => {
          if (!disposed && error.name !== "AbortError") setPaused(true);
        });
      } else media.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", sync);
    };
  }, [activeVideo?.url, paused, inView, unlocked]);
  function togglePlayback() {
    const media = player.current;
    if (!media) return;
    if (!unlockedRef.current || media.paused) {
      unlockedRef.current = true;
      setUnlocked(true);
      media.muted = false;
      // Play on the same element, synchronously inside the initial gesture.
      void media
        .play()
        .then(() => setPaused(false))
        .catch(() => setPaused(true));
    } else {
      setPaused(true);
      media.pause();
    }
  }
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
          <a href="#library" aria-label="Library" title="Library">
            <ArrowLeft size={20} aria-hidden="true" />
          </a>
          {owner && (
            <button
              onClick={() => setManage(!manage)}
              aria-label={manage ? "Watch videos" : "Manage videos"}
              title={manage ? "Watch videos" : "Manage videos"}
            >
              {manage ? (
                <Play size={20} aria-hidden="true" />
              ) : (
                <Settings2 size={20} aria-hidden="true" />
              )}
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
            Swipe for the next idea. Tap the video to play or pause.
          </p>
          <div className="video-player-frame">
            <video
              ref={player}
              className="video-shared-player"
              src={activeVideo?.url}
              muted={!unlocked}
              loop
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              onError={() => setFailed(true)}
              onPlay={() => {
                setPaused(false);
                setFailed(false);
              }}
              onTimeUpdate={(event) => {
                const media = event.currentTarget;
                setPlaybackProgress(
                  Number.isFinite(media.duration) && media.duration > 0
                    ? media.currentTime / media.duration
                    : 0,
                );
              }}
              onEmptied={() => setPlaybackProgress(0)}
            >
              {captions && (
                <track
                  ref={captionTrack}
                  kind="captions"
                  src={captions}
                  srcLang="en"
                  label="English"
                  default
                  onLoad={(event) => {
                    event.currentTarget.track.mode = "hidden";
                    syncCaption();
                  }}
                />
              )}
            </video>
            {activeCaption && (
              <p className="video-active-caption" aria-hidden="true">
                {activeCaption}
              </p>
            )}
            <div
              className="video-feed"
              ref={feed}
              tabIndex={0}
              aria-label="Swipeable video feed"
            >
              {videos.map((v) => (
                <VideoSlide
                  key={v.topicId}
                  video={v}
                  root={feed}
                  active={v.topicId === activeVideo?.topicId}
                  paused={paused}
                  unlocked={unlocked}
                  failed={failed}
                  playbackProgress={playbackProgress}
                  onActivate={activate}
                  onToggle={togglePlayback}
                />
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

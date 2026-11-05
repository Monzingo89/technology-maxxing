import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { uploadTopicVideo, videoCall, type VideoJob } from "../services/videos";
import "./videos.css";
export default function TopicVideoControls({
  topicId,
  job,
}: {
  topicId: string;
  job?: VideoJob;
}) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (job) setAccepted(false);
  }, [job?.id, job?.status]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, "topicVideos", topicId),
      (s) => setExists(s.exists()),
      () => {
        setError("Could not check video status.");
        setExists(null);
      },
    );
  }, [topicId]);
  async function run(file?: File) {
    setBusy(true);
    setError("");
    setAccepted(true);
    try {
      if (file) await uploadTopicVideo(topicId, file);
      else await videoCall("requestTopicVideo", { topicId, mode: "generate" });
    } catch (e) {
      setAccepted(false);
      setError(e instanceof Error ? e.message : "Video request failed.");
    } finally {
      setBusy(false);
    }
  }
  if (exists) return <a href="#videos">Watch videos →</a>;
  const pending =
    job &&
    ["queued", "uploading", "processing", "review", "publishing"].includes(
      job.status,
    ) &&
    (job.status === "review" ||
      job.status === "publishing" ||
      job.expiresAt > now);
  const expired =
    job &&
    ["queued", "processing", "uploading"].includes(job.status) &&
    job.expiresAt <= now;
  return (
    <div className="topic-video-actions">
      {pending || accepted ? (
        <a href="/?studio=1#videos">
          {job?.status === "review" ? "Review video" : "Open video studio"} →
        </a>
      ) : (
        <>
          <button disabled={busy || exists === null} onClick={() => void run()}>
            {busy ? "Starting…" : "Generate video"}
          </button>
          <label className="video-upload-label">
            Upload video
            <input
              aria-label="Upload video"
              type="file"
              accept="video/mp4"
              disabled={busy || exists === null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void run(file);
                e.target.value = "";
              }}
            />
          </label>
        </>
      )}
      {(pending || accepted) && (
        <p role="status">
          {job?.status === "review"
            ? "Your draft is ready. Open the studio to preview and publish it."
            : job?.progress ||
              "Request accepted. Generation runs in the background; open the studio to follow progress. The video appears in the feed after you review and publish it."}
        </p>
      )}
      {job?.status === "failed" && (
        <p role="alert">
          {job.error || "Generation failed. Open the video studio for details."}
        </p>
      )}
      {expired && (
        <p role="alert">
          This request timed out before a draft was ready. You can retry
          generation.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}

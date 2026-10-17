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
    try {
      if (file) await uploadTopicVideo(topicId, file);
      else await videoCall("requestTopicVideo", { topicId, mode: "generate" });
    } catch (e) {
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
      job.expiresAt > Date.now());
  return (
    <div className="topic-video-actions">
      {pending ? (
        <a href="#videos">
          {job.status === "review" ? "Review video" : "Video in progress"} →
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
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}

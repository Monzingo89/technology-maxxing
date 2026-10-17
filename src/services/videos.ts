import { httpsCallable } from "firebase/functions";
import {
  getStorage,
  ref,
  uploadBytes,
  getBlob,
  connectStorageEmulator,
} from "firebase/storage";
import { app, functions } from "./firebase";
export type TopicVideo = {
  topicId: string;
  title: string;
  category: string;
  url: string;
  script: string;
  captions: string;
  generated: boolean;
  duration: number;
};
export type VideoJob = {
  id: string;
  topicId: string;
  status: string;
  objectPath?: string;
  error?: string;
  createdAt: number;
  expiresAt: number;
  script?: string;
};
const storage = app ? getStorage(app) : null;
if (
  storage &&
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
)
  connectStorageEmulator(storage, "127.0.0.1", 9199);
export async function videoCall<T>(
  name: string,
  data: unknown = {},
): Promise<T> {
  if (!functions) throw Error("Video services are not configured yet.");
  return (await httpsCallable<unknown, T>(functions, name)(data)).data;
}
export async function uploadTopicVideo(topicId: string, file: File) {
  if (!storage) throw Error("Video storage is not configured.");
  if (
    file.type !== "video/mp4" ||
    file.size > 40 * 1024 * 1024 ||
    file.size === 0
  )
    throw Error(
      "Choose an MP4 up to 40 MB, in portrait format, with audio and 59 seconds long.",
    );
  const job = await videoCall<{ jobId: string; uploadPath: string }>(
    "requestTopicVideo",
    { topicId, mode: "upload" },
  );
  await uploadBytes(ref(storage, job.uploadPath), file, {
    contentType: "video/mp4",
    customMetadata: { jobId: job.jobId },
  });
}
export async function draftBlob(objectPath: string) {
  if (!storage) throw Error("Video storage is not configured.");
  return getBlob(ref(storage, objectPath), 40 * 1024 * 1024);
}

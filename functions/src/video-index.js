// Standalone discovery entry point: video deployments do not require unrelated secrets.
import { initializeApp } from "firebase-admin/app";
initializeApp();
export {
  videoOwnerStatus,
  requestTopicVideo,
  generateTopicVideo,
  processVideoUpload,
  publishTopicVideo,
  discardTopicVideo,
} from "./videos.js";

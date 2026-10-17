import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw Error("Run only with Firestore and Storage emulators.");
const env = await initializeTestEnvironment({
  projectId: "demo-video-security",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
  storage: { rules: readFileSync("storage.rules", "utf8") },
});
const claims = {
  email: "robertjmonzingo@gmail.com",
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
};
const owner = env.authenticatedContext("owner", claims);
const stranger = env.authenticatedContext("stranger", {
  ...claims,
  email: "other@gmail.com",
});
const password = env.authenticatedContext("password", {
  ...claims,
  firebase: { sign_in_provider: "password" },
});
const unverified = env.authenticatedContext("unverified", {
  ...claims,
  email_verified: false,
});
const guest = env.unauthenticatedContext();
try {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "topicVideos/react"), {
      title: "React",
      publishedAt: new Date(),
    });
    await setDoc(doc(context.firestore(), "videoJobs/reserved"), {
      uid: "owner",
      mode: "upload",
      status: "uploading",
      expiresAt: Date.now() + 60_000,
    });
    await uploadBytes(
      ref(context.storage(), "video-drafts/owner/draft.mp4"),
      new Uint8Array([1, 2, 3]),
      { contentType: "video/mp4" },
    );
  });
  await assertSucceeds(getDoc(doc(guest.firestore(), "topicVideos/react")));
  for (const context of [guest, stranger, password, unverified, owner]) {
    for (const collection of [
      "topicVideos",
      "videoJobs",
      "videoLocks",
      "videoBudgets",
    ])
      await assertFails(
        setDoc(doc(context.firestore(), `${collection}/forged`), {
          status: "published",
        }),
      );
    await assertFails(
      uploadBytes(
        ref(context.storage(), "published-videos/react/forged.mp4"),
        new Uint8Array([1]),
        { contentType: "video/mp4" },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(context.storage(), "video-staging/owner/unreserved.mp4"),
        new Uint8Array([1]),
        { contentType: "video/mp4", customMetadata: { jobId: "unreserved" } },
      ),
    );
  }
  for (const context of [guest, stranger, password, unverified]) {
    await assertFails(getDoc(doc(context.firestore(), "videoJobs/reserved")));
    await assertFails(
      getBytes(ref(context.storage(), "video-drafts/owner/draft.mp4")),
    );
    await assertFails(
      uploadBytes(
        ref(context.storage(), "video-staging/owner/reserved.mp4"),
        new Uint8Array([1]),
        { contentType: "video/mp4", customMetadata: { jobId: "reserved" } },
      ),
    );
  }
  await assertSucceeds(getDoc(doc(owner.firestore(), "videoJobs/reserved")));
  await assertSucceeds(
    getBytes(ref(owner.storage(), "video-drafts/owner/draft.mp4")),
  );
  const target = ref(owner.storage(), "video-staging/owner/reserved.mp4");
  await assertFails(
    uploadBytes(target, new Uint8Array([1]), {
      contentType: "text/html",
      customMetadata: { jobId: "reserved" },
    }),
  );
  await assertFails(
    uploadBytes(target, new Uint8Array([1]), {
      contentType: "video/mp4",
      customMetadata: { jobId: "reserved", unexpected: "attacker" },
    }),
  );
  await assertSucceeds(
    uploadBytes(target, new Uint8Array([1]), {
      contentType: "video/mp4",
      customMetadata: { jobId: "reserved" },
    }),
  );
  await assertFails(
    uploadBytes(target, new Uint8Array([2]), {
      contentType: "video/mp4",
      customMetadata: { jobId: "reserved" },
    }),
  );
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "videoJobs/expired"), {
      uid: "owner",
      mode: "upload",
      status: "uploading",
      expiresAt: Date.now() - 60_000,
    });
  });
  await assertFails(
    uploadBytes(
      ref(owner.storage(), "video-staging/owner/expired.mp4"),
      new Uint8Array([1]),
      { contentType: "video/mp4", customMetadata: { jobId: "expired" } },
    ),
  );
  assert.ok(true);
  console.log(
    "Video rules passed: public reading, owner-only staging, private drafts, no direct publication, no forged jobs, no overwrite, unexpected metadata rejected, expired reservation denied.",
  );
} finally {
  await env.clearFirestore();
  await env.clearStorage();
  await env.cleanup();
}

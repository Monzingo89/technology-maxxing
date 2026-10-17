export const VIDEO_OWNER = "vcv@robertjmonzingo.com";
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const JOB_LEASE_MS = 20 * 60 * 1000;
export function isVideoOwner(token, account) {
  return (
    !!token &&
    !!account &&
    !account.disabled &&
    token.email === VIDEO_OWNER &&
    token.email_verified === true &&
    token.firebase?.sign_in_provider === "google.com" &&
    account.email === VIDEO_OWNER &&
    account.emailVerified === true &&
    account.providerData?.some((p) => p.providerId === "google.com") === true &&
    Number(token.auth_time) * 1000 >=
      Date.parse(account.tokensValidAfterTime || "1970-01-01")
  );
}
export function validTopicId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}
export function canStartVideo(existing, lock, now) {
  return !existing && !(lock && lock.expiresAt > now);
}
export function validateStoryboard(value) {
  if (!value || !Array.isArray(value.scenes) || value.scenes.length !== 3)
    throw Error("Invalid storyboard");
  for (const scene of value.scenes) {
    if (
      typeof scene.narration !== "string" ||
      typeof scene.visual !== "string" ||
      scene.narration.length < 30 ||
      scene.narration.length > 250 ||
      scene.visual.length < 20 ||
      scene.visual.length > 1500 ||
      /[<>]/.test(scene.narration)
    )
      throw Error("Invalid scene");
  }
  return value;
}
export const STARTER_SCRIPTS = {
  react: {
    scenes: [
      {
        narration:
          "Here is React in 30 seconds. React builds interfaces from reusable components, like buttons, cards, and menus.",
        visual:
          "Colorful three-dimensional interface pieces assemble into a website. Show a button, a card and a menu clearly as separate reusable pieces.",
      },
      {
        narration:
          "Components receive data, and state remembers things that change. Tap a like button, and its state changes.",
        visual:
          "Close up of one like button. A cursor taps it. A small state orb lights up and the heart fills, while the surrounding interface remains stable.",
      },
      {
        narration:
          "React calculates the updated interface and applies changes to the page. Describe what the screen should look like; React helps keep it synchronized.",
        visual:
          "Show before and after interface panels side by side, highlighting only the changed heart and counter. Finish with reusable interface pieces neatly connected.",
      },
    ],
  },
  docker: {
    scenes: [
      {
        narration:
          "Here is Docker in 30 seconds. Docker packages an application with the libraries and settings it needs to run consistently.",
        visual:
          "An application works on one laptop but encounters missing puzzle pieces on another. Application and dependency pieces slide together into a container image.",
      },
      {
        narration:
          "Run that image, and you get an isolated process called a container. Compatible computers can run the same image with a consistent environment.",
        visual:
          "One packaged image creates identical running containers on a developer laptop and server. Show consistent internal components in each.",
      },
      {
        narration:
          "Containers share the host kernel, so they are usually lighter than full virtual machines. Build once, then run consistently.",
        visual:
          "Cutaway diagram: three separate containers rest on one shared operating-system kernel layer. Distinct boundaries and a clear shared base. Smooth slow camera motion.",
      },
    ],
  },
  agentic_rag: {
    scenes: [
      {
        narration:
          "Here is Agentic RAG in 30 seconds. Retrieval augmented generation finds relevant information, then gives it to a model to help answer.",
        visual:
          "A question moves toward a library of documents. Relevant passages glow and move into a model, followed by an answer with source markers.",
      },
      {
        narration:
          "Agentic RAG adds decisions. The system can choose a search tool, refine its question, or gather more evidence before responding.",
        visual:
          "A researcher-like abstract agent examines a branching diagram: search documents, refine query, gather evidence. Animate a second search loop before the answer.",
      },
      {
        narration:
          "Picture a researcher checking several shelves before explaining a result. Better evidence can improve answers, but sources still need checking.",
        visual:
          "Evidence cards connect visibly to the final answer. A magnifier checks each source. End with an answer and its supporting documents together.",
      },
    ],
  },
};

export function withTopicIntro(storyboard, topicName) {
  validateStoryboard(storyboard);
  if (
    typeof topicName !== "string" ||
    !topicName.trim() ||
    /[<>\r\n]/.test(topicName)
  )
    throw Error("Invalid topic name");
  const prefix = `Here is ${topicName.trim()} in 30 seconds.`;
  const result = structuredClone(storyboard);
  const first = result.scenes[0];
  // Enforce the opener even if a script model ignores the requested format.
  first.narration = `${prefix} ${first.narration.replace(/^Here is .*? in 30 seconds[.!?]\s*/i, "")}`;
  return validateStoryboard(result);
}

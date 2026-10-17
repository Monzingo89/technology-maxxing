export const VIDEO_OWNER = "vcv@robertjmonzingo.com";
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const JOB_LEASE_MS = 20 * 60 * 1000;
export function videoBudgetWindow(now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const resetsAt = new Date(`${day}T00:00:00.000Z`).getTime() + 86400000;
  return { day, resetsAt };
}
export function videoLimitMessage(mode, limit, resetsAt) {
  const action = mode === "generate" ? "generation" : "upload";
  return `Daily ${action} limit reached (${limit} requests per UTC day). This is the site's spending safeguard, not a sign-in or provider-credit error. Requests reset at ${new Date(resetsAt).toISOString().replace("T", " ").replace(".000Z", " UTC")}. No new video was started. Processing attempts count even if they fail.`;
}
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
          "Here is React in 30 seconds. React builds interfaces from reusable components, like buttons, cards, and menus. Combine small components into pages, and reuse them wherever the same design appears.",
        visual:
          "Colorful three-dimensional interface pieces assemble into a website. Show a button, a card and a menu clearly as separate reusable pieces.",
      },
      {
        narration:
          "Props pass data into components. State remembers changing values, like whether you liked a post. Clicking updates state; React runs your components again to calculate what the interface should display.",
        visual:
          "Close up of one like button. A cursor taps it. A small state orb lights up and the heart fills, while the surrounding interface remains stable.",
      },
      {
        narration:
          "React applies the needed changes to the page. You describe the desired result instead of manually editing each element. Use stable keys for lists, and avoid changing state objects directly.",
        visual:
          "Show before and after interface panels side by side, highlighting only the changed heart and counter. Finish with reusable interface pieces neatly connected.",
      },
    ],
  },
  docker: {
    scenes: [
      {
        narration:
          "Here is Docker in 30 seconds. Docker packages an application and its dependencies into an image: a reusable recipe for running your software consistently across compatible laptops, test environments, and servers.",
        visual:
          "An application works on one laptop but encounters missing puzzle pieces on another. Application and dependency pieces slide together into a container image.",
      },
      {
        narration:
          "Start an image, and you get a container: an isolated running process. One image can create many containers. Map ports to expose services, and use volumes for data that must persist.",
        visual:
          "One packaged image creates identical running containers on a developer laptop and server. Show consistent internal components in each.",
      },
      {
        narration:
          "Containers share the host kernel instead of bundling a full operating system, making them lighter than virtual machines. But isolation is not absolute: update images, limit privileges, and keep secrets outside.",
        visual:
          "Cutaway diagram: three separate containers rest on one shared operating-system kernel layer. Distinct boundaries and a clear shared base. Smooth slow camera motion.",
      },
    ],
  },
  agentic_rag: {
    scenes: [
      {
        narration:
          "Here is Agentic RAG in 30 seconds. Retrieval augmented generation searches documents and gives relevant passages to a model, so answers can use your information instead of relying only on training.",
        visual:
          "A question moves toward a library of documents. Relevant passages glow and move into a model, followed by an answer with source markers.",
      },
      {
        narration:
          "The agent adds decisions: choose a search tool, rewrite the query, inspect results, and search again if evidence is missing. Think of a researcher checking several shelves before explaining an answer.",
        visual:
          "A researcher-like abstract agent examines a branching diagram: search documents, refine query, gather evidence. Animate a second search loop before the answer.",
      },
      {
        narration:
          "Return citations so readers can check supporting sources. More searching can improve coverage, but costs time and money. Restrict tool permissions, set search limits, and verify claims: retrieval does not guarantee accuracy.",
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

export function storyboardCaptions(storyboard, spokenDurations = [10, 10, 10]) {
  validateStoryboard(storyboard);
  if (
    spokenDurations.length !== 3 ||
    spokenDurations.some((d) => !Number.isFinite(d) || d <= 0 || d > 10)
  )
    throw Error("Invalid caption timing");
  const stamp = (seconds) =>
    new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
  let captions = "WEBVTT\n\n";
  storyboard.scenes.forEach((scene, i) => {
    const chunks = [];
    for (const word of scene.narration.split(/\s+/)) {
      if (!chunks.length || chunks.at(-1).length + word.length + 1 > 22)
        chunks.push(word);
      else chunks[chunks.length - 1] += ` ${word}`;
    }
    chunks.forEach((text, k) => {
      captions += `${stamp(i * 10 + (k * spokenDurations[i]) / chunks.length)} --> ${stamp(i * 10 + ((k + 1) * spokenDurations[i]) / chunks.length)} line:45% size:90% align:center\n${text}\n\n`;
    });
  });
  return captions;
}

export const VIDEO_OWNER = "vcv@robertjmonzingo.com";
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const JOB_LEASE_MS = 20 * 60 * 1000;
export const VIDEO_DURATION = 59;
export const SCENE_DURATIONS = [10, 10, 10, 10, 10, 9];
export const VIDEO_FORMAT = "technical-eli5-59-v1";
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
  if (!value || typeof value.analogy !== "string" || value.analogy.length < 5 ||
      value.analogy.length > 200 || !Array.isArray(value.scenes) || value.scenes.length !== 6)
    throw Error("Invalid storyboard");
  for (const [index, scene] of value.scenes.entries()) {
    if (
      typeof scene.narration !== "string" ||
      typeof scene.visual !== "string" ||
      scene.narration.length < 30 ||
      scene.narration.length > 250 ||
      scene.narration.trim().split(/\s+/).length > (index === 5 ? 20 : 22) ||
      scene.section !== (index < 3 ? "technical" : "eli5") ||
      scene.visual.length < 20 ||
      scene.visual.length > 1500 ||
      /[<>]/.test(scene.narration)
    )
      throw Error("Invalid scene");
  }
  if (!/^Now, (imagine|think of)\b/i.test(value.scenes[3].narration))
    throw Error("The ELI5 half must introduce the everyday analogy at 30 seconds");
  return value;
}

// One consistent everyday analogy per topic; the section switch is exactly 30s.
const scenes = (rows) => rows.map(([narration, visual], i) => ({
  section: i < 3 ? "technical" : "eli5", narration, visual,
}));
export const STARTER_SCRIPTS = {
  react: {
    analogy: "A reusable building-block toy town",
    scenes: scenes([
      ["React in 1 minute. React builds interactive screens from reusable components. A component can be a button, menu, or card.", "Separate button, menu and card components assemble into one website. Highlight the boundaries between components."],
      ["Props give components information. State remembers changing values, such as a counter. When state changes, React calculates the new screen.", "A counter component receives a data packet. A click changes its internal state and the displayed number changes."],
      ["React updates the page to match. You describe the result you want. Developers still write the rules and manage data.", "Compare two interface states. Highlight only the changed counter while other components stay unchanged."],
      ["Now, imagine a building-block town. Each house is a component. You can use the same house design in several places.", "A friendly toy town assembles from colorful blocks. Several houses share the same clearly recognizable design."],
      ["Props choose each house's color. State remembers whether its light is on. Changing that state tells React the display needs updating.", "Two identical block houses get different colors. Inside one house, a light switch turns a window light on."],
      ["React updates the town's display when the light changes. Your rules describe the town; React keeps its pieces consistent.", "The house light switches on in the toy town while all neighboring buildings remain unchanged. Finish on the complete town."],
    ]),
  },
  docker: {
    analogy: "A packed lunch kit",
    scenes: scenes([
      ["Docker in 1 minute. Docker packages an application and its required software into an image. Images run on compatible computers.", "An application and its dependencies fit into one image package. The same package appears on a laptop and server."],
      ["Running an image creates a container: an isolated process. Containers share the computer's operating system instead of carrying separate copies.", "Show isolated running containers above one shared operating system layer. Connect every container to the common base."],
      ["Ports allow connections. Volumes keep important data outside the container. Containers help software run consistently, but still need security updates.", "Show network connections entering a container and a separate persistent storage volume retaining files after the container disappears."],
      ["Now, think of a lunch kit. The image is its packing plan, listing the meal, spoon, and napkin you need.", "A simple lunch packing plan becomes a neat kit with a meal, spoon and napkin, each clearly visible."],
      ["A container is one kit packed from that plan. Several kits start with the same contents, even at different tables.", "One packing plan produces three identical lunch kits. Move them to different tables without changing their contents."],
      ["The table is your computer. The kit brings essentials, but cannot fix a wobbly table. The surrounding environment still matters.", "Lunch kits rest on stable tables. Contrast a suitable table with a wobbly table, and show a person checking the food."],
    ]),
  },
  agentic_rag: {
    analogy: "A librarian researching a question",
    scenes: scenes([
      ["Agentic RAG in 1 minute. RAG retrieves documents and gives their content to an AI model before it answers questions.", "A question retrieves relevant documents. Highlighted evidence passages move into a model before an answer emerges."],
      ["An agent decides how to search. It chooses tools, checks results, and searches again when the available evidence leaves gaps.", "An agent chooses a search branch, checks results, detects a gap, and follows a second search path."],
      ["Answers can cite sources for you to check. Extra searches cost time and money. Retrieved information can still be wrong.", "Connect an answer to supporting evidence cards. Show a clock and a missing evidence gap to communicate limits."],
      ["Now, imagine asking a librarian about dinosaurs. Instead of guessing, the librarian finds a useful book and checks its explanation.", "A friendly librarian receives a dinosaur question and selects a relevant book from a library shelf."],
      ["If something remains unclear, the librarian checks another shelf. They combine useful evidence and show which books support the answer.", "The same librarian notices a missing clue, visits another shelf, then brings two supporting books to the reader."],
      ["The agent decides what to look up next. But books can contain mistakes. Always check the evidence behind important answers.", "The librarian points from a simple answer to its supporting books. The reader checks a questionable passage with a magnifying glass."],
    ]),
  },
  databricks: {
    analogy: "A shared school workshop",
    scenes: scenes([
      ["Databricks in 1 minute. Databricks brings data processing, analysis, and machine learning into one platform, using a shared data lakehouse.", "Data engineering, analytics and machine learning stations connect to one shared lakehouse storage foundation."],
      ["A lakehouse combines flexible storage with reliable tables. Delta Lake protects transactions. Teams clean and transform data before analysis.", "Incoming raw records become clean structured tables. A transaction completes atomically while processing stages transform the records."],
      ["Unity Catalog controls access to shared data and AI assets. Teams still need to manage permissions, data quality, and costs.", "A central access-control layer grants approved teams access to shared tables. Show data checks and a compute usage meter."],
      ["Now, imagine a school workshop. Materials arrive in boxes. Students sort them, build projects, and measure how well each works.", "A friendly school workshop receives boxes of materials. Students sort supplies, assemble projects and measure completed projects."],
      ["Everyone shares organized supplies instead of keeping separate piles. A teacher checks labels and decides who can use each tool.", "The same workshop has one organized supply shelf. A teacher gives students permission to use suitable tools and checks labels."],
      ["Databricks brings those jobs into one workspace. People still need good materials, clear rules, and sensible spending to work well.", "Pull back to show the whole workshop working together, with organized supplies, supervised tools and a simple materials budget."],
    ]),
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
  const prefix = `${topicName.trim()} in 1 minute.`;
  const result = structuredClone(storyboard);
  const first = result.scenes[0];
  // Enforce the opener even if a script model ignores the requested format.
  first.narration = `${prefix} ${first.narration.replace(/^(?:Here is )?.*? in (?:30 seconds|1 minute)[.!?]\s*/i, "")}`;
  return validateStoryboard(result);
}

export function storyboardCaptions(storyboard, spokenDurations = SCENE_DURATIONS) {
  validateStoryboard(storyboard);
  if (
    spokenDurations.length !== 6 ||
    spokenDurations.some((d, i) => !Number.isFinite(d) || d <= 0 || d > SCENE_DURATIONS[i])
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

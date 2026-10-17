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
      scene.narration.trim().split(/\s+/).length > (index === 5 ? 24 : 27) ||
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
      ["React in 1 minute. React is a JavaScript library for building user interfaces. It organizes a page into reusable components, such as buttons and menus.", "Separate button, menu and card components assemble into one website. Highlight the boundaries between components."],
      ["Components receive information through props. State stores information that can change, such as a counter. Updating state tells React to calculate the new screen.", "A counter component receives a data packet. A click changes its internal state and the displayed number changes."],
      ["React updates the page to match that result. This helps keep interactive screens consistent. Developers still write the rules and manage the application's data.", "Compare two interface states. Highlight only the changed counter while other components stay unchanged."],
      ["Now, imagine a toy town made from building blocks. Each house is a component. You can reuse the same house design in several places.", "A friendly toy town assembles from colorful blocks. Several houses share the same clearly recognizable design."],
      ["Props are the choices you give each house, such as its color. State is something the house remembers, such as whether its light is on.", "Two identical block houses get different colors. Inside one house, a light switch turns a window light on."],
      ["When that light changes, React updates the town's display. You describe how it should look; React helps keep the pieces in sync.", "The house light switches on in the toy town while all neighboring buildings remain unchanged. Finish on the complete town."],
    ]),
  },
  docker: {
    analogy: "A packed lunch kit",
    scenes: scenes([
      ["Docker in 1 minute. Docker packages an application with the software it needs into an image. That image can run on compatible computers.", "An application and its dependencies fit into one image package. The same package appears on a laptop and server."],
      ["Running an image creates a container, an isolated process. Containers share the host operating system's kernel. They do not each need a complete operating system.", "Show isolated running containers above one shared operating system layer. Connect every container to the common base."],
      ["Ports let other programs connect to a container. Volumes keep important data outside it. Containers improve consistency, but still need updates and careful permissions.", "Show network connections entering a container and a separate persistent storage volume retaining files after the container disappears."],
      ["Now, think of a packed lunch kit. The image is the packing plan. It lists the meal and the utensils needed to enjoy it.", "A simple lunch packing plan becomes a neat kit with a meal, spoon and napkin, each clearly visible."],
      ["A container is one lunch kit packed from that plan. Make several kits, and each starts with the same contents, even at different tables.", "One packing plan produces three identical lunch kits. Move them to different tables without changing their contents."],
      ["The table is the host computer: it still matters. The kit brings your essentials, but it cannot fix an unsuitable table or spoiled food.", "Lunch kits rest on stable tables. Contrast a suitable table with a wobbly table, and show a person checking the food."],
    ]),
  },
  agentic_rag: {
    analogy: "A librarian researching a question",
    scenes: scenes([
      ["Agentic RAG in 1 minute. Retrieval augmented generation finds relevant documents and gives their content to an AI model before it writes an answer.", "A question retrieves relevant documents. Highlighted evidence passages move into a model before an answer emerges."],
      ["An agent adds decisions to that process. It can choose a search tool, improve the question, inspect results, and search again when evidence is missing.", "An agent chooses a search branch, checks results, detects a gap, and follows a second search path."],
      ["The answer can cite its sources so you can check them. More searches take time and money. Retrieved information can still be wrong or incomplete.", "Connect an answer to supporting evidence cards. Show a clock and a missing evidence gap to communicate limits."],
      ["Now, imagine asking a librarian why dinosaurs disappeared. Instead of guessing, the librarian finds a useful book and checks what it says about your question.", "A friendly librarian receives a dinosaur question and selects a relevant book from a library shelf."],
      ["If that book leaves something unclear, the librarian checks another shelf. They combine the useful evidence and tell you which books supported the explanation.", "The same librarian notices a missing clue, visits another shelf, then brings two supporting books to the reader."],
      ["That is the agent's job: decide what to look up next. But books can contain mistakes, so you still need to check important answers.", "The librarian points from a simple answer to its supporting books. The reader checks a questionable passage with a magnifying glass."],
    ]),
  },
  databricks: {
    analogy: "A shared school workshop",
    scenes: scenes([
      ["Databricks in 1 minute. Databricks is a platform for data engineering, analytics, and machine learning. Teams work with shared data through a lakehouse architecture.", "Data engineering, analytics and machine learning stations connect to one shared lakehouse storage foundation."],
      ["A lakehouse combines flexible data storage with reliable tables. Delta Lake adds transaction reliability. Processing tools clean and transform data before teams analyze it.", "Incoming raw records become clean structured tables. A transaction completes atomically while processing stages transform the records."],
      ["Unity Catalog helps govern access to data and AI assets. Teams can share work, but they must still manage permissions, data quality, and computing costs.", "A central access-control layer grants approved teams access to shared tables. Show data checks and a compute usage meter."],
      ["Now, imagine a shared school workshop. Materials arrive in boxes. Some students sort them, others build projects, and others measure how well those projects work.", "A friendly school workshop receives boxes of materials. Students sort supplies, assemble projects and measure completed projects."],
      ["Everyone uses the same organized supplies instead of keeping separate piles. A teacher decides who can use each tool and checks that materials are labeled.", "The same workshop has one organized supply shelf. A teacher gives students permission to use suitable tools and checks labels."],
      ["Databricks brings those jobs into one shared workspace. It helps people work together, but they still need good materials, clear rules, and sensible spending.", "Pull back to show the whole workshop working together, with organized supplies, supervised tools and a simple materials budget."],
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

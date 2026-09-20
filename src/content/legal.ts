export const legalVersion = "2026-09-15";
export interface LegalSection {
  title: string;
  body: string;
}

export const privacySections: LegalSection[] = [
  {
    title: "Preview policy and operator",
    body: "AI Space is a learning and social world for adults aged 18 and over. This is the policy for the development preview, dated September 15, 2026. The legal operator name, privacy contact, postal contact where required, service region, and production retention schedule must be published before public registration opens. Those details have not been supplied yet; this preview is not a public service launch.",
  },
  {
    title: "Account and essential data",
    body: "When connected to a configured service, Firebase Authentication handles email/password or Google sign-in, verification, and password recovery. The service uses your account ID and email to provide your account. Firebase may process technical information such as IP addresses and user-agent information for authentication and security. The app does not put your password in your profile or analytics. Do not use a real password in an offline demo.",
  },
  {
    title: "Your agent and what others can see",
    body: "Your chosen username, avatar, AI community, practice role, public posts, and ranking information are intended to be visible to other members. Your email is not part of your public profile. Avatar choices and role-quiz answers are for play and learning, not a claim about your real body, identity, profession, intelligence, or qualifications. Live presence can reveal that you are online; it does not require your real-world location.",
  },
  {
    title: "Conversations and safety",
    body: "Team requests and conversations are social features. Recipients can read and retain messages you send. Only chat with people you choose to connect with; do not post confidential, financial, health, or other sensitive information. Conversations are not represented as end-to-end encrypted. When reporting is enabled, authorized moderators may review reported content and relevant context to investigate abuse. A production reporting, blocking, and moderation process must be operating before public social features open.",
  },
  {
    title: "Optional diagnostics",
    body: "Product diagnostics are off until you choose to enable them. Local diagnostics record only a fixed list of interaction names, code-defined area/category/link IDs, counts, and durations. They exclude email, account IDs, messages, prompts, full URLs, and recordings. Local events stay in this browser for up to 30 days, capped at 500 events, and are not transmitted by default. If connected cloud diagnostics are activated with your consent, the service associates allowed interaction events with your private account ID so they can be deleted, expires those events after 30 days, and creates aggregate daily counts. Optional diagnostics are separate from necessary authentication and abuse-prevention records. You can withdraw permission and clear local events in settings.",
  },
  {
    title: "Storage and service providers",
    body: "Necessary browser storage remembers your session, settings, and preview progress. Where cloud features are configured, Google Firebase processes authentication and application records as a service provider. Google explains its practices at firebase.google.com/support/privacy. Authentication can involve processing in the United States; other storage locations depend on the deployed configuration. Choosing Claude, OpenAI, or Gemini as your community does not itself send your profile or conversations to those companies. The web interface requests typefaces from Google Fonts, which can receive network information such as your IP address when delivering those files. External documentation links have their own policies.",
  },
  {
    title: "AI and creative content",
    body: "Prompts and gallery contributions are content you choose to share. The preview does not send them to a model provider merely because you enter a prompt. Any future image-generation or AI-chat integration must identify the provider and explain what it receives before use. Do not include private information, content you have no right to share, or a real person’s likeness without an appropriate right or permission.",
  },
  {
    title: "Your controls and deletion",
    body: "You can sign out, change available profile settings, disable optional diagnostics, and clear local preview data. Clearing browser data does not delete a cloud account. The connected service includes export and account-deletion operations. Deletion requires a recent sign-in and removes the account, profile, reserved username, posts, rankings, associated diagnostics, learning records, team connections, and stored paired conversation histories; interrupted cleanup is retried. Other members may retain copies already received. The preview export caps large collections and reports those limits. Before public launch, the deployed deletion flow and an accessible web request route must be verified, a privacy contact published, and any justified safety-record retention and provider backup periods disclosed. Depending on your location, applicable law may give you access, correction, deletion, objection, portability, or complaint rights.",
  },
  {
    title: "Security, children, and changes",
    body: "No online service can guarantee absolute security. This preview is intended for people aged 18 and over and does not knowingly invite children to register. If a child’s account is discovered, the operator must investigate and remove it through the published support process. Material changes to data use require a clear notice and, where needed, renewed permission. This draft must be completed and reviewed against the actual deployed service and launch regions before launch.",
  },
];

export const termsSections: LegalSection[] = [
  {
    title: "Welcome to AI Space",
    body: "Learn. Laugh. Master. AI Space combines a technology library with an avatar world, creative prompts, learning games, and community features. These preview terms are dated September 15, 2026. The contracting operator and support contact are not yet configured; they must be identified before public registration. This development preview is offered without a fee. Future paid features, if any, would need clear terms and your separate agreement.",
  },
  {
    title: "Eligibility and account",
    body: "You must be at least 18 and able to agree to these terms. Provide an email you control, protect your credentials, and do not impersonate another person or organization. Usernames are reserved through the service when connected; local demo names are not global reservations. You are responsible for activity you authorize on your account. Use recovery tools if you lose access and contact the published support channel when available.",
  },
  {
    title: "Community and character",
    body: "Choose a Claude, OpenAI, or Gemini community and create an agent avatar. Community changes are limited to once every 30 days under the service rules. These are independent fan communities and do not imply endorsement or affiliation with Anthropic, OpenAI, or Google. Your practice role is a fictional learning track. Changing it requires completing the applicable school path; it is never a professional license or credential.",
  },
  {
    title: "Fair daily play",
    body: "Ranked quizzes permit one entry per published daily period and use a five-second answer window where shown. Do not automate answers, scrape unreleased questions, share live answers, manipulate timing, create accounts to inflate results, or interfere with other users. No quiz is completely cheat-proof. Scores describe performance in this game; they are not IQ tests or judgments of innate intelligence. Suspect results may be reviewed or excluded, with an appeal process required for public competitive operation. Accessible practice can use different timing and remain separate from ranked play.",
  },
  {
    title: "Respect others",
    body: "Do not harass, threaten, discriminate, dox, spam, scam, impersonate, sexually exploit anyone, promote violence, post illegal material, or upload malware. Sexual content involving minors is prohibited. Do not post others’ private information, non-consensual intimate material, or content that infringes intellectual-property rights. Respect refusals of team and chat requests. Report concerns and block users using the available controls; production social features require staffed moderation and a reachable support contact.",
  },
  {
    title: "Your content and permissions",
    body: "You retain whatever rights you hold in your original posts and prompts. You give the operator a non-exclusive permission to store, display, format, and deliver that content only as needed to provide, moderate, secure, and operate AI Space. Sharing does not transfer ownership to other users. This permission ends when the content is removed except for copies already shared, legal obligations, and limited backup retention disclosed in the final policy. AI outputs can be inaccurate, similar to other outputs, or subject to third-party rights; no exclusivity or copyright protection is guaranteed.",
  },
  {
    title: "Learning, not professional advice",
    body: "Library pages, quiz explanations, fictional roles, and user posts are for learning and entertainment. They are not legal, medical, financial, emergency, or other professional advice. Verify important information with appropriate primary sources and qualified professionals. Calling a role lawyer, farmer, teacher, scientist, police officer, or firefighter does not certify competence or authorize real-world practice.",
  },
  {
    title: "Service limits and enforcement",
    body: "The preview may contain errors, lose local progress, or change as features are developed. The operator may restrict content or accounts to address abuse, security, legal obligations, or fair-play violations, and should provide a reason and review route when appropriate. We do not promise uninterrupted service, particular rankings, traffic, income, or permanent storage. Nothing in these terms removes consumer protections or other rights that cannot lawfully be excluded.",
  },
  {
    title: "Leaving and future terms",
    body: "You can stop using AI Space and sign out at any time. Deleting browser data removes local preview state but does not request cloud account deletion. Before public launch, the operator must provide a working deletion process, contact details, moderation appeals, applicable jurisdiction terms, and final retention commitments. Material changes must be clearly announced. These terms are a product-specific starting draft and require review for the actual operator, service, and launch regions.",
  },
];

export const legalVersion = "2026-09-19";
export interface LegalSection {
  title: string;
  body: string;
}

export const privacySections: LegalSection[] = [
  {
    title: "About this policy",
    body: "IoT is a free, not-for-profit learning project offering a technology library, knowledge assessments, and links to research papers. This policy explains the information needed to operate those features. For privacy questions or requests, contact Robert at robertjmonzingo@gmail.com.",
  },
  {
    title: "Five guest assessments and your IP address",
    body: "When the connected service checks your guest allowance, it uses the IP address of your connection to recognize returning visits and limit that network to five completed guest assessments. Our application stores a protected identifier derived from the IP address using a server-held secret, a completion count, up to five random assessment identifiers to prevent duplicate counting, and a temporary assessment reservation. The quota record does not store your raw IP address, answers, email, or browsing history. The derived identifier is still treated as personal information, not anonymous data. We use it only to administer the guest allowance and prevent resets from clearing browser storage. People on a shared network may share the allowance; changing networks or IP addresses may affect recognition.",
  },
  {
    title: "Guest record retention and deletion on registration",
    body: "The guest allowance does not reset on a new visit. We retain the derived IP identifier and completed-assessment count until you create an account or sign in and the deletion request succeeds, or we fulfill an applicable deletion request. A reservation stops blocking another assessment after 35 minutes; its expired value may remain until the next assessment or deletion. After successful account authentication, the app requests deletion of the guest quota record for your current network and any earlier records referenced by guest receipts saved in this browser. It then removes those receipts and the temporary attempt identifier from the browser. No guest IP identifier is added to your account. If deletion fails, the site shows a retry option and tries again on your next signed-in visit. We cannot identify earlier networks once their browser receipts have been cleared. This deletion covers our guest quota records; it does not erase IP addresses independently retained in hosting, authentication, security logs, or provider backups.",
  },
  {
    title: "Accounts and information you send us",
    body: "If you create an account, Google Firebase Authentication processes your email address, account identifier, credentials, and authentication/security information. Google sign-in can provide your name, email, and profile image to the authentication service. Passwords are handled by Firebase Authentication and are not stored in assessment progress or paper votes. If you email a paper submission, support question, or privacy request, we receive the message, your email address, and any information you include, and use them to respond or review the submission. Please do not include sensitive information that is unnecessary for your request.",
  },
  {
    title: "Browser storage and current data use",
    body: "Assessment scores, attempt history, topic retake locks, ELO values, and paper votes are currently saved in your browser. They are not uploaded as a global leaderboard or shared vote count by this interface. Necessary browser storage also supports sign-in, guest deletion receipts, and the current assessment attempt. Clearing this storage removes local progress but does not remove an account or the server guest allowance. The current library interface does not run optional usage analytics, advertising tracking, data sales, or AI training on your activity. We process only the information described here to provide these features, respond to requests, and protect the service; we do not claim that operating the site involves no data processing.",
  },
  {
    title: "Providers and external websites",
    body: "Hosting providers receive technical information when delivering the site. Google Firebase provides connected authentication, database, and server functions; App Check and reCAPTCHA, where configured, help protect those functions against abuse. Google Fonts receives network information when supplying the site’s typefaces. These providers may process information in countries other than yours and retain their own service and security records under their policies. Research papers and other external links open websites with their own privacy practices. Opening a paper in a new tab does not send your assessment results or account credentials to the paper’s website. Firebase’s privacy information is available at https://firebase.google.com/support/privacy and Google’s at https://policies.google.com/privacy.",
  },
  {
    title: "Your choices and requests",
    body: "You may browse without creating an account, sign out, or clear this site’s local browser data. Local progress remains until you clear it; signing out does not erase it. Authentication records remain until the account is deleted, subject to provider deletion and backup schedules. Contact robertjmonzingo@gmail.com to request access, correction, export, or deletion of information we control, including an account or guest record. We may need proportionate information to verify a request, but will never ask for your password. Applicable law may provide additional rights, including objection, restriction, portability, or a complaint to a privacy authority. We keep support correspondence only as needed to resolve the request and any applicable legal obligations.",
  },
  {
    title: "Age, security, and future changes",
    body: "Accounts are intended for people aged 18 or older. Contact us if you believe a child has provided personal information so we can investigate and remove it where appropriate. We use access controls and protected connections, but no online service can guarantee absolute security. If our features or data practices change, we will update this policy and its effective date, explain material changes before they take effect, and obtain consent where required. A future policy change is not blanket permission to reuse previously collected information for a new, incompatible purpose.",
  },
];

export const termsSections: LegalSection[] = [
  {
    title: "A free, not-for-profit learning project",
    body: "IoT provides a technology library, learning assessments, local progress tracking, and curated research-paper links for educational use. The project is operated on a not-for-profit basis and is currently free to use, including account creation. These terms apply to your use of the service. Questions and support requests can be sent to Robert at robertjmonzingo@gmail.com.",
  },
  {
    title: "Guest access and accounts",
    body: "Guests may complete up to five assessments per recognized network IP address. Returning visits and clearing browser storage do not renew that allowance on the connected service. Create a free account to continue beyond the guest allowance. Shared networks can share a limit, and an IP address does not uniquely identify a person. Accounts require you to be at least 18, provide an email you control, protect your credentials, and agree to these terms and the Privacy Policy. Do not impersonate others or use accounts, automated requests, or network changes to evade service limits. After authentication, we request deletion of our guest quota records as described in the Privacy Policy.",
  },
  {
    title: "Assessments and fair use",
    body: "Assessments normally contain 10 focused randomized questions with 20 seconds per question, a 10-minute overall limit, and a 70% passing score. A failed assessment locks that topic for five days in the current browser. Scores, ELO values, and retake history currently reflect local activity and are not independently verified credentials or a global ranking. Do not manipulate results, submit abusive traffic, interfere with other users, attempt unauthorized access, or introduce malicious code. We may restrict access reasonably to protect the service and its users; contact support if you believe a restriction is mistaken.",
  },
  {
    title: "Educational content and research papers",
    body: "Content and assessment answers may contain errors or become outdated. They are learning aids, not professional advice, certification, or a guarantee of competence. Verify important information with appropriate sources. Linked papers and third-party materials belong to their respective authors or rights holders and remain subject to their own licenses and terms. A link does not imply affiliation, endorsement, or ownership. Paper submissions are reviewed before publication; only submit links and descriptions you have the right to share.",
  },
  {
    title: "Privacy and current use of information",
    body: "We do not currently sell personal data, run advertising tracking, or use your assessment activity to train AI. Providing accounts, remembering local progress, enforcing the guest allowance, and handling messages does require limited information, as described in the Privacy Policy. Our not-for-profit purpose does not remove those responsibilities. These terms do not grant unrestricted permission to collect or use information in the future.",
  },
  {
    title: "Availability and responsibility",
    body: "The service is provided as available, without a promise of uninterrupted access, error-free content, or permanent storage of local progress. Features may change or be withdrawn, and you should retain your own copies of information you need. To the extent allowed by applicable law, we disclaim implied warranties and responsibility for indirect or consequential losses arising from use of the service. Nothing in these terms excludes liability or limits consumer or other rights that cannot lawfully be excluded or limited.",
  },
  {
    title: "Changes and ending your use",
    body: "You can stop using the service at any time and request account deletion through the contact above. If our purpose, features, charges, terms, or data practices change, we will publish updated terms and give clear notice of material changes before they take effect. Any future charges will be disclosed and require your agreement before you incur them. Changes to data use will follow the notice and consent commitments in the Privacy Policy and applicable law. These terms do not retroactively authorize a new use of information simply because we change this page.",
  },
];

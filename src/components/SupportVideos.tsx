import { useState } from "react";
import { screenSupporterName } from "../services/supporterName";
import {
  contributionCents,
  topicCreditSummary,
} from "../../shared/topic-credit-policy.js";
import "./support-videos.css";

function contributionLink() {
  const value = import.meta.env.VITE_VIDEO_SUPPORT_URL;
  if (!value) return "";
  try {
    const url = new URL(value);
    const hosts = [
      "buy.stripe.com",
      "checkout.stripe.com",
      "paypal.me",
      "www.paypal.com",
      "ko-fi.com",
      "www.gofundme.com",
      "gofund.me",
    ];
    return url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export default function SupportVideos() {
  const [alias, setAlias] = useState("");
  const [consent, setConsent] = useState(false);
  const [amount, setAmount] = useState("20");
  const cents = contributionCents(amount);
  const credit = cents === null ? null : topicCreditSummary(cents);
  const result = screenSupporterName(alias);
  const checkout = contributionLink();
  return (
    <section className="support-videos" aria-labelledby="support-title">
      <p className="support-eyebrow">
        YOU’VE REACHED THE END · HELP MAKE THE NEXT ONE
      </p>
      <h1 id="support-title">Keep the next minute free.</h1>
      <p className="support-intro">
        A small contribution helps turn another technology topic into a clear
        explanation anyone can watch.
      </p>
      <div className="support-cost">
        <strong>About $6</strong>
        <span>
          in animation API usage for one 59-second video, before narration,
          hosting, and payment fees. Actual costs vary.
        </span>
      </div>
      <p>
        Each video starts with 30 seconds of technical explanation, then uses 29
        seconds for a simple analogy and a practical use case. Your support
        helps fund the animation and narration that bring it to life.
      </p>
      <article className="support-shoutout">
        <h2>Help choose what gets explained next.</h2>
        <p>
          Each $6 of confirmed support gives you one topic selection. Only whole
          topics can be selected; any remainder carries toward your next
          selection.
        </p>
        <label htmlFor="support-amount">Contribution amount (USD)</label>
        <input
          id="support-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.currentTarget.value)}
          aria-describedby="credit-preview"
        />
        <p id="credit-preview" role="status">
          {credit
            ? `$${(cents! / 100).toFixed(2)} → ${credit.topics} topic ${credit.topics === 1 ? "selection" : "selections"}, with $${(credit.carryCents / 100).toFixed(2)} carried toward the next topic.`
            : "Enter an amount from $1 to $600, with at most two decimal places."}
        </p>
        <p className="support-small">
          This is a preview, not an account balance. Topic selection unlocks
          only after the payment provider confirms payment. Test payments never
          fund real video generation. Processing fees reduce the funds the
          project receives; the $6 topic-credit rate is based on your
          contribution amount.
        </p>
      </article>
      <article className="support-shoutout">
        <h2>A little thank-you, out loud.</h2>
        <p>
          Contributors can opt into a shoutout in a future video, after payment
          confirmation and name approval. For example:
        </p>
        <blockquote>“HTML in 1 minute. Thanks to sam1989.”</blockquote>
        <label htmlFor="supporter-alias">Preview a supporter alias</label>
        <input
          id="supporter-alias"
          value={alias}
          maxLength={20}
          autoComplete="off"
          placeholder="sam1989"
          onChange={(event) => {
            setAlias(event.currentTarget.value);
            setConsent(false);
          }}
          aria-describedby="alias-feedback"
        />
        <p id="alias-feedback" role="status">
          {alias
            ? result.reason
            : "Use an alias you are happy to have spoken publicly. This preview is not submitted or saved."}
        </p>
        {alias && result.accepted && (
          <p className="support-preview">
            Preview: “HTML in 1 minute. Thanks to {alias}.”
          </p>
        )}
        <label className="support-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={!result.accepted}
            onChange={(event) => setConsent(event.currentTarget.checked)}
          />
          I would like my approved alias spoken publicly in a future video.
        </label>
        <p className="support-small">
          Every name is reviewed for profanity, slurs, harassment,
          impersonation, and references to violent or extremist figures.
          Automated screening can miss things, so a human approval is required.
          If an alias is rejected, you can choose another or receive a generic
          thank-you. No name is sent to narration from this preview.
        </p>
      </article>
      {checkout ? (
        <a
          className="support-primary"
          href={checkout}
          target="_blank"
          rel="noopener noreferrer"
        >
          Contribute to the next video ↗
        </a>
      ) : (
        <>
          <button className="support-primary" disabled>
            Contributions aren’t open yet
          </button>
          <p className="support-small">
            The payment destination is being configured. This page currently
            accepts no money or supporter-name submissions.
          </p>
        </>
      )}
      <p className="support-small">
        Contributions support this independent educational project. They are
        optional; watching stays free. A contribution does not automatically add
        credits to Google Cloud.
      </p>
      <div className="support-links">
        <a href="#videos">Watch again</a>
        <a href="#library">Explore the free library</a>
      </div>
    </section>
  );
}

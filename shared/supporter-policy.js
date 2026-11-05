export function screenSupporterName(value) {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(value))
    return {
      accepted: false,
      reason:
        "Use 3–20 English letters, numbers, or underscores, starting with a letter.",
    };
  const folded = value
    .toLowerCase()
    .replace(
      /[0134578]/g,
      (character) =>
        ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b" })[character],
    )
    .replace(/[^a-z]/g, "");
  if (
    /fuck|shit|bitch|cunt|nigg|fagg|nazi|hitler|heilhitler|binladen|polpot|epstein|porn|rape|killall|whitepower|siegheil/.test(
      folded,
    )
  )
    return {
      accepted: false,
      reason:
        "Choose a different alias. This name cannot be used in an audio credit.",
    };
  return {
    accepted: true,
    reason:
      "Format check passed. Every name still needs a human review before recording.",
  };
}
// Use only server-verified payment records, never browser-submitted data.
export function approvedSupporterCredit(receipt) {
  if (
    !receipt ||
    receipt.paymentStatus !== "paid" ||
    !receipt.paymentEventId ||
    receipt.reviewStatus !== "approved" ||
    !receipt.reviewedBy ||
    !receipt.reviewedAt ||
    receipt.shoutoutConsent !== true
  )
    return "";
  if (!screenSupporterName(receipt.approvedAlias).accepted) return "";
  return `Thanks to ${receipt.approvedAlias}.`;
}

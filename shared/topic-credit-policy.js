export const TOPIC_CREDIT_CENTS = 600;
export function contributionCents(value) {
  if (typeof value !== "string" || !/^\d{1,4}(?:\.\d{1,2})?$/.test(value))
    return null;
  const [dollars, fraction = ""] = value.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 60000
    ? cents
    : null;
}
export function topicCreditSummary(balanceCents) {
  if (!Number.isSafeInteger(balanceCents) || balanceCents < 0)
    throw Error("Invalid topic credit balance.");
  return {
    topics: Math.floor(balanceCents / TOPIC_CREDIT_CENTS),
    carryCents: balanceCents % TOPIC_CREDIT_CENTS,
  };
}
// Use inside a server-side transaction against a verified balance. The client
// preview must never grant credit or authorize paid generation.
export function reserveTopicCredits(balanceCents, topicIds, availableTopicIds) {
  topicCreditSummary(balanceCents);
  if (
    !Array.isArray(topicIds) ||
    !topicIds.length ||
    topicIds.length > 100 ||
    new Set(topicIds).size !== topicIds.length
  )
    throw Error("Choose distinct topics.");
  if (
    topicIds.some((id) => typeof id !== "string" || !availableTopicIds.has(id))
  )
    throw Error("Choose available, unpublished topics.");
  const cost = topicIds.length * TOPIC_CREDIT_CENTS;
  if (cost > balanceCents) throw Error("Not enough confirmed topic credit.");
  return {
    remainingCents: balanceCents - cost,
    reservedTopicIds: [...topicIds],
  };
}

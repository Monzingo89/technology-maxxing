export const TOPIC_CREDIT_CENTS: number;
export function contributionCents(value: unknown): number | null;
export function topicCreditSummary(balanceCents: number): {
  topics: number;
  carryCents: number;
};
export function reserveTopicCredits(
  balanceCents: number,
  topicIds: string[],
  availableTopicIds: Set<string>,
): { remainingCents: number; reservedTopicIds: string[] };

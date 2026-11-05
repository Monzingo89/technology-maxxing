export function screenSupporterName(value: unknown): {
  accepted: boolean;
  reason: string;
};
export function approvedSupporterCredit(
  receipt: {
    paymentStatus?: string;
    paymentEventId?: string;
    reviewStatus?: string;
    reviewedBy?: string;
    reviewedAt?: unknown;
    shoutoutConsent?: boolean;
    approvedAlias?: string;
  } | null,
): string;

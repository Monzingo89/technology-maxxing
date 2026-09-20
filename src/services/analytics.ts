/** Opt-in, bounded product diagnostics. Never pass identity or user content here. */
export const analyticsEventNames = [
  "landing_view",
  "signup_started",
  "signup_completed",
  "login_completed",
  "onboarding_completed",
  "world_entered",
  "space_entered",
  "quiz_started",
  "quiz_completed",
  "lesson_opened",
  "lesson_completed",
  "team_requested",
  "team_accepted",
  "gallery_posted",
  "link_opened",
  "link_returned",
  "error",
] as const;
export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export interface AnalyticsFields {
  area?: string;
  category?: string;
  target?: string;
  durationMs?: number;
  value?: number;
}
export interface AnalyticsEvent extends AnalyticsFields {
  name: AnalyticsEventName;
  at: number;
}
export interface LinkInsight {
  target: string;
  opens: number;
  returns: number;
  quickReturns: number;
  quickReturnRate: number | null;
  medianDwellMs: number | null;
  confidence: "insufficient" | "directional";
  recommendation: string;
}
const CONSENT_KEY = "aispace:analytics-consent:v1";
const EVENTS_KEY = "aispace:analytics-events:v1";
const MAX_EVENTS = 500;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DWELL_MS = 24 * 60 * 60 * 1000;
const names = new Set<string>(analyticsEventNames);
const pendingLinks = new Map<string, number>();
let eventSink: ((event: AnalyticsEvent) => void) | undefined;
let returnListenerAttached = false;
let consentUnavailable = false;

// Only code-owned IDs, never a URL, email, username, error message, or prompt.
const safeId = (value: unknown): string | undefined =>
  typeof value === "string" && /^[a-z][a-z0-9_-]{0,63}$/.test(value)
    ? value
    : undefined;
const safeNumber = (value: unknown, maximum: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(Math.round(value), maximum)
    : undefined;

function cleanEvent(value: unknown): AnalyticsEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (typeof event.name !== "string" || !names.has(event.name)) return null;
  if (typeof event.at !== "number" || !Number.isFinite(event.at)) return null;
  if (event.at < Date.now() - RETENTION_MS || event.at > Date.now() + 60_000)
    return null;
  return {
    name: event.name as AnalyticsEventName,
    at: event.at,
    area: safeId(event.area),
    category: safeId(event.category),
    target: safeId(event.target),
    durationMs: safeNumber(event.durationMs, MAX_DWELL_MS),
    value: safeNumber(event.value, 1_000_000),
  };
}

export function getAnalyticsConsent(): boolean {
  if (consentUnavailable) return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

export function clearAnalytics(): void {
  pendingLinks.clear();
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* Storage may be disabled. */
  }
}

export function setAnalyticsConsent(enabled: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? "yes" : "no");
    consentUnavailable = false;
  } catch {
    consentUnavailable = true;
  }
  if (!enabled) clearAnalytics();
}

/** No collector is configured by default. Configure only after publishing its purpose/retention. */
export function configureAnalyticsSink(
  sink?: (event: AnalyticsEvent) => void,
): void {
  eventSink = sink;
}

function readEvents(): AnalyticsEvent[] {
  if (!getAnalyticsConsent()) return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    const events = raw
      .slice(-MAX_EVENTS)
      .map(cleanEvent)
      .filter((event): event is AnalyticsEvent => event !== null);
    // Reading also expires old entries rather than extending retention.
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return events;
  } catch {
    return [];
  }
}

export function trackEvent(
  name: AnalyticsEventName,
  fields: AnalyticsFields = {},
): void {
  if (!getAnalyticsConsent()) return;
  const event = cleanEvent({ ...fields, name, at: Date.now() });
  if (!event) return;
  try {
    localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify([...readEvents(), event].slice(-MAX_EVENTS)),
    );
  } catch {
    /* Nonessential. */
  }
  try {
    eventSink?.({ ...event });
  } catch {
    /* Telemetry never interrupts the product. */
  }
}

export function trackLinkOpen(targetId: string): void {
  const target = safeId(targetId);
  if (!target || !getAnalyticsConsent()) return;
  pendingLinks.set(target, Date.now());
  trackEvent("link_opened", { target });
  if (pendingLinks.size > 20)
    pendingLinks.delete(pendingLinks.keys().next().value!);
  if (!returnListenerAttached && typeof window !== "undefined") {
    returnListenerAttached = true;
    const onReturn = () => {
      if (document.visibilityState === "hidden") return;
      // Time until focus returns is a proxy: external pages cannot be observed here.
      for (const id of [...pendingLinks.keys()]) trackLinkReturn(id);
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
  }
}

export function trackLinkReturn(targetId: string): void {
  const openedAt = pendingLinks.get(targetId);
  if (openedAt === undefined) return;
  pendingLinks.delete(targetId);
  const durationMs = Date.now() - openedAt;
  if (durationMs >= 0 && durationMs <= MAX_DWELL_MS)
    trackEvent("link_returned", { target: targetId, durationMs });
}

export function getAnalyticsSummary(): {
  enabled: boolean;
  eventCount: number;
  eventsByName: Partial<Record<AnalyticsEventName, number>>;
  links: LinkInsight[];
} {
  const events = readEvents();
  const eventsByName: Partial<Record<AnalyticsEventName, number>> = {};
  const links = new Map<string, { opens: number; durations: number[] }>();
  for (const event of events) {
    eventsByName[event.name] = (eventsByName[event.name] ?? 0) + 1;
    if (!event.target || !["link_opened", "link_returned"].includes(event.name))
      continue;
    const link = links.get(event.target) ?? { opens: 0, durations: [] };
    if (event.name === "link_opened") link.opens++;
    if (event.name === "link_returned" && event.durationMs !== undefined)
      link.durations.push(event.durationMs);
    links.set(event.target, link);
  }
  return {
    enabled: getAnalyticsConsent(),
    eventCount: events.length,
    eventsByName,
    links: [...links]
      .map(([target, { opens, durations }]) => {
        durations.sort((a, b) => a - b);
        const returns = durations.length;
        const quickReturns = durations.filter((ms) => ms < 10_000).length;
        const rate = returns ? quickReturns / returns : null;
        const confidence = returns >= 30 ? "directional" : "insufficient";
        const middle = Math.floor(returns / 2);
        return {
          target,
          opens,
          returns,
          quickReturns,
          quickReturnRate: rate,
          medianDwellMs: returns
            ? returns % 2
              ? durations[middle]
              : (durations[middle - 1] + durations[middle]) / 2
            : null,
          confidence,
          recommendation:
            confidence === "insufficient"
              ? "Collect at least 30 observed returns. These local events do not represent all visitors."
              : rate !== null && rate >= 0.8
                ? "Review the destination, speed, and link promise; test an improved label or page. A quick return can still mean success. Do not remove automatically."
                : "No strong quick-return signal. Compare task completion and feedback before making a change.",
        } satisfies LinkInsight;
      })
      .sort((a, b) => b.opens - a.opens),
  };
}

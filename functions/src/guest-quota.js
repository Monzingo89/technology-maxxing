import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const GUEST_LIMIT = 5;
export const RESERVATION_MS = 35 * 60_000;
export class GuestQuotaError extends Error {
  constructor(code, message, reason) {
    super(message);
    this.code = code;
    this.details = { reason };
  }
}

export function normalizeIp(value) {
  if (typeof value !== "string" || value.includes("%") || !isIP(value.trim()))
    throw new GuestQuotaError(
      "unavailable",
      "Guest assessment access could not be checked.",
      "missing-ip",
    );
  const ip = value.trim();
  if (isIP(ip) === 4) return ip;
  const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const mapped = normalized.match(/^::ffff:([a-f\d]+):([a-f\d]+)$/);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16),
    low = parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

export function requestIp(request, emulator = false) {
  // Direct v2 callable endpoints only: the managed ingress appends its peer.
  // Never trust an arbitrary leftmost X-Forwarded-For value supplied by a client.
  // Revalidate this trust boundary before adding a CDN/Hosting/LB proxy.
  // The Functions emulator serializes requests without a socket. All emulator
  // callers intentionally share loopback; no forwarded header is trusted there.
  if (emulator)
    return normalizeIp(request.socket?.remoteAddress || "127.0.0.1");
  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded !== "string") return normalizeIp(undefined);
  return normalizeIp(forwarded.split(",").at(-1));
}

export function createGuestQuota({ db, secret, now = Date.now }) {
  if (typeof secret !== "string" || secret.length < 32)
    throw new GuestQuotaError(
      "unavailable",
      "Guest assessment access is not configured yet.",
      "configuration",
    );
  const sign = (text) =>
    createHmac("sha256", secret).update(text).digest("hex");
  const keyFor = (ip) => sign(`guest-ip:v1:${normalizeIp(ip)}`);
  const ref = (key) => db.collection("guestAllowances").doc(key);
  const receiptFor = (key, generation) => {
    const payload = `v1.${key}.${generation}`;
    return `${payload}.${sign(`receipt:${payload}`)}`;
  };
  const parseReceipt = (receipt) => {
    if (typeof receipt !== "string" || receipt.length > 220) return null;
    const parts = receipt.split(".");
    if (
      parts.length !== 4 ||
      parts[0] !== "v1" ||
      !/^[a-f\d]{64}$/.test(parts[1]) ||
      !/^[a-f\d-]{36}$/.test(parts[2]) ||
      !/^[a-f\d]{64}$/.test(parts[3])
    )
      return null;
    const expected = sign(`receipt:${parts.slice(0, 3).join(".")}`);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts[3]))
      ? { key: parts[1], generation: parts[2] }
      : null;
  };
  const status = (key, record) => ({
    completed: record.completed.length,
    remaining: Math.max(0, GUEST_LIMIT - record.completed.length),
    receipt: receiptFor(key, record.generation),
  });
  const validAttempt = (id) => {
    if (
      typeof id !== "string" ||
      !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
        id,
      )
    )
      throw new GuestQuotaError(
        "invalid-argument",
        "Start a new assessment.",
        "invalid-attempt",
      );
  };
  async function access(ip, operation, attemptId, receipt) {
    if (operation !== "status") validAttempt(attemptId);
    const previous = operation === "complete" ? parseReceipt(receipt) : null;
    const key = previous?.key || keyFor(ip);
    const target = ref(key);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(target);
      const record = snapshot.data() || {
        generation: randomUUID(),
        completed: [],
        active: null,
      };
      if (
        operation === "complete" &&
        (!snapshot.exists ||
          (previous && previous.generation !== record.generation))
      )
        throw new GuestQuotaError(
          "failed-precondition",
          "This guest assessment is no longer active. Please sign in to continue.",
          "expired-attempt",
        );
      if (operation === "complete" && record.completed.includes(attemptId))
        return status(key, record);
      if (operation !== "status" && record.completed.length >= GUEST_LIMIT)
        throw new GuestQuotaError(
          "resource-exhausted",
          "Your five guest assessments are complete. Create a free account to continue.",
          "guest-limit",
        );
      if (operation === "start") {
        if (record.completed.includes(attemptId))
          throw new GuestQuotaError(
            "already-exists",
            "This assessment has already been completed.",
            "completed-attempt",
          );
        if (
          record.active &&
          record.active.expiresAt > now() &&
          record.active.id !== attemptId
        )
          throw new GuestQuotaError(
            "resource-exhausted",
            "A guest assessment is already open on this network. Finish it or try again after 35 minutes.",
            "active-assessment",
          );
        if (
          !record.active ||
          record.active.id !== attemptId ||
          record.active.expiresAt <= now()
        )
          record.active = { id: attemptId, expiresAt: now() + RESERVATION_MS };
      }
      if (operation === "complete") {
        if (record.active?.id !== attemptId || record.active.expiresAt <= now())
          throw new GuestQuotaError(
            "failed-precondition",
            "This assessment has expired. Start another assessment.",
            "expired-attempt",
          );
        record.completed.push(attemptId);
        record.active = null;
      }
      if (operation !== "status" || !snapshot.exists) tx.set(target, record);
      return {
        ...status(key, record),
        ...(operation === "start" ? { attemptId } : {}),
      };
    });
  }
  return {
    get: (ip) => access(ip, "status"),
    start: (ip, attemptId) => access(ip, "start", attemptId),
    complete: (ip, attemptId, receipt) =>
      access(ip, "complete", attemptId, receipt),
    async clear(ip, receipt, auth, getUser) {
      if (!auth?.uid)
        throw new GuestQuotaError(
          "unauthenticated",
          "Sign in to remove your guest record.",
          "sign-in-required",
        );
      const account = await getUser(auth.uid);
      if (account.disabled)
        throw new GuestQuotaError(
          "permission-denied",
          "This account is unavailable.",
          "disabled-account",
        );
      const key = keyFor(ip),
        previous = parseReceipt(receipt);
      await db.runTransaction(async (tx) => {
        // Read before writes; receipts cannot delete a later visitor's generation.
        const oldRef =
          previous && previous.key !== key ? ref(previous.key) : null;
        const old = oldRef ? await tx.get(oldRef) : null;
        tx.delete(ref(key));
        if (oldRef && old.data()?.generation === previous.generation)
          tx.delete(oldRef);
      });
      return { cleared: true };
    },
  };
}

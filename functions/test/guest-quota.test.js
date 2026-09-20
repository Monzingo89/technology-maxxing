import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createGuestQuota,
  normalizeIp,
  requestIp,
  RESERVATION_MS,
} from "../src/guest-quota.js";

const secret = "guest-quota-test-only-key-at-least-32-characters";
const ip = "203.0.113.8";
function fixture() {
  const records = new Map();
  let queue = Promise.resolve(),
    clock = 1_800_000_000_000;
  const db = {
    collection: (name) => ({ doc: (id) => `${name}/${id}` }),
    runTransaction(action) {
      const run = queue.then(async () => {
        const next = new Map(structuredClone([...records]));
        const result = await action({
          get: async (id) => ({
            exists: next.has(id),
            data: () => structuredClone(next.get(id)),
          }),
          set: (id, value) => next.set(id, structuredClone(value)),
          delete: (id) => next.delete(id),
        });
        records.clear();
        for (const [key, value] of next) records.set(key, value);
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return {
    records,
    db,
    quota: createGuestQuota({ db, secret, now: () => clock }),
    advance: (ms) => {
      clock += ms;
    },
  };
}
const enabledUser = async (uid) => ({
  uid,
  disabled: false,
  emailVerified: false,
});

test("normalizes IPv6 and mapped IPv4; ignores spoofed leftmost forwarded addresses", () => {
  assert.equal(normalizeIp("2001:0DB8:0000::1"), "2001:db8::1");
  assert.equal(normalizeIp("::ffff:203.0.113.8"), ip);
  assert.equal(normalizeIp("::ffff:cb00:7108"), ip);
  assert.equal(
    requestIp({ headers: { "x-forwarded-for": `198.51.100.9, ${ip}` } }),
    ip,
  );
  assert.equal(
    requestIp(
      {
        headers: { "x-forwarded-for": "evil" },
        socket: { remoteAddress: "::1" },
      },
      true,
    ),
    "::1",
  );
  assert.throws(() => requestIp({ headers: {} }), /could not be checked/);
  assert.throws(() => normalizeIp("fe80::1%eth0"));
  assert.throws(() => normalizeIp("not-an-ip"));
});

test("server key is mandatory; identifiers and records do not contain raw IP or identity", async () => {
  assert.throws(
    () => createGuestQuota({ db: {}, secret: "" }),
    /not configured/,
  );
  const { quota, records } = fixture();
  const status = await quota.get(ip);
  assert.equal(status.remaining, 5);
  assert.equal(JSON.stringify([...records]).includes(ip), false);
  assert.equal(status.receipt.includes(ip), false);
  assert.deepEqual(Object.keys([...records.values()][0]).sort(), [
    "active",
    "completed",
    "generation",
  ]);
});

test("five completions survive a new client and do not reset with time or cleared storage", async () => {
  const { quota, db, advance } = fixture();
  for (let i = 1; i <= 5; i++) {
    const id = randomUUID();
    const started = await quota.start(ip, id);
    assert.equal(started.completed, i - 1);
    assert.equal((await quota.complete(ip, id, started.receipt)).completed, i);
  }
  advance(365 * 24 * 60 * 60_000);
  const returning = createGuestQuota({ db, secret });
  assert.equal((await returning.get(ip)).remaining, 0);
  await assert.rejects(
    returning.start(ip, randomUUID()),
    (e) => e.details.reason === "guest-limit",
  );
});

test("competing tabs reserve one attempt and retries never count twice", async () => {
  const { quota } = fixture();
  const ids = [randomUUID(), randomUUID()];
  const starts = await Promise.allSettled(ids.map((id) => quota.start(ip, id)));
  assert.equal(starts.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(starts[1].reason.details.reason, "active-assessment");
  const status = starts[0].value;
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      quota.complete(ip, ids[0], status.receipt),
    ),
  );
  assert.ok(results.every((result) => result.completed === 1));
  assert.equal((await quota.get(ip)).completed, 1);
});

test("abandoning a reservation consumes nothing and expired completions cannot count", async () => {
  const { quota, advance } = fixture();
  const first = randomUUID(),
    second = randomUUID();
  const status = await quota.start(ip, first);
  advance(RESERVATION_MS + 1);
  await assert.rejects(
    quota.complete(ip, first, status.receipt),
    (e) => e.details.reason === "expired-attempt",
  );
  assert.equal((await quota.start(ip, second)).remaining, 5);
});

test("failed completion and invalid IDs leave the quota unchanged", async () => {
  const { quota } = fixture();
  const status = await quota.get(ip);
  await assert.rejects(
    quota.start(ip, "../../other"),
    (e) => e.code === "invalid-argument",
  );
  await assert.rejects(
    quota.complete(ip, randomUUID(), status.receipt),
    (e) => e.details.reason === "expired-attempt",
  );
  assert.equal((await quota.get(ip)).completed, 0);
});

test("account creation removes guest records even before email verification", async () => {
  const { quota, records } = fixture();
  const original = await quota.get(ip);
  await quota.get("198.51.100.7");
  await quota.clear(
    "198.51.100.7",
    original.receipt,
    { uid: "new-account" },
    enabledUser,
  );
  assert.equal(records.size, 0);
});

test("anonymous, disabled, deleted and failed sign-ins cannot delete records", async () => {
  const { quota, records } = fixture();
  const status = await quota.get(ip);
  await assert.rejects(
    quota.clear(ip, status.receipt, null, enabledUser),
    (e) => e.code === "unauthenticated",
  );
  await assert.rejects(
    quota.clear(ip, status.receipt, { uid: "disabled" }, async () => ({
      disabled: true,
    })),
    (e) => e.code === "permission-denied",
  );
  await assert.rejects(
    quota.clear(ip, status.receipt, { uid: "deleted" }, async () => {
      throw new Error("Account does not exist");
    }),
  );
  assert.equal(records.size, 1);
});

test("forged and stale receipts cannot remove another generation or network", async () => {
  const { quota, records } = fixture();
  const original = await quota.get(ip);
  await quota.clear(
    "198.51.100.7",
    original.receipt.slice(0, -1) + "z",
    { uid: "user" },
    enabledUser,
  );
  assert.equal(records.size, 1);
  await quota.clear(ip, original.receipt, { uid: "user" }, enabledUser);
  const next = await quota.get(ip);
  assert.notEqual(next.receipt, original.receipt);
  await quota.clear(
    "198.51.100.7",
    original.receipt,
    { uid: "user" },
    enabledUser,
  );
  assert.equal(records.size, 1);
});

test("an in-flight completion cannot recreate a guest record after account cleanup", async () => {
  const { quota, records } = fixture();
  const attempt = randomUUID();
  const status = await quota.start(ip, attempt);
  await quota.clear(ip, status.receipt, { uid: "user" }, enabledUser);
  await assert.rejects(
    quota.complete(ip, attempt, status.receipt),
    (e) => e.details.reason === "expired-attempt",
  );
  assert.equal(records.size, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  videoReservation,
  retryAfterMs,
  googleRateControls,
  GOOGLE_WINDOW_MS,
} from "../src/video-rate-limit.js";
test("a whole video has an exclusive spend window, including crash allowance", () => {
  const slot = videoReservation(null, 1000, "job1");
  assert.equal(slot.reservedUsd, 7.5);
  assert.throws(
    () => videoReservation(slot, slot.nextStartAt - 1, "job2"),
    (error) => error.retryAt === slot.nextStartAt,
  );
  assert.equal(videoReservation(slot, slot.nextStartAt, "job2").jobId, "job2");
});
test("Retry-After supports seconds and HTTP dates without negative delays", () => {
  assert.equal(retryAfterMs("30"), 30000);
  assert.equal(
    retryAfterMs(
      "Thu, 05 Nov 2026 16:00:00 GMT",
      Date.parse("2026-11-05T15:59:00Z"),
    ),
    60000,
  );
  assert.equal(retryAfterMs("invalid"), 0);
});
test("requests share one-minute pacing; 429s drain the ten-minute spend window", async () => {
  let time = 1000;
  let data = videoReservation(null, time, "job1");
  const sleeps = [];
  const ref = {};
  const db = {
    collection: () => ({ doc: () => ref }),
    runTransaction: async (fn) =>
      fn({
        get: async () => ({ data: () => data }),
        set: (_ref, value) => {
          data = { ...data, ...value };
        },
      }),
  };
  const controls = googleRateControls(db, "job1", async () => {}, {
    now: () => time,
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
  });
  await controls.beforeGoogleRequest();
  await controls.beforeGoogleRequest();
  assert.deepEqual(sleeps, [60000]);
  await controls.finish({ status: 429, retryAfterMs: 30000 });
  assert.equal(data.nextStartAt, time + GOOGLE_WINDOW_MS);
  assert.throws(() => videoReservation(data, time, "job2"));
  data.jobId = "someone-else";
  await assert.rejects(controls.beforeGoogleRequest(), /reservation was lost/);
});

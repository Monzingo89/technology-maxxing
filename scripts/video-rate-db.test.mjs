import test from "node:test";
import assert from "node:assert/strict";
import { videoRateDb } from "./video-rate-db.mjs";
test("REST pacing preserves numeric spend and atomic preconditions", async () => {
  let commit;
  const db = videoRateDb({}, async (url, options) => {
    if (url.endsWith(":commit")) {
      commit = JSON.parse(options.body);
      return Response.json({ writeResults: [] });
    }
    return Response.json({ fields: { reservedUsd: { doubleValue: 7.5 } }, updateTime: "2026-11-05T00:00:00Z" });
  });
  const ref = db.collection("videoProviderBudgets").doc("google-video");
  await db.runTransaction(async tx => {
    assert.equal((await tx.get(ref)).data().reservedUsd, 7.5);
    tx.set(ref, { reservedUsd: 7.5, nextStartAt: 600000 }, { merge: true });
  });
  assert.deepEqual(commit.writes[0].update.fields.reservedUsd, { doubleValue: 7.5 });
  assert.deepEqual(commit.writes[0].currentDocument, { updateTime: "2026-11-05T00:00:00Z" });
  assert.throws(() => db.collection("accounts"));
});
test("inaccessible pacing storage fails closed without sending provider calls", async () => {
  const db = videoRateDb({}, async () => new Response(null, { status: 403 }));
  let ran = false;
  await assert.rejects(db.runTransaction(async () => { ran = true; }), /Pacing read failed/);
  assert.equal(ran, false);
});

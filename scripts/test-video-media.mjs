import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  generateVideo,
  normalizeUpload,
  probe,
  render,
} from "../functions/src/video-media.js";
const dir = await mkdtemp(path.join(tmpdir(), "video-media-test-"));
const originalFetch = globalThis.fetch;
try {
  const input = path.join(dir, "fixture.mp4"),
    audio = path.join(dir, "fixture.mp3");
  await render([
    "-f",
    "lavfi",
    "-i",
    "color=c=navy:s=180x320:r=30:d=1",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    input,
  ]);
  await render(["-f", "lavfi", "-i", "sine=frequency=440:duration=2", audio]);
  await assert.rejects(
    normalizeUpload(input, path.join(dir, "bad.mp4")),
    /30 seconds/,
  );
  let videoCalls = 0,
    voiceCalls = 0;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    if (url.includes("generativelanguage")) {
      videoCalls++;
      assert.equal(body.response_format.aspect_ratio, "9:16");
      return new Response(
        JSON.stringify({
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "video",
                  mime_type: "video/mp4",
                  data: (await readFile(input)).toString("base64"),
                },
              ],
            },
          ],
        }),
      );
    }
    voiceCalls++;
    assert.ok(String(url).includes("/v1/text-to-dialogue?"));
    assert.equal(body.model_id, "eleven_v4");
    assert.ok(body.inputs[0].text.length > 30);
    assert.ok(body.inputs[0].voice_id);
    return new Response(await readFile(audio));
  };
  const result = await generateVideo({ id: "react", name: "React" }, dir, {
    gemini: "test-only",
    eleven: "test-only",
  });
  const info = await probe(result.output);
  assert.ok(Math.abs(Number(info.format.duration) - 30) < 0.2);
  assert.equal(info.streams.find((s) => s.codec_type === "video").width, 720);
  assert.equal(info.streams.find((s) => s.codec_type === "video").height, 1280);
  assert.equal(videoCalls, 3);
  assert.equal(voiceCalls, 3);
  assert.ok(result.captions.includes("00:00:20.000 --> 00:00:30.000"));
  await normalizeUpload(result.output, path.join(dir, "normalized.mp4"));
  assert.ok(
    Math.abs(
      Number((await probe(path.join(dir, "normalized.mp4"))).format.duration) -
        30,
    ) < 0.2,
  );
  console.log(
    "Media pipeline passed: mocked providers, three narrated scenes, portrait MP4, captions, 30-second duration, valid upload normalization, invalid duration rejection. No paid calls made.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await rm(dir, { recursive: true, force: true });
}

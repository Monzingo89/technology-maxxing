// Component integration fixture served only by Playwright against the Vite dev server.
// It never enters the production bundle or bypasses production authentication.
import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
let dir: string, media: Buffer;
test.beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "feed-playback-test-"));
  const file = join(dir, "sample.mp4");
  await promisify(execFile)(require("ffmpeg-static"), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=navy:s=180x320:r=30:d=3",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=3",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    file,
  ]);
  media = await readFile(file);
});
test.afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});
for (const reduced of [false, true])
  for (const signedIn of [false, true])
    test(`feed playback, captions and pagination (reduced motion: ${reduced}, signed in: ${signedIn})`, async ({
      page,
    }) => {
      page.on("pageerror", (error) => console.error(error.message));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      await page.addInitScript(() => {
        const play = HTMLMediaElement.prototype.play;
        let interacted = false;
        document.addEventListener(
          "click",
          () => {
            interacted = true;
          },
          true,
        );
        HTMLMediaElement.prototype.play = function () {
          if (!interacted)
            return Promise.reject(
              new DOMException("Gesture required", "NotAllowedError"),
            );
          return play.call(this);
        };
      });
      await page.route("**/src/services/firebase.ts", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export const app=null; export const functions=null; export const db={};",
        }),
      );
      await page.route("**/src/components/VideoFeed.tsx", async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(
          /from "[^"]*firebase_firestore[^\"]*"/g,
          'from "/__video-firestore.js"',
        );
        await route.fulfill({ response, body });
      });
      await page.route("**/__video-firestore.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: `
    export const collection=()=>({});export const orderBy=()=>({});export const limit=n=>({count:n});
    export const query=(...args)=>args.find(a=>a.count);
    export function onSnapshot(q,cb){cb({docs:Array.from({length:Math.min(q.count,7)},(_,i)=>({data:()=>({topicId:'topic-'+i,title:'Test topic '+i,category:'Test fixture',url:'/__sample.mp4',script:'Test transcript',captions:'WEBVTT\\n\\n00:00:00.000 --> 00:00:03.000\\nTest caption\\n',generated:true,duration:30})}))});return()=>{};}
  `,
        }),
      );
      await page.route("**/__sample.mp4", (route) =>
        route.fulfill({ contentType: "video/mp4", body: media }),
      );
      await page.route("**/__video-component.html", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
    const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {default:VideoFeed}=await import('/src/components/VideoFeed.tsx');document.body.classList.add('video-mode');ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(VideoFeed,{owner:false,jobs:[],signedIn:${signedIn},onFeedEnd:()=>{location.hash=${signedIn ? "'library'" : "'home'"};}}));
    </script></body></html>`,
        }),
      );
      await page.goto("/__video-component.html");
      const first = page.locator(".video-slide").nth(0),
        second = page.locator(".video-slide").nth(1);
      await expect(page.locator(".video-slide")).toHaveCount(6);
      const bounds = await page.locator(".video-feed").boundingBox();
      expect(bounds?.x).toBe(0);
      expect(bounds?.y).toBe(0);
      expect(bounds?.width).toBe(390);
      expect(bounds?.height).toBe(844);
      {
        await expect(
          first.getByRole("button", {
            name: "Play Test topic 0 video",
            exact: true,
          }),
        ).toBeVisible();
        expect(
          await first
            .locator("video")
            .evaluate((v: HTMLVideoElement) => v.paused),
        ).toBe(true);
        await first
          .getByRole("button", { name: "Play Test topic 0 video", exact: true })
          .click();
      }
      await expect
        .poll(() =>
          first
            .locator("video")
            .evaluate((v: HTMLVideoElement) => v.currentTime),
        )
        .toBeGreaterThan(0);
      await expect(
        first.getByRole("button", { name: /^(Sound on|Mute|Play|Pause)$/ }),
      ).toHaveCount(0);
      await expect
        .poll(() =>
          first.locator("video").evaluate((v: HTMLVideoElement) => v.muted),
        )
        .toBe(false);
      await expect
        .poll(() =>
          first
            .locator("progress")
            .evaluate((p: HTMLProgressElement) => p.value),
        )
        .toBeGreaterThan(0);
      await first
        .getByRole("button", { name: "Pause Test topic 0 video", exact: true })
        .click();
      await expect
        .poll(() =>
          first.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
        )
        .toBe(true);
      await expect(first.locator("track")).toHaveAttribute("src", /^blob:/);
      await first
        .getByRole("button", { name: "Play Test topic 0 video" })
        .press("Space");
      await expect
        .poll(() =>
          first.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
        )
        .toBe(false);
      await first.getByLabel("Read transcript", { exact: true }).click();
      await expect(
        first.getByText("Test transcript", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(() =>
          first.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
        )
        .toBe(false);
      await second.scrollIntoViewIfNeeded();
      if (reduced)
        await second
          .getByRole("button", { name: "Play Test topic 1 video", exact: true })
          .click();
      await expect
        .poll(() =>
          second
            .locator("video")
            .evaluate((v: HTMLVideoElement) => v.currentTime),
        )
        .toBeGreaterThan(0);
      await expect(first.locator("video")).not.toHaveAttribute("src", /sample/);
      expect(
        await second
          .locator("video")
          .evaluate((v: HTMLVideoElement) => v.muted),
      ).toBe(false);
      expect(new URL(page.url()).hash).toBe("");
      await page.locator(".video-feed").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(page.locator(".video-slide")).toHaveCount(7);
      await page.locator(".video-feed").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      if (signedIn) {
        await expect(
          page.getByText("You’re caught up.", { exact: false }),
        ).toBeVisible();
        await expect(page).toHaveURL(/#library$/);
      } else {
        await expect(page).toHaveURL(/#home$/);
      }
    });

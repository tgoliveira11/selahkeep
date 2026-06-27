// Copies the self-hosted ffmpeg.wasm core (ESM) into public/ffmpeg/ so the
// audio-upload fallback decoder can load it same-origin (no CDN, CSP-clean, and
// out of reach of Turbopack's bundler). Runs on install and before dev/build.
// The 32 MB wasm is regenerated here rather than committed to git.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const FILES = [
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js", "public/ffmpeg/ffmpeg-core.js"],
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm", "public/ffmpeg/ffmpeg-core.wasm"],
];

let copied = 0;
for (const [src, dest] of FILES) {
  if (!existsSync(src)) {
    console.warn(`[copy-ffmpeg] source missing (skipped): ${src}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  copied += 1;
}
console.log(`[copy-ffmpeg] copied ${copied}/${FILES.length} file(s) into public/ffmpeg/`);

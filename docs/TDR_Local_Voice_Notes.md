# TDR — Local (On-Device) Voice Notes

> Product: **SelahKeep** (former working name: LTG Vault). This TDR designs **Feature 2 — note creation by voice**, transcribed **entirely on the client**, in **English, Portuguese, and Spanish**, with no user audio or transcript ever sent to any API in plaintext.

## 1. Status

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-21 |
| **Decision type** | Product / Architecture / Security / Privacy |
| **Related** | [`docs/TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md), [`docs/EDITOR_IMPLEMENTATION_DECISION.md`](./EDITOR_IMPLEMENTATION_DECISION.md), [`SECURITY.md`](../SECURITY.md), [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./THREAT_MODEL_Private_Letters_Vault.md) |

---

## 2. Executive Summary

SelahKeep's promise is that private content is protected on the device and that "our systems are designed so our team does not have access" to it. Voice capture must uphold that promise: **the microphone audio and the resulting transcript are private note content** and therefore must be treated exactly like a typed note body — they must never leave the browser in plaintext.

This feature lets a user **dictate a note**. Speech is transcribed **on-device**, the transcript is inserted into the normal note editor, and from that point the note follows the existing encrypted-note flow (encrypted client-side, stored as `enc-v1` payloads). The user chooses the spoken language: **English, Portuguese, or Spanish**.

### Hard constraint

> Transcription runs in the client. No user audio and no transcript is transmitted to any server, API, or third party in plaintext at any point.

---

## 3. Engine decision

### 3.1 Why not the Web Speech API

The browser `SpeechRecognition` / `webkitSpeechRecognition` API is the "easy" path, but in the dominant implementation (Chrome / Chromium) it **streams the microphone audio to Google's servers** for recognition. That is a network transmission of raw private content and **directly violates the hard constraint**. It is therefore **rejected** and must not be used for note content.

### 3.2 Decision: Whisper via `@huggingface/transformers` (transformers.js)

On-device automatic speech recognition using OpenAI **Whisper** models executed through **transformers.js** (`@huggingface/transformers` v3) on **ONNX Runtime Web** (WebAssembly, with optional WebGPU acceleration).

| Property | Value |
|----------|-------|
| Library | `@huggingface/transformers` (pinned `^3.8.1`) |
| Pipeline | `automatic-speech-recognition` |
| Default model | `Xenova/whisper-base` (multilingual) with fallback option `Xenova/whisper-tiny` for low-end devices |
| Languages | English (`en`), Portuguese (`pt`), Spanish (`es`) — Whisper multilingual |
| Execution | Web Worker; WASM by default, WebGPU when available |
| Network | **Only** model weights are fetched (once, then cached by the browser). **No audio, no transcript, leaves the device.** |

**What crosses the network:** only the model **weights** (public, content-free `.onnx`/config files), downloaded from the configured model host on first use and then served from the browser cache / Cache Storage. Weights are not user data. This is documented to the user.

**What never crosses the network:** the microphone stream and the transcript. Inference is a pure local computation on the downloaded model.

### 3.3 Trade-offs (accepted)

- **First-use download**: ~40 MB (tiny) to ~150 MB (base). Mitigated by: lazy load only when the user opens voice capture; cache after first download; a clear "preparing speech model (one-time download)" progress state; model-size choice.
- **CPU/latency on low-end mobile**: Whisper base in WASM can be slow. Mitigated by WebGPU when available, the tiny-model option, and recording-then-transcribing (not streaming) so the UI stays responsive.
- **Bundle/SSR safety**: the library is **dynamically imported inside a Web Worker** and never at module top level, so it does not affect SSR, the main bundle's critical path, the build, or the test runner.

---

## 4. User experience

Entry point: **`/notes/new`** (and reusable in the editor). A discreet **"Dictate"** (microphone) control opens a voice-capture panel:

1. **Language selector** — English / Português / Español (persisted as a non-sensitive UI preference in `localStorage`, key `selahkeep:voice:lang`; the value is a language code, never content).
2. **Record / Stop** — uses `navigator.mediaDevices.getUserMedia({ audio: true })`; audio is captured **continuously** as raw PCM via the Web Audio API on a dedicated **AudioWorklet** (`public/worklets/audio-capture-worklet.js`, registered as `audio-capture`), so capture runs on the audio thread (off the main thread). Frames are buffered in ~2048-sample chunks and posted to the hook; held in memory only.
3. **Near real-time transcription.** While recording, the accumulated audio is re-transcribed on-device on a short interval (~2.5s) and a **live transcript** is shown as it grows. Re-transcribing the whole buffer each pass yields stable cumulative text (no chunk-stitching artifacts); passes are serialized so the cadence self-throttles to the device's speed. On **Stop**, a final pass runs over the full buffer. Nothing is uploaded.
4. After the final pass the transcript appears in a **review textarea** the user can edit, then **Insert** appends it into the note body (at the cursor / end), or **Discard**.
5. The captured audio (PCM chunks + `AudioContext`) is released from memory immediately on Stop/cancel/unmount. The transcript lives only in React state until inserted, then follows the normal encrypted-note path.

Accessibility: the control is keyboard reachable, has `aria-pressed`/`aria-live` status, and never auto-submits the note. Permission denial, unsupported-browser, and model-load failures show calm, specific guidance and fall back to typing.

The privacy notice on the page is extended: *"Voice is transcribed on your device. Your audio and words are never uploaded."*

---

## 5. Architecture

```text
/notes/new  (and editor)
  └─ VoiceCapturePanel            src/features/voice/voice-capture-panel.tsx   (UI, opt-in, lazy)
        └─ useVoiceTranscription  src/features/voice/use-voice-transcription.ts (continuous PCM capture + incremental worker passes)
              └─ Web Worker       src/features/voice/transcription.worker.ts
                    └─ dynamic import("@huggingface/transformers") → ASR pipeline (local)
        └─ language config        src/lib/voice/voice-languages.ts             (pure, tested)
        └─ audio helpers          src/lib/voice/audio-pcm.ts                   (pure, tested)
        └─ transcript cleanup     src/lib/voice/transcript-format.ts           (pure, tested)
```

- **Pure, testable logic** lives in `src/lib/voice/**`: supported-language list + validation, audio resample/mono-mixdown to 16 kHz Float32, and transcript normalization (trim, collapse whitespace, capitalize). These are unit-tested without the model.
- **Heavy, browser-only logic** (model + mic) lives in `src/features/voice/**` and the worker, dynamically imported, mocked in tests. `src/features/voice/**` is intentionally **outside** the enforced coverage scope (like other `src/features/*` UI), so the heavy worker code does not distort coverage; its pure dependencies are tested.
- **No new API routes, no new DB columns, no server code.** The note that results from dictation is saved through the **existing** `POST /api/notes` encrypted flow — there is literally no server-side awareness that a note originated from voice.
- **App-wide singleton worker + background warm-up** (`src/features/voice/transcription-worker-client.ts`): the Whisper worker is created once and shared (a single `onmessage` fans out to subscribers). `VoiceWarmup` (mounted in the authenticated `(vault)` layout) schedules `warmUpTranscription()` during browser idle time, which downloads the weights and initializes the pipeline ahead of first use. Warm-up is gated: skipped when voice is disabled, the browser lacks `Worker`/`AudioWorkletNode`/`getUserMedia`, or the connection reports `saveData`/2g. The dictation panel reuses the same (warm) worker, so first dictation is instant; the worker is intentionally **not** terminated on panel unmount (only the mic/audio graph is released).

### 5.1 Worker contract

```text
main → worker:  { type: "warmup", modelId, modelHost? }                        // background pre-load
main → worker:  { type: "transcribe", audio: Float32Array(16kHz mono), language: "en"|"pt"|"es", modelId, modelHost? }
worker → main:  { type: "progress", stage: "model" | "inference", value: 0..1 }
worker → main:  { type: "ready" }                                              // warm-up complete
worker → main:  { type: "result", text: string }
worker → main:  { type: "error", message: string }
```

The worker lazy-loads the pipeline once and caches it across calls, so the incremental passes reuse the same in-memory model. Each pass re-transcribes the accumulated audio (full buffer), transferred to the worker via a transferable `ArrayBuffer`; the main thread keeps the source PCM chunks to rebuild the next, larger buffer. `env.allowLocalModels=false` fetches weights remotely (self-hostable via `NEXT_PUBLIC_VOICE_MODEL_HOST`, which also serves the ONNX-runtime WASM). Capture uses an **AudioWorklet** served as a static same-origin module (`/worklets/audio-capture-worklet.js`), allowed by the CSP `script-src/worker-src 'self'`; it runs off the main thread for glitch-free capture during inference.

---

## 6. Security & privacy requirements

1. **No network transmission of audio or transcript.** Only model weights are fetched. A security test asserts the voice modules contain **no `fetch`/XHR/WebSocket of audio or transcript** and do **not** reference the cloud `SpeechRecognition` API for content.
2. **No persistence of audio.** The audio buffer is memory-only and released right after transcription; never written to IndexedDB, localStorage, or disk.
3. **Transcript is private content.** Until inserted and encrypted, it lives only in component state; once inserted it is encrypted by the existing note crypto. It is never logged.
4. **No plaintext to APIs.** Unchanged: the resulting note is encrypted client-side; the no-plaintext API contract and sentinel tests still hold.
5. **CSP / worker origin.** The worker is same-origin; weight fetches go to the configured model host (documented; can be self-hosted to avoid third-party entirely — see §8).
6. **Permission & consent.** Microphone access uses the standard browser permission prompt; denial is handled gracefully; the mic track is stopped immediately after recording.
7. **No telemetry** of transcripts or audio.

---

## 7. Testing

| Layer | Coverage |
|-------|----------|
| Unit | `voice-languages.ts` (supported set, validation, labels); `audio-pcm.ts` (mono mixdown, resample length math, clamping); `transcript-format.ts` (trim/collapse/capitalize/empty) |
| Security | voice modules do not transmit audio/transcript (no `fetch(`/`XMLHttpRequest`/`WebSocket`/cloud `webkitSpeechRecognition` on content); no audio persisted to storage; privacy-notice copy present |
| Features | `useVoiceTranscription` + `VoiceCapturePanel` with `getUserMedia`, `Worker`, and the transformers pipeline **mocked**: record→stop→worker message→transcript appears→Insert calls `onInsert`; permission-denied and worker-error paths |

The heavy model is never downloaded in tests. Coverage thresholds must not regress; pure `src/lib/voice` logic is fully covered.

---

## 8. Configuration

| Env var | Default | Meaning |
|---------|---------|---------|
| `NEXT_PUBLIC_VOICE_NOTES_ENABLED` | `true` | Feature flag to hide the Dictate control |
| `NEXT_PUBLIC_VOICE_MODEL` | `Xenova/whisper-base` | ASR model id (use `Xenova/whisper-tiny` for low-end) |
| `NEXT_PUBLIC_VOICE_MODEL_HOST` | unset (HF CDN) | Optional self-hosted base URL for model weights to avoid any third-party fetch |

Self-hosting the weights (set `NEXT_PUBLIC_VOICE_MODEL_HOST` to a same-origin/CDN path) makes the feature fully first-party — recommended before public beta and noted in `docs/LGPD_BETA_GATES.md`.

---

## 9. Documentation impact

- `README.md` — Notes section: "Voice notes (on-device transcription)"; new env vars.
- `ARCHITECTURE.md` — voice feature layer, worker, no server surface.
- `SECURITY.md` — on-device transcription model, Web Speech API rejection rationale, no audio/transcript egress.
- `docs/EDITOR_IMPLEMENTATION_DECISION.md` — cross-reference voice input into the editor.
- `docs/README.md` — index entry for this TDR.
- `CHANGELOG.md` — `Added` + `Security` entries.

---

## 10. Resolved decisions

| # | Decision |
|---|----------|
| 1 | Engine: **Whisper via transformers.js**, on-device (WASM/WebGPU) |
| 2 | Web Speech API is **rejected** for note content (cloud egress) |
| 3 | Languages: **English, Portuguese, Spanish** (user-selected) |
| 4 | Inference in a **Web Worker**, library **dynamically imported** (SSR/build/test safe) |
| 5 | Only **model weights** cross the network; **never** audio or transcript |
| 6 | Audio is **memory-only**, released after transcription; transcript follows existing encrypted-note flow |
| 7 | **No new API routes, DB columns, or server code** |
| 8 | Opt-in feature flag + optional self-hosted weights for full first-party operation |

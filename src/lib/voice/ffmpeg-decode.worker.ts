/// <reference lib="webworker" />
/**
 * ffmpeg.wasm decode worker (Turbopack-bundled). It loads the self-hosted ESM
 * core via a native dynamic import marked `/* turbopackIgnore: true *\/` so the
 * bundler leaves it alone (the package's own worker hits "expression is too
 * dynamic" under Turbopack). Decodes any container/codec — including ALAC /
 * Apple Lossless that WebCodecs can't — to mono 16 kHz f32 PCM. On-device only.
 */

interface DecodeRequest {
  type: "decode";
  coreURL: string;
  wasmURL: string;
  bytes: Uint8Array;
  ext: string;
  sampleRate: number;
}

// The @ffmpeg/core Emscripten module surface we use (matches the package worker).
interface FfmpegCore {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string, opts: { encoding: "binary" }): Uint8Array;
    unlink(path: string): void;
  };
  setLogger(cb: (data: { type: string; message: string }) => void): void;
  setProgress(cb: (data: { progress: number; time: number }) => void): void;
  setTimeout(ms: number): void;
  exec(...args: string[]): void;
  ret: number;
  reset(): void;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
let corePromise: Promise<FfmpegCore> | null = null;

async function getCore(coreURL: string, wasmURL: string): Promise<FfmpegCore> {
  if (corePromise) return corePromise;
  corePromise = (async () => {
    const mod = (await import(/* turbopackIgnore: true */ coreURL)) as {
      default: (opts: Record<string, unknown>) => Promise<FfmpegCore>;
    };
    if (typeof mod.default !== "function") {
      throw new Error("ffmpeg core failed to load");
    }
    // Same mainScriptUrlOrBlob hack the package uses so locateFile finds the wasm.
    const core = await mod.default({
      mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL: wasmURL }))}`,
    });
    core.setProgress?.((data) => {
      if (data && typeof data.progress === "number") {
        scope.postMessage({ type: "progress", value: data.progress });
      }
    });
    return core;
  })();
  corePromise.catch(() => {
    corePromise = null; // allow a later retry after a failed load
  });
  return corePromise;
}

scope.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  const msg = event.data;
  if (!msg || msg.type !== "decode") return;
  try {
    const core = await getCore(msg.coreURL, msg.wasmURL);
    const input = `input.${msg.ext}`;
    const output = "output.f32le";
    core.FS.writeFile(input, msg.bytes);
    core.setTimeout(-1);
    // Mono, target sample rate, 32-bit float little-endian raw PCM.
    core.exec("-i", input, "-ac", "1", "-ar", String(msg.sampleRate), "-f", "f32le", output);
    core.reset();
    try {
      core.FS.unlink(input); // free the input before reading the (large) output
    } catch {
      /* ignore */
    }
    const out = core.FS.readFile(output, { encoding: "binary" });
    try {
      core.FS.unlink(output);
    } catch {
      /* ignore */
    }
    if (out.byteLength < 4) throw new Error("ffmpeg produced no audio samples.");
    // f32le is always 4-byte aligned; transfer the buffer (no copy).
    scope.postMessage({ type: "result", buffer: out.buffer }, [out.buffer]);
  } catch (err) {
    scope.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};

/**
 * Pure audio helpers for preparing recorded audio for Whisper.
 *
 * Whisper expects mono 16 kHz Float32 PCM. These helpers operate on plain
 * arrays in memory — no DOM, no network — so they are unit-testable and contain
 * no user-content egress.
 */

export const WHISPER_SAMPLE_RATE = 16_000;

/** Concatenate captured Float32 PCM chunks into one contiguous buffer. */
export function concatFloat32(chunks: Float32Array[]): Float32Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Average interleaved/mono channel buffers down to a single mono channel. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];

  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels.length; c++) {
      sum += channels[c][i] ?? 0;
    }
    mono[i] = sum / channels.length;
  }
  return mono;
}

/** Output length after resampling `inputLength` from one rate to another. */
export function resampledLength(
  inputLength: number,
  inputRate: number,
  outputRate: number
): number {
  if (inputRate <= 0 || outputRate <= 0) return 0;
  return Math.max(0, Math.floor((inputLength * outputRate) / inputRate));
}

/**
 * Linear-interpolation resample of mono Float32 PCM to a target rate.
 * Adequate for speech recognition input; not a high-fidelity resampler.
 */
export function resampleLinear(
  input: Float32Array,
  inputRate: number,
  outputRate = WHISPER_SAMPLE_RATE
): Float32Array {
  if (inputRate === outputRate || input.length === 0) return input;
  const outLength = resampledLength(input.length, inputRate, outputRate);
  const output = new Float32Array(outLength);
  const ratio = inputRate / outputRate;
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcPos - i0;
    output[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return output;
}

/** Clamp PCM samples to the valid [-1, 1] range. */
export function clampPcm(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    out[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }
  return out;
}

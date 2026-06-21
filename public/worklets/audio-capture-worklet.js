// AudioWorklet processor for on-device voice capture.
//
// Runs on the audio rendering thread (off the main thread). It buffers raw mono
// Float32 PCM frames and posts them to the main thread in ~2048-sample chunks
// to keep message volume low. No audio ever leaves the device — these frames
// are consumed locally by the Whisper worker. See docs/TDR_Local_Voice_Notes.md.
/* global AudioWorkletProcessor, registerProcessor */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._chunks = [];
    this._length = 0;
    this._target = 2048;
  }

  _flush() {
    if (this._length === 0) return;
    const out = new Float32Array(this._length);
    let offset = 0;
    for (const chunk of this._chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    this.port.postMessage(out, [out.buffer]);
    this._chunks = [];
    this._length = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel && channel.length > 0) {
      this._chunks.push(new Float32Array(channel));
      this._length += channel.length;
      if (this._length >= this._target) {
        this._flush();
      }
    }
    return true;
  }
}

registerProcessor("audio-capture", AudioCaptureProcessor);

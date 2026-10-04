export const MUSE_SAMPLE_RATE = 16000;
export const MAX_UTTERANCE_SECONDS = 30;
export const MAX_WAV_BYTES = MUSE_SAMPLE_RATE * 2 * MAX_UTTERANCE_SECONDS + 44;

const HEADER_BYTES = 44;

export function encodeWavPcm16Mono(samples: Int16Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(HEADER_BYTES + i * 2, samples[i], true);
  }

  return new Uint8Array(buffer);
}

export type WavInfo = { sampleRate: number; channels: number; bitsPerSample: number; dataBytes: number };

/** Returns null for anything that isn't a canonical PCM WAV header. */
export function readWavInfo(bytes: Uint8Array): WavInfo | null {
  if (bytes.byteLength < HEADER_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAscii(view, 0) !== "RIFF" || readAscii(view, 8) !== "WAVE") return null;
  if (readAscii(view, 12) !== "fmt " || readAscii(view, 36) !== "data") return null;
  if (view.getUint16(20, true) !== 1) return null;

  return {
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitsPerSample: view.getUint16(34, true),
    dataBytes: view.getUint32(40, true),
  };
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function readAscii(view: DataView, offset: number): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

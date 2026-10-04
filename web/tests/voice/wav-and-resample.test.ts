import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeWavPcm16Mono, readWavInfo, MUSE_SAMPLE_RATE } from "@/lib/voice/wav";
import { floatToInt16, resampleLinear } from "@/lib/voice/resample";

test("encodeWavPcm16Mono writes a header that readWavInfo accepts", () => {
  const samples = Int16Array.from([0, 1000, -1000, 32767]);
  const bytes = encodeWavPcm16Mono(samples, MUSE_SAMPLE_RATE);
  const info = readWavInfo(bytes);

  assert.deepEqual(info, { sampleRate: 16000, channels: 1, bitsPerSample: 16, dataBytes: 8 });
  assert.equal(bytes.byteLength, 44 + 8);
});

test("readWavInfo rejects non-WAV bytes", () => {
  assert.equal(readWavInfo(new TextEncoder().encode("not a wav file at all, just text padding here.....")), null);
  assert.equal(readWavInfo(new Uint8Array(10)), null);
});

test("resampleLinear halves the length when going from 32 kHz to 16 kHz", () => {
  const input = new Float32Array(3200);
  const output = resampleLinear(input, 32000, 16000);
  assert.equal(output.length, 1600);
});

test("resampleLinear returns the same samples when rates already match", () => {
  const input = new Float32Array([0.1, 0.2]);
  assert.equal(resampleLinear(input, 16000, 16000), input);
});

test("floatToInt16 clamps out-of-range samples", () => {
  assert.deepEqual(Array.from(floatToInt16(Float32Array.from([2, -2, 0]))), [32767, -32768, 0]);
});

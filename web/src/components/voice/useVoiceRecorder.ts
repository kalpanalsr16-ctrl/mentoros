"use client";

import { useEffect, useMemo, useRef } from "react";
import { MAX_UTTERANCE_SECONDS, MUSE_SAMPLE_RATE, encodeWavPcm16Mono } from "@/lib/voice/wav";
import { floatToInt16, resampleLinear } from "@/lib/voice/resample";

const CAPTURE_WORKLET_SOURCE = `
class MentorOSCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("mentoros-capture", MentorOSCapture);
`;

type ActiveRecording = {
  stream: MediaStream;
  context: AudioContext;
  chunks: Float32Array[];
  maxTimer: ReturnType<typeof setTimeout>;
};

export function isVoiceInputSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof AudioWorkletNode !== "undefined"
  );
}

/**
 * Captures one push-to-talk utterance entirely in memory and returns it as a
 * 16 kHz mono WAV. Nothing is written to storage. Recording stops itself at
 * the utterance cap so an open mic can't run unattended.
 */
export function useVoiceRecorder(options: { onAutoStop: () => void }) {
  const activeRef = useRef<ActiveRecording | null>(null);
  const onAutoStopRef = useRef(options.onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = options.onAutoStop;
  });

  const recorder = useMemo(() => {
    async function start(): Promise<void> {
      if (activeRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      const context = new AudioContext();
      try {
        const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET_SOURCE], { type: "text/javascript" }));
        await context.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const source = context.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(context, "mentoros-capture");
        const recording: ActiveRecording = {
          stream,
          context,
          chunks: [],
          maxTimer: setTimeout(() => onAutoStopRef.current(), MAX_UTTERANCE_SECONDS * 1000),
        };

        node.port.onmessage = (event: MessageEvent<Float32Array>) => {
          recording.chunks.push(event.data);
        };
        source.connect(node);
        activeRef.current = recording;
      } catch (err) {
        stream.getTracks().forEach((track) => track.stop());
        await context.close();
        throw err;
      }
    }

    async function stop(): Promise<Blob | null> {
      const recording = activeRef.current;
      if (!recording) return null;
      activeRef.current = null;
      clearTimeout(recording.maxTimer);

      recording.stream.getTracks().forEach((track) => track.stop());
      await recording.context.close();

      const total = recording.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (total === 0) return null;

      const merged = new Float32Array(total);
      let offset = 0;
      for (const chunk of recording.chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const resampled = resampleLinear(merged, recording.context.sampleRate, MUSE_SAMPLE_RATE);
      const wav = encodeWavPcm16Mono(floatToInt16(resampled), MUSE_SAMPLE_RATE);
      return new Blob([wav], { type: "audio/wav" });
    }

    function cancel() {
      const recording = activeRef.current;
      if (!recording) return;
      activeRef.current = null;
      clearTimeout(recording.maxTimer);
      recording.stream.getTracks().forEach((track) => track.stop());
      void recording.context.close();
    }

    return { start, stop, cancel };
  }, []);

  useEffect(() => () => recorder.cancel(), [recorder]);

  return recorder;
}

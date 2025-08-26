import { useState, useEffect, useRef } from "react";

interface UseAudioLevelOptions {
  stream: MediaStream | null;
  enabled?: boolean;
  speakingThreshold?: number;
  smoothing?: number;
}

interface AudioLevelResult {
  audioLevel: number;
  isSpeaking: boolean;
}

export const useAudioLevel = ({
  stream,
  enabled = true,
  speakingThreshold = 25,
  smoothing = 0.8,
}: UseAudioLevelOptions): AudioLevelResult => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastLevelRef = useRef(0);

  useEffect(() => {
    if (!stream || !enabled) {
      cleanup();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      cleanup();
      return;
    }

    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = smoothing;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyser || !enabled) {
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) for better volume detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);

        // Smooth the audio level to reduce jitter
        const smoothedLevel =
          lastLevelRef.current * smoothing + rms * (1 - smoothing);
        lastLevelRef.current = smoothedLevel;

        const normalizedLevel = Math.min(100, smoothedLevel);
        setAudioLevel(normalizedLevel);
        setIsSpeaking(normalizedLevel > speakingThreshold);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.warn("Failed to setup audio level detection:", error);
      cleanup();
    }

    return cleanup;
  }, [stream, enabled, speakingThreshold, smoothing]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    lastLevelRef.current = 0;
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return { audioLevel, isSpeaking };
};

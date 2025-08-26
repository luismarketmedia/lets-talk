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
      console.warn("No audio tracks found in stream");
      cleanup();
      return;
    }

    // Check if audio track is active
    const audioTrack = audioTracks[0];
    if (!audioTrack.enabled || audioTrack.readyState !== 'live') {
      console.warn("Audio track is not active:", audioTrack.readyState);
      cleanup();
      return;
    }

    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256; // Smaller for better performance
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      console.log("Audio level detection setup successful", {
        audioTracks: audioTracks.length,
        bufferLength,
        contextState: audioContext.state
      });

      const updateLevel = () => {
        if (!analyser || !enabled || audioContext.state === 'closed') {
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // Calculate average with more responsive method
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Convert to percentage and apply smoothing
        const normalizedLevel = (average / 255) * 100;
        const smoothedLevel = lastLevelRef.current * smoothing + normalizedLevel * (1 - smoothing);
        lastLevelRef.current = smoothedLevel;

        const finalLevel = Math.min(100, Math.max(0, smoothedLevel));
        setAudioLevel(finalLevel);
        setIsSpeaking(finalLevel > speakingThreshold);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Failed to setup audio level detection:", error);
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

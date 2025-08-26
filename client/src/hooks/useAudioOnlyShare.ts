import { useState, useCallback, useRef } from "react";

interface AudioOnlyShareOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

export const useAudioOnlyShare = () => {
  const [isAudioSharing, setIsAudioSharing] = useState(false);
  const [audioShareStream, setAudioShareStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Start audio-only sharing
  const startAudioShare = useCallback(async (options: AudioOnlyShareOptions = {}) => {
    try {
      setError(null);

      // Get audio stream with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
          sampleRate: options.sampleRate ?? 48000,
          channelCount: options.channelCount ?? 2,
          // Request high quality audio
          ...(options.sampleRate && { sampleRate: options.sampleRate }),
        },
        video: false, // Explicitly no video
      });

      // Create audio context for processing if needed
      const audioContext = new AudioContext({
        sampleRate: options.sampleRate ?? 48000,
      });
      audioContextRef.current = audioContext;

      // Add audio processing if needed (e.g., noise reduction, gain control)
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      
      // You can add audio processing nodes here
      // For now, just pass through
      source.connect(destination);

      const processedStream = destination.stream;
      
      setAudioShareStream(processedStream);
      setIsAudioSharing(true);

      console.log("Audio-only sharing started with options:", options);
      
      return processedStream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start audio sharing";
      setError(errorMessage);
      console.error("Failed to start audio-only sharing:", err);
      throw err;
    }
  }, []);

  // Stop audio sharing
  const stopAudioShare = useCallback(() => {
    if (audioShareStream) {
      audioShareStream.getTracks().forEach(track => {
        track.stop();
      });
      setAudioShareStream(null);
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsAudioSharing(false);
    setError(null);
    
    console.log("Audio-only sharing stopped");
  }, [audioShareStream]);

  // Toggle audio sharing
  const toggleAudioShare = useCallback(async (options?: AudioOnlyShareOptions) => {
    if (isAudioSharing) {
      stopAudioShare();
    } else {
      await startAudioShare(options);
    }
  }, [isAudioSharing, stopAudioShare, startAudioShare]);

  // Get audio level for visualization
  const getAudioLevel = useCallback((): number => {
    if (!audioShareStream || !audioContextRef.current) return 0;

    try {
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioShareStream);
      
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const sum = dataArray.reduce((acc, value) => acc + value, 0);
      const average = sum / dataArray.length;

      // Convert to 0-100 scale
      return Math.round((average / 255) * 100);
    } catch (error) {
      console.warn("Failed to get audio level:", error);
      return 0;
    }
  }, [audioShareStream]);

  // Apply audio effects
  const applyAudioEffects = useCallback((effects: {
    gain?: number;
    lowpass?: number;
    highpass?: number;
  }) => {
    if (!audioShareStream || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(audioShareStream);
      const destination = audioContext.createMediaStreamDestination();

      let currentNode: AudioNode = source;

      // Apply gain
      if (effects.gain !== undefined) {
        const gainNode = audioContext.createGain();
        gainNode.gain.value = effects.gain;
        currentNode.connect(gainNode);
        currentNode = gainNode;
      }

      // Apply lowpass filter
      if (effects.lowpass !== undefined) {
        const lowpassFilter = audioContext.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = effects.lowpass;
        currentNode.connect(lowpassFilter);
        currentNode = lowpassFilter;
      }

      // Apply highpass filter
      if (effects.highpass !== undefined) {
        const highpassFilter = audioContext.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.value = effects.highpass;
        currentNode.connect(highpassFilter);
        currentNode = highpassFilter;
      }

      currentNode.connect(destination);

      // Update the stream
      setAudioShareStream(destination.stream);
      
      console.log("Audio effects applied:", effects);
    } catch (error) {
      console.error("Failed to apply audio effects:", error);
    }
  }, [audioShareStream]);

  return {
    isAudioSharing,
    audioShareStream,
    error,
    startAudioShare,
    stopAudioShare,
    toggleAudioShare,
    getAudioLevel,
    applyAudioEffects,
  };
};

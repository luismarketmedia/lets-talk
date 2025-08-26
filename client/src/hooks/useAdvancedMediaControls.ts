import { useState, useEffect, useCallback, useRef } from "react";

interface AdvancedMediaState {
  microphoneVolume: number;
  speakerVolume: number;
  videoQuality: "360p" | "720p" | "1080p";
  dataSavingMode: boolean;
  isTemporarilyMuted: boolean;
}

interface UseAdvancedMediaControlsOptions {
  localStream?: MediaStream | null;
  onVideoQualityChange?: (quality: "360p" | "720p" | "1080p") => void;
}

export const useAdvancedMediaControls = (
  options: UseAdvancedMediaControlsOptions = {},
) => {
  const { localStream, onVideoQualityChange } = options;

  const [state, setState] = useState<AdvancedMediaState>({
    microphoneVolume: 100,
    speakerVolume: 100,
    videoQuality: "720p",
    dataSavingMode: false,
    isTemporarilyMuted: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const originalMuteStateRef = useRef<boolean>(false);

  // Initialize audio context for volume control
  useEffect(() => {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      const sourceNode = audioContext.createMediaStreamSource(localStream);

      sourceNode.connect(gainNode);
      // Note: For actual microphone volume control, we would need to replace the track
      // This is a basic setup that could be extended

      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
      sourceNodeRef.current = sourceNode;
    } catch (error) {
      console.warn("Failed to setup audio context for volume control:", error);
    }

    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [localStream]);

  // Handle microphone volume change
  const handleMicrophoneVolumeChange = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, microphoneVolume: volume }));

    // Apply gain to microphone (simplified approach)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }

    // For actual implementation, you would typically:
    // 1. Create a new MediaStream with modified audio track
    // 2. Replace the track in all peer connections
    // This is a simplified version for demonstration
  }, []);

  // Handle speaker volume change
  const handleSpeakerVolumeChange = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, speakerVolume: volume }));

    // Apply volume to all audio elements playing remote streams
    const audioElements = document.querySelectorAll("audio, video");
    audioElements.forEach((element) => {
      if (
        element instanceof HTMLAudioElement ||
        element instanceof HTMLVideoElement
      ) {
        element.volume = volume / 100;
      }
    });
  }, []);

  // Handle video quality change
  const handleVideoQualityChange = useCallback(
    (quality: "360p" | "720p" | "1080p") => {
      setState((prev) => ({ ...prev, videoQuality: quality }));

      // Notify parent component about quality change
      if (onVideoQualityChange) {
        onVideoQualityChange(quality);
      }
    },
    [onVideoQualityChange],
  );

  // Handle data saving mode toggle
  const handleDataSavingModeToggle = useCallback(() => {
    setState((prev) => {
      const newDataSavingMode = !prev.dataSavingMode;

      // When enabling data saving mode, switch to lower quality
      if (newDataSavingMode && prev.videoQuality !== "360p") {
        handleVideoQualityChange("360p");
        return {
          ...prev,
          dataSavingMode: newDataSavingMode,
          videoQuality: "360p",
        };
      }

      return { ...prev, dataSavingMode: newDataSavingMode };
    });
  }, [handleVideoQualityChange]);

  // Handle spacebar for temporary mute
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (
        event.code === "Space" &&
        !event.repeat &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !((event.target as HTMLElement)?.isContentEditable)
      ) {
        event.preventDefault();

        if (!state.isTemporarilyMuted) {
          // Store original state and mute
          const audioTracks = localStream?.getAudioTracks() || [];
          originalMuteStateRef.current = audioTracks[0]?.enabled || false;
          audioTracks.forEach((track) => (track.enabled = false));

          setState((prev) => ({ ...prev, isTemporarilyMuted: true }));
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        state.isTemporarilyMuted &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !((event.target as HTMLElement)?.isContentEditable)
      ) {
        event.preventDefault();

        // Restore original state
        const audioTracks = localStream?.getAudioTracks() || [];
        audioTracks.forEach(
          (track) => (track.enabled = originalMuteStateRef.current),
        );

        setState((prev) => ({ ...prev, isTemporarilyMuted: false }));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [localStream, state.isTemporarilyMuted]);

  // Get video quality settings
  const getVideoConstraints = useCallback(() => {
    const baseConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    switch (state.videoQuality) {
      case "360p":
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: state.dataSavingMode ? 15 : 30 },
          },
          audio: baseConstraints,
        };
      case "720p":
        return {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: state.dataSavingMode ? 20 : 30 },
          },
          audio: baseConstraints,
        };
      case "1080p":
        return {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: state.dataSavingMode ? 24 : 30 },
          },
          audio: baseConstraints,
        };
      default:
        return {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: baseConstraints,
        };
    }
  }, [state.videoQuality, state.dataSavingMode]);

  return {
    ...state,
    handleMicrophoneVolumeChange,
    handleSpeakerVolumeChange,
    handleVideoQualityChange,
    handleDataSavingModeToggle,
    getVideoConstraints,
  };
};

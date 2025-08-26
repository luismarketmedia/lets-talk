import { useState, useEffect, useRef, useCallback } from "react";

interface SpeakerDetectionOptions {
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  threshold?: number; // Volume threshold to consider someone speaking
  updateInterval?: number; // How often to update speaker detection (ms)
}

interface SpeakerInfo {
  activeSpeaker: string | null; // socketId of current speaker
  speakingParticipants: Set<string>; // All currently speaking participants
  audioLevels: Map<string, number>; // Current audio levels for all participants
}

export const useSpeakerDetection = ({
  remoteStreams,
  localStream,
  threshold = 30, // Volume threshold (0-100)
  updateInterval = 100,
}: SpeakerDetectionOptions) => {
  const [speakerInfo, setSpeakerInfo] = useState<SpeakerInfo>({
    activeSpeaker: null,
    speakingParticipants: new Set(),
    audioLevels: new Map(),
  });

  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const dataArraysRef = useRef<Map<string, Uint8Array>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastSpeakerChangeRef = useRef<number>(0);

  // Minimum time before changing active speaker (to avoid rapid switching)
  const SPEAKER_CHANGE_DELAY = 500; // ms

  const setupAudioAnalysis = useCallback((streamId: string, stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextsRef.current.set(streamId, audioContext);
      analysersRef.current.set(streamId, analyser);
      dataArraysRef.current.set(streamId, dataArray);
    } catch (error) {
      console.warn(`Failed to setup audio analysis for ${streamId}:`, error);
    }
  }, []);

  const cleanupAudioAnalysis = useCallback((streamId: string) => {
    const audioContext = audioContextsRef.current.get(streamId);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
    
    audioContextsRef.current.delete(streamId);
    analysersRef.current.delete(streamId);
    dataArraysRef.current.delete(streamId);
  }, []);

  const getAudioLevel = useCallback((streamId: string): number => {
    const analyser = analysersRef.current.get(streamId);
    const dataArray = dataArraysRef.current.get(streamId);

    if (!analyser || !dataArray) return 0;

    try {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const sum = dataArray.reduce((acc, value) => acc + value, 0);
      const average = sum / dataArray.length;
      
      // Convert to 0-100 scale
      return Math.round((average / 255) * 100);
    } catch (error) {
      return 0;
    }
  }, []);

  const updateSpeakerDetection = useCallback(() => {
    const currentTime = Date.now();
    const newAudioLevels = new Map<string, number>();
    const newSpeakingParticipants = new Set<string>();
    
    // Check local stream
    if (localStream) {
      const localLevel = getAudioLevel('local');
      newAudioLevels.set('local', localLevel);
      if (localLevel > threshold) {
        newSpeakingParticipants.add('local');
      }
    }

    // Check remote streams
    for (const [streamId, stream] of remoteStreams) {
      const level = getAudioLevel(streamId);
      newAudioLevels.set(streamId, level);
      if (level > threshold) {
        newSpeakingParticipants.add(streamId);
      }
    }

    // Determine active speaker (loudest among speaking participants)
    let newActiveSpeaker: string | null = null;
    let maxLevel = 0;

    for (const participantId of newSpeakingParticipants) {
      const level = newAudioLevels.get(participantId) || 0;
      if (level > maxLevel) {
        maxLevel = level;
        newActiveSpeaker = participantId;
      }
    }

    // Only change active speaker if enough time has passed (to avoid rapid switching)
    const shouldChangeActiveSpeaker = 
      currentTime - lastSpeakerChangeRef.current > SPEAKER_CHANGE_DELAY;

    setSpeakerInfo(prev => {
      const activeSpeaker = shouldChangeActiveSpeaker && newActiveSpeaker 
        ? newActiveSpeaker 
        : prev.activeSpeaker;

      // Update last change time if speaker actually changed
      if (activeSpeaker !== prev.activeSpeaker) {
        lastSpeakerChangeRef.current = currentTime;
      }

      return {
        activeSpeaker,
        speakingParticipants: newSpeakingParticipants,
        audioLevels: newAudioLevels,
      };
    });
  }, [remoteStreams, localStream, threshold, getAudioLevel]);

  // Setup audio analysis for local stream
  useEffect(() => {
    if (localStream) {
      setupAudioAnalysis('local', localStream);
    } else {
      cleanupAudioAnalysis('local');
    }

    return () => {
      cleanupAudioAnalysis('local');
    };
  }, [localStream, setupAudioAnalysis, cleanupAudioAnalysis]);

  // Setup audio analysis for remote streams
  useEffect(() => {
    // Setup new streams
    for (const [streamId, stream] of remoteStreams) {
      if (!audioContextsRef.current.has(streamId)) {
        setupAudioAnalysis(streamId, stream);
      }
    }

    // Cleanup removed streams
    const currentStreamIds = new Set(remoteStreams.keys());
    for (const streamId of audioContextsRef.current.keys()) {
      if (streamId !== 'local' && !currentStreamIds.has(streamId)) {
        cleanupAudioAnalysis(streamId);
      }
    }
  }, [remoteStreams, setupAudioAnalysis, cleanupAudioAnalysis]);

  // Start/stop detection interval
  useEffect(() => {
    if (audioContextsRef.current.size > 0) {
      intervalRef.current = setInterval(updateSpeakerDetection, updateInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateSpeakerDetection, updateInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Close all audio contexts
      for (const audioContext of audioContextsRef.current.values()) {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }
      
      audioContextsRef.current.clear();
      analysersRef.current.clear();
      dataArraysRef.current.clear();
    };
  }, []);

  return speakerInfo;
};

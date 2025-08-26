import { useState, useRef, useCallback } from "react";

export type RecordingMode = "video" | "audio-only";
export type RecordingState = "idle" | "recording" | "paused" | "stopped";

interface RecordingOptions {
  mode: RecordingMode;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

interface RecordingInfo {
  state: RecordingState;
  duration: number;
  fileSize: number;
  mode: RecordingMode;
  startTime?: Date;
}

export const useRecording = () => {
  const [recordingInfo, setRecordingInfo] = useState<RecordingInfo>({
    state: "idle",
    duration: 0,
    fileSize: 0,
    mode: "video",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording
  const startRecording = useCallback(
    async (
      localStream: MediaStream | null,
      remoteStreams: Map<string, MediaStream>,
      options: RecordingOptions = { mode: "video" },
    ) => {
      try {
        if (!localStream) {
          throw new Error("No local stream available for recording");
        }

        // Create composite stream with local and remote audio/video
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Add local audio
        if (localStream.getAudioTracks().length > 0) {
          const localAudioSource =
            audioContext.createMediaStreamSource(localStream);
          localAudioSource.connect(destination);
        }

        // Add remote audio streams
        for (const remoteStream of remoteStreams.values()) {
          if (remoteStream.getAudioTracks().length > 0) {
            const remoteAudioSource =
              audioContext.createMediaStreamSource(remoteStream);
            remoteAudioSource.connect(destination);
          }
        }

        // Create final stream for recording
        let recordingStream: MediaStream;

        if (options.mode === "audio-only") {
          // Audio only recording
          recordingStream = new MediaStream([
            ...destination.stream.getAudioTracks(),
          ]);
        } else {
          // Video + audio recording
          const canvas = document.createElement("canvas");
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext("2d")!;

          // Create video stream from canvas
          const canvasStream = canvas.captureStream(30);

          // Combine video from canvas with mixed audio
          recordingStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
          ]);

          // Function to draw video grid on canvas
          const drawVideoGrid = () => {
            if (recordingInfo.state !== "recording") return;

            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const videos = document.querySelectorAll("video");
            const visibleVideos = Array.from(videos).filter(
              (video) => video.videoWidth > 0 && video.videoHeight > 0,
            );

            if (visibleVideos.length === 0) {
              // Draw placeholder text
              ctx.fillStyle = "#ffffff";
              ctx.font = "48px Arial";
              ctx.textAlign = "center";
              ctx.fillText(
                "Gravação em andamento...",
                canvas.width / 2,
                canvas.height / 2,
              );
            } else {
              // Calculate grid layout
              const cols = Math.ceil(Math.sqrt(visibleVideos.length));
              const rows = Math.ceil(visibleVideos.length / cols);
              const cellWidth = canvas.width / cols;
              const cellHeight = canvas.height / rows;

              visibleVideos.forEach((video, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * cellWidth;
                const y = row * cellHeight;

                try {
                  ctx.drawImage(video, x, y, cellWidth, cellHeight);
                } catch (error) {
                  // Handle CORS issues or other drawing errors
                  ctx.fillStyle = "#333333";
                  ctx.fillRect(x, y, cellWidth, cellHeight);
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "24px Arial";
                  ctx.textAlign = "center";
                  ctx.fillText(
                    "Participante",
                    x + cellWidth / 2,
                    y + cellHeight / 2,
                  );
                }
              });
            }

            requestAnimationFrame(drawVideoGrid);
          };

          drawVideoGrid();
        }

        streamRef.current = recordingStream;

        // Configure MediaRecorder
        const mimeType =
          options.mode === "audio-only"
            ? "audio/webm"
            : "video/webm;codecs=vp8,opus";

        const mediaRecorder = new MediaRecorder(recordingStream, {
          mimeType,
          videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
          audioBitsPerSecond: options.audioBitsPerSecond || 128000,
        });

        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);

            // Update file size
            const totalSize = chunksRef.current.reduce(
              (sum, chunk) => sum + chunk.size,
              0,
            );
            setRecordingInfo((prev) => ({ ...prev, fileSize: totalSize }));
          }
        };

        mediaRecorder.onstop = () => {
          setRecordingInfo((prev) => ({ ...prev, state: "stopped" }));

          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }

          // Clean up streams
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          audioContext.close();
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000); // Collect data every second

        // Start duration tracking
        const startTime = new Date();
        setRecordingInfo({
          state: "recording",
          duration: 0,
          fileSize: 0,
          mode: options.mode,
          startTime,
        });

        durationIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime.getTime();
          setRecordingInfo((prev) => ({
            ...prev,
            duration: Math.floor(elapsed / 1000),
          }));
        }, 1000);
      } catch (error) {
        console.error("Failed to start recording:", error);
        setRecordingInfo((prev) => ({ ...prev, state: "idle" }));
        throw error;
      }
    },
    [recordingInfo.state],
  );

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setRecordingInfo((prev) => ({ ...prev, state: "paused" }));

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setRecordingInfo((prev) => ({ ...prev, state: "recording" }));

      // Resume duration tracking
      const resumeTime = Date.now() - recordingInfo.duration * 1000;
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - resumeTime;
        setRecordingInfo((prev) => ({
          ...prev,
          duration: Math.floor(elapsed / 1000),
        }));
      }, 1000);
    }
  }, [recordingInfo.duration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Download recording
  const downloadRecording = useCallback(
    (filename?: string) => {
      if (chunksRef.current.length === 0) {
        throw new Error("No recording data available");
      }

      const blob = new Blob(chunksRef.current, {
        type: recordingInfo.mode === "audio-only" ? "audio/webm" : "video/webm",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        filename ||
        `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Reset recording state
      chunksRef.current = [];
      setRecordingInfo({
        state: "idle",
        duration: 0,
        fileSize: 0,
        mode: "video",
      });
    },
    [recordingInfo.mode],
  );

  // Get recording blob without downloading
  const getRecordingBlob = useCallback(() => {
    if (chunksRef.current.length === 0) {
      return null;
    }

    return new Blob(chunksRef.current, {
      type: recordingInfo.mode === "audio-only" ? "audio/webm" : "video/webm",
    });
  }, [recordingInfo.mode]);

  // Format duration as MM:SS
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  return {
    recordingInfo,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    downloadRecording,
    getRecordingBlob,
    formatDuration,
    formatFileSize,
    isRecording: recordingInfo.state === "recording",
    isPaused: recordingInfo.state === "paused",
    isStopped: recordingInfo.state === "stopped",
    canRecord: recordingInfo.state === "idle",
  };
};

import { useState, useEffect, useRef } from "react";

export interface ConnectionStats {
  connectionState: RTCPeerConnectionState;
  bitrate: number; // kbps
  packetLoss: number; // percentage
  rtt: number; // milliseconds
  jitter: number; // milliseconds
  resolution: string;
  bandwidth: number; // kbps
  quality: "excellent" | "good" | "fair" | "poor" | "disconnected";
}

interface UseConnectionStatsOptions {
  peerConnection: RTCPeerConnection | null;
  enabled?: boolean;
  interval?: number;
}

const defaultStats: ConnectionStats = {
  connectionState: "new",
  bitrate: 0,
  packetLoss: 0,
  rtt: 0,
  jitter: 0,
  resolution: "",
  bandwidth: 0,
  quality: "disconnected",
};

export const useConnectionStats = ({
  peerConnection,
  enabled = true,
  interval = 1000,
}: UseConnectionStatsOptions): ConnectionStats => {
  const [stats, setStats] = useState<ConnectionStats>(defaultStats);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatsRef = useRef<any>(null);

  const calculateQuality = (
    rtt: number,
    packetLoss: number,
    bitrate: number,
  ): ConnectionStats["quality"] => {
    if (bitrate === 0) return "disconnected";
    if (rtt < 100 && packetLoss < 1 && bitrate > 500) return "excellent";
    if (rtt < 200 && packetLoss < 3 && bitrate > 200) return "good";
    if (rtt < 500 && packetLoss < 5 && bitrate > 100) return "fair";
    return "poor";
  };

  const getConnectionStats = async () => {
    if (!peerConnection || !enabled) return;

    try {
      const statsReport = await peerConnection.getStats();
      let inboundRtp: any = null;
      let outboundRtp: any = null;
      let candidatePair: any = null;

      // Find relevant stats
      statsReport.forEach((report: any) => {
        if (report.type === "inbound-rtp" && report.mediaType === "video") {
          inboundRtp = report;
        } else if (
          report.type === "outbound-rtp" &&
          report.mediaType === "video"
        ) {
          outboundRtp = report;
        } else if (
          report.type === "candidate-pair" &&
          report.state === "succeeded"
        ) {
          candidatePair = report;
        }
      });

      const currentTime = Date.now();
      const previousStats = previousStatsRef.current;

      let newStats: ConnectionStats = {
        connectionState: peerConnection.connectionState,
        bitrate: 0,
        packetLoss: 0,
        rtt: 0,
        jitter: 0,
        resolution: "",
        bandwidth: 0,
        quality: "disconnected",
      };

      // Calculate bitrate from inbound RTP
      if (inboundRtp && previousStats?.inboundRtp) {
        const timeDiff = (currentTime - previousStats.timestamp) / 1000;
        const bytesDiff =
          inboundRtp.bytesReceived - previousStats.inboundRtp.bytesReceived;
        newStats.bitrate = Math.round((bytesDiff * 8) / (timeDiff * 1000)); // Convert to kbps
      }

      // Calculate outbound bitrate
      if (outboundRtp && previousStats?.outboundRtp) {
        const timeDiff = (currentTime - previousStats.timestamp) / 1000;
        const bytesDiff =
          outboundRtp.bytesSent - previousStats.outboundRtp.bytesSent;
        newStats.bandwidth = Math.round((bytesDiff * 8) / (timeDiff * 1000)); // Convert to kbps
      }

      // Get packet loss
      if (inboundRtp) {
        newStats.packetLoss =
          inboundRtp.packetsLost > 0
            ? Math.round(
                (inboundRtp.packetsLost /
                  (inboundRtp.packetsReceived + inboundRtp.packetsLost)) *
                  100,
              )
            : 0;
        newStats.jitter = Math.round((inboundRtp.jitter || 0) * 1000); // Convert to ms
      }

      // Get RTT from candidate pair
      if (candidatePair) {
        newStats.rtt =
          Math.round(candidatePair.currentRoundTripTime * 1000) || 0; // Convert to ms
      }

      // Get video resolution
      if (inboundRtp && inboundRtp.frameWidth && inboundRtp.frameHeight) {
        newStats.resolution = `${inboundRtp.frameWidth}x${inboundRtp.frameHeight}`;
      }

      // Calculate overall quality
      newStats.quality = calculateQuality(
        newStats.rtt,
        newStats.packetLoss,
        newStats.bitrate,
      );

      setStats(newStats);

      // Store current stats for next calculation
      previousStatsRef.current = {
        timestamp: currentTime,
        inboundRtp,
        outboundRtp,
        candidatePair,
      };
    } catch (error) {
      console.warn("Failed to get connection stats:", error);
      setStats((prev) => ({ ...prev, quality: "disconnected" }));
    }
  };

  useEffect(() => {
    if (!peerConnection || !enabled) {
      setStats(defaultStats);
      return;
    }

    // Start monitoring
    getConnectionStats(); // Get initial stats
    intervalRef.current = setInterval(getConnectionStats, interval);

    // Listen for connection state changes
    const handleConnectionStateChange = () => {
      setStats((prev) => ({
        ...prev,
        connectionState: peerConnection.connectionState,
        quality:
          peerConnection.connectionState === "connected"
            ? prev.quality
            : "disconnected",
      }));
    };

    peerConnection.addEventListener(
      "connectionstatechange",
      handleConnectionStateChange,
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      peerConnection.removeEventListener(
        "connectionstatechange",
        handleConnectionStateChange,
      );
    };
  }, [peerConnection, enabled, interval]);

  return stats;
};

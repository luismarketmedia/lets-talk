import { useState, useEffect, useRef, useCallback } from "react";

interface ConnectionStats {
  rtt: number;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  jitter: number;
  bandwidth: number;
  quality: "excellent" | "good" | "fair" | "poor" | "unknown";
}

interface UseConnectionMonitorOptions {
  peerConnections: Map<string, RTCPeerConnection>;
  enabled?: boolean;
  updateInterval?: number;
}

export const useConnectionMonitor = ({
  peerConnections,
  enabled = true,
  updateInterval = 2000,
}: UseConnectionMonitorOptions) => {
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    rtt: 0,
    packetsLost: 0,
    packetsReceived: 0,
    bytesReceived: 0,
    bytesSent: 0,
    jitter: 0,
    bandwidth: 0,
    quality: "unknown",
  });

  const intervalRef = useRef<NodeJS.Timeout | undefined>();
  const lastStatsRef = useRef<Map<string, RTCStatsReport>>(new Map());

  const calculateQuality = useCallback(
    (rtt: number, packetsLost: number, packetsReceived: number) => {
      const lossRate =
        packetsReceived > 0 ? (packetsLost / packetsReceived) * 100 : 0;

      if (rtt < 100 && lossRate < 1) {
        return "excellent";
      } else if (rtt < 200 && lossRate < 3) {
        return "good";
      } else if (rtt < 400 && lossRate < 5) {
        return "fair";
      } else {
        return "poor";
      }
    },
    [],
  );

  const calculateBandwidth = useCallback(
    (currentBytes: number, previousBytes: number, timeDiff: number): number => {
      if (timeDiff <= 0) return 0;

      const bytesDiff = currentBytes - previousBytes;
      const bytesPerSecond = (bytesDiff / timeDiff) * 1000; // Convert to bytes per second
      const kbps = (bytesPerSecond * 8) / 1000; // Convert to kilobits per second

      return Math.max(0, kbps);
    },
    [],
  );

  const updateStats = useCallback(async () => {
    if (!enabled || peerConnections.size === 0) {
      return;
    }

    try {
      let totalRtt = 0;
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;
      let totalBytesReceived = 0;
      let totalBytesSent = 0;
      let totalJitter = 0;
      let connectionCount = 0;
      let totalBandwidth = 0;

      const currentTime = Date.now();

      for (const [connectionId, peerConnection] of peerConnections) {
        if (peerConnection.connectionState === "connected") {
          try {
            const stats = await peerConnection.getStats();
            const previousStats = lastStatsRef.current.get(connectionId);

            stats.forEach((report) => {
              if (
                report.type === "remote-inbound-rtp" &&
                report.kind === "video"
              ) {
                totalRtt += report.roundTripTime || 0;
                totalJitter += report.jitter || 0;
                connectionCount++;
              }

              if (report.type === "inbound-rtp") {
                totalPacketsLost += report.packetsLost || 0;
                totalPacketsReceived += report.packetsReceived || 0;
                totalBytesReceived += report.bytesReceived || 0;

                // Calculate bandwidth for this stream
                if (previousStats) {
                  previousStats.forEach((prevReport) => {
                    if (
                      prevReport.id === report.id &&
                      prevReport.type === "inbound-rtp"
                    ) {
                      const timeDiff = report.timestamp - prevReport.timestamp;
                      const bandwidth = calculateBandwidth(
                        report.bytesReceived || 0,
                        prevReport.bytesReceived || 0,
                        timeDiff,
                      );
                      totalBandwidth += bandwidth;
                    }
                  });
                }
              }

              if (report.type === "outbound-rtp") {
                totalBytesSent += report.bytesSent || 0;

                // Calculate outbound bandwidth
                if (previousStats) {
                  previousStats.forEach((prevReport) => {
                    if (
                      prevReport.id === report.id &&
                      prevReport.type === "outbound-rtp"
                    ) {
                      const timeDiff = report.timestamp - prevReport.timestamp;
                      const bandwidth = calculateBandwidth(
                        report.bytesSent || 0,
                        prevReport.bytesSent || 0,
                        timeDiff,
                      );
                      totalBandwidth += bandwidth;
                    }
                  });
                }
              }
            });

            // Store current stats for next comparison
            lastStatsRef.current.set(connectionId, stats);
          } catch (error) {
            console.warn(
              `Failed to get stats for connection ${connectionId}:`,
              error,
            );
          }
        }
      }

      // Average the stats
      const avgRtt = connectionCount > 0 ? totalRtt / connectionCount : 0;
      const avgJitter = connectionCount > 0 ? totalJitter / connectionCount : 0;
      const quality = calculateQuality(
        avgRtt * 1000,
        totalPacketsLost,
        totalPacketsReceived,
      ); // Convert RTT to ms

      setConnectionStats({
        rtt: Math.round(avgRtt * 1000), // Convert to milliseconds
        packetsLost: totalPacketsLost,
        packetsReceived: totalPacketsReceived,
        bytesReceived: totalBytesReceived,
        bytesSent: totalBytesSent,
        jitter: Math.round(avgJitter * 1000), // Convert to milliseconds
        bandwidth: Math.round(totalBandwidth),
        quality,
      });
    } catch (error) {
      console.warn("Failed to update connection stats:", error);
    }
  }, [enabled, peerConnections, calculateQuality, calculateBandwidth]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Initial update
    updateStats();

    // Set up periodic updates
    intervalRef.current = setInterval(updateStats, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateStats, updateInterval]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return connectionStats;
};

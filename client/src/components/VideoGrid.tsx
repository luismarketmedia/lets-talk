import React from "react";
import { Users } from "lucide-react";
import { VideoTile } from "./VideoTile";
import { ViewMode } from "./ViewModeSelector";
import { cn } from "../lib/utils";

interface VideoGridProps {
  viewMode: ViewMode;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participantStates: Map<string, { isAudioEnabled: boolean; isVideoEnabled: boolean }>;
  participantNames: Map<string, string>;
  peerConnections: Map<string, RTCPeerConnection>;
  screenSharingParticipant: string | null;
  activeSpeaker: string | null;
  spotlightParticipant: string | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onParticipantClick?: (participantId: string) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  viewMode,
  localStream,
  remoteStreams,
  participantStates,
  participantNames,
  peerConnections,
  screenSharingParticipant,
  activeSpeaker,
  spotlightParticipant,
  isAudioEnabled,
  isVideoEnabled,
  onParticipantClick,
}) => {
  const remoteStreamArray = Array.from(remoteStreams.entries());
  const totalParticipants = 1 + remoteStreamArray.length;

  // Gallery View - Grid layout for all participants
  const renderGalleryView = () => {
    const getGridClass = () => {
      if (totalParticipants === 1) return "grid-cols-1";
      if (totalParticipants === 2) return "grid-cols-1 lg:grid-cols-2";
      if (totalParticipants <= 4) return "grid-cols-2";
      if (totalParticipants <= 6) return "grid-cols-2 lg:grid-cols-3";
      return "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    };

    const getVideoHeight = () => {
      if (totalParticipants === 1) return "h-[400px] lg:h-[500px]";
      if (totalParticipants === 2) return "h-[300px] lg:h-[400px]";
      if (totalParticipants <= 4) return "h-[200px] lg:h-[300px]";
      return "h-[150px] lg:h-[200px]";
    };

    return (
      <div className={cn("grid gap-4", getGridClass())}>
        {/* Local video */}
        <VideoTile
          stream={localStream}
          isLocal={true}
          isMuted={!isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          participantName="Você"
          className={cn(
            getVideoHeight(),
            activeSpeaker === "local" && "ring-2 ring-green-500 ring-offset-2"
          )}
          onClick={() => onParticipantClick?.("local")}
        />

        {/* Remote videos */}
        {remoteStreamArray.map(([userId, stream], index) => {
          const participantState = participantStates.get(userId);
          const participantName = participantNames.get(userId) || `Participante ${index + 1}`;
          const isSharing = screenSharingParticipant === userId;
          const isSpeaking = activeSpeaker === userId;
          const displayName = isSharing ? `🖥️ ${participantName} (Compartilhando)` : participantName;

          return (
            <VideoTile
              key={userId}
              stream={stream}
              isLocal={false}
              isMuted={participantState ? !participantState.isAudioEnabled : false}
              isVideoEnabled={participantState ? participantState.isVideoEnabled : true}
              participantName={displayName}
              className={cn(
                getVideoHeight(),
                isSharing && "ring-2 ring-blue-500 ring-offset-2",
                isSpeaking && "ring-2 ring-green-500 ring-offset-2"
              )}
              peerConnection={peerConnections.get(userId) || null}
              onClick={() => onParticipantClick?.(userId)}
            />
          );
        })}
      </div>
    );
  };

  // Speaker View - Large view for active speaker, small thumbnails for others
  const renderSpeakerView = () => {
    let mainParticipant: { id: string; stream: MediaStream | null; name: string; isLocal: boolean } | null = null;
    let thumbnailParticipants: Array<{ id: string; stream: MediaStream | null; name: string; isLocal: boolean }> = [];

    // Determine main participant (active speaker or screen sharer)
    if (screenSharingParticipant && remoteStreams.has(screenSharingParticipant)) {
      mainParticipant = {
        id: screenSharingParticipant,
        stream: remoteStreams.get(screenSharingParticipant) || null,
        name: `🖥️ ${participantNames.get(screenSharingParticipant) || "Participante"} (Compartilhando)`,
        isLocal: false,
      };
    } else if (activeSpeaker === "local") {
      mainParticipant = {
        id: "local",
        stream: localStream,
        name: "Você",
        isLocal: true,
      };
    } else if (activeSpeaker && remoteStreams.has(activeSpeaker)) {
      mainParticipant = {
        id: activeSpeaker,
        stream: remoteStreams.get(activeSpeaker) || null,
        name: participantNames.get(activeSpeaker) || "Participante",
        isLocal: false,
      };
    } else {
      // Fallback: use first remote participant or local
      if (remoteStreamArray.length > 0) {
        const [userId, stream] = remoteStreamArray[0];
        mainParticipant = {
          id: userId,
          stream,
          name: participantNames.get(userId) || "Participante",
          isLocal: false,
        };
      } else {
        mainParticipant = {
          id: "local",
          stream: localStream,
          name: "Você",
          isLocal: true,
        };
      }
    }

    // Add all other participants as thumbnails
    if (mainParticipant.id !== "local") {
      thumbnailParticipants.push({
        id: "local",
        stream: localStream,
        name: "Você",
        isLocal: true,
      });
    }

    for (const [userId, stream] of remoteStreamArray) {
      if (userId !== mainParticipant.id) {
        thumbnailParticipants.push({
          id: userId,
          stream,
          name: participantNames.get(userId) || "Participante",
          isLocal: false,
        });
      }
    }

    return (
      <div className="relative h-full">
        {/* Main participant */}
        <div className="h-full pb-24">
          {mainParticipant && (
            <VideoTile
              stream={mainParticipant.stream}
              isLocal={mainParticipant.isLocal}
              isMuted={
                mainParticipant.isLocal
                  ? !isAudioEnabled
                  : !participantStates.get(mainParticipant.id)?.isAudioEnabled
              }
              isVideoEnabled={
                mainParticipant.isLocal
                  ? isVideoEnabled
                  : participantStates.get(mainParticipant.id)?.isVideoEnabled ?? true
              }
              participantName={mainParticipant.name}
              className="h-full w-full"
              peerConnection={
                mainParticipant.isLocal ? null : peerConnections.get(mainParticipant.id) || null
              }
              onClick={() => onParticipantClick?.(mainParticipant.id)}
            />
          )}
        </div>

        {/* Thumbnail participants */}
        {thumbnailParticipants.length > 0 && (
          <div className="absolute bottom-4 right-4 flex space-x-2 max-w-[50%] overflow-x-auto">
            {thumbnailParticipants.map((participant) => (
              <VideoTile
                key={participant.id}
                stream={participant.stream}
                isLocal={participant.isLocal}
                isMuted={
                  participant.isLocal
                    ? !isAudioEnabled
                    : !participantStates.get(participant.id)?.isAudioEnabled
                }
                isVideoEnabled={
                  participant.isLocal
                    ? isVideoEnabled
                    : participantStates.get(participant.id)?.isVideoEnabled ?? true
                }
                participantName={participant.name}
                className={cn(
                  "w-32 h-24 flex-shrink-0 border-2 border-white shadow-lg rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform",
                  activeSpeaker === participant.id && "ring-2 ring-green-500"
                )}
                peerConnection={
                  participant.isLocal ? null : peerConnections.get(participant.id) || null
                }
                onClick={() => onParticipantClick?.(participant.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Spotlight View - Focus on specific participant
  const renderSpotlightView = () => {
    let spotlightStream: MediaStream | null = null;
    let spotlightName = "";
    let isSpotlightLocal = false;
    let spotlightId = spotlightParticipant || activeSpeaker || "local";

    if (spotlightId === "local") {
      spotlightStream = localStream;
      spotlightName = "Você";
      isSpotlightLocal = true;
    } else if (remoteStreams.has(spotlightId)) {
      spotlightStream = remoteStreams.get(spotlightId) || null;
      spotlightName = participantNames.get(spotlightId) || "Participante";
      isSpotlightLocal = false;
    } else {
      // Fallback to first available participant
      if (remoteStreamArray.length > 0) {
        const [userId, stream] = remoteStreamArray[0];
        spotlightStream = stream;
        spotlightName = participantNames.get(userId) || "Participante";
        spotlightId = userId;
        isSpotlightLocal = false;
      } else {
        spotlightStream = localStream;
        spotlightName = "Você";
        spotlightId = "local";
        isSpotlightLocal = true;
      }
    }

    return (
      <div className="h-full flex items-center justify-center">
        {spotlightStream ? (
          <VideoTile
            stream={spotlightStream}
            isLocal={isSpotlightLocal}
            isMuted={
              isSpotlightLocal
                ? !isAudioEnabled
                : !participantStates.get(spotlightId)?.isAudioEnabled
            }
            isVideoEnabled={
              isSpotlightLocal
                ? isVideoEnabled
                : participantStates.get(spotlightId)?.isVideoEnabled ?? true
            }
            participantName={spotlightName}
            className="w-full h-full max-w-4xl max-h-[80vh]"
            peerConnection={
              isSpotlightLocal ? null : peerConnections.get(spotlightId) || null
            }
          />
        ) : (
          <div className="text-center p-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum participante selecionado para foco</p>
          </div>
        )}
      </div>
    );
  };

  // Render based on view mode
  switch (viewMode) {
    case "speaker":
      return renderSpeakerView();
    case "spotlight":
      return renderSpotlightView();
    case "gallery":
    default:
      return renderGalleryView();
  }
};

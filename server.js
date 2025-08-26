const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Armazenar salas e usuários
const rooms = new Map(); // roomId -> Set of socketIds
// Armazenar pedidos de entrada pendentes
const pendingRequests = new Map(); // roomId -> Map of socketId -> request data
// Armazenar informações dos participantes
const participants = new Map(); // socketId -> { userName, roomId }

io.on("connection", (socket) => {
  console.log(
    `✅ [SOCKET] Usuário conectado: ${socket.id} de ${socket.handshake.address}`,
  );
  console.log(`📊 [STATS] Total de conexões ativas: ${io.engine.clientsCount}`);

  // Solicitar entrada em uma sala (novo sistema de aprovação)
  socket.on("request-join-room", (data) => {
    const { roomId, userName } = data;

    // Verificar se a sala existe
    if (!rooms.has(roomId)) {
      socket.emit("join-error", { message: "Sala não encontrada" });
      return;
    }

    // Verificar se já está na sala
    if (rooms.get(roomId).has(socket.id)) {
      socket.emit("join-error", { message: "Você já está na sala" });
      return;
    }

    // Criar estrutura de pedidos pendentes se não existir
    if (!pendingRequests.has(roomId)) {
      pendingRequests.set(roomId, new Map());
    }

    // Adicionar pedido pendente
    pendingRequests.get(roomId).set(socket.id, {
      socketId: socket.id,
      userName: userName || "Usuário Anônimo",
      timestamp: new Date(),
    });

    // Notificar host da sala sobre pedido de entrada
    const roomUsers = Array.from(rooms.get(roomId));
    const hostSocketId = roomUsers[0]; // Primeiro usuário é considerado host

    if (hostSocketId) {
      io.to(hostSocketId).emit("join-request", {
        socketId: socket.id,
        userName: userName || "Usuário Anônimo",
        roomId,
      });
    }

    console.log(
      `Usuário ${socket.id} (${userName}) solicitou entrada na sala ${roomId}`,
    );
  });

  // Aprovar entrada na sala
  socket.on("approve-join", (data) => {
    const { roomId, socketId } = data;

    // Verificar se o usuário é host da sala
    const roomUsers = Array.from(rooms.get(roomId) || []);
    if (!roomUsers.includes(socket.id) || roomUsers[0] !== socket.id) {
      socket.emit("error", { message: "Você não é o host desta sala" });
      return;
    }

    // Verificar se há pedido pendente
    if (
      !pendingRequests.has(roomId) ||
      !pendingRequests.get(roomId).has(socketId)
    ) {
      socket.emit("error", { message: "Pedido não encontrado" });
      return;
    }

    // Get pending request info
    const requestInfo = pendingRequests.get(roomId).get(socketId);

    // Remover pedido pendente
    pendingRequests.get(roomId).delete(socketId);

    // Adicionar usuário à sala
    rooms.get(roomId).add(socketId);
    io.sockets.sockets.get(socketId)?.join(roomId);

    // Store participant info
    participants.set(socketId, { userName: requestInfo.userName, roomId });

    // Send existing participants info to new user
    const existingParticipants = [];
    for (const existingSocketId of rooms.get(roomId)) {
      if (existingSocketId !== socketId) {
        const participantInfo = participants.get(existingSocketId);
        if (participantInfo) {
          existingParticipants.push({
            socketId: existingSocketId,
            userName: participantInfo.userName
          });
        }
      }
    }

    // Notificar aprovação com informações da sala
    io.to(socketId).emit("join-approved", {
      roomId,
      existingParticipants
    });

    // Notificar outros usuários na sala sobre o novo participante
    socket.to(roomId).emit("user-joined", {
      socketId: socketId,
      userName: requestInfo.userName
    });

    console.log(`Entrada aprovada para ${socketId} (${requestInfo.userName}) na sala ${roomId}`);
  });

  // Rejeitar entrada na sala
  socket.on("reject-join", (data) => {
    const { roomId, socketId } = data;

    // Verificar se o usuário é host da sala
    const roomUsers = Array.from(rooms.get(roomId) || []);
    if (!roomUsers.includes(socket.id) || roomUsers[0] !== socket.id) {
      socket.emit("error", { message: "Você não é o host desta sala" });
      return;
    }

    // Remover pedido pendente
    if (pendingRequests.has(roomId)) {
      pendingRequests.get(roomId).delete(socketId);
    }

    // Notificar rejeição
    io.to(socketId).emit("join-rejected", { roomId });

    console.log(`Entrada rejeitada para ${socketId} na sala ${roomId}`);
  });

  // Entrar em uma sala diretamente (para criadores de sala)
  socket.on("join-room", (data) => {
    const { roomId, userName } = typeof data === 'string' ? { roomId: data, userName: 'Usuário Anônimo' } : data;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(socket.id);

    // Store participant info
    participants.set(socket.id, { userName: userName || 'Usuário Anônimo', roomId });

    // Send existing participants info to new user
    const existingParticipants = [];
    for (const existingSocketId of rooms.get(roomId)) {
      if (existingSocketId !== socket.id) {
        const participantInfo = participants.get(existingSocketId);
        if (participantInfo) {
          existingParticipants.push({
            socketId: existingSocketId,
            userName: participantInfo.userName
          });
        }
      }
    }

    if (existingParticipants.length > 0) {
      socket.emit("existing-participants", existingParticipants);
    }

    // Notificar outros usuários na sala sobre o novo participante
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName: userName || 'Usuário Anônimo'
    });

    console.log(`Usuário ${socket.id} (${userName}) entrou na sala ${roomId}`);
  });

  // Encaminhar oferta WebRTC
  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", {
      offer: data.offer,
      sender: socket.id,
    });
  });

  // Encaminhar resposta WebRTC
  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", {
      answer: data.answer,
      sender: socket.id,
    });
  });

  // Encaminhar candidatos ICE
  socket.on("ice-candidate", (data) => {
    socket.to(data.target).emit("ice-candidate", {
      candidate: data.candidate,
      sender: socket.id,
    });
  });

  // Handle participant state changes (mute/video/screen sharing)
  socket.on("participant-state-change", (data) => {
    const { roomId, isAudioEnabled, isVideoEnabled, isScreenSharing } = data;

    console.log(`[STATE] ${socket.id} changed state in room ${roomId}:`, {
      audio: isAudioEnabled,
      video: isVideoEnabled,
      screenSharing: isScreenSharing,
    });

    // Verify user is in the room
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      console.log(`[STATE ERROR] User ${socket.id} not in room ${roomId}`);
      return;
    }

    // Broadcast state change to all other users in the room
    socket.to(roomId).emit("participant-state-changed", {
      participantId: socket.id,
      isAudioEnabled,
      isVideoEnabled,
      isScreenSharing,
    });
  });

  // Handle screen sharing events
  socket.on("screen-share-started", (data) => {
    const { roomId } = data;

    console.log(`[SCREEN_SHARE] ${socket.id} started screen sharing in room ${roomId}`);

    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      return;
    }

    const participantInfo = participants.get(socket.id);
    socket.to(roomId).emit("screen-share-started", {
      participantId: socket.id,
      userName: participantInfo ? participantInfo.userName : 'Participante'
    });
  });

  socket.on("screen-share-stopped", (data) => {
    const { roomId } = data;

    console.log(`[SCREEN_SHARE] ${socket.id} stopped screen sharing in room ${roomId}`);

    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      return;
    }

    const participantInfo = participants.get(socket.id);
    socket.to(roomId).emit("screen-share-stopped", {
      participantId: socket.id,
      userName: participantInfo ? participantInfo.userName : 'Participante'
    });
  });

  // Eventos de Chat
  socket.on("chat-message", (data) => {
    const { roomId, message, userName } = data;

    console.log(`[CHAT DEBUG] Mensagem recebida de ${socket.id}:`, {
      roomId,
      message: message?.substring(0, 50),
      userName,
      hasRoom: rooms.has(roomId),
      isInRoom: rooms.has(roomId) ? rooms.get(roomId).has(socket.id) : false,
      roomSize: rooms.has(roomId) ? rooms.get(roomId).size : 0,
    });

    // Verificar se o usuário está na sala
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      console.log(
        `[CHAT ERROR] Usuário ${socket.id} não está na sala ${roomId}`,
      );
      socket.emit("error", { message: "Você não está nesta sala" });
      return;
    }

    // Enviar mensagem para todos na sala (incluindo o remetente)
    const chatMessage = {
      message: message.trim(),
      sender: socket.id,
      userName: userName || "Usuário Anônimo",
      timestamp: new Date(),
      roomId,
    };

    io.to(roomId).emit("chat-message", chatMessage);
    console.log(
      `[CHAT SUCCESS] Mensagem enviada na sala ${roomId} por ${userName || "Anônimo"}: ${message.trim()}`,
    );
  });

  // Lidar com desconexão
  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);

    const participantInfo = participants.get(socket.id);
    const participantName = participantInfo ? participantInfo.userName : 'Usuário Desconhecido';

    // Remover usuário de todas as salas
    for (let [roomId, users] of rooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        // Send participant info when notifying about leaving
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          userName: participantName
        });

        // Remover sala se estiver vazia
        if (users.size === 0) {
          rooms.delete(roomId);
          // Limpar pedidos pendentes da sala vazia
          pendingRequests.delete(roomId);
        }
      }
    }

    // Clean up participant info
    participants.delete(socket.id);

    // Remover de pedidos pendentes
    for (let [roomId, requests] of pendingRequests.entries()) {
      if (requests.has(socket.id)) {
        requests.delete(socket.id);

        // Notificar host que o pedido foi cancelado
        const roomUsers = Array.from(rooms.get(roomId) || []);
        const hostSocketId = roomUsers[0];
        if (hostSocketId) {
          io.to(hostSocketId).emit("join-request-cancelled", {
            socketId: socket.id,
            roomId,
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor WebRTC rodando na porta ${PORT}`);
});

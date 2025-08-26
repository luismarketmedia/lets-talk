const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Armazenar salas e usuários
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    // Entrar em uma sala
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        
        rooms.get(roomId).add(socket.id);
        
        // Notificar outros usuários na sala
        socket.to(roomId).emit('user-joined', socket.id);
        
        console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
    });

    // Encaminhar oferta WebRTC
    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            sender: socket.id
        });
    });

    // Encaminhar resposta WebRTC
    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            sender: socket.id
        });
    });

    // Encaminhar candidatos ICE
    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    // Lidar com desconexão
    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        
        // Remover usuário de todas as salas
        for (let [roomId, users] of rooms.entries()) {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                socket.to(roomId).emit('user-left', socket.id);
                
                // Remover sala se estiver vazia
                if (users.size === 0) {
                    rooms.delete(roomId);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor WebRTC rodando na porta ${PORT}`);
});


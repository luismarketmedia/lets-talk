// Elementos DOM
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const status = document.getElementById('status');

// Variáveis globais
let socket;
let localStream;
let remoteStream;
let peerConnection;
let currentRoom;

// Configuração ICE servers (usando servidores públicos do Google)
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Inicializar aplicação
async function init() {
    try {
        // Conectar ao servidor Socket.IO
        socket = io();
        
        // Configurar event listeners
        setupSocketEvents();
        setupUIEvents();
        
        updateStatus('Conectado ao servidor', 'connected');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        updateStatus('Erro na inicialização', 'disconnected');
    }
}

// Configurar eventos do Socket.IO
function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        updateStatus('Conectado ao servidor', 'connected');
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        updateStatus('Desconectado do servidor', 'disconnected');
    });
    
    socket.on('user-joined', async (userId) => {
        console.log('Usuário entrou na sala:', userId);
        updateStatus('Usuário entrou na sala. Estabelecendo conexão...', 'connecting');
        
        // Criar oferta para o novo usuário
        await createOffer(userId);
    });
    
    socket.on('user-left', (userId) => {
        console.log('Usuário saiu da sala:', userId);
        updateStatus('Usuário saiu da sala', 'connected');
        
        // Limpar vídeo remoto
        if (remoteVideo.srcObject) {
            remoteVideo.srcObject = null;
        }
    });
    
    socket.on('offer', async (data) => {
        console.log('Oferta recebida de:', data.sender);
        await handleOffer(data.offer, data.sender);
    });
    
    socket.on('answer', async (data) => {
        console.log('Resposta recebida de:', data.sender);
        await handleAnswer(data.answer);
    });
    
    socket.on('ice-candidate', async (data) => {
        console.log('Candidato ICE recebido de:', data.sender);
        await handleIceCandidate(data.candidate);
    });
}

// Configurar eventos da UI
function setupUIEvents() {
    joinBtn.addEventListener('click', joinRoom);
    leaveBtn.addEventListener('click', leaveRoom);
    
    roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });
}

// Entrar na sala
async function joinRoom() {
    const roomId = roomInput.value.trim();
    
    if (!roomId) {
        alert('Por favor, digite um ID de sala');
        return;
    }
    
    try {
        updateStatus('Obtendo acesso à câmera...', 'connecting');
        
        // Obter stream local (câmera e microfone)
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        localVideo.srcObject = localStream;
        
        // Entrar na sala via Socket.IO
        socket.emit('join-room', roomId);
        currentRoom = roomId;
        
        // Atualizar UI
        joinBtn.disabled = true;
        leaveBtn.disabled = false;
        roomInput.disabled = true;
        
        updateStatus(`Conectado à sala: ${roomId}`, 'connected');
        
    } catch (error) {
        console.error('Erro ao entrar na sala:', error);
        updateStatus('Erro ao acessar câmera/microfone', 'disconnected');
        alert('Erro ao acessar câmera/microfone. Verifique as permissões.');
    }
}

// Sair da sala
function leaveRoom() {
    // Parar stream local
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }
    
    // Limpar vídeo remoto
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject = null;
    }
    
    // Fechar conexão peer
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Atualizar UI
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
    roomInput.disabled = false;
    
    currentRoom = null;
    updateStatus('Desconectado da sala', 'disconnected');
}

// Criar conexão peer
function createPeerConnection(targetUserId) {
    peerConnection = new RTCPeerConnection(iceServers);
    
    // Adicionar stream local
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    // Lidar com stream remoto
    peerConnection.ontrack = (event) => {
        console.log('Stream remoto recebido');
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
        updateStatus('Conexão estabelecida!', 'connected');
    };
    
    // Lidar com candidatos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                candidate: event.candidate,
                target: targetUserId
            });
        }
    };
    
    // Lidar com mudanças de estado da conexão
    peerConnection.onconnectionstatechange = () => {
        console.log('Estado da conexão:', peerConnection.connectionState);
        
        switch (peerConnection.connectionState) {
            case 'connected':
                updateStatus('Conexão WebRTC estabelecida!', 'connected');
                break;
            case 'disconnected':
                updateStatus('Conexão WebRTC perdida', 'connecting');
                break;
            case 'failed':
                updateStatus('Falha na conexão WebRTC', 'disconnected');
                break;
        }
    };
    
    return peerConnection;
}

// Criar oferta
async function createOffer(targetUserId) {
    try {
        const pc = createPeerConnection(targetUserId);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('offer', {
            offer: offer,
            target: targetUserId
        });
        
    } catch (error) {
        console.error('Erro ao criar oferta:', error);
    }
}

// Lidar com oferta recebida
async function handleOffer(offer, senderId) {
    try {
        const pc = createPeerConnection(senderId);
        
        await pc.setRemoteDescription(offer);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('answer', {
            answer: answer,
            target: senderId
        });
        
    } catch (error) {
        console.error('Erro ao lidar com oferta:', error);
    }
}

// Lidar com resposta recebida
async function handleAnswer(answer) {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Erro ao lidar com resposta:', error);
    }
}

// Lidar com candidato ICE
async function handleIceCandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Erro ao adicionar candidato ICE:', error);
    }
}

// Atualizar status na UI
function updateStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
}

// Inicializar aplicação quando a página carregar
window.addEventListener('load', init);


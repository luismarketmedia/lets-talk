# WebRTC Video Chat

Uma aplicação simples de videochamada usando WebRTC e Node.js que permite comunicação em tempo real entre navegadores.

## Funcionalidades

- **Videochamada peer-to-peer**: Comunicação direta entre navegadores usando WebRTC
- **Salas de chat**: Usuários podem se conectar a salas específicas usando um ID
- **Interface responsiva**: Funciona em desktop e dispositivos móveis
- **Servidor de sinalização**: Coordena o estabelecimento de conexões WebRTC
- **Status em tempo real**: Mostra o estado da conexão

## Tecnologias Utilizadas

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **WebRTC**: Para comunicação peer-to-peer
- **Socket.IO**: Para sinalização entre clientes

## Estrutura do Projeto

```
webrtc-app/
├── server.js              # Servidor de sinalização
├── package.json           # Dependências do projeto
├── public/
│   ├── index.html         # Interface do usuário
│   └── script.js          # Lógica WebRTC do cliente
└── README.md              # Este arquivo
```

## Como Executar

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

### Instalação

1. Clone ou baixe o projeto
2. Navegue até o diretório do projeto:
   ```bash
   cd webrtc-app
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

### Executar a Aplicação

1. Inicie o servidor:
   ```bash
   npm start
   ```

2. Abra o navegador e acesse:
   ```
   http://localhost:3000
   ```

3. Para testar a videochamada:
   - Abra duas abas ou janelas do navegador
   - Digite o mesmo ID de sala em ambas (ex: "sala123")
   - Clique em "Entrar na Sala" em ambas as abas
   - Permita o acesso à câmera e microfone quando solicitado

## Como Usar

1. **Entrar em uma sala**:
   - Digite um ID de sala no campo de texto
   - Clique em "Entrar na Sala"
   - Permita o acesso à câmera e microfone

2. **Conectar com outros usuários**:
   - Compartilhe o ID da sala com outros usuários
   - Quando eles entrarem na mesma sala, a conexão será estabelecida automaticamente

3. **Sair da sala**:
   - Clique em "Sair da Sala" para desconectar

## Recursos Técnicos

### Servidor de Sinalização (server.js)

- **Express**: Serve arquivos estáticos e gerencia rotas
- **Socket.IO**: Gerencia comunicação em tempo real para sinalização
- **Salas**: Organiza usuários em salas virtuais
- **Eventos suportados**:
  - `join-room`: Entrar em uma sala
  - `offer`: Enviar oferta WebRTC
  - `answer`: Enviar resposta WebRTC
  - `ice-candidate`: Trocar candidatos ICE

### Cliente WebRTC (script.js)

- **getUserMedia**: Captura vídeo e áudio do usuário
- **RTCPeerConnection**: Estabelece conexão peer-to-peer
- **ICE Servers**: Usa servidores STUN do Google para NAT traversal
- **Sinalização**: Comunica com servidor via Socket.IO

## Configurações

### ICE Servers

A aplicação usa servidores STUN públicos do Google:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

Para ambientes de produção, considere usar servidores TURN próprios para melhor conectividade.

### Porta do Servidor

Por padrão, o servidor roda na porta 3000. Para alterar:
```bash
PORT=8080 npm start
```

## Limitações

- Suporta apenas conexões 1:1 (dois usuários por sala)
- Não inclui recursos de chat por texto
- Não tem persistência de dados
- Requer HTTPS em produção para funcionar corretamente

## Melhorias Futuras

- Suporte para múltiplos usuários por sala
- Chat por texto
- Compartilhamento de tela
- Gravação de chamadas
- Autenticação de usuários
- Interface administrativa

## Troubleshooting

### Problemas Comuns

1. **Câmera/microfone não funcionam**:
   - Verifique as permissões do navegador
   - Use HTTPS em produção

2. **Conexão não estabelecida**:
   - Verifique se ambos os usuários estão na mesma sala
   - Verifique a conectividade de rede
   - Considere usar servidores TURN para NATs restritivos

3. **Erro de CORS**:
   - O servidor já está configurado para aceitar todas as origens
   - Em produção, configure origens específicas por segurança

## Licença

Este projeto é de código aberto e pode ser usado livremente para fins educacionais e comerciais.


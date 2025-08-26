# Let's Talk - WebRTC Video Chat

Uma aplicação moderna de videochamada usando WebRTC, Node.js, React com Vite e Tailwind CSS.

## 🚀 Funcionalidades

- **Videochamada peer-to-peer**: Comunicação direta entre navegadores usando WebRTC
- **Códigos de reunião profissionais**: Formatos similares ao Google Meet, Zoom e Teams
- **Interface moderna**: Cliente React com Tailwind CSS e componentes estilizados
- **Salas de chat**: Usuários podem criar ou se conectar a salas específicas
- **Controles intuitivos**: Stop/Play para microfone, câmera, compartilhamento de tela
- **Verificação de dispositivos**: Checagem automática de câmera e microfone
- **Design responsivo**: Funciona perfeitamente em desktop e dispositivos móveis
- **Tema personalizado**: Cores baseadas no logo "Let's Talk" (azuis e branco)

## 🛠 Tecnologias

### Backend
- Node.js + Express
- Socket.IO para sinalização
- WebRTC para comunicação P2P

### Frontend (Cliente)
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS para estilização
- Componentes UI customizados (inspirados em shadcn/ui)
- Lucide React para ícones

## 📁 Estrutura do Projeto

```
webrtc-app/
├── server.js              # Servidor de sinalização WebRTC
├── package.json           # Dependências do servidor
├── public/                # Cliente HTML antigo (legacy)
├── client/                # Novo cliente React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── ui/        # Componentes UI base
│   │   │   ├── JoinRoom.tsx
│   │   │   ├── CallInterface.tsx
│   │   │   ├── VideoTile.tsx
│   │   │   └── MediaControls.tsx
│   │   ├── hooks/         # Hooks customizados
│   │   │   └── useWebRTC.ts
│   │   ├── types/         # Definições TypeScript
│   │   │   └── webrtc.ts
│   │   ├── lib/           # Utilitários
│   │   │   └── utils.ts
│   │   ├── App.tsx        # Componente principal
│   │   └── main.tsx       # Entry point
│   ├── package.json       # Dependências do cliente
│   └── tailwind.config.js # Configuração Tailwind
└── README.md              # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm

### Instalação

1. **Instalar dependências do servidor:**
   ```bash
   npm install
   ```

2. **Instalar dependências do cliente:**
   ```bash
   npm run install:client
   ```

### Executar em Desenvolvimento

1. **Iniciar o servidor WebRTC:**
   ```bash
   npm start
   ```
   O servidor roda na porta 3000.

2. **Iniciar o cliente React (em outro terminal):**
   ```bash
   npm run client
   ```
   O cliente roda na porta 5173.

3. **Ou iniciar ambos simultaneamente:**
   ```bash
   npm run dev:all
   ```

### Acessar a Aplicação

- **Cliente moderno**: http://localhost:5173
- **Cliente legado**: http://localhost:3000

## 📱 Como Usar

### Criar uma Chamada
1. Acesse o cliente moderno
2. Clique em "Criar"
3. Clique no botão "+" para gerar um código da sala
4. Clique em "Iniciar chamada"
5. Permita acesso à câmera e microfone
6. Compartilhe o código da sala com outros participantes

### Entrar em uma Chamada
1. Acesse o cliente moderno  
2. Mantenha "Entrar" selecionado
3. Digite o código da sala recebido
4. Clique em "Entrar na chamada"
5. Permita acesso à câmera e microfone

### Controles Durante a Chamada
- **🎤 Microfone**: Ativar/desativar áudio
- **📹 Câmera**: Ativar/desativar vídeo
- **🖥️ Compartilhar Tela**: Compartilhar sua tela
- **📞 Encerrar**: Sair da chamada

## 🎨 Personalização

### Cores do Tema
As cores foram extraídas do logo "Let's Talk":
- **Azul Principal**: `#0fa3e0`
- **Azul Médio**: `#0b82c4`
- **Azul Escuro**: `#0a5c8a`
- **Branco**: `#ffffff`

### Modificar Cores
Edite o arquivo `client/tailwind.config.js` na seção `colors.primary`.

## 🌐 Produção

### Build do Cliente
```bash
npm run build:client
```

### Considerações para Produção
- Configure HTTPS (obrigatório para WebRTC)
- Use servidores TURN próprios para melhor conectividade
- Configure CORS específicos por segurança
- Otimize recursos estáticos

## 🔧 Configurações

### ICE Servers
Por padrão usa servidores STUN públicos do Google. Para produção, configure TURN servers no arquivo `client/src/hooks/useWebRTC.ts`.

### Porta do Servidor
```bash
PORT=8080 npm start
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Câmera/microfone não funcionam**:
   - Verifique permissões do navegador
   - Use HTTPS em produção
   - Teste em navegador suportado (Chrome, Firefox, Safari)

2. **Conexão WebRTC falha**:
   - Verifique se ambos estão na mesma sala
   - Teste conectividade de rede
   - Configure TURN servers para NATs restritivos

3. **Cliente não carrega**:
   - Verifique se as dependências foram instaladas
   - Confirme se o servidor Vite está rodando na porta 5173
   - Verifique logs de erro no console

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é open source e pode ser usado livremente para fins educacionais e comerciais.

---

**Desenvolvido com ❤️ usando React, Tailwind CSS e WebRTC**

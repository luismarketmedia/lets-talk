# 🚀 Quick Start - Deploy Windows/IIS

Guia rápido para fazer deploy do **Let's Talk** em Windows com IIS.

## ⚡ Deploy Automático (Recomendado)

### 1. Pré-requisitos Rápidos
```powershell
# Executar como Administrador
# Instalar IIS
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole

# Instalar Node.js (download do site oficial)
# Instalar módulos IIS necessários (URLs no arquivo completo)
```

### 2. Deploy em 1 comando
```batch
# Executar como Administrador
cd scripts
quick-deploy.bat
```

**OU via PowerShell:**
```powershell
# Executar como Administrador
.\scripts\deploy-windows.ps1 -SourcePath "C:\dev\lets-talk" -Domain "meet.empresa.com"
```

---

## 📋 Deploy Manual Rápido

### Cliente (Frontend)
```bash
cd client
npm install
npm run build

# Copiar dist/ para C:\inetpub\wwwroot\letstalk-client
# Criar site IIS apontando para essa pasta
```

### Servidor (Backend) - Modo Standalone
```bash
npm install -g pm2
npm install

# Criar site IIS com proxy reverso para localhost:3000
pm2 start server.js --name letstalk-server
pm2 save
```

---

## 🔧 Configurações Essenciais

### web.config - Cliente (SPA)
```xml
<!-- Colocar em C:\inetpub\wwwroot\letstalk-client\web.config -->
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### web.config - Proxy Reverso
```xml
<!-- Para site proxy IIS apontando para Node.js -->
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <webSocket enabled="true" />
  </system.webServer>
</configuration>
```

---

## 🌐 Estrutura Final

```
IIS Sites:
├── LetsTalk-Client (Port 80/443)
│   └── C:\inetpub\wwwroot\letstalk-client\
└── LetsTalk-Proxy (Port 80/443 com host header)
    └── C:\inetpub\wwwroot\letstalk-proxy\

PM2 Process:
└── letstalk-server (Port 3000)
    └── C:\inetpub\wwwroot\letstalk-server\
```

---

## 🔍 Verificação Rápida

### Testar se funcionou:
1. **Cliente**: `http://seudominio.com` → Deve carregar a interface
2. **Servidor**: `http://seudominio.com/socket.io/` → Deve retornar dados Socket.IO
3. **WebSocket**: Teste criar uma sala → Deve funcionar sem erros

### Comandos úteis:
```powershell
# Ver status PM2
pm2 status

# Ver logs PM2
pm2 logs letstalk-server

# Reiniciar servidor
pm2 restart letstalk-server

# Ver sites IIS
Get-Website
```

---

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Erro 500.19 | Verificar web.config |
| WebSocket não conecta | Verificar proxy e WebSocket enabled |
| Página em branco | Verificar VITE_SERVER_URL |
| PM2 não inicia | Verificar permissões e logs |

---

## 📖 Documentação Completa

Para instruções detalhadas, troubleshooting e configurações avançadas:
👉 **[DEPLOYMENT_WINDOWS_IIS.md](DEPLOYMENT_WINDOWS_IIS.md)**

---

## 📞 URLs Importantes

Após deploy bem-sucedido:
- **Aplicação**: `http(s)://seudominio.com`
- **Teste Socket.IO**: `http(s)://seudominio.com/socket.io/`
- **IIS Manager**: `inetmgr.exe`
- **Logs IIS**: `C:\inetpub\logs\LogFiles\`

**🎉 Pronto! Sua aplicação Let's Talk está rodando no Windows/IIS!**

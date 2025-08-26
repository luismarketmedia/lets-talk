# Let's Talk - Deployment para Windows/IIS

Esta documentação explica como fazer o deploy da aplicação Let's Talk em ambiente Windows usando IIS (Internet Information Services).

## 📋 Pré-requisitos

### Software Necessário
- **Windows Server 2016+** ou **Windows 10/11 Pro**
- **IIS** instalado com os recursos:
  - Servidor Web (IIS)
  - ASP.NET Core Hosting Bundle
  - Application Request Routing (ARR) para proxy reverso
  - URL Rewrite Module
- **Node.js** (v18+ recomendado)
- **npm** ou **yarn**

### Instalação dos Recursos IIS
```powershell
# Habilitar IIS via PowerShell (executar como Administrador)
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirection
Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45
```

### Módulos Adicionais para IIS
1. **Application Request Routing (ARR)**
   - Download: https://www.iis.net/downloads/microsoft/application-request-routing
   - Necessário para proxy reverso

2. **URL Rewrite Module**
   - Download: https://www.iis.net/downloads/microsoft/url-rewrite
   - Necessário para reescrita de URLs

---

## 🎯 Parte 1: Deploy do Cliente (Frontend React)

### 1. Build do Cliente

```bash
# Navegar para o diretório client
cd client

# Instalar dependências
npm install

# Configurar variáveis de ambiente (opcional)
# Criar arquivo .env.production
VITE_SERVER_URL=https://seudominio.com.br

# Build de produção
npm run build
```

O comando `npm run build` criará uma pasta `dist/` com os arquivos estáticos otimizados.

### 2. Estrutura após Build
```
client/
├── dist/
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── [outros arquivos]
│   └── [outros arquivos estáticos]
```

### 3. Configuração no IIS

#### 3.1 Criar Site no IIS

1. Abrir **IIS Manager**
2. Clicar com botão direito em **Sites** → **Add Website**
3. Configurar:
   - **Site name**: `LetsTalk-Client`
   - **Physical path**: `C:\inetpub\wwwroot\letstalk-client`
   - **Port**: `80` (ou `443` para HTTPS)
   - **Host name**: `letstalk.seudominio.com.br`

#### 3.2 Copiar Arquivos

```powershell
# Copiar arquivos do build para o IIS
xcopy "C:\caminho\para\lets-talk\client\dist\*" "C:\inetpub\wwwroot\letstalk-client\" /E /Y
```

#### 3.3 Configurar web.config

Criar arquivo `C:\inetpub\wwwroot\letstalk-client\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- Configuração para SPA (Single Page Application) -->
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>

    <!-- Configurações de MIME types -->
    <staticContent>
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>

    <!-- Compressão -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />

    <!-- Headers de Cache -->
    <httpProtocol>
      <customHeaders>
        <add name="Cache-Control" value="no-cache, no-store, must-revalidate" />
        <add name="Pragma" value="no-cache" />
        <add name="Expires" value="0" />
      </customHeaders>
    </httpProtocol>

    <!-- Cache para assets estáticos -->
    <location path="assets">
      <system.webServer>
        <httpProtocol>
          <customHeaders>
            <clear />
            <add name="Cache-Control" value="public, max-age=31536000" />
          </customHeaders>
        </httpProtocol>
      </system.webServer>
    </location>
  </system.webServer>
</configuration>
```

---

## 🎯 Parte 2: Deploy do Servidor (Backend Node.js)

### Opção A: Usando IISNode (Recomendado)

#### 1. Instalar IISNode
- Download: https://github.com/Azure/iisnode/releases
- Instalar a versão x64

#### 2. Preparar Servidor

```bash
# No diretório raiz do projeto
npm install

# Instalar pm2 globalmente (opcional, para gerenciamento)
npm install -g pm2
```

#### 3. Criar web.config para o Servidor

Criar `web.config` no diretório raiz do projeto:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    
    <rewrite>
      <rules>
        <rule name="DynamicContent">
          <match url="/*" />
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
    
    <!-- Configurações do IISNode -->
    <iisnode
      nodeProcessCommandLine="&quot;C:\Program Files\nodejs\node.exe&quot;"
      interceptor="&quot;%programfiles%\iisnode\interceptor.js&quot;"
      logDirectory="logs"
      debuggingEnabled="false"
      loggingEnabled="true"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="3"
      namedPipeConnectionRetryDelay="2000"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      enableXFF="true"
    />

    <!-- Error pages -->
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

#### 4. Configurar Site IIS para Servidor

1. **Criar novo site:**
   - **Site name**: `LetsTalk-Server`
   - **Physical path**: `C:\inetpub\wwwroot\letstalk-server`
   - **Port**: `3000`

2. **Copiar arquivos do servidor:**
```powershell
xcopy "C:\caminho\para\lets-talk\*" "C:\inetpub\wwwroot\letstalk-server\" /E /Y /EXCLUDE:excludelist.txt
```

3. **Criar excludelist.txt** (para não copiar client):
```
client\
node_modules\
.git\
```

### Opção B: Servidor Node.js Standalone + Proxy Reverso

#### 1. Executar Node.js como Serviço

Instalar e configurar pm2:

```bash
# Instalar pm2
npm install -g pm2
npm install pm2-windows-startup -g

# Configurar startup autom��tico
pm2-startup install

# Iniciar aplicação
pm2 start server.js --name "letstalk-server"

# Salvar configuração
pm2 save
```

#### 2. Configurar Proxy Reverso no IIS

Criar site IIS para proxy:

**web.config para proxy reverso:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_ORIGINAL_ACCEPT_ENCODING" value="{HTTP_ACCEPT_ENCODING}" />
            <set name="HTTP_ACCEPT_ENCODING" value="" />
          </serverVariables>
        </rule>
      </rules>
      <outboundRules>
        <rule name="ReverseProxyOutboundRule1" preCondition="ResponseIsHtml1">
          <match filterByTags="A, Form, Img" pattern="^http(s)?://localhost:3000/(.*)" />
          <action type="Rewrite" value="http{R:1}://seudominio.com.br/{R:2}" />
        </rule>
        <preConditions>
          <preCondition name="ResponseIsHtml1">
            <add input="{RESPONSE_CONTENT_TYPE}" pattern="^text/html" />
          </preCondition>
        </preConditions>
      </outboundRules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 🔧 Configurações Adicionais

### 1. HTTPS/SSL

#### Configurar Certificado SSL:
1. Obter certificado SSL (Let's Encrypt, DigiCert, etc.)
2. Importar no Windows Certificate Store
3. Configurar binding HTTPS no IIS
4. Redirecionar HTTP para HTTPS:

```xml
<!-- Adicionar ao web.config -->
<rule name="Redirect to HTTPS" stopProcessing="true">
  <match url="." />
  <conditions>
    <add input="{HTTPS}" pattern="^OFF$" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:0}" redirectType="Permanent" />
</rule>
```

### 2. WebSockets

Para suporte completo a WebSockets no IIS:

```xml
<!-- Adicionar ao web.config do servidor -->
<system.webServer>
  <webSocket enabled="true" />
  
  <!-- Headers para WebSocket -->
  <httpProtocol>
    <customHeaders>
      <add name="Upgrade" value="websocket" />
      <add name="Connection" value="Upgrade" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

### 3. Monitoramento e Logs

#### Configurar logs do IIS:
1. Habilitar **Failed Request Tracing**
2. Configurar **IIS Logs**
3. Monitorar logs do Node.js em `logs/` (IISNode)

#### Script PowerShell para monitoramento:
```powershell
# monitor.ps1
$logPath = "C:\inetpub\wwwroot\letstalk-server\logs"
Get-ChildItem $logPath -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

---

## 🚀 Deploy Automatizado

### Script de Deploy Completo

```powershell
# deploy.ps1
param(
    [string]$SourcePath = "C:\source\lets-talk",
    [string]$IISPath = "C:\inetpub\wwwroot"
)

Write-Host "Iniciando deploy do Let's Talk..." -ForegroundColor Green

# 1. Build do Cliente
Write-Host "Building cliente..." -ForegroundColor Yellow
Set-Location "$SourcePath\client"
npm install
npm run build

# 2. Deploy Cliente
Write-Host "Deploying cliente..." -ForegroundColor Yellow
$clientDest = "$IISPath\letstalk-client"
if (Test-Path $clientDest) {
    Remove-Item $clientDest -Recurse -Force
}
Copy-Item "$SourcePath\client\dist" $clientDest -Recurse

# 3. Deploy Servidor
Write-Host "Deploying servidor..." -ForegroundColor Yellow
$serverDest = "$IISPath\letstalk-server"
if (Test-Path $serverDest) {
    # Parar aplicação
    pm2 stop letstalk-server
    Start-Sleep -Seconds 5
    Remove-Item $serverDest -Recurse -Force
}

# Copiar arquivos do servidor
Copy-Item $SourcePath $serverDest -Recurse -Exclude @("client", "node_modules", ".git")

# Instalar dependências do servidor
Set-Location $serverDest
npm install --production

# Reiniciar aplicação
pm2 start server.js --name "letstalk-server"

Write-Host "Deploy concluído com sucesso!" -ForegroundColor Green
```

---

## 📝 Checklist de Deploy

### Pré-Deploy
- [ ] IIS instalado com módulos necessários
- [ ] Node.js instalado
- [ ] Certificados SSL configurados (se necessário)
- [ ] Firewall configurado para as portas necessárias

### Deploy do Cliente
- [ ] Build executado com sucesso
- [ ] Arquivos copiados para diretório IIS
- [ ] web.config configurado
- [ ] Site IIS criado e funcionando

### Deploy do Servidor
- [ ] Dependências instaladas
- [ ] web.config configurado (IISNode) ou pm2 configurado
- [ ] Site IIS criado ou proxy reverso configurado
- [ ] WebSockets funcionando
- [ ] Logs configurados

### Pós-Deploy
- [ ] Teste de conectividade cliente-servidor
- [ ] Teste de funcionalidades WebRTC
- [ ] Teste de chat em tempo real
- [ ] Monitoramento ativo

---

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro 500.19 - web.config inválido**
   - Verificar sintaxe XML
   - Verificar se módulos necessários estão instalados

2. **WebSockets não funcionam**
   - Verificar se WebSocket está habilitado no IIS
   - Verificar proxy reverso para WebSocket

3. **Aplicação Node.js não inicia**
   - Verificar logs do IISNode
   - Verificar permissões de arquivo
   - Verificar se Node.js está no PATH

4. **Cliente não conecta ao servidor**
   - Verificar variável VITE_SERVER_URL
   - Verificar CORS no servidor
   - Verificar firewall e proxy

### Logs Importantes
- **IIS Access Logs**: `C:\inetpub\logs\LogFiles\`
- **IISNode Logs**: `C:\inetpub\wwwroot\letstalk-server\logs\`
- **Event Viewer**: Windows Logs > Application
- **PM2 Logs**: `pm2 logs`

---

## 📞 Suporte

Para suporte adicional, consulte:
- [Documentação IIS](https://docs.microsoft.com/en-us/iis/)
- [IISNode GitHub](https://github.com/Azure/iisnode)
- [Socket.IO Documentation](https://socket.io/docs/)

---

**Versão do documento**: 1.0  
**Última atualização**: Dezembro 2024

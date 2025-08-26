#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Script automatizado para deploy do Let's Talk no Windows/IIS

.DESCRIPTION
    Este script automatiza o processo completo de deploy da aplicação Let's Talk
    incluindo build do cliente, configuração do IIS e deploy do servidor.

.PARAMETER SourcePath
    Caminho para o código fonte do projeto

.PARAMETER Domain
    Domínio onde a aplicação será hospedada

.PARAMETER UseHttps
    Se deve configurar HTTPS (requer certificado)

.PARAMETER ServerPort
    Porta onde o servidor Node.js irá rodar (padrão: 3000)

.EXAMPLE
    .\deploy-windows.ps1 -SourcePath "C:\dev\lets-talk" -Domain "meet.empresa.com"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    
    [Parameter(Mandatory = $true)]
    [string]$Domain,
    
    [switch]$UseHttps = $false,
    
    [int]$ServerPort = 3000,
    
    [string]$IISPath = "C:\inetpub\wwwroot",
    
    [ValidateSet("IISNode", "Standalone")]
    [string]$ServerDeploymentMode = "Standalone"
)

# Cores para output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Cyan"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Test-Prerequisites {
    Write-Step "Verificando pré-requisitos"
    
    # Verificar se é executado como administrador
    if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Error "Este script deve ser executado como Administrador"
        exit 1
    }
    
    # Verificar Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-Error "Node.js não encontrado. Instale Node.js antes de continuar."
        exit 1
    }
    
    # Verificar npm
    try {
        $npmVersion = npm --version
        Write-Success "npm encontrado: $npmVersion"
    }
    catch {
        Write-Error "npm não encontrado"
        exit 1
    }
    
    # Verificar IIS
    $iisFeature = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
    if ($iisFeature.State -ne "Enabled") {
        Write-Error "IIS não está instalado. Execute: Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole"
        exit 1
    }
    Write-Success "IIS encontrado e habilitado"
    
    # Verificar PM2 se usando modo Standalone
    if ($ServerDeploymentMode -eq "Standalone") {
        try {
            $pm2Version = pm2 --version
            Write-Success "PM2 encontrado: $pm2Version"
        }
        catch {
            Write-Warning "PM2 não encontrado. Instalando..."
            npm install -g pm2
            npm install -g pm2-windows-startup
            Write-Success "PM2 instalado"
        }
    }
}

function Build-Client {
    Write-Step "Building cliente React"
    
    $clientPath = Join-Path $SourcePath "client"
    
    if (-not (Test-Path $clientPath)) {
        Write-Error "Diretório client não encontrado: $clientPath"
        exit 1
    }
    
    Set-Location $clientPath
    
    # Criar arquivo .env.production
    $envContent = "VITE_SERVER_URL=http"
    if ($UseHttps) {
        $envContent += "s"
    }
    $envContent += "://$Domain"
    
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Success "Arquivo .env.production criado"
    
    # Instalar dependências
    Write-Host "Instalando dependências do cliente..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na instalação das dependências do cliente"
        exit 1
    }
    Write-Success "Dependências do cliente instaladas"
    
    # Build
    Write-Host "Executando build do cliente..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha no build do cliente"
        exit 1
    }
    Write-Success "Build do cliente concluído"
}

function Deploy-Client {
    Write-Step "Fazendo deploy do cliente"
    
    $clientDest = Join-Path $IISPath "letstalk-client"
    $clientSource = Join-Path $SourcePath "client\dist"
    
    # Remover diretório existente
    if (Test-Path $clientDest) {
        Write-Host "Removendo deploy anterior..."
        Remove-Item $clientDest -Recurse -Force
    }
    
    # Copiar arquivos
    Write-Host "Copiando arquivos do cliente..."
    Copy-Item $clientSource $clientDest -Recurse
    Write-Success "Arquivos do cliente copiados"
    
    # Criar web.config
    $webConfigContent = @'
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
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
  </system.webServer>
</configuration>
'@
    
    $webConfigPath = Join-Path $clientDest "web.config"
    $webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8
    Write-Success "web.config do cliente criado"
}

function Create-IIS-Site {
    param(
        [string]$SiteName,
        [string]$PhysicalPath,
        [int]$Port,
        [string]$HostHeader = ""
    )
    
    # Importar módulo WebAdministration
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    
    # Remover site existente
    if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
        Write-Host "Removendo site IIS existente: $SiteName"
        Remove-Website -Name $SiteName
    }
    
    # Criar novo site
    if ($HostHeader) {
        New-Website -Name $SiteName -PhysicalPath $PhysicalPath -Port $Port -HostHeader $HostHeader
    } else {
        New-Website -Name $SiteName -PhysicalPath $PhysicalPath -Port $Port
    }
    
    Write-Success "Site IIS criado: $SiteName"
}

function Deploy-Server-Standalone {
    Write-Step "Fazendo deploy do servidor (modo Standalone + Proxy)"
    
    $serverDest = Join-Path $IISPath "letstalk-server"
    
    # Parar aplicação PM2 se estiver rodando
    try {
        pm2 stop letstalk-server 2>$null
        pm2 delete letstalk-server 2>$null
    } catch {
        # Ignorar erro se não existir
    }
    
    # Remover diretório existente
    if (Test-Path $serverDest) {
        Write-Host "Removendo deploy anterior do servidor..."
        Remove-Item $serverDest -Recurse -Force
    }
    
    # Copiar arquivos do servidor (excluindo client)
    Write-Host "Copiando arquivos do servidor..."
    $excludeItems = @("client", "node_modules", ".git", ".gitignore", "README.md")
    
    New-Item -ItemType Directory -Path $serverDest -Force | Out-Null
    
    Get-ChildItem $SourcePath | Where-Object { $_.Name -notin $excludeItems } | ForEach-Object {
        Copy-Item $_.FullName $serverDest -Recurse -Force
    }
    Write-Success "Arquivos do servidor copiados"
    
    # Instalar dependências
    Set-Location $serverDest
    Write-Host "Instalando dependências do servidor..."
    npm install --production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na instalação das dependências do servidor"
        exit 1
    }
    Write-Success "Dependências do servidor instaladas"
    
    # Configurar PM2
    Write-Host "Configurando PM2..."
    $pm2Config = @{
        name = "letstalk-server"
        script = "server.js"
        cwd = $serverDest
        env = @{
            PORT = $ServerPort
            NODE_ENV = "production"
        }
        instances = 1
        autorestart = $true
        watch = $false
        max_memory_restart = "1G"
    } | ConvertTo-Json -Depth 3
    
    $pm2ConfigPath = Join-Path $serverDest "ecosystem.config.json"
    $pm2Config | Out-File -FilePath $pm2ConfigPath -Encoding UTF8
    
    # Iniciar com PM2
    pm2 start $pm2ConfigPath
    pm2 save
    Write-Success "Servidor iniciado com PM2"
    
    # Criar site proxy no IIS
    $proxyDest = Join-Path $IISPath "letstalk-proxy"
    New-Item -ItemType Directory -Path $proxyDest -Force | Out-Null
    
    # web.config para proxy reverso
    $proxyWebConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_ORIGINAL_ACCEPT_ENCODING" value="{HTTP_ACCEPT_ENCODING}" />
            <set name="HTTP_ACCEPT_ENCODING" value="" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <webSocket enabled="true" />
  </system.webServer>
</configuration>
'@
    
    $proxyWebConfigPath = Join-Path $proxyDest "web.config"
    $proxyWebConfig | Out-File -FilePath $proxyWebConfigPath -Encoding UTF8
    
    # Criar site proxy IIS
    $proxyPort = if ($UseHttps) { 443 } else { 80 }
    Create-IIS-Site -SiteName "LetsTalk-Proxy" -PhysicalPath $proxyDest -Port $proxyPort -HostHeader $Domain
    
    Write-Success "Proxy reverso configurado"
}

function Deploy-Server-IISNode {
    Write-Step "Fazendo deploy do servidor (modo IISNode)"
    
    $serverDest = Join-Path $IISPath "letstalk-server"
    
    # Remover diretório existente
    if (Test-Path $serverDest) {
        Write-Host "Removendo deploy anterior do servidor..."
        Remove-Item $serverDest -Recurse -Force
    }
    
    # Copiar arquivos
    Write-Host "Copiando arquivos do servidor..."
    $excludeItems = @("client", "node_modules", ".git", ".gitignore", "README.md")
    
    New-Item -ItemType Directory -Path $serverDest -Force | Out-Null
    
    Get-ChildItem $SourcePath | Where-Object { $_.Name -notin $excludeItems } | ForEach-Object {
        Copy-Item $_.FullName $serverDest -Recurse -Force
    }
    
    # Instalar dependências
    Set-Location $serverDest
    Write-Host "Instalando dependências do servidor..."
    npm install --production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na instalação das dependências do servidor"
        exit 1
    }
    Write-Success "Dependências do servidor instaladas"
    
    # Criar web.config para IISNode
    $iisNodeWebConfig = @'
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
    <iisnode
      nodeProcessCommandLine="&quot;C:\Program Files\nodejs\node.exe&quot;"
      interceptor="&quot;%programfiles%\iisnode\interceptor.js&quot;"
      logDirectory="logs"
      debuggingEnabled="false"
      loggingEnabled="true"
      maxConcurrentRequestsPerProcess="1024"
      enableXFF="true"
    />
    <webSocket enabled="true" />
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
'@
    
    $iisNodeWebConfigPath = Join-Path $serverDest "web.config"
    $iisNodeWebConfig | Out-File -FilePath $iisNodeWebConfigPath -Encoding UTF8
    Write-Success "web.config do servidor criado"
    
    # Criar site IIS
    $serverPortForIIS = if ($UseHttps) { 443 } else { 80 }
    Create-IIS-Site -SiteName "LetsTalk-Server" -PhysicalPath $serverDest -Port $serverPortForIIS -HostHeader $Domain
}

function Configure-HTTPS {
    if ($UseHttps) {
        Write-Step "Configurando HTTPS"
        Write-Warning "Certificado SSL deve ser instalado manualmente no IIS Manager"
        Write-Warning "1. Obtenha um certificado SSL (Let's Encrypt, etc.)"
        Write-Warning "2. Importe no Windows Certificate Store"
        Write-Warning "3. Configure o binding HTTPS no IIS Manager"
    }
}

function Show-Summary {
    Write-Step "Resumo do Deploy"
    
    Write-Success "Deploy concluído com sucesso!"
    Write-Host ""
    Write-Host "URLs da aplicação:" -ForegroundColor $Blue
    
    $protocol = if ($UseHttps) { "https" } else { "http" }
    Write-Host "  Cliente: $protocol://$Domain" -ForegroundColor $Green
    
    if ($ServerDeploymentMode -eq "Standalone") {
        Write-Host "  Servidor: $protocol://$Domain (via proxy)" -ForegroundColor $Green
        Write-Host "  Servidor direto: http://localhost:$ServerPort" -ForegroundColor $Yellow
    } else {
        Write-Host "  Servidor: $protocol://$Domain" -ForegroundColor $Green
    }
    
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor $Blue
    
    if ($UseHttps) {
        Write-Host "  1. Configurar certificado SSL no IIS Manager" -ForegroundColor $Yellow
    }
    
    Write-Host "  2. Configurar firewall para as portas necessárias" -ForegroundColor $Yellow
    Write-Host "  3. Testar a aplicação" -ForegroundColor $Yellow
    Write-Host "  4. Configurar monitoramento" -ForegroundColor $Yellow
    
    Write-Host ""
    Write-Host "Comandos úteis:" -ForegroundColor $Blue
    
    if ($ServerDeploymentMode -eq "Standalone") {
        Write-Host "  Ver logs do servidor: pm2 logs letstalk-server" -ForegroundColor $Green
        Write-Host "  Reiniciar servidor: pm2 restart letstalk-server" -ForegroundColor $Green
        Write-Host "  Status do servidor: pm2 status" -ForegroundColor $Green
    }
    
    Write-Host "  Logs do IIS: C:\inetpub\logs\LogFiles\" -ForegroundColor $Green
}

# Execução principal
try {
    Write-Host "Let's Talk - Deploy Automatizado para Windows/IIS" -ForegroundColor $Blue
    Write-Host "======================================================" -ForegroundColor $Blue
    
    Test-Prerequisites
    Build-Client
    Deploy-Client
    
    # Criar site IIS para cliente
    $clientDest = Join-Path $IISPath "letstalk-client"
    $clientPort = if ($UseHttps) { 443 } else { 80 }
    Create-IIS-Site -SiteName "LetsTalk-Client" -PhysicalPath $clientDest -Port $clientPort -HostHeader $Domain
    
    # Deploy do servidor baseado no modo escolhido
    switch ($ServerDeploymentMode) {
        "Standalone" { Deploy-Server-Standalone }
        "IISNode" { Deploy-Server-IISNode }
    }
    
    Configure-HTTPS
    Show-Summary
    
} catch {
    Write-Error "Erro durante o deploy: $($_.Exception.Message)"
    exit 1
}

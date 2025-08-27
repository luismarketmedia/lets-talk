#Requires -RunAsAdministrator

param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    
    [Parameter(Mandatory = $true)]
    [string]$Domain,
    
    [switch]$UseHttps = $false,
    
    [int]$ServerPort = 3000,
    
    [string]$IISPath = "C:\inetpub\wwwroot"
)

# --- Funcoes de Logging ---
function Write-Step ($Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor "Cyan"
}

function Write-Success ($Message) {
    Write-Host "V $Message" -ForegroundColor "Green"
}

function Write-WarningMessage ($Message) {
    Write-Host "!! $Message" -ForegroundColor "Yellow"
}

function Write-DeployError ($Message) {
    Write-Host "X $Message" -ForegroundColor "Red"
}

# --- Funcoes de Deploy ---

function Test-Prerequisites {
    Write-Step "Verificando pre-requisitos"
    
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-DeployError "Este script deve ser executado como Administrador"
        exit 1
    }
    Write-Success "Executando como Administrador"
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-DeployError "Node.js nao encontrado. Instale Node.js antes de continuar."
        exit 1
    }
    Write-Success "Node.js encontrado"
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-DeployError "npm nao encontrado."
        exit 1
    }
    Write-Success "npm encontrado"
    
    Import-Module WebAdministration -ErrorAction Stop
    if (-not (Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole).State -eq "Enabled") {
        Write-DeployError "IIS nao esta instalado. Execute: Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole"
        exit 1
    }
    Write-Success "IIS encontrado e habilitado"

    if (-not (Get-WebGlobalModule -Name "ApplicationRequestRouting" -ErrorAction SilentlyContinue)) {
        Write-DeployError "O modulo 'Application Request Routing (ARR)' do IIS nao foi encontrado."
        exit 1
    }
    Write-Success "Modulo Application Request Routing (ARR) encontrado."
    
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        Write-WarningMessage "PM2 nao encontrado. Instalando globalmente..."
        npm install -g pm2
        npm install -g pm2-windows-startup
        Write-Success "PM2 instalado com sucesso."
    } else {
        Write-Success "PM2 encontrado"
    }
}

function Build-Client {
    Write-Step "Building cliente React"
    $clientPath = Join-Path $SourcePath "client"
    if (-not (Test-Path $clientPath)) {
        Write-DeployError "Diretorio client nao encontrado: $clientPath"
        exit 1
    }
    
    Set-Location $clientPath
    
    $protocol = "http"
    if ($UseHttps ) { $protocol = "https" }
    $envContent = "VITE_SERVER_URL=${protocol}://${Domain}"
    
    $envContent | Out-File -FilePath ".env.production" -Encoding utf8
    Write-Success "Arquivo .env.production criado."
    
    Write-Host "Instalando dependencias e fazendo build do cliente..."
    npm install
    if ($LASTEXITCODE -ne 0 ) { Write-DeployError "Falha na instalacao das dependencias do cliente."; exit 1 }
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-DeployError "Falha no build do cliente."; exit 1 }
    Write-Success "Build do cliente concluido"
}

function Deploy-Server-Standalone {
    Write-Step "Fazendo deploy do servidor (modo Standalone)"
    $serverDeployPath = Join-Path $SourcePath "server-deploy"
    
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        pm2 stop "letstalk-server" --silent 2>$null
        pm2 delete "letstalk-server" --silent 2>$null
        Write-Success "Processo PM2 'letstalk-server' parado e removido (se existia)."
    }
    
    if (Test-Path $serverDeployPath) {
        Remove-Item $serverDeployPath -Recurse -Force
    }
    
    $excludeItems = @("client", "node_modules", ".git", ".gitignore", "server-deploy")
    Get-ChildItem $SourcePath -Exclude $excludeItems | Copy-Item -Destination $serverDeployPath -Recurse -Force
    Write-Success "Arquivos do servidor copiados para $serverDeployPath"
    
    Set-Location $serverDeployPath
    Write-Host "Instalando dependencias de producao do servidor..."
    npm install --production
    if ($LASTEXITCODE -ne 0) { Write-DeployError "Falha na instalacao das dependencias do servidor"; exit 1 }
    Write-Success "Dependencias do servidor instaladas"
    
    Write-Host "Iniciando servidor com PM2..."
    pm2 start server.js --name "letstalk-server" --env @{ PORT = $ServerPort; NODE_ENV = "production" }
    pm2 save
    Write-Success "Servidor iniciado com PM2 no nome 'letstalk-server' na porta $ServerPort"
}

function Deploy-Client-To-IIS {
    Write-Step "Fazendo deploy do cliente no IIS e configurando proxy"
    $clientDest = Join-Path $IISPath "letstalk-client"
    $clientSource = Join-Path $SourcePath "client\dist"
    
    if (Test-Path $clientDest) {
        Remove-Item $clientDest -Recurse -Force
    }
    Copy-Item $clientSource $clientDest -Recurse
    Write-Success "Arquivos do cliente copiados para $clientDest"
    
    # CORREÇÃO: A regra de proxy agora inclui /socket.io/
    $webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyInboundRule" stopProcessing="true">
                    <match url="^(api|socket.io)/(.*)" />
                    <action type="Rewrite" url="http://localhost:${ServerPort}/{R:0}" />
                </rule>
                <rule name="React-Router-Rule" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                        
                        <add input="{REQUEST_URI}" pattern="^/(api|socket.io )/" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        <webSocket enabled="true" />
    </system.webServer>
</configuration>
"@
    $webConfigPath = Join-Path $clientDest "web.config"
    $webConfigContent | Out-File -FilePath $webConfigPath -Encoding utf8
    Write-Success "web.config do cliente com proxy reverso criado"
    
    $port = 80
    if ($UseHttps ) { $port = 443 }
    $siteName = "LetsTalk-Client"

    if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
        Write-Host "Removendo site IIS existente: $siteName"
        Remove-Website -Name $siteName -Confirm:$false
    }
    
    Write-Host "Criando site IIS: $siteName"
    New-Website -Name $siteName -PhysicalPath $clientDest
    
    Write-Host "Adicionando binding: $Domain na porta $port"
    # Usando http por padrao. O binding https deve ser feito manualmente com o certificado.
    New-WebBinding -Name $siteName -HostHeader $Domain -Port $port -Protocol "http"
    
    if ($UseHttps ) {
        Write-WarningMessage "Binding HTTPS para a porta 443 deve ser adicionado manualmente no IIS apos a instalacao do certificado SSL."
    }
    
    Write-Success "Site IIS '$siteName' criado e configurado."
}

function Show-Summary {
    Write-Step "Resumo do Deploy"
    $protocol = "http"
    if ($UseHttps ) { $protocol = "https" }
    
    Write-Success "Deploy concluido com sucesso!"
    Write-Host ""
    Write-Host "Frontend e API: ${protocol}://${Domain}" -ForegroundColor "Green"
    Write-Host "Servidor Node.js (rodando via PM2 ): http://localhost:${ServerPort}" -ForegroundColor "Yellow"
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor "Cyan"
    if ($UseHttps ) {
        Write-Host "  1. (IMPORTANTE) Configure o certificado SSL e o binding HTTPS no Gerenciador do IIS." -ForegroundColor "Yellow"
    }
    Write-Host "  2. Verifique se o Firewall do Windows permite trafego nas portas 80 e/ou 443." -ForegroundColor "Yellow"
    Write-Host "  3. Acesse ${protocol}://${Domain} em um navegador para testar a aplicacao." -ForegroundColor "Yellow"
    Write-Host ""
    Write-Host "Comandos uteis:" -ForegroundColor "Cyan"
    Write-Host "  Ver logs do servidor: pm2 logs letstalk-server"
    Write-Host "  Reiniciar servidor:  pm2 restart letstalk-server"
}

# --- Execucao Principal ---
try {
    Write-Host "Iniciando deploy automatizado para Let's Talk" -ForegroundColor "Cyan"
    Write-Host "======================================================" -ForegroundColor "Cyan"
    
    Test-Prerequisites
    Build-Client
    Deploy-Server-Standalone
    Deploy-Client-To-IIS
    
    Show-Summary
    
} catch {
    Write-DeployError "-----------------------------------------------------"
    Write-DeployError "Ocorreu um erro fatal durante o deploy."
    Write-DeployError ("Mensagem: " + $_.Exception.Message)
    Write-DeployError ("No script: " + $_.InvocationInfo.ScriptName)
    Write-DeployError ("Na linha: " + $_.InvocationInfo.ScriptLineNumber)
    Write-DeployError "-----------------------------------------------------"
    exit 1
}

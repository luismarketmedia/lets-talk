#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Script para atualizar deployment existente do Let's Talk

.DESCRIPTION
    Este script atualiza uma instalação existente do Let's Talk sem
    reconfigurar completamente o IIS.

.PARAMETER SourcePath
    Caminho para o código fonte atualizado

.PARAMETER UpdateClient
    Se deve atualizar o cliente (default: true)

.PARAMETER UpdateServer
    Se deve atualizar o servidor (default: true)

.PARAMETER BackupBeforeUpdate
    Se deve fazer backup antes da atualização (default: true)

.EXAMPLE
    .\update-deploy.ps1 -SourcePath "C:\dev\lets-talk"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    
    [switch]$UpdateClient = $true,
    [switch]$UpdateServer = $true,
    [switch]$BackupBeforeUpdate = $true,
    
    [string]$IISPath = "C:\inetpub\wwwroot"
)

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

function Create-Backup {
    param([string]$SourceDir, [string]$BackupName)
    
    if (-not (Test-Path $SourceDir)) {
        Write-Warning "Diretório não encontrado para backup: $SourceDir"
        return $null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "C:\Backups\LetsTalk\$BackupName`_$timestamp"
    
    Write-Host "Criando backup: $backupDir"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item "$SourceDir\*" $backupDir -Recurse -Force
    
    Write-Success "Backup criado: $backupDir"
    return $backupDir
}

function Update-Client {
    Write-Step "Atualizando Cliente"
    
    $clientDest = Join-Path $IISPath "letstalk-client"
    $clientSource = Join-Path $SourcePath "client"
    
    if (-not (Test-Path $clientDest)) {
        Write-Error "Instalação do cliente não encontrada: $clientDest"
        return $false
    }
    
    if (-not (Test-Path $clientSource)) {
        Write-Error "Código fonte do cliente não encontrado: $clientSource"
        return $false
    }
    
    # Backup
    if ($BackupBeforeUpdate) {
        $backupPath = Create-Backup -SourceDir $clientDest -BackupName "client"
    }
    
    # Build do cliente
    Set-Location $clientSource
    Write-Host "Executando build do cliente..."
    
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na instalação das dependências do cliente"
        return $false
    }
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha no build do cliente"
        return $false
    }
    
    # Preservar web.config existente
    $webConfigPath = Join-Path $clientDest "web.config"
    $tempWebConfig = $null
    if (Test-Path $webConfigPath) {
        $tempWebConfig = Join-Path $env:TEMP "letstalk_webcfg_$(Get-Random).xml"
        Copy-Item $webConfigPath $tempWebConfig
        Write-Success "web.config preservado"
    }
    
    # Atualizar arquivos
    $distPath = Join-Path $clientSource "dist"
    Remove-Item "$clientDest\*" -Recurse -Force -Exclude "web.config"
    Copy-Item "$distPath\*" $clientDest -Recurse -Force
    
    # Restaurar web.config
    if ($tempWebConfig -and (Test-Path $tempWebConfig)) {
        Copy-Item $tempWebConfig $webConfigPath -Force
        Remove-Item $tempWebConfig -Force
        Write-Success "web.config restaurado"
    }
    
    Write-Success "Cliente atualizado com sucesso"
    return $true
}

function Update-Server {
    Write-Step "Atualizando Servidor"
    
    $serverDest = Join-Path $IISPath "letstalk-server"
    
    if (-not (Test-Path $serverDest)) {
        Write-Error "Instalação do servidor não encontrada: $serverDest"
        return $false
    }
    
    # Backup
    if ($BackupBeforeUpdate) {
        $backupPath = Create-Backup -SourceDir $serverDest -BackupName "server"
    }
    
    # Verificar se é PM2 ou IISNode
    $isUsingPM2 = $false
    try {
        $pm2List = pm2 list --silent
        if ($pm2List -match "letstalk-server") {
            $isUsingPM2 = $true
            Write-Success "Detectado: Usando PM2"
        }
    } catch {
        Write-Success "Detectado: Usando IISNode"
    }
    
    # Parar aplicação se usando PM2
    if ($isUsingPM2) {
        Write-Host "Parando aplicação PM2..."
        pm2 stop letstalk-server
        Start-Sleep -Seconds 3
    }
    
    # Preservar arquivos importantes
    $preserveFiles = @("web.config", "ecosystem.config.json", "logs", "node_modules")
    $tempDir = Join-Path $env:TEMP "letstalk_preserve_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    foreach ($file in $preserveFiles) {
        $sourcePath = Join-Path $serverDest $file
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $tempDir $file
            Copy-Item $sourcePath $destPath -Recurse -Force
            Write-Success "Preservado: $file"
        }
    }
    
    # Atualizar arquivos do servidor
    Write-Host "Atualizando arquivos do servidor..."
    $excludeItems = @("client", "node_modules", ".git", ".gitignore", "README.md")
    
    # Remover arquivos antigos (exceto preservados)
    Get-ChildItem $serverDest | Where-Object { $_.Name -notin $preserveFiles } | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
    }
    
    # Copiar novos arquivos
    Get-ChildItem $SourcePath | Where-Object { $_.Name -notin $excludeItems } | ForEach-Object {
        Copy-Item $_.FullName $serverDest -Recurse -Force
    }
    
    # Restaurar arquivos preservados
    Get-ChildItem $tempDir | ForEach-Object {
        $destPath = Join-Path $serverDest $_.Name
        if ($_.Name -eq "node_modules") {
            # Para node_modules, vamos reinstalar dependências em vez de restaurar
            Write-Host "Pulando restauração de node_modules (será reinstalado)"
        } else {
            Copy-Item $_.FullName $destPath -Recurse -Force
            Write-Success "Restaurado: $($_.Name)"
        }
    }
    
    # Limpar diretório temporário
    Remove-Item $tempDir -Recurse -Force
    
    # Atualizar dependências
    Set-Location $serverDest
    Write-Host "Atualizando dependências do servidor..."
    npm install --production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na atualização das dependências"
        
        # Tentar restaurar backup
        if ($BackupBeforeUpdate -and $backupPath) {
            Write-Warning "Tentando restaurar backup..."
            Remove-Item "$serverDest\*" -Recurse -Force
            Copy-Item "$backupPath\*" $serverDest -Recurse -Force
        }
        return $false
    }
    
    # Reiniciar aplicação
    if ($isUsingPM2) {
        Write-Host "Reiniciando aplicação PM2..."
        pm2 restart letstalk-server
        pm2 save
        
        # Verificar se reiniciou corretamente
        Start-Sleep -Seconds 5
        $status = pm2 status letstalk-server --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Aplicação reiniciada com sucesso"
        } else {
            Write-Error "Falha ao reiniciar aplicação"
            return $false
        }
    } else {
        Write-Success "Aplicação IISNode será reiniciada automaticamente"
    }
    
    Write-Success "Servidor atualizado com sucesso"
    return $true
}

function Test-Update {
    Write-Step "Testando atualização"
    
    # Testar se sites IIS estão respondendo
    $sites = Get-Website | Where-Object { $_.Name -like "*LetsTalk*" }
    
    foreach ($site in $sites) {
        $state = $site.State
        if ($state -eq "Started") {
            Write-Success "Site IIS '$($site.Name)' está rodando"
        } else {
            Write-Warning "Site IIS '$($site.Name)' está em estado: $state"
        }
    }
    
    # Testar PM2 se aplicável
    try {
        $pm2Status = pm2 status letstalk-server --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Processo PM2 está rodando"
        }
    } catch {
        # PM2 não está sendo usado
    }
    
    Write-Success "Testes básicos concluídos"
}

function Show-UpdateSummary {
    param([bool]$ClientSuccess, [bool]$ServerSuccess)
    
    Write-Step "Resumo da Atualização"
    
    if ($UpdateClient) {
        if ($ClientSuccess) {
            Write-Success "Cliente atualizado com sucesso"
        } else {
            Write-Error "Falha na atualização do cliente"
        }
    }
    
    if ($UpdateServer) {
        if ($ServerSuccess) {
            Write-Success "Servidor atualizado com sucesso"
        } else {
            Write-Error "Falha na atualização do servidor"
        }
    }
    
    if ($ClientSuccess -and $ServerSuccess) {
        Write-Host "`n🎉 Atualização concluída com sucesso!" -ForegroundColor $Green
        Write-Host "A aplicação foi atualizada e deve estar funcionando normalmente." -ForegroundColor $Green
    } else {
        Write-Host "`n⚠ Atualização concluída com problemas!" -ForegroundColor $Yellow
        Write-Host "Verifique os logs acima e teste a aplicação." -ForegroundColor $Yellow
        
        if ($BackupBeforeUpdate) {
            Write-Host "Backups foram criados em: C:\Backups\LetsTalk\" -ForegroundColor $Blue
        }
    }
    
    Write-Host "`nRecomendações pós-atualização:" -ForegroundColor $Blue
    Write-Host "1. Testar funcionamento da aplicação" -ForegroundColor $Yellow
    Write-Host "2. Verificar logs para possíveis erros" -ForegroundColor $Yellow
    Write-Host "3. Monitorar performance por algumas horas" -ForegroundColor $Yellow
    
    if ($BackupBeforeUpdate) {
        Write-Host "4. Remover backups antigos se tudo estiver funcionando" -ForegroundColor $Yellow
    }
}

# Execução principal
try {
    Write-Host "Let's Talk - Atualização de Deployment" -ForegroundColor $Blue
    Write-Host "========================================" -ForegroundColor $Blue
    
    $clientSuccess = $true
    $serverSuccess = $true
    
    if ($UpdateClient) {
        $clientSuccess = Update-Client
    } else {
        Write-Warning "Atualização do cliente pulada"
    }
    
    if ($UpdateServer) {
        $serverSuccess = Update-Server
    } else {
        Write-Warning "Atualização do servidor pulada"
    }
    
    Test-Update
    Show-UpdateSummary -ClientSuccess $clientSuccess -ServerSuccess $serverSuccess
    
} catch {
    Write-Error "Erro durante a atualização: $($_.Exception.Message)"
    Write-Host "`nPilha de erro completa:" -ForegroundColor $Red
    Write-Host $_.Exception.StackTrace -ForegroundColor $Red
    
    if ($BackupBeforeUpdate) {
        Write-Host "`nBackups disponíveis em: C:\Backups\LetsTalk\" -ForegroundColor $Blue
    }
    
    exit 1
}

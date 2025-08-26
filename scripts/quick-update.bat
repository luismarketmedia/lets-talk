@echo off
cls
echo ===============================================
echo Let's Talk - Quick Update
echo ===============================================
echo.

REM Verificar se está sendo executado como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRO: Este script deve ser executado como Administrador
    echo Clique com botao direito e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

REM Definir variáveis padrão
set "SOURCE_PATH=%~dp0.."
set "UPDATE_CLIENT=true"
set "UPDATE_SERVER=true"
set "BACKUP=true"

echo Configuracao atual:
echo - Codigo fonte: %SOURCE_PATH%
echo - Atualizar cliente: %UPDATE_CLIENT%
echo - Atualizar servidor: %UPDATE_SERVER%
echo - Fazer backup: %BACKUP%
echo.

REM Perguntar configurações ao usuário
echo Deseja alterar as configuracoes? (s/N)
set /p "CHANGE_CONFIG="
if /i "%CHANGE_CONFIG%"=="s" goto :configure
if /i "%CHANGE_CONFIG%"=="sim" goto :configure
goto :update

:configure
echo.
echo === Configuracao ===
set /p "SOURCE_PATH=Caminho do codigo fonte [%SOURCE_PATH%]: " || set "SOURCE_PATH=%SOURCE_PATH%"

echo.
echo Atualizar cliente? (S/n)
set /p "CLIENT_INPUT="
if /i "%CLIENT_INPUT%"=="n" set "UPDATE_CLIENT=false"
if /i "%CLIENT_INPUT%"=="nao" set "UPDATE_CLIENT=false"

echo.
echo Atualizar servidor? (S/n)
set /p "SERVER_INPUT="
if /i "%SERVER_INPUT%"=="n" set "UPDATE_SERVER=false"
if /i "%SERVER_INPUT%"=="nao" set "UPDATE_SERVER=false"

echo.
echo Fazer backup antes da atualizacao? (S/n)
set /p "BACKUP_INPUT="
if /i "%BACKUP_INPUT%"=="n" set "BACKUP=false"
if /i "%BACKUP_INPUT%"=="nao" set "BACKUP=false"

:update
echo.
echo === Iniciando Atualizacao ===
echo.

REM Construir comando PowerShell
set "PS_COMMAND=powershell.exe -ExecutionPolicy Bypass -File "%~dp0update-deploy.ps1""
set "PS_COMMAND=%PS_COMMAND% -SourcePath "%SOURCE_PATH%""

if "%UPDATE_CLIENT%"=="true" (
    set "PS_COMMAND=%PS_COMMAND% -UpdateClient"
)

if "%UPDATE_SERVER%"=="true" (
    set "PS_COMMAND=%PS_COMMAND% -UpdateServer"
)

if "%BACKUP%"=="true" (
    set "PS_COMMAND=%PS_COMMAND% -BackupBeforeUpdate"
)

echo Executando: %PS_COMMAND%
echo.

REM Executar script PowerShell
%PS_COMMAND%

if %errorLevel% equ 0 (
    echo.
    echo ===============================================
    echo Atualizacao concluida com sucesso!
    echo ===============================================
    echo.
    echo A aplicacao foi atualizada e deve estar funcionando.
    echo.
    echo Proximos passos:
    echo 1. Testar a aplicacao no navegador
    echo 2. Verificar se todas as funcionalidades estao OK
    echo 3. Monitorar logs por possveis erros
    if "%BACKUP%"=="true" (
        echo 4. Remover backups antigos em C:\Backups\LetsTalk\
    )
    echo.
) else (
    echo.
    echo ===============================================
    echo Erro durante a atualizacao!
    echo ===============================================
    echo Verifique os logs acima para mais detalhes.
    if "%BACKUP%"=="true" (
        echo Backups disponveis em: C:\Backups\LetsTalk\
    )
    echo.
)

echo Pressione qualquer tecla para finalizar...
pause >nul

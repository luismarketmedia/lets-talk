@echo off
cls
echo ===============================================
echo Let's Talk - Quick Deploy para Windows/IIS
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
set "SOURCE_PATH=D:\Projetos\Solutech\lets-talk"
set "DOMAIN=letstalk-local.solutech.com.br"
set "USE_HTTPS=true"
set "SERVER_MODE=Standalone"

echo Configuracao atual:
echo - Codigo fonte: %SOURCE_PATH%
echo - Dominio: %DOMAIN%
echo - HTTPS: %USE_HTTPS%
echo - Modo servidor: %SERVER_MODE%
echo.

REM Perguntar configurações ao usu��rio
echo Deseja alterar as configuracoes? (s/N)
set /p "CHANGE_CONFIG="
if /i "%CHANGE_CONFIG%"=="s" goto :configure
if /i "%CHANGE_CONFIG%"=="sim" goto :configure
goto :deploy

:configure
echo.
echo === Configuracao ===
set /p "SOURCE_PATH=Caminho do codigo fonte [%SOURCE_PATH%]: " || set "SOURCE_PATH=%SOURCE_PATH%"
set /p "DOMAIN=Dominio da aplicacao [%DOMAIN%]: " || set "DOMAIN=%DOMAIN%"

echo.
echo Usar HTTPS? (s/N)
set /p "HTTPS_INPUT="
if /i "%HTTPS_INPUT%"=="s" set "USE_HTTPS=true"
if /i "%HTTPS_INPUT%"=="sim" set "USE_HTTPS=true"

echo.
echo Modo do servidor:
echo   1. Standalone + Proxy Reverso (Recomendado)
echo   2. IISNode
set /p "MODE_INPUT=Escolha [1]: " || set "MODE_INPUT=1"
if "%MODE_INPUT%"=="2" set "SERVER_MODE=IISNode"

:deploy
echo.
echo === Iniciando Deploy ===
echo.

REM Construir comando PowerShell
set "PS_COMMAND=powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy-windows.ps1""
set "PS_COMMAND=%PS_COMMAND% -SourcePath "%SOURCE_PATH%""
set "PS_COMMAND=%PS_COMMAND% -Domain "%DOMAIN%""

if "%USE_HTTPS%"=="true" (
    set "PS_COMMAND=%PS_COMMAND% -UseHttps"
)

echo Executando: %PS_COMMAND%
echo.

REM Executar script PowerShell
%PS_COMMAND%

if %errorLevel% equ 0 (
    echo.
    echo ===============================================
    echo Deploy concluido com sucesso!
    echo ===============================================
    echo.
    if "%USE_HTTPS%"=="true" (
        echo Aplicacao disponivel em: https://%DOMAIN%
    ) else (
        echo Aplicacao disponivel em: http://%DOMAIN%
    )
    echo.
    echo Proximos passos:
    echo 1. Configurar DNS para apontar para este servidor
    if "%USE_HTTPS%"=="true" (
        echo 2. Configurar certificado SSL no IIS Manager
    )
    echo 3. Configurar firewall se necessario
    echo 4. Testar a aplicacao
    echo.
) else (
    echo.
    echo ===============================================
    echo Erro durante o deploy!
    echo ===============================================
    echo Verifique os logs acima para mais detalhes.
    echo.
)

echo Pressione qualquer tecla para finalizar...
pause >nul

@echo off
net session >nul 2>&1
if not %errorLevel% == 0 goto notadmin

echo =====================================================
echo ATIVANDO RECURSOS DO WINDOWS PARA O DOCKER E WSL 2
echo =====================================================
echo.
echo 1. Ativando a Plataforma de Maquina Virtual...
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

echo.
echo 2. Ativando o Subsistema do Windows para Linux (WSL)...
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

echo.
echo 3. Ativando o Hyper-V...
dism.exe /online /enable-feature /featurename:Microsoft-Hyper-V /all /norestart

echo.
echo =====================================================
echo PRONTO! O Windows foi configurado.
echo AGORA VOCE PRECISA REINICIAR O COMPUTADOR!
echo =====================================================
pause
exit /b

:notadmin
echo =====================================================
echo ERRO: VOCE PRECISA EXECUTAR COMO ADMINISTRADOR!
echo =====================================================
echo.
echo Clique com o botao direito neste arquivo e escolha:
echo "Executar como administrador"
echo.
pause
exit /b

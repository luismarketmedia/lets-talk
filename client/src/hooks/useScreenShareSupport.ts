import { useState, useEffect } from "react";

interface ScreenShareSupport {
  isSupported: boolean;
  reason?: string;
  canAttempt: boolean;
}

export const useScreenShareSupport = (): ScreenShareSupport => {
  const [support, setSupport] = useState<ScreenShareSupport>({
    isSupported: false,
    reason: "Verificando...",
    canAttempt: false,
  });

  useEffect(() => {
    const checkSupport = () => {
      // Verificar se a API está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setSupport({
          isSupported: false,
          reason: "Navegador não suporta compartilhamento de tela",
          canAttempt: false,
        });
        return;
      }

      // Verificar contexto seguro apenas se não for localhost
      if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        setSupport({
          isSupported: false,
          reason: "Requer HTTPS para funcionar",
          canAttempt: false,
        });
        return;
      }

      // Para desenvolvimento local ou contexto seguro, permitir tentativa
      setSupport({
        isSupported: true,
        reason: undefined,
        canAttempt: true,
      });
    };

    checkSupport();
  }, []);

  return support;
};

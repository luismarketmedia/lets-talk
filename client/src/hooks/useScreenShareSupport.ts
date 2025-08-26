import { useState, useEffect } from 'react';

interface ScreenShareSupport {
  isSupported: boolean;
  reason?: string;
  canAttempt: boolean;
}

export const useScreenShareSupport = (): ScreenShareSupport => {
  const [support, setSupport] = useState<ScreenShareSupport>({
    isSupported: false,
    reason: 'Verificando...',
    canAttempt: false
  });

  useEffect(() => {
    const checkSupport = () => {
      // Verificar se a API está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setSupport({
          isSupported: false,
          reason: 'Navegador não suporta compartilhamento de tela',
          canAttempt: false
        });
        return;
      }

      // Verificar contexto seguro
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setSupport({
          isSupported: false,
          reason: 'Requer HTTPS para funcionar',
          canAttempt: false
        });
        return;
      }

      // Verificar políticas de permissão
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'display-capture' as PermissionName })
          .then(result => {
            const isAvailable = result.state !== 'denied';
            setSupport({
              isSupported: isAvailable,
              reason: isAvailable ? undefined : 'Bloqueado por política de permissões',
              canAttempt: isAvailable
            });
          })
          .catch(() => {
            // Se não conseguir verificar permissões, assume que está disponível
            setSupport({
              isSupported: true,
              reason: undefined,
              canAttempt: true
            });
          });
      } else {
        // Se não há API de permissões, verifica apenas se a API básica existe
        setSupport({
          isSupported: true,
          reason: undefined,
          canAttempt: true
        });
      }
    };

    checkSupport();
  }, []);

  return support;
};

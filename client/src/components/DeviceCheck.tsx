import React, { useState, useEffect } from 'react';
import { Camera, Mic, AlertTriangle, CheckCircle, Settings, TestTube } from 'lucide-react';
import { Button } from './ui/button';

interface DeviceStatus {
  hasCamera: boolean;
  hasMicrophone: boolean;
  permissionGranted: boolean;
  isChecking: boolean;
}

interface DeviceCheckProps {
  onDeviceCheck?: (status: DeviceStatus) => void;
  onOpenAudioSettings?: () => void;
  onOpenDeviceTest?: () => void;
}

export const DeviceCheck: React.FC<DeviceCheckProps> = ({ onDeviceCheck }) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    hasCamera: false,
    hasMicrophone: false,
    permissionGranted: false,
    isChecking: false
  });

  const checkDevices = async () => {
    setDeviceStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      // Verificar dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');

      let permissionGranted = false;

      // Tentar obter permissões
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: hasCamera,
          audio: hasMicrophone
        });
        
        permissionGranted = true;
        
        // Parar as tracks imediatamente
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Permissão não concedida ou dispositivos não disponíveis:', error);
        permissionGranted = false;
      }

      const status = {
        hasCamera,
        hasMicrophone,
        permissionGranted,
        isChecking: false
      };

      setDeviceStatus(status);
      onDeviceCheck?.(status);

    } catch (error) {
      console.error('Erro ao verificar dispositivos:', error);
      setDeviceStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  useEffect(() => {
    checkDevices();
  }, []);

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Status dos Dispositivos
      </h3>
      
      <div className="space-y-2">
        {/* Status da Câmera */}
        <div className="flex items-center space-x-3">
          <Camera className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 flex-1">Câmera</span>
          {deviceStatus.hasCamera ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-xs text-gray-500">
            {deviceStatus.hasCamera ? 'Detectada' : 'Não encontrada'}
          </span>
        </div>

        {/* Status do Microfone */}
        <div className="flex items-center space-x-3">
          <Mic className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 flex-1">Microfone</span>
          {deviceStatus.hasMicrophone ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-xs text-gray-500">
            {deviceStatus.hasMicrophone ? 'Detectado' : 'Não encontrado'}
          </span>
        </div>

        {/* Status das Permissões */}
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gray-300" />
          <span className="text-sm text-gray-700 flex-1">Permissões</span>
          {deviceStatus.permissionGranted ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-gray-500">
            {deviceStatus.permissionGranted ? 'Concedidas' : 'Pendentes'}
          </span>
        </div>
      </div>

      {/* Botão para testar novamente */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={checkDevices}
          disabled={deviceStatus.isChecking}
          className="w-full"
        >
          {deviceStatus.isChecking ? (
            <div className="flex items-center">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
              Verificando...
            </div>
          ) : (
            'Testar Dispositivos'
          )}
        </Button>
      </div>

      {/* Dicas */}
      {(!deviceStatus.hasCamera || !deviceStatus.hasMicrophone || !deviceStatus.permissionGranted) && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          {!deviceStatus.hasCamera && (
            <p>• Verifique se sua câmera está conectada</p>
          )}
          {!deviceStatus.hasMicrophone && (
            <p>• Verifique se seu microfone está conectado</p>
          )}
          {!deviceStatus.permissionGranted && (
            <p>• Clique em "Permitir" quando solicitado pelo navegador</p>
          )}
        </div>
      )}
    </div>
  );
};

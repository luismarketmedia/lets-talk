import React from 'react';
import { Copy, Check } from 'lucide-react';
import { generateMeetingCode, type MeetingCodeFormat } from '../lib/meetingCodeGenerator';
import { Button } from './ui/button';

interface MeetingCodeExamplesProps {
  onSelectCode?: (code: string) => void;
}

export const MeetingCodeExamples: React.FC<MeetingCodeExamplesProps> = ({ onSelectCode }) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const formats: Array<{
    type: MeetingCodeFormat;
    name: string;
    description: string;
    icon: string;
  }> = [
    {
      type: 'google-meet',
      name: 'Google Meet',
      description: 'Formato amig��vel com letras e números',
      icon: '🎥'
    },
    {
      type: 'zoom',
      name: 'Zoom',
      description: 'Apenas números separados por hífen',
      icon: '📞'
    },
    {
      type: 'teams',
      name: 'Microsoft Teams',
      description: 'Números separados por espaços',
      icon: '👥'
    },
    {
      type: 'simple',
      name: 'Simples',
      description: 'Formato curto e fácil de lembrar',
      icon: '✨'
    }
  ];

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  const handleSelectCode = (code: string) => {
    onSelectCode?.(code);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Formatos de Código de Reunião
        </h3>
        <p className="text-sm text-gray-600">
          Escolha o formato que preferir para suas reuniões
        </p>
      </div>

      <div className="grid gap-3">
        {formats.map((format) => {
          const example = generateMeetingCode(format.type);
          
          return (
            <div
              key={format.type}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{format.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{format.name}</h4>
                    <p className="text-xs text-gray-500">{format.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <code className="font-mono text-primary-600 font-semibold">
                  {example}
                </code>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCode(example)}
                    className="px-2"
                  >
                    {copiedCode === example ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                  
                  {onSelectCode && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSelectCode(example)}
                      className="px-3 text-xs"
                    >
                      Usar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg">
        💡 <strong>Dica:</strong> Todos os formatos são aceitos. Escolha o que for mais fácil de compartilhar!
      </div>
    </div>
  );
};

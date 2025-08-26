import React, { useState } from 'react';
import { Video, Users, Plus, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface JoinRoomProps {
  onJoinRoom: (roomId: string) => void;
  isConnecting: boolean;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ onJoinRoom, isConnecting }) => {
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoinRoom(roomId.trim());
    }
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(`SALA-${randomId}`);
    setMode('create');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Let's Talk</h1>
          <p className="text-gray-600">Conecte-se facilmente com videochamadas de alta qualidade</p>
        </div>

        {/* Cartão principal */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">
              {mode === 'join' ? 'Entrar em uma chamada' : 'Criar nova chamada'}
            </CardTitle>
            <CardDescription>
              {mode === 'join' 
                ? 'Digite o código da sala para participar' 
                : 'Compartilhe este código para outros participarem'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Modo de entrada */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'join' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('join')}
                disabled={isConnecting}
              >
                <Users className="w-4 h-4 mr-2" />
                Entrar
              </Button>
              <Button
                variant={mode === 'create' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('create')}
                disabled={isConnecting}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar
              </Button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="roomId" className="text-sm font-medium text-gray-700">
                  Código da sala
                </label>
                <div className="flex gap-2">
                  <Input
                    id="roomId"
                    type="text"
                    placeholder="Digite ou gere um código"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={isConnecting}
                    className="flex-1"
                  />
                  {mode === 'create' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRoomId}
                      disabled={isConnecting}
                      className="px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!roomId.trim() || isConnecting}
              >
                {isConnecting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Conectando...
                  </div>
                ) : (
                  <div className="flex items-center">
                    {mode === 'join' ? 'Entrar na chamada' : 'Iniciar chamada'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>
            </form>

            {/* Dicas */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>• Certifique-se de que sua câmera e microfone estão funcionando</p>
              <p>• O código da sala é sensível a maiúsculas e minúsculas</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Powered by WebRTC • Seguro e privado
        </div>
      </div>
    </div>
  );
};

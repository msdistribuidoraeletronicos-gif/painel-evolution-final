// src/components/config/EvolutionConfigSection.jsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Loader2, Zap, QrCode, LogOut, Link, Ban, Clock } from 'lucide-react';
import ConfigCard from './ConfigCard';
import ConfigField from './ConfigField';

// === CONFIGURAÇÕES FIXAS DA SUA EVOLUTION API (HOSTINGER/EASYPANEL) ===
// CORREÇÃO: Usando o IP para contornar o erro ERR_NAME_NOT_RESOLVED
const API_BASE_URL = 'https://dados-evolution-api.ngxrmm.easypanel.host';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_DEFAULT_NAME = 'bot_principal'; 
// ... (O RESTO DO CÓDIGO PERMANECE O MESMO) ...

const headers = {
  'Authorization': API_KEY,
  'Content-Type': 'application/json',
};
// =====================================================================


export default function EvolutionConfigSection({ config, setConfig }) {
  const [instanceStatus, setInstanceStatus] = useState('loading'); // 'loading', 'disconnected', 'connected', 'qr_ready', 'error', 'not_found'
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null); // 'status', 'qr', 'logout', 'create'
  const [instanceError, setInstanceError] = useState(null);
  
  // Obter nome e número da configuração do usuário
  const instanceName = config.evolution_instance_name || INSTANCE_DEFAULT_NAME;
  const instanceNumber = config.evolution_number || '';
  const instanceToken = config.evolution_token || ''; // Mantemos o token na config para usarmos em outras chamadas, se necessário

  // Função auxiliar para atualizar as configurações do Evolution
  const handleEvolutionConfigChange = (key, value) => {
    setConfig(prevConfig => ({
        ...prevConfig,
        [key]: value
    }));
  };

  // Função que busca o status da instância
  const fetchInstanceStatus = async () => {
    setLoadingAction('status');
    setInstanceError(null);
    setQrCodeData(null);
    try {
      const response = await fetch(`${API_BASE_URL}/instance/fetchInstances`, { headers });
      const data = await response.json();

      if (response.status !== 200) {
        throw new Error(data.message || data.error || 'Erro ao buscar instâncias. Verifique a chave.');
      }
      
      const instance = data.find(inst => inst.instanceName === instanceName);

      if (instance) {
        setInstanceStatus(instance.state === 'open' ? 'connected' : 'disconnected');
      } else {
        setInstanceStatus('not_found'); // Instância não existe
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      setInstanceError(error.message);
      setInstanceStatus('error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Função que CRIA a instância (Passo 1 & 2 juntos)
  const handleCreateInstance = async () => {
      setLoadingAction('create');
      setInstanceError(null);

      // O Evolution API requer o nome. O número é opcional (associado à sessão).
      if (!instanceName) {
          setInstanceError("O Nome da Instância é obrigatório.");
          setLoadingAction(null);
          return;
      }
      
      try {
          const response = await fetch(`${API_BASE_URL}/instance/create`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                  instanceName: instanceName,
                  number: instanceNumber || undefined, // Envia se preenchido
                  qrcode: true // Tenta gerar o QR Code logo após a criação
                  // TOKEN É OMITIDO E SERÁ GERADO PELA API
              })
          });

          if (response.status === 200 || response.status === 201) {
              const data = await response.json();
              
              // SALVA O TOKEN GERADO AUTOMATICAMENTE NA CONFIGURAÇÃO DO USUÁRIO
              handleEvolutionConfigChange('evolution_token', data.token); 

              setInstanceStatus('disconnected');
              handleGetQrCode(); // Vai para o Passo 3 (Gerar QR Code)
          } else {
              const data = await response.json();
              setInstanceError(data.message || "Falha ao criar instância.");
          }
      } catch (error) {
          setInstanceError("Erro de comunicação ao tentar criar a instância.");
      } finally {
          setLoadingAction(null);
      }
  };

  // Função que obtém o QR Code (Passo 3)
  const handleGetQrCode = async () => {
    setLoadingAction('qr');
    setInstanceError(null);
    setQrCodeData(null);
    try {
      const response = await fetch(`${API_BASE_URL}/instance/connect/${instanceName}`, {
        method: 'POST', 
        headers: headers,
        body: JSON.stringify({ qrcode: true })
      });
      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(data.message || data.error || 'Erro ao gerar QR Code.');
      }

      if (data.qrcode) {
        setQrCodeData(data.qrcode); 
        setInstanceStatus('qr_ready');
      } else {
        throw new Error("API não retornou o QR Code. Tente novamente ou atualize o status.");
      }

    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      setInstanceError(error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // Função que desconecta a instância (Logout)
  const handleLogout = async () => {
    setLoadingAction('logout');
    setInstanceError(null);
    setQrCodeData(null);
    try {
      const response = await fetch(`${API_BASE_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: headers,
      });

      if (response.status === 200) {
        setInstanceStatus('disconnected');
        alert("Instância desconectada com sucesso.");
      } else {
         const data = await response.json();
         throw new Error(data.message || 'Erro ao fazer logout.');
      }

    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      setInstanceError(error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // Carrega o status inicial ao montar o componente
  useEffect(() => {
    fetchInstanceStatus();
    const interval = setInterval(fetchInstanceStatus, 30000); 
    return () => clearInterval(interval);
  }, [instanceName]);

  // Determina o texto do Status
  const getStatusText = () => {
    switch (instanceStatus) {
      case 'loading': return 'Verificando status da instância...';
      case 'connected': return 'Conectado';
      case 'disconnected': return 'Desconectado';
      case 'qr_ready': return 'Pronto para Conexão (Scan QR Code)';
      case 'not_found': return 'Instância não encontrada (Pronto para criar)';
      case 'error': return 'Erro na API';
      default: return 'Desconhecido';
    }
  };

  // Componente de ícone/cor do status
  const StatusIcon = () => {
    switch (instanceStatus) {
      case 'connected': return <Zap className="w-5 h-5 text-green-500" />;
      case 'qr_ready': return <QrCode className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'loading': return <Loader2 className="w-5 h-5 animate-spin text-gray-500" />;
      case 'not_found': 
      case 'disconnected': return <Ban className="w-5 h-5 text-red-500" />;
      case 'error': return <span className="text-red-500 font-bold">ERRO</span>;
      default: return null;
    }
  };


  return (
    <ConfigCard
      icon={Zap}
      title="Conexão Evolution API"
      description={`Gerencia a instância: ${instanceName}`}
      iconColor="text-blue-600"
      className="lg:col-span-2"
    >
      <div className="space-y-4">
        
        {/* === CAMPO DE STATUS GERAL === */}
        <ConfigField label="Status da Instância" description="Estado atual da conexão com o WhatsApp.">
            <div className={`flex items-center gap-3 text-lg font-semibold p-2 rounded-md ${
                instanceStatus === 'connected' ? 'bg-green-100 text-green-700' : 
                ['disconnected', 'not_found', 'error'].includes(instanceStatus) ? 'bg-red-100 text-red-700' : 
                instanceStatus === 'qr_ready' ? 'bg-blue-100 text-blue-700' : 
                'bg-gray-100 text-gray-700'
            }`}>
                <StatusIcon />
                <span>{getStatusText()}</span>
            </div>
        </ConfigField>

        {/* === CAMPOS DE CONFIGURAÇÃO DA INSTÂNCIA (Passo 1) === */}
        <ConfigField label="Nome da Instância" description="Nome único para identificar a sessão do WhatsApp.">
            <Input
                value={config.evolution_instance_name || INSTANCE_DEFAULT_NAME}
                onChange={(e) => handleEvolutionConfigChange('evolution_instance_name', e.target.value)}
                placeholder={INSTANCE_DEFAULT_NAME}
                disabled={instanceStatus !== 'not_found'} // Só pode mudar se não estiver criada
            />
        </ConfigField>

        <ConfigField label="Número WhatsApp (Opcional)" description="Número do telefone para o qual a instância será associada (ex: 5511999999999).">
            <Input
                value={config.evolution_number || ''}
                onChange={(e) => handleEvolutionConfigChange('evolution_number', e.target.value)}
                placeholder="Ex: 5511999999999"
            />
        </ConfigField>
        
        {/* CAMPO DO TOKEN GERADO (Apenas para visualização/uso futuro) */}
        {instanceToken && (
            <ConfigField label="Token Gerado" description="Este token foi gerado pela API. Mantenha-o seguro.">
                <Input
                    value={instanceToken}
                    type="text"
                    readOnly
                    className="font-mono text-xs bg-gray-50"
                />
            </ConfigField>
        )}

        {/* === ÁREA DE QR CODE (Passo 3) === */}
        {qrCodeData && instanceStatus === 'qr_ready' && (
            <div className="text-center p-4 border rounded-lg bg-white shadow-inner">
                <p className="font-semibold text-blue-600 mb-2">Escaneie o QR Code no seu WhatsApp:</p>
                <img src={qrCodeData} alt="QR Code" className="mx-auto w-40 h-40" />
                <p className="text-sm text-red-500 mt-2">O QR Code expira rapidamente. Escaneie já!</p>
            </div>
        )}
        
        {instanceError && (
            <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
                Erro: {instanceError}
            </div>
        )}

        {/* === BOTÕES DE AÇÃO === */}
        <div className="pt-2 border-t flex flex-wrap gap-3">
          
          {(instanceStatus === 'not_found' || instanceStatus === 'error') && (
            <Button 
              onClick={handleCreateInstance} 
              disabled={loadingAction !== null}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {loadingAction === 'create' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
              {loadingAction === 'create' ? 'Criando...' : 'Criar Instância & Conectar'}
            </Button>
          )}

          {instanceStatus === 'disconnected' && (
            <Button 
              onClick={handleGetQrCode} 
              disabled={loadingAction !== null}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {loadingAction === 'qr' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              {loadingAction === 'qr' ? 'Gerar QR Code' : 'Gerar QR Code'}
            </Button>
          )}
          
          {instanceStatus === 'connected' && (
            <Button 
              onClick={handleLogout} 
              disabled={loadingAction !== null}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {loadingAction === 'logout' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              {loadingAction === 'logout' ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </Button>
          )}
          
          <Button 
            onClick={fetchInstanceStatus} 
            disabled={loadingAction !== null}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loadingAction === 'status' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            {loadingAction === 'status' ? 'Atualizando...' : 'Atualizar Status'}
          </Button>

        </div>
      </div>
    </ConfigCard>
  );
}
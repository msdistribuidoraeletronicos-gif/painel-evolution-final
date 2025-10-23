// src/ClientPanel.jsx
// v5 - Adiciona o Card de Conexão do Evolution API

import React, { useState, useEffect } from "react"; 
import { supabase } from './supabaseClient';
import { Save, Loader2, LogOut, Clock } from 'lucide-react'; 
import { Button } from '@/components/ui/button'; 

// === IMPORTS DOS CARDS ===
import AIConfigSection from "@/components/config/AIConfigSection";
// REMOVIDO: import BehaviorConfigSection from "@/components/config/BehaviorConfigSection";
import VoiceConfigSection from "@/components/config/VoiceConfigSection";

// >>>>> 1. IMPORTE O NOVO COMPONENTE <<<<<
import EvolutionConfigSection from "@/components/config/EvolutionConfigSection";
// ==========================


export default function ClientPanel() {
  // ... (TODA A LÓGICA 'useState', 'useEffect', 'handleSaveConfig', 'handleLogout' CONTINUA A MESMA) ...
  // ... (NÃO MUDE NADA AQUI DENTRO) ...
  const [config, setConfig] = useState({}); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false);   
  const [error, setError] = useState(null); 
  const [userEmail, setUserEmail] = useState(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  
  useEffect(() => {
    const loadPanelData = async () => {
      setLoading(true);
      setError(null); 
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Usuário não encontrado.");
        setUserEmail(user.email); 
        const { data: profileData, error: dbError } = await supabase
          .from('teste_escrita_usuarios')
          .select('configuracao_bot, created_at, subscription_status') 
          .eq('email_usuario', user.email)
          .single(); 
        if (dbError) throw dbError;
        if (profileData && profileData.configuracao_bot) {
          setConfig(profileData.configuracao_bot);
        } else {
          setConfig({}); 
        }
        if (profileData && profileData.subscription_status === 'trialing') {
          const createdAt = new Date(profileData.created_at);
          const trialEndsAt = new Date(createdAt.getTime() + (15 * 24 * 60 * 60 * 1000));
          const now = new Date();
          const diffTime = trialEndsAt.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft > 0) {
            setTrialDaysLeft(daysLeft);
          } else {
            setTrialDaysLeft(0); 
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do painel:", err.message);
        setError("Falha ao carregar suas configurações. Tente recarregar a página."); 
      } finally {
        setLoading(false);
      }
    };
    loadPanelData();
  }, []); 

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('teste_escrita_usuarios')
        .update({ configuracao_bot: config }) 
        .eq('email_usuario', userEmail);
      if (updateError) throw updateError;
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configuração:", err.message);
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao fazer logout:", err.message);
      alert("Erro ao tentar sair.");
    }
  };


  // ... (O CÓDIGO 'if (loading)' E 'if (error)' CONTINUA O MESMO) ...
  if (loading) {
    return <div className="p-10">Carregando configurações...</div>;
  }
  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }


  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-gray-50 min-h-screen">
      
      {/* ... (O CABEÇALHO COM O CONTADOR E BOTÕES CONTINUA O MESMO) ... */}
      <div className="flex flex-wrap items-center justify-between gap-4 space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suas Configurações</h2>
          <p className="text-gray-500">
            Gerencie as configurações do seu chatbot para {userEmail}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trialDaysLeft !== null && (
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 bg-blue-100 px-3 py-2 rounded-lg shadow-sm">
              <Clock className="w-4 h-4" />
              <span>
                {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'} de teste
              </span>
            </div>
          )}
          <Button onClick={handleSaveConfig} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
      
      {error && <div className="p-4 text-red-600 bg-red-100 rounded-md">{error}</div>}

      {/* >>>>> 2. ATUALIZE A GRADE <<<<<
          A grade foi reduzida para 3 colunas (lg:grid-cols-3), pois o BehaviorConfigSection foi removido.
      */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* >>>>> ADICIONE O NOVO COMPONENTE AQUI <<<<< */}
        <EvolutionConfigSection
          config={config}
          setConfig={setConfig}
        />
        
        {/* Os componentes antigos continuam aqui */}
        <AIConfigSection 
          config={config} 
          setConfig={setConfig} 
        />
        
        {/* REMOVIDO: <BehaviorConfigSection 
          config={config} 
          setConfig={setConfig} 
        /> */}
        
        <VoiceConfigSection 
          config={config} 
          setConfig={setConfig} 
        />
      </div>
    </div>
  );
}
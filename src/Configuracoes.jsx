// src/Configuracoes.jsx

// --- IMPORTS ---
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";

import { 
  Bot, Plus, MessageSquare, HelpCircle
} from "lucide-react";
import { motion } from "framer-motion";

// --- COMPONENTES INTERNOS ---

function ConfigCard({ icon: Icon, title, description, children, iconColor = "text-blue-600" }) {
  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-opacity-10 ${iconColor.replace('text-', 'bg-')}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

function ConfigField({ label, description, children, required = false }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && (
          <HoverCard><HoverCardTrigger><HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" /></HoverCardTrigger><HoverCardContent className="w-80"><p className="text-sm text-gray-600">{description}</p></HoverCardContent></HoverCard>
        )}
      </div>
      {children}
    </div>
  );
}

function WhatsappConfigSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('subscriptions').select(`status, plans ( name, whatsapp_limit )`).eq('user_id', user.id).single();
      if (error) { console.warn('Erro ao buscar assinatura:', error.message); return null; }
      return data;
    }
  });

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['whatsapp_accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from('whatsapp_accounts').select('*').eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const addAccountMutation = useMutation({
    mutationFn: async (newAccount) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      const { error } = await supabase.from('whatsapp_accounts').insert({ ...newAccount, user_id: user.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_accounts'] });
      setShowForm(false);
      setNewInstanceName("");
      setNewApiKey("");
    },
  });

  const handleAddAccount = (e) => {
    e.preventDefault();
    addAccountMutation.mutate({ evolution_instance_name: newInstanceName, evolution_api_key: newApiKey });
  };

  const planLimit = subscription?.plans?.whatsapp_limit ?? 0;
  const accountsCount = accounts?.length ?? 0;
  const canAddMore = planLimit === -1 || accountsCount < planLimit;

  return (
    <ConfigCard icon={MessageSquare} title="Contas de WhatsApp" description="Gerencie suas conexões com a Evolution API" iconColor="text-green-600">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="font-medium">Plano Atual: <Badge>{subscription?.plans?.name || 'Nenhum'}</Badge></p>
          <p className="text-sm text-gray-600">Conexões: <strong>{accountsCount} / {planLimit === -1 ? 'Ilimitadas' : planLimit === 0 ? '...' : planLimit}</strong></p>
        </div>
      </div>
      {isLoadingAccounts ? <p>Carregando contas...</p> : (
        <div className="space-y-3 mt-4">
          {accounts && accounts.map(acc => (
            <div key={acc.id} className="p-3 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">{acc.evolution_instance_name}</p>
                <p className="text-xs text-gray-500">Número: {acc.phone_number || 'Não informado'}</p>
              </div>
              <Button variant="outline" size="sm">Gerenciar</Button>
            </div>
          ))}
        </div>
      )}
      {showForm ? (
        <form onSubmit={handleAddAccount} className="mt-4 pt-4 border-t space-y-4">
          <h4 className="font-semibold">Adicionar Nova Conexão</h4>
          <ConfigField label="Nome da Instância (Evolution API)"><Input value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} placeholder="Ex: instancia01" required /></ConfigField>
          <ConfigField label="API Key (Evolution API)"><Input type="password" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} placeholder="Sua chave secreta" required /></ConfigField>
          <div className="flex gap-2">
            <Button type="submit" disabled={addAccountMutation.isPending}>{addAccountMutation.isPending ? 'Salvando...' : 'Salvar Conexão'}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Button onClick={() => setShowForm(true)} disabled={!canAddMore}><Plus className="w-4 h-4 mr-2" /> Adicionar Nova Conta</Button>
          {!canAddMore && subscription && <p className="text-xs text-red-600 mt-2">Você atingiu o limite de conexões do seu plano.</p>}
        </div>
      )}
    </ConfigCard>
  );
}

// --- COMPONENTE PRINCIPAL ---

export default function Configuracoes() {
  const queryClient = useQueryClient();
  
  // A lógica de busca de configurações do bot foi removida para simplificar.

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* CABEÇALHO CORRIGIDO COM O BOTÃO DE SAIR */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Painel de Controle</h1>
                <p className="text-gray-600 mt-1">Gerencie as contas de WhatsApp e as configurações do seu assistente virtual.</p>
              </div>
            </div>
            {/* O BOTÃO DE SAIR QUE FALTAVA */}
            <Button 
              variant="outline" 
              onClick={() => supabase.auth.signOut()}
            >
              Sair
            </Button>
          </div>
        </motion.div>

        {/* ESTRUTURA PRINCIPAL DO PAINEL */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900">Navegação</h3>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <WhatsappConfigSection />
            </motion.div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
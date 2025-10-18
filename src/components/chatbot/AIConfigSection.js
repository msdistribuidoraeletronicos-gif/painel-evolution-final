import React from "react";
import { Brain } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfigCard from "./ConfigCard";
import ConfigField from "./ConfigField";

export default function AIConfigSection({ config, setConfig }) {
  return (
    <ConfigCard
      icon={Brain}
      title="Configurações de Inteligência Artificial"
      description="Defina a personalidade e o modelo de IA do seu chatbot"
      iconColor="text-purple-600"
    >
      <ConfigField
        label="Prompt do Agente"
        description="Este é o 'cérebro' do chatbot. Defina aqui a persona, tom de voz, fluxo de conversa, informações sobre produtos/serviços e regras de negócio."
        required
      >
        <Textarea
          value={config.prompt_agente || ''}
          onChange={(e) => setConfig({ ...config, prompt_agente: e.target.value })}
          placeholder="Você é um assistente virtual amigável e prestativo que ajuda clientes a..."
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          {config.prompt_agente?.length || 0} caracteres
        </p>
      </ConfigField>

      <ConfigField
        label="Modelo OpenAI"
        description="Escolha o modelo de IA. GPT-4 é mais inteligente, GPT-3.5-turbo é mais rápido e econômico."
      >
        <Select
          value={config.openai_model || 'gpt-4o'}
          onValueChange={(value) => setConfig({ ...config, openai_model: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Rápido e Potente)</SelectItem>
            <SelectItem value="gpt-4">GPT-4 (Mais Inteligente)</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Econômico)</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais Barato)</SelectItem>
          </SelectContent>
        </Select>
      </ConfigField>
    </ConfigCard>
  );
}
import React from "react";
import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ConfigCard from "./ConfigCard";
import ConfigField from "./ConfigField";

export default function BehaviorConfigSection({ config, setConfig }) {
  const formatTimeDisplay = (seconds) => {
    if (seconds < 60) return `${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <ConfigCard
      icon={Settings}
      title="Configurações de Comportamento"
      description="Ajuste como o chatbot se comporta durante conversas"
      iconColor="text-orange-600"
    >
      <ConfigField
        label="Timeout (segundos)"
        description="Tempo que o sistema aguarda por intervenção humana antes do bot voltar a responder automaticamente."
      >
        <div className="space-y-2">
          <Input
            type="number"
            min={0}
            value={config.timeout_seconds || 900}
            onChange={(e) => setConfig({ ...config, timeout_seconds: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-gray-500">
            Equivale a: {formatTimeDisplay(config.timeout_seconds || 900)}
          </p>
        </div>
      </ConfigField>

      <ConfigField
        label="Configuração Ativa"
        description="Ative ou desative esta configuração. Apenas configurações ativas serão usadas pelo chatbot."
      >
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <Switch
            checked={config.ativo !== false}
            onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
          />
          <span className="text-sm font-medium">
            {config.ativo !== false ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </ConfigField>
    </ConfigCard>
  );
}
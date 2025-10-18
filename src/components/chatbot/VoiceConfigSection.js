import React from "react";
import { Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import ConfigCard from "./ConfigCard";
import ConfigField from "./ConfigField";

export default function VoiceConfigSection({ config, setConfig }) {
  return (
    <ConfigCard
      icon={Mic}
      title="Configurações de Voz"
      description="Configure a voz e a qualidade do áudio do chatbot"
      iconColor="text-green-600"
    >
      <ConfigField
        label="API Key ElevenLabs"
        description="Chave de API para usar o serviço de conversão de texto em voz do ElevenLabs."
      >
        <Input
          type="password"
          value={config.api_key_elevenlabs || ''}
          onChange={(e) => setConfig({ ...config, api_key_elevenlabs: e.target.value })}
          placeholder="sk_..."
        />
      </ConfigField>

      <ConfigField
        label="Voice ID ElevenLabs"
        description="ID da voz específica a ser usada. Você pode encontrar isso na biblioteca do ElevenLabs."
      >
        <Input
          value={config.voice_id_elevenlabs || ''}
          onChange={(e) => setConfig({ ...config, voice_id_elevenlabs: e.target.value })}
          placeholder="Ex: 21m00Tcm4TlvDq8ikWAM"
        />
      </ConfigField>

      <ConfigField
        label="Estabilidade da Voz"
        description="Controle entre expressão (valores baixos) e consistência (valores altos). Recomendado: 0.5"
      >
        <div className="space-y-3">
          <Slider
            value={[config.voice_stability || 0.5]}
            onValueChange={([value]) => setConfig({ ...config, voice_stability: value })}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Mais Expressiva (0)</span>
            <span className="font-semibold text-gray-900">{(config.voice_stability || 0.5).toFixed(1)}</span>
            <span>Mais Estável (1)</span>
          </div>
        </div>
      </ConfigField>
    </ConfigCard>
  );
}
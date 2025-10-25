import React, { useState, useEffect, useRef } from "react";
import {
  createInstance,
  getQrCode,
  getInstanceStatus,
} from "../../api/evolutionService";

export default function EvolutionConfigSection() {
  const [instanceName, setInstanceName] = useState("bot_principal");
  const [whatsappNumber, setWhatsappNumber] = useState("5567999849479");
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guarda a referência do "timer" do polling para podermos pará-lo
  const pollingIntervalRef = useRef(null);

  // ✅ Para o polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // ✅ Tenta buscar o QR Code
  const fetchQrCode = async () => {
    try {
      const qr = await getQrCode(instanceName);
      
      // SUCESSO!
      setQrCode(qr); // O service já retorna o data:image
      setStatus({ status: "qrcode" });
      setError(null);
      stopPolling(); // Para de perguntar
      setLoading(false);

    } catch (err) {
      // Falhou (provavelmente 404), o polling vai tentar de novo
      console.warn("Tentativa de buscar QR falhou, tentando novamente...", err.message);
      setStatus({ status: "Gerando QR Code..." });
    }
  };

  // ✅ Inicia o polling
  const startPollingQrCode = () => {
    stopPolling(); // Para qualquer polling anterior
    setLoading(true);
    setStatus({ status: "Iniciando conexão..." });

    // Tenta buscar o QR imediatamente
    fetchQrCode();

    // E então tenta a cada 3 segundos
    pollingIntervalRef.current = setInterval(fetchQrCode, 3000);

    // Para de tentar após 30 segundos
    setTimeout(() => {
      if ( pollingIntervalRef.current ) {
        stopPolling();
        setLoading(false);
        setError("Não foi possível obter o QR Code. Tente atualizar.");
        setStatus({ status: "timeout" });
      }
    }, 30000); 
  };


  // Verifica o status da instância
  const handleCheckStatus = async () => {
    setLoading(true);
    stopPolling(); // Para qualquer polling ao checar o status
    try {
      setError(null);
      setQrCode(null); // Limpa o QR antigo antes de checar
      
      // =================================================================
      // ✅ CORREÇÃO 1: Validar nome vazio
      // =================================================================
      if (!instanceName) {
        setError("Por favor, informe o Nome da Instância.");
        setStatus({ status: "nao_encontrada" });
        setLoading(false);
        return;
      }
      
      // 1. Busca a instância pelo NOME
      // A 'result' agora será: { status: "...", number: "...", qrCode: "..." }
      const result = await getInstanceStatus(instanceName);
      
      // =================================================================
      // ✅ CORREÇÃO 2: Lógica "E" (Nome E Número) Correta
      // =================================================================
      const apiNumber = result?.number;
      const userNumber = whatsappNumber; // Número que o usuário digitou

      // Limpa os números para comparar (remove '+', ' ', etc.)
      const cleanApiNum = apiNumber ? String(apiNumber).replace(/\D/g, '') : null;
      const cleanUserNum = userNumber ? String(userNumber).replace(/\D/g, '') : null;

      // 2. Validação:
      // SE a API tem um número registrado (cleanApiNum não é nulo)
      // E o número do usuário (cleanUserNum) é DIFERENTE do da API...
      // (Isso inclui o caso do usuário deixar o campo em branco (cleanUserNum = null))
      if (cleanApiNum && cleanUserNum !== cleanApiNum) {
          
          // ... então é um erro de "número incorreto".
          // (Ex: 'painel' (API: ...9842) e usuário digita NADA (null))
          setError(
            `Instância "${instanceName}" encontrada, mas o número não corresponde. (API: ...${cleanApiNum.slice(-4)} | Digitado: ${cleanUserNum ? '...'+cleanUserNum.slice(-4) : 'Nenhum'})`
          );
          setStatus({ status: "numero_incorreto" });
          setLoading(false);
          return; // Para a execução
      }
      
      // Se a API NÃO tem número (cleanApiNum é null, ex: 'bot_principal' desconectada),
      // a validação é PULADA, e o sistema tenta conectar com o número
      // que o usuário digitou. (Corrigindo o problema da 'bot_principal')
      // =================================================================
      // FIM DA VALIDAÇÃO
      // =================================================================

      // 3. Se chegou aqui, está tudo certo. Seta o status.
      setStatus(result);

      // 4. Se a API já retornou o QR Code, apenas exiba-o.
      if (result.qrCode) {
        setQrCode(result.qrCode);
        setLoading(false); // Paramos aqui, não precisamos de polling
      } 
      // 5. Se a API disse que está 'open', limpa o QR.
      else if (result.status === "open") {
        setQrCode(null); // Conectado, limpa QR
        setLoading(false);
      } 
      // 6. Se está em qualquer outro estado ('connecting', 'close', etc.)
      //    E NÃO temos um QR, aí sim iniciamos o polling.
      else {
        startPollingQrCode();
      }
    } catch (err) {
      if (err.status === 404) {
        setError(`Instância "${instanceName}" não encontrada. Clique em 'Criar'.`);
        setStatus({ status: "nao_encontrada" });
      } else {
        setError(`Erro ao verificar status: ${err.message}`);
      }
      setLoading(false); // Garante que o loading pare em caso de erro
    }
  };

  // Cria instância e inicia o polling
  const handleCreateAndConnect = async () => {
    setLoading(true);
    stopPolling();
    setError(null);
    setQrCode(null);

    // =================================================================
    // ✅ CORREÇÃO 3: Validar antes de Criar
    // =================================================================
    if (!instanceName || !whatsappNumber) {
        setError("Para criar, o Nome da Instância e o Número são obrigatórios.");
        setLoading(false);
        return;
    }

    try {
      // A função createInstance já envia o NOME e o NÚMERO
      await createInstance(instanceName, whatsappNumber);
      
      // Após criar, inicia o polling para buscar o QR Code
      startPollingQrCode();

    } catch (err) {
      // Verifica se a instância já existe
      if (
        err.status === 403 ||
        err.message?.includes("is already in use")
      ) {
        setError("Essa instância já existe. Buscando QR Code para reconectar...");
        startPollingQrCode(); 
      } else {
        console.error("Erro ao criar instância:", err);
        setError(err.message || "Erro desconhecido ao criar instância");
        setLoading(false);
      }
    }
    // O setLoading(false) será chamado pelo startPollingQrCode
  };

  // Limpa o polling ao sair da tela
  useEffect(() => {
    // Não vamos mais checar o status ao carregar,
    // pois os campos podem estar vazios ou com dados
    // de outra instância.
    // handleCheckStatus(); // REMOVIDO
    
    return () => {
      stopPolling(); // Limpa o timer
    };
  }, []); // Dependência vazia: roda apenas 1x ao montar

  return (
    <div className="p-6 rounded-2xl shadow-md bg-white max-w-xl mx-auto mt-8 border border-gray-200">
      <h2 className="text-2xl font-semibold mb-3 text-gray-800">
        ⚡ Conexão Evolution API
      </h2>
      <p className="text-gray-600 mb-6">
        Gerencia a instância: <strong>{instanceName || "N/A"}</strong>
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nome da Instância
          </label>
          <input
            type="text"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número WhatsApp (Opcional)
          </label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="Ex: 5511999999999"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 border-red-300 text-red-700">
            {error}
          </div>
        )}

        {status && (
          <div
            className={`p-3 rounded-lg border ${
              status?.status === "open"
                ? "bg-green-100 border-green-300 text-green-700"
                : (status?.status === "nao_encontrada" || status?.status === "timeout" || status?.status === "numero_incorreto" || status?.status === "dados_incompletos")
                  ? "bg-red-100 border-red-300 text-red-700" // Erros em vermelho
                   : "bg-yellow-100 border-yellow-300 text-yellow-700" // Pendências em amarelo
            }`}
          >
            {status?.status === "open"
              ? "✅ Instância conectada com sucesso!"
              : `📡 Status: ${status?.status || String(status)}`}
          </div>
        )}

        {qrCode && (
          <div className="mt-4 text-center">
            <p className="mb-2 text-gray-700">Escaneie o QR Code no WhatsApp:</p>
            <img
              src={qrCode}
              alt="QR Code WhatsApp"
              className="mx-auto w-64 h-64 border rounded-lg shadow"
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreateAndConnect}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            {loading ? "Processando..." : "Criar Instância & Conectar"}
          </button>
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            {loading ? "Verificando..." : "Atualizar Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
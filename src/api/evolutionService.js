const API_BASE_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://dados-evolution-api.nqgxnm.easypanel.host';
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';

// util: faz fetch e tenta ler body como json/text
async function safeFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  let text = '';
  try { text = await res.text(); } catch (e) { /* ignore */ }
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  return { res, ok: res.ok, status: res.status, text, json };
}

async function evolutionFetch(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { apikey: API_KEY };
  const opts = { method, headers };

  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const { res, ok, status, text, json } = await safeFetch(url, opts);

  if (!ok) {
    const serverMsg = (json && (json.message || json.error)) || text || `HTTP ${status}`;
    const err = new Error(serverMsg);
    err.status = status;
    err.body = text;
    throw err;
  }
  return json !== null ? json : (text ? { raw: text } : {});
}

/**
 * ✅ Helper para extrair dados da resposta da API.
 * (Usa sintaxe segura (data && data.instance) em vez de data?.instance)
 */
function extractInstanceData(data) {
  // 1. Tenta pegar os dados aninhados (ex: data.instance.qrcode)
  // 2. Se não achar, tenta pegar os dados no nível raiz (ex: data.qrcode)
  const instance = (data && data.instance) || data;

  if (!instance) {
    return { status: 'connecting', number: null, qrCode: null };
  }

  const rawQr = instance.base64 || instance.qrcode || instance.qrCode;
  let apiStatus = instance.state || instance.status;
  let qrBase64 = null;

  if (rawQr) {
    apiStatus = 'qrcode';
    qrBase64 = rawQr.startsWith('data:image') ? rawQr : `data:image/png;base64,${rawQr}`;
  }
  if (!apiStatus) {
    apiStatus = 'connecting';
  }

  const apiNumber = instance.number || instance.owner;

  return { status: apiStatus, number: apiNumber, qrCode: qrBase64 };
}


export async function createInstance(instanceName, instanceNumber, instanceToken) {
  return evolutionFetch('/instance/create', 'POST', {
    instanceName,
    token: instanceToken,
    number: instanceNumber || undefined,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });
}

export async function fetchInstances() {
  const url = `${API_BASE_URL}/instance/fetchInstances`;
  const { res, ok, status, text, json } = await safeFetch(url, { headers: { apikey: API_KEY } });
  if (!ok) {
    const serverMsg = (json && (json.message || json.error)) || text || `HTTP ${status}`;
    const err = new Error(serverMsg);
    err.status = status;
    err.body = text;
    throw err;
  }
  return json || [];
}

export async function logoutInstance(instanceName) {
  return evolutionFetch(`/instance/logout/${instanceName}`, 'DELETE');
}

// =================================================================
// ✅ CORREÇÃO APLICADA AQUI
// Esta é a lógica completa para buscar o número
// =================================================================
export async function getInstanceStatus(instanceName) {
  console.log(`Verificando status, número e QR via /instance/connect/ para: ${instanceName}`);
  
  const url = `${API_BASE_URL}/instance/connect/${instanceName}`;
  const { ok, status, text, json } = await safeFetch(url, {
    method: 'GET',
    headers: { apikey: API_KEY }
  });

  if (ok) {
    const data = json || (text ? (() => { try { return JSON.parse(text); } catch(e){ return null; } })() : null);
    if (!data) {
        throw new Error("Resposta 200 OK de /instance/connect/ mas corpo vazio.");
    }
    
    // 1. Extrai os dados primários (pode vir sem o número)
    let result = extractInstanceData(data);

    // =================================================================
    // ✅ Lógica "Bug do Número Faltando"
    // Se /connect/ retornou "open" mas NÃO retornou o número,
    // vamos buscar o número manualmente em /fetchInstances/.
    // =================================================================
    if (result.status === "open" && !result.number) {
      console.warn(`Instância "${instanceName}" está "open" mas /connect/ não retornou o número. Verificando em /fetchInstances/...`);
      try {
        // 2. Busca a lista completa
        const allInstances = await fetchInstances();
        
        // 3. Encontra a instância na lista (de forma robusta)
        const searchName = String(instanceName).trim().toLowerCase();
        const foundInstanceContainer = allInstances.find(item => {
          const inst = item.instance || item; // Pega o objeto da instância, aninhado ou não
          
          // Tenta encontrar o nome em 'instanceName' OU 'name'
          const apiName = inst.instanceName || inst.name; 
          
          if (!apiName) {
            return false;
          }
          
          return String(apiName).trim().toLowerCase() === searchName;
        });
        
        // 4. Se encontrou, extrai os dados da instância
        if (foundInstanceContainer) {
          const foundInstance = foundInstanceContainer.instance || foundInstanceContainer;
          if (foundInstance.number || foundInstance.owner) {
            console.log("Número encontrado em /fetchInstances/. Adicionando ao resultado.");
            result.number = foundInstance.number || foundInstance.owner;
          } else {
            console.warn(`Instância "${instanceName}" encontrada em /fetchInstances/, mas ela também não tem um número registrado.`);
          }
        } else {
          console.warn(`Não foi possível encontrar a instância "${instanceName}" na lista de /fetchInstances/.`);
        }
      } catch (fetchErr) {
        console.error("Erro ao tentar buscar /fetchInstances/ para corrigir o número:", fetchErr.message);
      }
    }
    // =================================================================
    // FIM DA LÓGICA
    // =================================================================

    // 5. Retorna o resultado (agora com o número, se tudo deu certo)
    return result;
  }

  // A API respondeu com erro
  if (status === 404) {
     const err = new Error(`Instância "${instanceName}" não encontrada (404).`);
     err.status = 404;
     throw err;
  }
  
  // Outro erro (500, 401, etc)
  const serverMsg = (json && (json.message || json.error)) || text || `HTTP ${status}`;
  const err = new Error(serverMsg);
  err.status = status;
  throw err;
}


/**
 * getQrCode - tenta obter o QR code em Base64 de forma robusta
 * (Versão limpa, sem o texto de log que causei)
 */
export async function getQrCode(instanceName) {
  console.log(`Buscando QR Code via /instance/connect/ para: ${instanceName}`);

  const urlB = `${API_BASE_URL}/instance/connect/${instanceName}`;
  const { ok: okB, status: statusB, text: textB, json: jsonB } = await safeFetch(urlB, { headers: { apikey: API_KEY } });
  
  if (okB) {
    const data = jsonB || (textB ? (() => { try { return JSON.parse(textB); } catch(e){ return null; } })() : null);
    
    // ✅ Usa o helper (com sintaxe corrigida) para extrair os dados
    const { status, qrCode } = extractInstanceData(data);
    
    if (!qrCode) {
      // Se não veio QR, a instância está em outro estado (connecting, open, etc)
      const err = new Error(`Instância em estado "${status}", ainda sem QR Code.`);
      err.state = status;
      throw err; // Isso fará o polling tentar novamente
    }
      
    // SUCESSO! Retorna o QR Code
    return qrCode;
  
  } else {
    // Falha (404, 500, etc)
    const serverMsg = (jsonB && (jsonB.message || json.error)) || textB || `HTTP ${statusB}`;
    const err = new Error(`Erro ao obter QR Code via /instance/connect: ${serverMsg}`);
    err.status = statusB;
    err.body = textB;
    throw err;
  }
}


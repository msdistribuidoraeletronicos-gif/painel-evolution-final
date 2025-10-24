// src/api/evolutionService.js

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

export async function getInstanceStatus(instanceName) {
  return evolutionFetch(`/instance/status/${instanceName}`, 'GET');
}

/**
 * getQrCode - tenta obter o QR code em Base64 de forma robusta
 */
export async function getQrCode(instanceName) {
  // 1) tenta qrbase64
  const urlA = `${API_BASE_URL}/instance/qrbase64/${instanceName}`;
  const { ok: okA, status: statusA, text: textA, json: jsonA } = await safeFetch(urlA, { headers: { apikey: API_KEY } });
  if (okA) {
    const data = jsonA || (textA ? (() => { try { return JSON.parse(textA); } catch(e){ return null; } })() : null);
    const raw = (data && (data.base64 || data.qrcode || data.qrCode)) || textA;
    if (!raw) throw new Error('Resposta vazia ao obter qrbase64');
    
    // ✅ CORREÇÃO AQUI: Não adiciona o prefixo se ele já existir
    return raw.startsWith('data:image') ? raw : `data:image/png;base64,${raw}`;
  }

  // se 404 tenta fallback /instance/connect/{instanceName}
  if (statusA === 404) {
    const urlB = `${API_BASE_URL}/instance/connect/${instanceName}`;
    const { ok: okB, status: statusB, text: textB, json: jsonB } = await safeFetch(urlB, { headers: { apikey: API_KEY } });
    if (okB) {
      const data = jsonB || (textB ? (() => { try { return JSON.parse(textB); } catch(e){ return null; } })() : null);
      const raw = (data && (data.base64 || data.qrcode || data.qrCode)) || (data && data.state ? null : textB);
      if (!raw) {
        if (data && data.state) {
          const err = new Error('Instância ainda não gerou QR (state returned).');
          err.state = data.state;
          throw err;
        }
        throw new Error('Resposta vazia ao obter /instance/connect');
      }
       
      // ✅ CORREÇÃO AQUI TAMBÉM: Não adiciona o prefixo se ele já existir
      return raw.startsWith('data:image') ? raw : `data:image/png;base64,${raw}`;
    } else {
      const serverMsg = (jsonB && (jsonB.message || jsonB.error)) || textB || `HTTP ${statusB}`;
      const err = new Error(`Fallback /instance/connect falhou: ${serverMsg}`);
      err.status = statusB;
      err.body = textB;
      throw err;
    }
  }

  const serverMsgA = (jsonA && (jsonA.message || jsonA.error)) || textA || `HTTP ${statusA}`;
  const err = new Error(`Erro ao obter QR Code: ${serverMsgA}`);
  err.status = statusA;
  err.body = textA;
  throw err;
}
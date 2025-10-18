// supabase/functions/handle-evolution-webhook/index.ts
// VERSÃO AUTOCONTIDA - SEM IMPORTS LOCAIS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Extrai os dados da mensagem da Evolution API
    // ATENÇÃO: A estrutura do 'body' pode variar. Verifique o payload real da Evolution API.
    const instanceName = body.instance
    const customerPhone = body.data?.key?.remoteJid
    const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || ''

    // Se não houver dados essenciais, encerre
    if (!instanceName || !customerPhone || !messageContent) {
      console.log('Webhook recebido, mas dados essenciais faltando.', { instanceName, customerPhone, messageContent })
      return new Response(JSON.stringify({ message: 'Dados essenciais faltando.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Cria um cliente Admin do Supabase para ter permissão de escrita
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Encontra a nossa conta de WhatsApp com base no nome da instância
    const { data: whatsappAccount, error: accountError } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('id')
      .eq('evolution_instance_name', instanceName)
      .single()

    if (accountError || !whatsappAccount) {
      throw new Error(`Conta WhatsApp com a instância '${instanceName}' não encontrada.`)
    }

    const whatsappAccountId = whatsappAccount.id

    // 2. Procura por uma conversa existente para este cliente nesta conta de WhatsApp
    let { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('whatsapp_account_id', whatsappAccountId)
      .eq('customer_phone', customerPhone)
      .single()

    // 3. Se a conversa não existir, cria uma nova
    if (!conversation) {
      const { data: newConversation, error: newConversationError } = await supabaseAdmin
        .from('conversations')
        .insert({
          whatsapp_account_id: whatsappAccountId,
          customer_phone: customerPhone,
          status: 'andamento'
        })
        .select('id')
        .single()
      
      if (newConversationError) throw newConversationError
      conversation = newConversation
    }
    
    const conversationId = conversation.id

    // 4. Insere a nova mensagem na tabela 'messages'
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'customer', // Assumindo que a mensagem veio do cliente
        content: messageContent,
      })
    
    if (messageError) throw messageError

    // 5. Retorna sucesso!
    return new Response(JSON.stringify({ message: 'Mensagem processada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
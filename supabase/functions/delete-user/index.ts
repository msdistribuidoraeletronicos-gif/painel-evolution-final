// supabase/functions/delete-user/index.ts
// VERSÃO FINAL E CORRIGIDA - SEM IMPORTS EXTERNOS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// O conteúdo do cors.ts foi movido para cá, eliminando o import
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Lida com a requisição OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Pega o ID do usuário que queremos deletar do corpo da requisição
    const { userIdToDelete } = await req.json()
    if (!userIdToDelete) {
      throw new Error("O ID do usuário para deletar não foi fornecido.")
    }

    // 2. Cria o cliente Admin do Supabase, que tem superpoderes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. Executa a ação de deletar o usuário
    // Graças ao ON DELETE CASCADE que configuramos, isso vai apagar tudo em cascata.
    const { data, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userIdToDelete
    )
    if (deleteError) throw deleteError

    // 4. Retorna uma mensagem de sucesso
    return new Response(JSON.stringify({ message: `Usuário ${userIdToDelete} deletado com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Se algo der errado, retorna uma mensagem de erro
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
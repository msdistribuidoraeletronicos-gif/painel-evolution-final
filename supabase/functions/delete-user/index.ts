// supabase/functions/delete-user/index.ts
// CORRIGIDO COM CABEÇALHOS CORS

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// <<< A PARTE MAIS IMPORTANTE: CABEÇALHOS CORS >>>
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173', // Mude para seu domínio em produção
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Trata a requisição 'preflight' (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userIdToDelete } = await req.json();
    if (!userIdToDelete) throw new Error('userIdToDelete não foi fornecido.');

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    if (deleteError) throw new Error(deleteError.message);

    return new Response(JSON.stringify({ message: `Usuário ${userIdToDelete} deletado.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
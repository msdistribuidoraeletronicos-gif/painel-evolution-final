// supabase/functions/create-user-with-config/index.ts
// CORRIGIDO para salvar o 'user_id' (UUID) e o 'role'

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { email, password, full_name, numero } = body; 

        if (!email || !password || !full_name || !numero) {
            return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        
        // --- ETAPA 1: CRIAR O USUÁRIO DE AUTENTICAÇÃO ---
        console.log(`Iniciando criação de usuário de autenticação para: ${email}`);
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name,
                numero: numero
            }
        });

        if (authError) {
            console.error("ERRO AO CRIAR USUÁRIO DE AUTENTICAÇÃO:", authError.message);
            throw new Error(`Erro ao criar usuário (Etapa 1): ${authError.message}`);
        }

        const newUserId = authData.user.id; // <-- Este é o UUID que precisamos
        console.log(`Usuário de autenticação criado com sucesso. ID: ${newUserId}`);


        // --- ETAPA 2: INSERIR NA TABELA 'teste_escrita_usuarios' ---
        console.log("Iniciando inserção em 'teste_escrita_usuarios'...");
        
        // >>>>>>>> CORREÇÃO AQUI <<<<<<<<<<
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from('teste_escrita_usuarios') 
          .insert({
            user_id: newUserId,       // <-- SALVA O UUID DO LOGIN
            nome_completo: full_name,
            numero_telefone: numero,
            email_usuario: email,
            role: 'user'              // <-- DEFINE O CARGO PADRÃO
          })
          .select() 
          .single(); 
        // >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<<

        if (insertError) {
            console.error("ERRO AO INSERIR EM 'teste_escrita_usuarios':", insertError.message);
            throw new Error(`Erro ao escrever no banco (Etapa 2): ${insertError.message}`);
        }
        
        console.log("Inserção em 'teste_escrita_usuarios' bem-sucedida. ID:", insertedData?.id);


        // --- SUCESSO ---
        return new Response(JSON.stringify({ message: `Usuário ${email} criado com sucesso!` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (generalError) {
        console.error('ERRO INESPERADO NA FUNÇÃO:', generalError.message);
        return new Response(JSON.stringify({ error: generalError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
});
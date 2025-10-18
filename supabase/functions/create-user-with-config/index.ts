// supabase/functions/create-user-with-config/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
if (!N8N_WEBHOOK_URL) {
    console.error("ERRO CRÍTICO: Variável de ambiente N8N_WEBHOOK_URL não configurada.");
}

serve(async (req) => {
    try {
        const body = await req.json();
        // A Edge Function agora espera todos os campos do formulário de cadastro
        const { email, password, full_name, numero } = body; 

        if (!email || !password || !full_name || !numero) {
            return new Response(JSON.stringify({ error: 'Todos os campos obrigatórios (Email, Senha, Nome e Telefone) devem ser preenchidos.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // PASSO 1: CRIAÇÃO DO USUÁRIO NA AUTENTICAÇÃO
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error("ERRO AO CRIAR USUÁRIO:", authError.message);
            throw new Error(`Falha na autenticação ao criar usuário: ${authError.message}`);
        }

        const newUser = authData.user;

        // PASSO 2: CRIAÇÃO DO PERFIL NA TABELA 'profiles'
        const profileData = {
            id: newUser.id,
            role: 'user',
            full_name: full_name,
            numero: numero, // <<< VALOR RECEBIDO DO FORMULÁRIO
            
            // CAMPOS OBRIGATÓRIOS RESTANTES
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString(), 
            avatar_url: '', 
        };

        const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

        if (profileError) {
            console.error("ERRO CRÍTICO AO CRIAR PERFIL:", profileError.message);
            throw new Error(`Falha no DB ao criar perfil. (Detalhes: ${profileError.code} - ${profileError.message})`);
        }

        // PASSO 3: DISPARAR WEBHOOK PARA O N8N
        if (N8N_WEBHOOK_URL) {
            const webhookPayload = {
                user_id: newUser.id,
                user_email: newUser.email,
                instance_name: full_name,
                user_name: full_name,
            };

            await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
            });
        }

        return new Response(JSON.stringify({ message: `Usuário ${email} criado e onboarding iniciado no n8n!` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        // TRATAMENTO DE ERRO: Garante que o usuário de autenticação seja deletado se o perfil falhar
        let userIdToDelete = null;
        try {
            const authHeader = error.message.match(/user ID: ([a-f0-9-]+)/i)?.[1];
            if (authHeader) userIdToDelete = authHeader;
        } catch (e) { /* ignore */ }

        if (userIdToDelete) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
            } catch (cleanupError) {
                console.error("Falha na limpeza do usuário Auth após erro:", cleanupError.message);
            }
        }
        
        console.error('Falha geral na Edge Function:', error.message);
        
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
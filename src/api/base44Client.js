// src/api/base44Client.js
// CORRIGIDO para filtrar por usuário e inserir com o ID do usuário

import { supabase } from '../supabaseClient';
const TABLE_NAME = 'configuracoes_bots'; 

// Função helper para pegar o ID do usuário logado
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');
  return user.id;
};

export const base44 = {
  entities: {
    ChatbotConfig: {
      
      // 1. LISTAR (READ) - CORRIGIDO
      list: async () => {
        const userId = await getUserId(); // Pega o ID do usuário logado
        
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('user_id', userId); // <-- FILTRA pelo usuário logado
        
        if (error) {
          console.error('ERRO SUPABASE - LISTAR:', error);
          // Se o RLS estiver DESATIVADO, mas a coluna 'user_id'
          // não existir, o erro será capturado aqui.
          throw new Error(`Falha ao carregar configurações: ${error.message}`);
        }
        return data; 
      },
      
      // 2. ATUALIZAR (UPDATE)
      // (Não muda, pois o RLS deve checar se o usuário é dono do 'id' da config)
      update: async (id, data) => {
        const { error } = await supabase
          .from(TABLE_NAME)
          .update(data)
          .eq('id', id);
          
        if (error) {
          console.error('ERRO SUPABASE - ATUALIZAR:', error);
          throw new Error('Falha ao atualizar.');
        }
        return { status: 'success' };
      },
      
      // 3. CRIAR (CREATE) - CORRIGIDO
      create: async (data) => {
        const userId = await getUserId(); // Pega o ID do usuário logado
        
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert({ 
            ...data,           // Os dados do formulário
            user_id: userId  // <-- INSERE o ID do usuário logado
          });
          
        if (error) {
          console.error('ERRO SUPABASE - CRIAR:', error);
          // O erro pode ser 'column "user_id" does not exist'
          throw new Error(`Falha ao criar: ${error.message}`);
        }
        return { status: 'success' };
      },
      
      // 4. EXCLUIR (DELETE)
      // (Não muda, pois o RLS deve checar se o usuário é dono do 'id' da config)
      delete: async (id) => {
        const { error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('ERRO SUPABASE - EXCLUIR:', error);
          throw new Error('Falha ao excluir.');
        }
        return { status: 'deleted' };
      },
    },
  },
};
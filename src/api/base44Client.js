// src/api/base44Client.js

import { supabase } from '../supabaseClient';
// Nome exato da sua tabela no Supabase
const TABLE_NAME = 'configuracoes_bots'; 

export const base44 = {
  entities: {
    ChatbotConfig: {
      
      // 1. LISTAR (READ)
      list: async () => {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*'); // Seleciona todas as colunas
        
        if (error) {
          console.error('ERRO SUPABASE - LISTAR:', error);
          throw new Error('Falha ao carregar configurações.');
        }
        return data; 
      },
      
      // 2. ATUALIZAR (UPDATE)
      update: async (id, data) => {
        // Atualiza a linha onde o 'id' é igual ao valor passado
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
      
      // 3. CRIAR (CREATE)
      create: async (data) => {
        // Insere a nova linha com os dados do formulário
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert(data);
          
        if (error) {
          console.error('ERRO SUPABASE - CRIAR:', error);
          throw new Error('Falha ao criar.');
        }
        return { status: 'success' };
      },
      
      // 4. EXCLUIR (DELETE)
      delete: async (id) => {
        // Exclui a linha onde o 'id' é igual ao valor passado
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
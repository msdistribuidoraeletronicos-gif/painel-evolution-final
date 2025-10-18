// src/AdminPanel.jsx

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [message, setMessage] = useState('');

  // --- 1. BUSCA DE USUÁRIOS (PROFILES) ---
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['profiles'], 
    queryFn: async () => {
      // Como admin, busca todos os perfis (permitido pela RLS)
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // --- 2. MUTATION PARA CRIAR USUÁRIO (com chamada ao n8n) ---
  const addUserMutation = useMutation({
    mutationFn: (newUser) => supabase.functions.invoke('create-user-with-config', { body: newUser }),
    
    // TRATAMENTO DE SUCESSO CORRIGIDO: Agora trata o formato de resposta da Edge Function
    onSuccess: (response) => {
      // Tenta extrair a mensagem de sucesso de diferentes locais (data.data, data, ou mensagem padrão)
      const messageText = response?.data?.message || response?.message || 'Usuário criado com sucesso, e onboarding iniciado.';
      setMessage(messageText);
      queryClient.invalidateQueries({ queryKey: ['profiles'] }); 
      setNewUserEmail('');
      setNewUserPassword('');
    },
    // TRATAMENTO DE ERRO CORRIGIDO: Lida com falhas de rede ou falhas internas da função
    onError: (error) => {
      // Tenta extrair o erro do objeto de erro, ou retorna uma mensagem genérica
      const errorMessage = error.message.includes('FetchError') 
        ? "Erro de conexão: O n8n ou o servidor da função está inacessível." 
        : error.message;
      setMessage(`Erro ao criar usuário: ${errorMessage}`);
    },
  });

  // --- 3. MUTATION PARA DELETAR USUÁRIO (com chamada à Edge Function) ---
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => supabase.functions.invoke('delete-user', { body: { userIdToDelete: userId } }),
    
    // TRATAMENTO DE SUCESSO CORRIGIDO:
    onSuccess: (response) => {
      const messageText = response?.data?.message || response?.message || 'Usuário deletado com sucesso!';
      setMessage(messageText);
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    // TRATAMENTO DE ERRO CORRIGIDO:
    onError: (error) => {
      setMessage(`Erro ao deletar usuário: ${error.message}`);
    },
  });

  const handleAddUser = (e) => {
    e.preventDefault();
    addUserMutation.mutate({ email: newUserEmail, password: newUserPassword });
  };
  
  const handleDeleteUser = async (userId) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser && currentUser.id === userId) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }
    
    if (window.confirm("Tem certeza que deseja excluir este usuário? Todos os seus dados serão apagados permanentemente.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Painel do Administrador</h1>
        <button style={styles.buttonLogout} onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>

      {/* Seção de Adicionar Usuário */}
      <div style={styles.card}>
        <h2>Adicionar Novo Usuário</h2>
        <form onSubmit={handleAddUser} style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{flexGrow: 1}}><label>E-mail</label><input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={styles.input}/></div>
          <div style={{flexGrow: 1}}><label>Senha</label><input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required style={styles.input}/></div>
          <button type="submit" style={styles.button} disabled={addUserMutation.isPending}>
            {addUserMutation.isPending ? 'Criando...' : 'Adicionar'}
          </button>
        </form>
        {message && <p style={styles.message}>{message}</p>}
      </div>

      {/* Seção de Gerenciar Usuários */}
      <div style={{ ...styles.card, marginTop: '2rem' }}>
        <h2>Gerenciar Usuários</h2>
        {isLoadingUsers ? <p>Carregando usuários...</p> : (
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Nome</th><th style={styles.th}>ID do Usuário</th><th style={styles.th}>Papel</th><th style={styles.th}>Ações</th></tr></thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>{user.full_name || 'Não informado'}</td>
                  <td style={styles.td}>{user.id}</td>
                  <td style={styles.td}>{user.role}</td>
                  <td style={styles.td}>
                    <button 
                      style={styles.deleteButton} 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleteUserMutation.isPending && deleteUserMutation.variables === user.id}
                    >
                      {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Estilos
const styles = {
  container: { fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' },
  card: { backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
  input: {width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'},
  button: { padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', height: '45px' },
  buttonLogout: { padding: '0.5rem 1rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', cursor: 'pointer' },
  message: { marginTop: '1rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  th: { borderBottom: '2px solid #dee2e6', padding: '0.75rem', textAlign: 'left', fontWeight: '600' },
  td: { borderBottom: '1px solid #dee2e6', padding: '0.75rem', verticalAlign: 'middle' },
  deleteButton: { padding: '0.3rem 0.6rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', cursor: 'pointer' },
};
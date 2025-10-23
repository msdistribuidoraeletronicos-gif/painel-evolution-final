// src/AdminPanel.jsx
// VERSÃO CORRIGIDA - Lendo da tabela 'teste_escrita_usuarios'

import React, { useState } from 'react';
import { supabase } from './supabaseClient'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newNumero, setNewNumero] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'

  // --- 1. FUNÇÕES DE BUSCA (useQuery) ---
  // >>>>>>>> CORREÇÃO AQUI <<<<<<<<<<
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['teste_escrita_usuarios'], // <-- Chave corrigida
    queryFn: async () => {
      try {
          // <-- Tabela corrigida
          const { data, error, status } = await supabase.from('teste_escrita_usuarios').select('*');
          
          if (status === 406 || error) {
            console.warn("ALERTA 406: Retornando vazio.");
            return []; 
          }
          return data || []; 
      } catch (e) {
          console.error("ERRO DE REDE AO BUSCAR USUÁRIOS:", e.message);
          return [];
      }
    },
  });
  // >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<<

  // --- 2. MUTATION PARA CRIAR USUÁRIO ---
  // (Esta função já chama a Edge Function, está correta)
  const addUserMutation = useMutation({
    mutationFn: async (userData) => {
      const { data, error } = await supabase.functions.invoke('create-user-with-config', { 
        body: { 
          email: userData.email, 
          password: userData.password,
          full_name: userData.full_name, 
          numero: userData.numero,
        } 
      });
      
      if (error) {
        throw new Error(error.message || 'Erro desconhecido na Edge Function.');
      }
      return data;
    },
    
    onSuccess: (data) => {
      const messageText = data?.message || 'Usuário criado com sucesso e onboarding iniciado.';
      setMessage(messageText);
      setMessageType('success');
      // >>>>>>>> CORREÇÃO AQUI <<<<<<<<<<
      queryClient.invalidateQueries({ queryKey: ['teste_escrita_usuarios'] }); // <-- Chave corrigida
      setNewUserEmail('');
      setNewUserPassword('');
      setNewFullName('');
      setNewNumero('');
    },
    onError: (error) => {
      const errorMessage = `Erro ao criar usuário: ${error.message}`;
      setMessage(errorMessage);
      setMessageType('error');
    },
  });

  // --- 3. MUTATION PARA DELETAR USUÁRIO ---
  // (Esta função já chama a Edge Function 'delete-user', está correta)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userIdToDelete: userId } });
      if (error) {
        throw new Error(error.message || 'Erro desconhecido ao deletar.');
      }
      return { data, userId };
    },
    onSuccess: ({ data, userId }) => {
      // >>>>>>>> CORREÇÃO AQUI <<<<<<<<<<
      // Busca pelo 'user_id' (UUID) e mostra o 'nome_completo'
      const deletedUser = users?.find(u => u.user_id === userId);
      const messageText = data?.message || `Usuário '${deletedUser?.nome_completo || userId}' deletado com sucesso!`;
      // >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<<
      
      setMessage(messageText);
      setMessageType('success');
      queryClient.invalidateQueries({ queryKey: ['teste_escrita_usuarios'] }); // <-- Chave corrigida
    },
    onError: (error) => {
      setMessage(`Erro ao deletar usuário: ${error.message}`);
      setMessageType('error');
    },
  });

  // --- 4. HANDLERS (Funções de Lógica) ---
  const handleAddUser = (e) => {
    e.preventDefault();
    setMessage(''); 
    if (!newUserEmail || !newUserPassword || !newFullName || !newNumero) {
        setMessage('E-mail, Senha, Nome Completo e Telefone são obrigatórios.');
        setMessageType('error');
        return;
    }
    addUserMutation.mutate({ 
      email: newUserEmail, 
      password: newUserPassword,
      full_name: newFullName,
      numero: newNumero
    });
  };
  
  const handleDeleteUser = async (userId) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser && currentUser.id === userId) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }
    setMessage('');
    if (window.confirm("Tem certeza que deseja excluir este usuário? Todos os seus dados serão apagados permanentemente.")) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  const getMessageStyle = () => {
    if (messageType === 'error') return { ...styles.message, backgroundColor: '#f8d7da', color: '#721c24' };
    if (messageType === 'success') return { ...styles.message, backgroundColor: '#d4edda', color: '#155724' };
    return { ...styles.message, backgroundColor: '#e9ecef', color: '#333' };
  };


  // --- 5. PARTE VISUAL (return) ---
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Painel do Administrador</h1>
        <button style={styles.buttonLogout} onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>

      {/* Seção de Adicionar Usuário (Já estava correta) */}
      <div style={styles.card}>
        <h2>Adicionar Novo Usuário</h2>
        <form onSubmit={handleAddUser} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div style={{display: 'flex', gap: '1rem', width: '100%'}}>
            <div style={{flex: 1}}><label>Nome Completo</label><input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required style={styles.input}/></div>
            <div style={{flex: 1}}><label>Telefone (c/ DDD)</label><input type="text" value={newNumero} onChange={(e) => setNewNumero(e.target.value)} required style={styles.input}/></div>
          </div>
          <div style={{display: 'flex', gap: '1rem', width: '100%'}}>
            <div style={{flex: 1}}><label>E-mail</label><input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={styles.input}/></div>
            <div style={{flex: 1}}><label>Senha</label><input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required style={styles.input}/></div>
          </div>
          <button type="submit" style={{...styles.button, width: '200px', alignSelf: 'flex-end', marginTop: '1rem'}} disabled={addUserMutation.isPending}>
            {addUserMutation.isPending ? 'Criando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {/* MENSAGEM DE ERRO/SUCESSO */}
      {message && <p style={{...getMessageStyle(), marginTop: '1rem', marginBottom: '1rem'}}>{message}</p>}

      {/* Seção de Gerenciar Usuários */}
      <div style={{ ...styles.card, marginTop: '2rem' }}>
        <h2>Gerenciar Usuários</h2>
        {isLoadingUsers ? <p>Carregando usuários...</p> : (
          <table style={styles.table}>
            {/* >>>>>>>> CORREÇÃO AQUI <<<<<<<<<< */}
            <thead><tr><th style={styles.th}>Nome</th><th style={styles.th}>Email</th><th style={styles.th}>Papel</th><th style={styles.th}>Ações</th></tr></thead>
            <tbody>
              {users?.map((user) => (
                // Usamos o 'id' (int8) da tabela como key
                <tr key={user.id}> 
                  <td style={styles.td}>{user.nome_completo || 'Não informado'}</td>
                  <td style={styles.td}>{user.email_usuario}</td>
                  <td style={styles.td}>{user.role}</td>
                  <td style={styles.td}>
                    {/* Passamos o 'user_id' (UUID) para a função de deletar */}
                    <button style={styles.deleteButton} onClick={() => handleDeleteUser(user.user_id)} disabled={deleteUserMutation.isPending && deleteUserMutation.variables === user.user_id}>
                      {deleteUserMutation.isPending && deleteUserMutation.variables === user.user_id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<< */}
          </table>
        )}
      </div>
    </div>
  );
}

// Estilos (Não mudam)
const styles = {
  container: { fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' },
  card: { backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
  input: {width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'},
  button: { padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', height: '45px' },
  buttonLogout: { padding: '0.5rem 1rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', cursor: 'pointer' },
  message: { marginTop: '1rem', padding: '1rem', borderRadius: '4px', textAlign: 'center', fontWeight: '500' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  th: { borderBottom: '2px solid #dee2e6', padding: '0.75rem', textAlign: 'left', fontWeight: '600' },
  td: { borderBottom: '1px solid #dee2e6', padding: '0.75rem', verticalAlign: 'middle' },
  deleteButton: { padding: '0.3rem 0.6rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', cursor: 'pointer' },
};
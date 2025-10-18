// src/App.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

// --- IMPORTAÇÕES IMPORTANTES QUE ESTAVAM FALTANDO ---
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Nossos componentes de página
import Configuracoes from './Configuracoes';
import AdminPanel from './AdminPanel';
import AuthPage from './AuthPage';

// --- CRIAÇÃO DO "GERENTE" (QueryClient) ---
const queryClient = new QueryClient();

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || 'user');
      }
      setLoading(false);
    };

    fetchSessionAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setUserRole(null);
      } else {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({data}) => {
           setUserRole(data?.role || 'user');
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  let content;
  if (loading) {
    content = <div>Carregando sua sessão...</div>;
  } else if (!session) {
    content = <AuthPage />;
  } else if (userRole === 'admin') {
    content = <AdminPanel />; 
  } else {
    content = <Configuracoes />; 
  }
  
  // --- O "GERENTE" (QueryClientProvider) ENTRA EM AÇÃO ---
  // Ele "abraça" todo o conteúdo, garantindo que qualquer componente filho
  // possa usar o React Query sem erros.
  return (
    <QueryClientProvider client={queryClient}>
      {content}
    </QueryClientProvider>
  )
}
// src/main.jsx - AGORA CONTÉM A LÓGICA DO ROTEADOR

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from './supabaseClient';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Configuracoes from './Configuracoes';
import AdminPanel from './AdminPanel';
import AuthPage from './AuthPage';
import './index.css'; // Não se esqueça do CSS

const queryClient = new QueryClient();

// FUNÇÃO ROTEADORA (Antigo App.jsx)
function RootApp() {
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
  
  return content;
}

// RENDERIZAÇÃO FINAL (A parte que o Vite/Vercel executa)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
        <RootApp />
    </QueryClientProvider>
  </React.StrictMode>,
);
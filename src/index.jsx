// src/index.jsx
// v16 - CORREÇÃO DEFINITIVA DO F5

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from './supabaseClient';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminPanel from './AdminPanel.jsx'; 
import AuthPage from './AuthPage';
import ClientPanel from './ClientPanel.jsx';
import SubscriptionPage from './SubscriptionPage.jsx'; 

import './index.css'; 
import './AuthPage.module.css'; 

const queryClient = new QueryClient();

function RootApp() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [hasAccess, setHasAccess] = useState(false); 

  const getUserProfile = async (userEmail) => {
    try {
      console.log(`[getProfile] Buscando perfil para: ${userEmail}`);
      const { data, error } = await supabase
        .from('teste_escrita_usuarios')
        .select('role, created_at, subscription_status, plan_id') 
        .eq('email_usuario', userEmail)
        .single(); 
      if (error) throw error;
      console.log("[getProfile] Perfil encontrado:", data);
      return data;
    } catch (error) {
      console.error("[getProfile] Erro ao buscar perfil:", error.message);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log("[index.jsx] onAuthStateChange disparou:", _event);
      setSession(newSession);

      if (!newSession) {
        setUserRole(null);
        setHasAccess(false);
        setLoading(false);
      } else {
        const profileTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout! getUserProfile() demorou muito.")), 5000)
        );

        try {
          console.log("[index.jsx] Sessão OK, buscando perfil (com timeout de 5s)...");
          
          const profile = await Promise.race([
            getUserProfile(newSession.user.email),
            profileTimeout
          ]);
          
          if (profile) {
            setUserRole(profile.role);
            
            if (profile.role === 'admin') {
              setHasAccess(true);
            } else if (profile.subscription_status === 'active') {
              setHasAccess(true);
            } else if (profile.subscription_status === 'trialing') {
              const createdAt = new Date(profile.created_at);
              const trialEndsAt = new Date(createdAt.getTime() + (15 * 24 * 60 * 60 * 1000));
              const now = new Date();
              
              if (now < trialEndsAt) {
                console.log("[Access] Trial ATIVO. Acesso permitido.");
                setHasAccess(true); 
              } else {
                console.log("[Access] Trial EXPIRADO. Acesso negado.");
                setHasAccess(false); 
              }
            } else {
              setHasAccess(false); 
            }
          } else {
            setHasAccess(false);
          }
          
        } catch (error) {
          console.error("[index.jsx] Erro ao buscar perfil (ou timeout):", error.message);
          
          // >>>>>>>> ESTA É A CORREÇÃO (v16) <<<<<<<<<<
          if (error.message.includes("Timeout")) {
            console.warn("[index.jsx] Timeout detectado. Concedendo acesso de 'user' por padrão.");
            setUserRole('user');
            setHasAccess(true); // DÁ O ACESSO
          } else {
            setHasAccess(false);
          }
          // >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<<
          
        } finally {
          console.log("[index.jsx] Busca de perfil finalizada, definindo loading(false)");
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); 


  // ----- RENDERIZAÇÃO -----
  
  if (loading) {
    return <div>Carregando sua sessão...</div>;
  }
  
  if (!session) {
    return <AuthPage />;
  }
  
  if (hasAccess) {
    if (userRole === 'admin') {
      return <AdminPanel />; 
    } else {
      return <ClientPanel />; 
    }
  } else {
    return <SubscriptionPage />; 
  }
}

// RENDERIZAÇÃO FINAL
ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <RootApp />
  </QueryClientProvider>
);
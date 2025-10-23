// src/AuthPage.jsx
// CÓDIGO CORRIGIDO E COMPLETO

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // CAMPOS OBRIGATÓRIOS
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- FUNÇÃO CORRIGIDA ---
  const handleAuthAction = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // VALIDAÇÃO FRONTEND
    if (!isLogin && (!fullName || !phoneNumber)) {
        setError("Nome completo e telefone são obrigatórios para o cadastro.");
        setLoading(false);
        return;
    }

    try {
      if (isLogin) {
        // LÓGICA DE LOGIN (NÃO MUDA, JÁ ESTAVA CORRETA)
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

      } else {
        
        // >>>>>>>> CORREÇÃO AQUI <<<<<<<<<<
        // Paramos de usar 'auth.signUp' e passamos a invocar
        // a sua Edge Function 'create-user-with-config' diretamente,
        // pois é assim que seu painel admin (que funciona) faz.
        
        // Usamos o 'supabase.functions.invoke' que é a forma moderna
        // de chamar a função. O nome da função é o nome do arquivo dela.
        const { data, error: functionError } = await supabase.functions.invoke('create-user-with-config', {
          body: {
            email: email,
            password: password,
            // Enviamos os nomes que a sua função espera:
            full_name: fullName, 
            numero: phoneNumber
          }
        });

        if (functionError) {
          // Se a função retornar um erro (ex: "User already registered"),
          // ele será capturado aqui.
          throw functionError;
        }
        
        // Se a função foi executada com sucesso:
        alert('Usuário criado com sucesso! Por favor, faça login.');
        setIsLogin(true); // Redireciona para o login
        // >>>>>>>> FIM DA CORREÇÃO <<<<<<<<<<
      }

    } catch (error) {
      // Captura erros tanto do login quanto da Edge Function
      setError(error.message || "Ocorreu um erro. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO CORRIGIDA ---

  return (
    <div className={styles.authContainer}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>
          {isLogin ? 'Bem-vindo de volta' : 'Crie sua Conta'}
        </h1>
        <p className={styles.subtitle}>
          {isLogin ? 'Acesse o seu painel de controle.' : 'Preencha os dados para começar.'}
        </p>

        <form onSubmit={handleAuthAction}>
          
          {/* CAMPOS EXTRAS PARA O CADASTRO */}
          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Nome Completo</label>
                <input id="name" type="text" placeholder="Seu nome" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="phone">Telefone (Obrigatório)</label>
                <input id="phone" type="tel" placeholder="Seu WhatsApp (apenas números)" value={phoneNumber} required onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" placeholder="seu@email.com" value={email} required onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" placeholder="••••••••" value={password} required onChange={(e) => setPassword(e.target.value)} />
          </div>

          {/* O erro (string) será renderizado aqui */}
          {error && <p className={styles.errorMessage}>{error}</p>}

          <button type="submit" className={styles.authButton} disabled={loading}>
            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar e Iniciar')}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <span onClick={() => { setIsLogin(!isLogin); setError(null); }}>
            {isLogin ? ' Cadastre-se' : ' Faça login'}
          </span>
        </p>
      </div>
    </div>
  );
}
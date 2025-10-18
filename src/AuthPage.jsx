// src/AuthPage.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // NOVOS ESTADOS PARA O CADASTRO
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // URL da Edge Function para criar usuário (chamada apenas no cadastro)
  const CREATE_USER_FUNCTION_URL = 'https://gwnztmmmazcxoygnkfhp.supabase.co/functions/v1/create-user-with-config'; 

  const handleAuthAction = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Lógica de Login Padrão
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

      } else {
        // LÓGICA DE CADASTRO (CHAMADA À EDGE FUNCTION)
        const response = await fetch(CREATE_USER_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // O n8n requer autenticação, mas a Edge Function não, a menos que você a proteja.
                // Não é necessário passar a chave secreta aqui.
            },
            body: JSON.stringify({
                email: email,
                password: password,
                full_name: fullName,
                numero: phoneNumber, 
            }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            // Se a função falhar (status 400 ou 500)
            const errorMessage = result.error || 'Erro desconhecido ao criar usuário.';
            throw new Error(errorMessage);
        }

        alert(result.message || 'Cadastro realizado! Onboarding iniciado.');
        setIsLogin(true); // Redireciona para o login após o cadastro
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
// src/supabaseClient.js - CÓDIGO FINAL E LIMPO

import { createClient } from '@supabase/supabase-js'

// --- CREDENCIAIS ANON (Frontend) ---
// Substitua pelos seus valores reais
const supabaseUrl = 'https://gwnztmmmazcxoygnkfhp.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bnp0bW1tYXpjeG95Z25rZmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzgyMDksImV4cCI6MjA3NTQ1NDIwOX0.M20mVYwwzzTjD1caE4R2hSg1gojidBZJZv-TD2lMTgU' 

// Cliente padrão (para uso no frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// NOTA: Todas as referências a chaves secretas ou clientes Admin foram removidas para corrigir o erro.
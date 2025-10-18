// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// --- CHAVES SECRETAS ---
// Você deve pegar a URL e a chave 'anon public' no seu painel Supabase
const supabaseUrl = 'https://gwnztmmmazcxoygnkfhp.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bnp0bW1tYXpjeG95Z25rZmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzgyMDksImV4cCI6MjA3NTQ1NDIwOX0.M20mVYwwzzTjD1caE4R2hSg1gojidBZJZv-TD2lMTgU'; 
// OBS: Se você já tem a chave no seu nó n8n, você já a tem. Use a chave 'anon public'.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// NOTA: Para segurança em produção, estas chaves devem vir de variáveis de ambiente (Vercel).
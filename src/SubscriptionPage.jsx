// src/SubscriptionPage.jsx
// Nova página para mostrar os planos quando o trial expira

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Button } from '@/components/ui/button'; // Reutiliza o botão
import { CheckCircle } from 'lucide-react';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca os planos da sua tabela 'plans' no Supabase
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        // Usamos a sua tabela 'plans'
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('price', { ascending: true }); // Ordena do mais barato ao mais caro

        if (error) throw error;
        setPlans(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, []);

  // Esta função é onde a mágica do pagamento vai acontecer no FUTURO.
  // Por agora, ela só mostra um alerta.
  const handleCheckout = (planId) => {
    alert(`Iniciando checkout para o plano: ${planId}!\n(Aqui chamaremos a API do Mercado Pago/Stripe)`);
    // No futuro:
    // 1. Chamar uma Supabase Edge Function com o 'planId'
    // 2. A Function cria um link de pagamento (Stripe/MercadoPago)
    // 3. Redirecionar o usuário para 'window.location.href = linkDePagamento'
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Seu período de teste expirou!
        </h1>
        <p className="text-xl text-gray-600">
          Para continuar usando o serviço, por favor, escolha um de nossos planos.
        </p>
      </div>

      {loading && <p>Carregando planos...</p>}
      {error && <p className="text-red-600">Erro ao carregar planos: {error}</p>}
      
      {/* Grade de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow-lg p-6 flex flex-col border-2 border-transparent hover:border-blue-600 transition-all">
            <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
            <p className="text-4xl font-bold mb-4">
              R$ {plan.price.toFixed(2)}
              <span className="text-lg font-normal text-gray-500">/mês</span>
            </p>
            
            <ul className="space-y-2 text-gray-700 mb-6 flex-grow">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Limite de {plan.whatsapp_limit} contas
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                {plan.has_lead_feature ? 'Captura de Leads' : 'Sem Captura de Leads'}
              </li>
              {/* Adicione mais features aqui se sua tabela 'plans' tiver */}
            </ul>

            <Button 
              onClick={() => handleCheckout(plan.id)}
              className="w-full"
              // Destaque para o plano 'pro' (exemplo)
              variant={plan.id === 'pro' ? 'default' : 'outline'}
            >
              Assinar Agora
            </Button>
          </div>
        ))}
      </div>
      
      <Button 
        variant="link" 
        onClick={handleLogout}
        className="mt-8 text-gray-600"
      >
        Sair da conta
      </Button>
    </div>
  );
}
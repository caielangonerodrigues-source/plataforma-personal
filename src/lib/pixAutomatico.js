import { supabase } from '../supabase.js'

// Pix automático pelo Mercado Pago: ligado com VITE_PIX_AUTOMATICO=1 na Vercel,
// depois de publicar as funções do Supabase (veja o README).
export const pixAutomatico = import.meta.env.VITE_PIX_AUTOMATICO === '1'

// Devolve { copia_e_cola, qr_base64 } ou lança erro (aí a tela usa o Pix estático).
export async function gerarPixAutomatico(corpo) {
  const { data, error } = await supabase.functions.invoke('pix-mercadopago', { body: corpo })
  if (error || !data?.copia_e_cola) throw new Error(data?.erro || error?.message || 'Pix automático indisponível')
  return data
}

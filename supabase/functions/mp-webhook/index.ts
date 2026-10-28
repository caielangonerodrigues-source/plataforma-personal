// Recebe o aviso do Mercado Pago e confirma o pagamento.
// O aviso só traz o id: a função consulta o pagamento direto no Mercado Pago (com o seu token),
// então um aviso falso não confirma nada. Publique com "Verify JWT" desligado.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

async function confirmar(referencia: string, valorPago: number, pagamento: string) {
  const [tipo, id, competencia] = referencia.split(':')
  if (tipo === 'reserva') {
    const { data: r } = await admin.from('reservas_spinning').select('id, status, aulas_spinning(valor)').eq('id', id).maybeSingle()
    const valor = Number((r?.aulas_spinning as unknown as { valor: number })?.valor)
    if (!r || valorPago < valor || r.status === 'pago') return
    // Se a reserva já tinha expirado e a bike foi para outra pessoa, o índice único recusa:
    // fica registrado no log para o personal devolver o Pix.
    const { error } = await admin.from('reservas_spinning').update({ status: 'pago', mp_pagamento: pagamento }).eq('id', id)
    if (error) console.error('Pix pago, mas a bike não está mais livre', referencia, error.message)
  } else if (tipo === 'pacote') {
    const { data: c } = await admin.from('creditos_spinning').select('valor, status').eq('id', id).maybeSingle()
    if (!c || valorPago < Number(c.valor) || c.status === 'pago') return
    await admin.from('creditos_spinning').update({ status: 'pago', mp_pagamento: pagamento }).eq('id', id)
  } else if (tipo === 'mensalidade') {
    const { data: a } = await admin.from('alunos').select('valor_mensal').eq('id', id).maybeSingle()
    if (!a || valorPago < Number(a.valor_mensal)) return
    await admin.from('pagamentos').upsert({ aluno_id: id, competencia, valor: valorPago, mp_pagamento: pagamento }, { onConflict: 'aluno_id,competencia', ignoreDuplicates: true })
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const corpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const id = corpo?.data?.id ?? url.searchParams.get('data.id') ?? (url.searchParams.get('topic') === 'payment' ? url.searchParams.get('id') : null)
    if (!id || !TOKEN) return new Response('ok')
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) return new Response('ok')
    const pg = await r.json()
    if (pg.status === 'approved' && pg.external_reference) await confirmar(pg.external_reference, Number(pg.transaction_amount), String(pg.id))
    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response('ok') // responde 200 para o Mercado Pago não reenviar sem parar
  }
})

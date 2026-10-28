// Pix automático: cria a cobrança no Mercado Pago e devolve o QR Code.
// Quando o Pix é pago, o Mercado Pago avisa a função mp-webhook, que confirma sozinha.
// Segredo necessário no Supabase: MP_ACCESS_TOKEN (Access Token de produção do Mercado Pago).
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
const EMAIL_PADRAO = Deno.env.get('MP_EMAIL_PAGADOR') || 'pagamentos@plataforma-personal.app'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Cobranca = { referencia: string; valor: number; descricao: string; email: string; expira: Date; existente?: string | null; tabela?: string; id?: string }

async function cobrancaDaReserva(id: string, codigo: string): Promise<Cobranca | string> {
  const { data: r } = await admin.from('reservas_spinning').select('id, bike, status, codigo, created_at, mp_pagamento, aulas_spinning(titulo, valor, inicio)').eq('id', id).maybeSingle()
  if (!r || r.codigo !== codigo.toUpperCase()) return 'Reserva não encontrada.'
  if (r.status !== 'pendente') return 'Esta reserva não está aguardando pagamento.'
  const aula = r.aulas_spinning as unknown as { titulo: string; valor: number; inicio: string }
  return {
    referencia: `reserva:${r.id}`, valor: Number(aula.valor), descricao: `${aula.titulo} - bike ${r.bike}`, email: EMAIL_PADRAO,
    expira: new Date(new Date(r.created_at).getTime() + 30 * 60000), existente: r.mp_pagamento, tabela: 'reservas_spinning', id: r.id,
  }
}

async function cobrancaDoPacote(codigo: string): Promise<Cobranca | string> {
  const { data: c } = await admin.from('creditos_spinning').select('id, aulas, valor, status, mp_pagamento').eq('codigo', codigo.toUpperCase()).maybeSingle()
  if (!c) return 'Pacote não encontrado.'
  if (c.status !== 'pendente') return 'Este pacote não está aguardando pagamento.'
  return {
    referencia: `pacote:${c.id}`, valor: Number(c.valor), descricao: `Pacote de ${c.aulas} aulas de spinning`, email: EMAIL_PADRAO,
    expira: new Date(Date.now() + 24 * 3600e3), existente: c.mp_pagamento, tabela: 'creditos_spinning', id: c.id,
  }
}

async function cobrancaDaMensalidade(req: Request): Promise<Cobranca | string> {
  const usuario = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await usuario.auth.getUser()
  if (!user) return 'Entre na sua conta para pagar a mensalidade.'
  const { data: a } = await admin.from('alunos').select('id, email, valor_mensal, status').eq('user_id', user.id).maybeSingle()
  if (!a?.valor_mensal || a.status === 'pausado') return 'Mensalidade não encontrada.'
  const competencia = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
  const { data: pago } = await admin.from('pagamentos').select('id').eq('aluno_id', a.id).eq('competencia', competencia).maybeSingle()
  if (pago) return 'A mensalidade deste mês já está paga.'
  return {
    referencia: `mensalidade:${a.id}:${competencia}`, valor: Number(a.valor_mensal), descricao: `Mensalidade ${competencia}`,
    email: a.email || EMAIL_PADRAO, expira: new Date(Date.now() + 3 * 24 * 3600e3),
  }
}

const mp = (caminho: string, init: RequestInit = {}) =>
  fetch(`https://api.mercadopago.com${caminho}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!TOKEN) return resposta({ erro: 'Pix automático não configurado.' }, 503)
  try {
    const { tipo, id, codigo } = await req.json()
    const c = tipo === 'reserva' ? await cobrancaDaReserva(String(id), String(codigo || ''))
      : tipo === 'pacote' ? await cobrancaDoPacote(String(codigo || ''))
      : tipo === 'mensalidade' ? await cobrancaDaMensalidade(req)
      : 'Tipo de cobrança inválido.'
    if (typeof c === 'string') return resposta({ erro: c }, 400)
    if (c.valor <= 0) return resposta({ erro: 'Nada a pagar.' }, 400)

    // Mesma referência = mesma cobrança (a chave de idempotência evita Pix duplicado).
    const r = await mp('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': c.referencia },
      body: JSON.stringify({
        transaction_amount: c.valor,
        description: c.descricao,
        payment_method_id: 'pix',
        payer: { email: c.email },
        external_reference: c.referencia,
        notification_url: `${URL_SUPABASE}/functions/v1/mp-webhook`,
        date_of_expiration: c.expira.toISOString().replace('Z', '-00:00'),
      }),
    })
    const pg = await r.json()
    if (!r.ok) { console.error('Mercado Pago recusou', pg); return resposta({ erro: 'O Mercado Pago não gerou o Pix.' }, 502) }
    if (c.tabela && c.id && c.existente !== String(pg.id)) await admin.from(c.tabela).update({ mp_pagamento: String(pg.id) }).eq('id', c.id)
    const t = pg.point_of_interaction?.transaction_data || {}
    return resposta({ copia_e_cola: t.qr_code, qr_base64: t.qr_code_base64, expira: c.expira.toISOString(), status: pg.status })
  } catch (e) {
    console.error(e)
    return resposta({ erro: 'Erro ao gerar o Pix.' }, 500)
  }
})

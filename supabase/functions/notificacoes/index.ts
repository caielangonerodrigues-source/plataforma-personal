// Notificações no celular (Web Push) para os alunos que ativaram em Conta > Notificações.
// Não precisa de chave nova: na primeira vez a função gera as chaves de envio e guarda em push_config.
// Ações (corpo JSON):
//   { acao: 'chave' }                                  → chave pública para o aparelho se inscrever
//   { acao: 'enviar', aluno_ids, titulo, corpo, url }  → o personal manda para os alunos dele
//   { acao: 'lembretes' }                              → lembrete dos atendimentos de amanhã (da agenda)
//   { acao: 'fichas' }                                 → avisa aluno e personal quando a ficha passou do prazo de troca
// Os lembretes (e o aviso das fichas) podem rodar sozinhos todo dia com o agendamento do README (segredo CRON_SECRET).
// O painel do personal também chama 'fichas' uma vez por dia.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CRON = Deno.env.get('CRON_SECRET')
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function chaves() {
  const { data } = await admin.from('push_config').select('publica, privada').eq('id', 1).maybeSingle()
  if (data) return data
  const k = webpush.generateVAPIDKeys()
  await admin.from('push_config').upsert({ id: 1, publica: k.publicKey, privada: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true })
  const { data: salvo } = await admin.from('push_config').select('publica, privada').eq('id', 1).single()
  return salvo!
}

type Mensagem = { titulo: string; corpo: string; url?: string }

// Envia para todos os aparelhos dessas contas; apaga os que não existem mais.
async function enviar(userIds: string[], msg: Mensagem) {
  if (!userIds.length) return { aparelhos: 0, enviadas: 0 }
  const { data } = await admin.from('push_inscricoes').select('*').in('user_id', userIds)
  let enviadas = 0
  await Promise.all((data || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: msg.titulo.slice(0, 80), body: msg.corpo.slice(0, 240), url: msg.url || '/' }), { TTL: 86400 })
      enviadas++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_inscricoes').delete().eq('id', s.id)
      else console.error('push', status, e)
    }
  }))
  return { aparelhos: (data || []).length, enviadas }
}

const diaSP = (deslocamento = 0) => new Date(Date.now() + deslocamento * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()

// Lembrete de cada atendimento de amanhã (horário fixo ou remarcado; desmarcado não recebe).
async function lembretes(personalId?: string) {
  const amanha = diaSP(1)
  let q = admin.from('horarios').select('id, aluno_id, dia_semana, hora, local, alunos(user_id, status, personais(nome))')
  if (personalId) q = q.eq('personal_id', personalId)
  const { data: horarios } = await q
  const ids = (horarios || []).map((h) => h.id)
  const { data: rem } = ids.length ? await admin.from('remarcacoes').select('*').in('horario_id', ids).or(`data.eq.${amanha},nova_data.eq.${amanha}`) : { data: [] }
  const avisos: { user: string; hora: string; local: string | null; personal: string }[] = []
  for (const h of horarios || []) {
    // deno-lint-ignore no-explicit-any
    const a = h.alunos as any
    if (!a?.user_id || a.status === 'pausado') continue
    const doDia = (rem || []).find((r) => r.horario_id === h.id && r.data === amanha)
    const movido = (rem || []).find((r) => r.horario_id === h.id && r.nova_data === amanha)
    if (h.dia_semana === diaDaSemana(amanha) && !doDia) avisos.push({ user: a.user_id, hora: String(h.hora).slice(0, 5), local: h.local, personal: a.personais?.nome || 'seu personal' })
    if (movido) avisos.push({ user: a.user_id, hora: String(movido.nova_hora || h.hora).slice(0, 5), local: h.local, personal: a.personais?.nome || 'seu personal' })
  }
  let enviadas = 0
  for (const v of avisos) {
    const r = await enviar([v.user], { titulo: 'Treino amanhã', corpo: `Amanhã às ${v.hora}${v.local ? ` em ${v.local}` : ''} com ${v.personal.split(' ')[0]}. Bora! 💪`, url: '/' })
    enviadas += r.enviadas
  }
  return { atendimentos: avisos.length, enviadas }
}

// Ficha passou do prazo (Configurações > trocar a cada N semanas): uma notificação para o aluno
// e uma para o personal, só uma vez por ficha (alunos.ficha_avisada_em).
async function fichas(personalId?: string) {
  const hoje = diaSP()
  let q = admin.from('alunos').select('id, nome, user_id, personal_id, ficha_renovada_em, ficha_avisada_em, treinos(created_at, arquivado), personais(trocar_ficha_semanas)').neq('status', 'pausado')
  if (personalId) q = q.eq('personal_id', personalId)
  const { data: alunos, error } = await q
  if (error) return { erro: error.message }
  const { data: fases } = await admin.from('fases').select('aluno_id').is('aplicada_em', null)
  const comFase = new Set((fases || []).map((f) => f.aluno_id))
  const porPersonal: Record<string, string[]> = {}
  let avisados = 0
  for (const a of alunos || []) {
    const atuais = (a.treinos || []).filter((t) => !t.arquivado)
    if (!atuais.length || comFase.has(a.id)) continue
    const inicio = [...atuais.map((t) => String(t.created_at).slice(0, 10)), a.ficha_renovada_em].filter(Boolean).sort().at(-1) as string
    // deno-lint-ignore no-explicit-any
    const semanas = (a.personais as any)?.trocar_ficha_semanas || 6
    const dias = Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 864e5)
    if (dias < semanas * 7 || (a.ficha_avisada_em && a.ficha_avisada_em >= inicio)) continue
    if (a.user_id) await enviar([a.user_id], { titulo: 'Hora de trocar a ficha 💪', corpo: `Você está há ${Math.floor(dias / 7)} semanas na mesma ficha. Seu personal já foi avisado para montar a próxima.`, url: '/' })
    ;(porPersonal[a.personal_id] ||= []).push(`${a.nome.split(' ')[0]} (${Math.floor(dias / 7)} sem.)`)
    await admin.from('alunos').update({ ficha_avisada_em: hoje }).eq('id', a.id)
    avisados++
  }
  for (const [p, nomes] of Object.entries(porPersonal)) {
    await enviar([p], { titulo: nomes.length === 1 ? 'Ficha para trocar' : `${nomes.length} fichas para trocar`, corpo: `${nomes.join(', ')} já passaram do prazo da ficha.`, url: '/' })
  }
  return { avisados }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const corpo = await req.json().catch(() => ({}))
    const k = await chaves()
    if (corpo.acao === 'chave') return resposta({ publica: k.publica })
    webpush.setVapidDetails(Deno.env.get('PUSH_CONTATO') || 'mailto:notificacoes@corpoatletico.app', k.publica, k.privada)

    // Agendamento diário: confere o segredo e manda os lembretes de todos.
    if (corpo.acao === 'lembretes' && CRON && req.headers.get('x-cron-secret') === CRON) return resposta({ ...(await lembretes()), fichas: await fichas() })

    // Daqui para baixo só o personal, com o login dele (as regras do banco limitam aos alunos dele).
    const db = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user } } = await db.auth.getUser()
    if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401)
    const { data: personal } = await db.from('personais').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!personal) return resposta({ erro: 'Só o personal envia notificações.' }, 403)

    if (corpo.acao === 'lembretes') return resposta(await lembretes(user.id))
    if (corpo.acao === 'fichas') return resposta(await fichas(user.id))
    if (corpo.acao === 'enviar') {
      const ids = Array.isArray(corpo.aluno_ids) ? corpo.aluno_ids.slice(0, 500).map(String) : []
      if (!ids.length || !corpo.titulo || !corpo.corpo) return resposta({ erro: 'Faltou aluno, título ou texto.' }, 400)
      const { data: alunos } = await db.from('alunos').select('user_id').in('id', ids).neq('status', 'pausado')
      const users = (alunos || []).map((a) => a.user_id).filter(Boolean) as string[]
      return resposta(await enviar(users, { titulo: String(corpo.titulo), corpo: String(corpo.corpo), url: corpo.url ? String(corpo.url) : '/' }))
    }
    return resposta({ erro: 'Ação desconhecida.' }, 400)
  } catch (e) {
    console.error(e)
    return resposta({ erro: 'Erro ao enviar a notificação.' }, 500)
  }
})

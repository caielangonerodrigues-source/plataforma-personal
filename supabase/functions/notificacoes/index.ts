// Notificações no celular (Web Push) para os alunos que ativaram em Conta > Notificações.
// Não precisa de chave nova: na primeira vez a função gera as chaves de envio e guarda em push_config.
// Ações (corpo JSON):
//   { acao: 'chave' }                                  → chave pública para o aparelho se inscrever
//   { acao: 'enviar', aluno_ids, titulo, corpo, url }  → o personal manda para os alunos dele
//   { acao: 'lembretes' }                              → lembrete dos atendimentos de amanhã (da agenda)
//   { acao: 'fichas' }                                 → avisa aluno e personal quando a ficha passou do prazo de troca
//   { acao: 'mensalidades' }                           → lembra o aluno da mensalidade (2 dias antes, no dia e 3 dias depois)
//   { acao: 'motivacao' }                              → frase de motivação para quem está sem treinar há 3, 7, 14, 21 ou 30 dias
//   { acao: 'interacao', tipo, checkin_id | aluno_id } → qualquer um logado: avisa o dono do post (comentário/reação)
//                                                        ou o outro lado da conversa particular (mensagem). O texto vem do banco.
// Os lembretes (e os avisos de ficha e mensalidade) podem rodar sozinhos todo dia com o agendamento do README (segredo CRON_SECRET).
// O painel do personal também chama 'fichas', 'mensalidades' e 'motivacao' uma vez por dia.
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
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5)
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

// Mesma regra de src/lib/academia.js (lembreteMensalidade).
function lembreteMensalidade(diaVencimento: number | null, hoje: string) {
  if (!diaVencimento) return null
  const dia = Number(hoje.slice(8, 10))
  if (dia === diaVencimento - 2) return 'antes'
  if (dia === diaVencimento) return 'hoje'
  if (dia === diaVencimento + 3) return 'atrasada'
  return null
}

// Mensalidade do mês ainda não paga: lembrete no celular do aluno, no máximo um por dia (alunos.mensalidade_avisada_em).
async function mensalidades(personalId?: string) {
  const hoje = diaSP()
  const competencia = hoje.slice(0, 7)
  let q = admin.from('alunos').select('id, user_id, valor_mensal, dia_vencimento, mensalidade_avisada_em').neq('status', 'pausado')
    .not('valor_mensal', 'is', null).not('dia_vencimento', 'is', null).not('user_id', 'is', null)
  if (personalId) q = q.eq('personal_id', personalId)
  const { data: alunos, error } = await q
  if (error) return { erro: error.message }
  const { data: pagos } = await admin.from('pagamentos').select('aluno_id').eq('competencia', competencia)
  const pagou = new Set((pagos || []).map((p) => p.aluno_id))
  const textos = {
    antes: (d: number) => `Sua mensalidade vence dia ${d}. Dá para pagar pelo Pix direto no app, na aba Conta.`,
    hoje: () => 'Sua mensalidade vence hoje. Pague pelo Pix na aba Conta do app. 💪',
    atrasada: (d: number) => `A mensalidade venceu dia ${d}. Se já pagou, é só ignorar. Se não, o Pix está na aba Conta.`,
  }
  let avisados = 0
  for (const a of alunos || []) {
    const quando = lembreteMensalidade(a.dia_vencimento, hoje)
    if (!quando || pagou.has(a.id) || a.mensalidade_avisada_em === hoje) continue
    await enviar([a.user_id], { titulo: quando === 'atrasada' ? 'Mensalidade em aberto' : 'Lembrete da mensalidade', corpo: textos[quando](a.dia_vencimento), url: '/' })
    await admin.from('alunos').update({ mensalidade_avisada_em: hoje }).eq('id', a.id)
    avisados++
  }
  return { avisados }
}

// Mesmas regras e frases de src/lib/motivacao.js.
function deveMotivar(dias: number, diasDesdeAviso: number | null) {
  const marco = [3, 7, 14, 21, 30].filter((d) => d <= dias).at(-1)
  if (!marco || dias > 45) return null
  if (diasDesdeAviso != null && diasDesdeAviso <= dias - marco) return null
  return marco === 3 ? 'leve' : marco === 7 ? 'semana' : 'volta'
}
const FRASES_MOTIVACAO: Record<string, string[][]> = {
  leve: [
    ['Bora treinar hoje? 💪', '{nome}, 3 dias sem treino já dá saudade. Hoje é um ótimo dia para voltar!'],
    ['Seu corpo está te chamando 🔥', '{nome}, um treino hoje e a semana já muda de cara. Partiu {lugar}?'],
    ['Não deixa esfriar!', '{nome}, o difícil é começar, e você já começou. Bora manter o ritmo hoje!'],
    ['Só 1 hora por você ⏱️', '{nome}, separa uma horinha hoje para {lugar}. Você sempre sai melhor do que entrou.'],
  ],
  semana: [
    ['Sentimos sua falta! 👀', '{nome}, já faz uma semana. Que tal voltar hoje? O primeiro treino de volta é o mais importante.'],
    ['Uma semana sem você', '{nome}, a turma sentiu sua falta. Bora voltar para {lugar} hoje, mesmo que seja um treino leve?'],
    ['Recomeçar também é progresso 💪', '{nome}, não precisa ser perfeito, precisa ser hoje. Te espero!'],
  ],
  volta: [
    ['Bora recomeçar? 🧡', '{nome}, nunca é tarde para voltar. Seu treino está te esperando no app, é só abrir e começar.'],
    ['Seu lugar continua aqui', '{nome}, fica tranquilo: a gente ajusta o treino para você voltar no seu ritmo. Bora?'],
    ['Um passo de cada vez 🚶', '{nome}, um treino curto hoje já é uma vitória. Me chama se quiser ajuda para recomeçar!'],
  ],
}
function mensagemMotivacao(nivel: string, a: { id: string; nome: string; online: boolean }, hoje: string) {
  const frases = FRASES_MOTIVACAO[nivel]
  let h = 0
  for (const c of `${a.id}${hoje}`) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const [titulo, corpo] = frases[h % frases.length]
  const primeiro = String(a.nome || '').trim().split(/\s+/)[0] || 'Ei'
  return { titulo, corpo: corpo.replace('{nome}', primeiro).replace('{lugar}', a.online ? 'o treino' : 'a academia'), url: '/' }
}

// Aluno sumido (sem marcar treino nem check-in): frase de motivação ao chegar em 3, 7, 14, 21 e 30 dias,
// uma por marco (alunos.motivacao_avisada_em). O personal desliga em Configurações (personais.motivacao_auto).
async function motivacao(personalId?: string) {
  const hoje = diaSP()
  let q = admin.from('alunos').select('id, nome, user_id, modalidade, inicio, created_at, motivacao_avisada_em, treinos(id, arquivado), personais(motivacao_auto)')
    .neq('status', 'pausado').not('user_id', 'is', null)
  if (personalId) q = q.eq('personal_id', personalId)
  const { data: alunos, error } = await q
  if (error) return { erro: error.message }
  const desde = diaSP(-40)
  const [r, c] = await Promise.all([
    admin.from('registros').select('aluno_id, data').gte('data', desde),
    admin.from('checkins').select('aluno_id, data').gte('data', desde),
  ])
  const ultimo: Record<string, string> = {}
  for (const x of [...(r.data || []), ...(c.data || [])]) if (!ultimo[x.aluno_id] || x.data > ultimo[x.aluno_id]) ultimo[x.aluno_id] = x.data
  let avisados = 0
  for (const a of alunos || []) {
    // deno-lint-ignore no-explicit-any
    if ((a.personais as any)?.motivacao_auto === false) continue
    if (!(a.treinos || []).some((t) => !t.arquivado)) continue
    const base = ultimo[a.id] || a.inicio || String(a.created_at).slice(0, 10)
    const nivel = deveMotivar(diasEntre(base, hoje), a.motivacao_avisada_em ? diasEntre(a.motivacao_avisada_em, hoje) : null)
    if (!nivel) continue
    await enviar([a.user_id!], mensagemMotivacao(nivel, { id: a.id, nome: a.nome, online: a.modalidade === 'online' }, hoje))
    await admin.from('alunos').update({ motivacao_avisada_em: hoje }).eq('id', a.id)
    avisados++
  }
  return { avisados }
}

// Comentário, reação ou mensagem particular: avisa quem recebeu. Só manda o que a pessoa acabou de fazer
// (lido com o login dela, então as regras do banco valem) e nunca para ela mesma.
const curto = (t: string, n = 110) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
async function nomeDe(userId: string) {
  const { data: p } = await admin.from('personais').select('nome').eq('user_id', userId).maybeSingle()
  if (p) return { nome: p.nome || 'Seu personal', personal: true }
  const { data: a } = await admin.from('alunos').select('nome').eq('user_id', userId).limit(1).maybeSingle()
  return { nome: (a?.nome || 'Alguém').split(' ')[0], personal: false }
}
// deno-lint-ignore no-explicit-any
async function interacao(db: any, eu: string, corpo: any) {
  const desde = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const quem = await nomeDe(eu)
  if (corpo.tipo === 'comentario' || corpo.tipo === 'reacao') {
    // O post é lido com o login de quem interagiu (prova que ele vê o post); o dono, com a chave de serviço.
    const { data: c } = await db.from('checkins').select('id, aluno_id').eq('id', String(corpo.checkin_id || '')).maybeSingle()
    if (!c) return { enviadas: 0 }
    const { data: aluno } = await admin.from('alunos').select('user_id').eq('id', c.aluno_id).maybeSingle()
    const dono = aluno?.user_id
    if (!dono || dono === eu) return { enviadas: 0 }
    if (corpo.tipo === 'comentario') {
      const { data: k } = await db.from('comentarios_checkin').select('texto').eq('checkin_id', c.id).eq('user_id', eu).gte('created_at', desde).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!k) return { enviadas: 0 }
      return enviar([dono], { titulo: `${quem.nome} comentou no seu treino 💬`, corpo: curto(k.texto), url: '/' })
    }
    const { data: r } = await db.from('curtidas').select('emoji, created_at').eq('checkin_id', c.id).eq('user_id', eu).gte('created_at', desde).maybeSingle()
    if (!r) return { enviadas: 0 }
    return enviar([dono], { titulo: `${quem.nome} reagiu ${r.emoji || '❤️'} ao seu treino`, corpo: quem.personal ? 'Seu personal viu seu treino. Bora manter o ritmo!' : 'A turma está de olho. Continue assim!', url: '/' })
  }
  if (corpo.tipo === 'mensagem') {
    const { data: m } = await db.from('mensagens_privadas').select('aluno_id, texto, do_personal').eq('aluno_id', String(corpo.aluno_id || '')).eq('user_id', eu).gte('created_at', desde).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!m) return { enviadas: 0 }
    const { data: aluno } = await admin.from('alunos').select('user_id, personal_id').eq('id', m.aluno_id).maybeSingle()
    const para = m.do_personal ? aluno?.user_id : aluno?.personal_id
    if (!para || para === eu) return { enviadas: 0 }
    return enviar([para], { titulo: m.do_personal ? 'Mensagem do seu personal 💬' : `Mensagem de ${quem.nome} 💬`, corpo: curto(m.texto), url: m.do_personal ? '/' : '/mensagens' })
  }
  return { erro: 'Tipo desconhecido.' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const corpo = await req.json().catch(() => ({}))
    const k = await chaves()
    if (corpo.acao === 'chave') return resposta({ publica: k.publica })
    webpush.setVapidDetails(Deno.env.get('PUSH_CONTATO') || 'mailto:notificacoes@corpoatletico.app', k.publica, k.privada)

    // Agendamento diário: confere o segredo e manda os lembretes de todos.
    if (corpo.acao === 'lembretes' && CRON && req.headers.get('x-cron-secret') === CRON) return resposta({ ...(await lembretes()), fichas: await fichas(), mensalidades: await mensalidades(), motivacao: await motivacao() })

    // Daqui para baixo precisa estar logado. 'interacao' vale para todos; o resto só para o personal (as regras do banco limitam aos alunos dele).
    const db = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user } } = await db.auth.getUser()
    if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401)
    if (corpo.acao === 'interacao') return resposta(await interacao(db, user.id, corpo))
    const { data: personal } = await db.from('personais').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!personal) return resposta({ erro: 'Só o personal envia notificações.' }, 403)

    if (corpo.acao === 'lembretes') return resposta(await lembretes(user.id))
    if (corpo.acao === 'fichas') return resposta(await fichas(user.id))
    if (corpo.acao === 'mensalidades') return resposta(await mensalidades(user.id))
    if (corpo.acao === 'motivacao') return resposta(await motivacao(user.id))
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

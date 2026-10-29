import { supabase } from '../supabase.js'

// Notificações no celular (Web Push). No iPhone só funcionam com o app instalado na tela de início.
export const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
export const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function chaveEmBytes(base64) {
  const b = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function registro() {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 4000))])
  if (!reg) throw new Error('O app ainda está carregando. Feche e abra de novo e tente outra vez.')
  return reg
}

export async function inscricaoAtual() {
  if (!suportado() || Notification.permission !== 'granted') return null
  return (await registro()).pushManager.getSubscription()
}

export async function ativarNotificacoes() {
  if (await Notification.requestPermission() !== 'granted') throw new Error('Você não permitiu as notificações. Libere nas configurações do celular.')
  const { data, error } = await supabase.functions.invoke('notificacoes', { body: { acao: 'chave' } })
  if (error || !data?.publica) throw new Error('As notificações ainda não foram ligadas pelo seu personal.')
  const reg = await registro()
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(data.publica) })
  const j = sub.toJSON()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('push_inscricoes').delete().eq('endpoint', j.endpoint)
  const { error: e2 } = await supabase.from('push_inscricoes').insert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
  if (e2) throw new Error('Não foi possível salvar. Tente de novo.')
  return sub
}

export async function desativarNotificacoes() {
  const sub = await inscricaoAtual()
  if (!sub) return
  await supabase.from('push_inscricoes').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

// Personal: manda uma notificação para alunos. Devolve { enviadas } ou null se não deu (sem lançar erro).
export async function avisarNoApp(alunoIds, titulo, corpo, url = '/') {
  const { data, error } = await supabase.functions.invoke('notificacoes', { body: { acao: 'enviar', aluno_ids: alunoIds, titulo, corpo, url } })
  return error ? null : data
}

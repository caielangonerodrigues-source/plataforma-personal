import { supabase } from '../supabase.js'
import { BIBLIOTECA } from './exercicios.js'

// Chama a função ia-assistente do Supabase (a chave da IA fica só lá, nunca no site).
// Devolve o treino ou a dieta sugeridos, ou lança erro com uma mensagem para a tela.
export async function pedirIA({ tipo, alunoId, pedido, meusExercicios = [], extra = {} }) {
  const exercicios = [...new Set([...meusExercicios.map((e) => e.nome), ...BIBLIOTECA.map((e) => e.nome)])]
  const { data, error } = await supabase.functions.invoke('ia-assistente', { body: { ...extra, tipo, aluno_id: alunoId, pedido, exercicios: tipo === 'treino' ? exercicios : undefined } })
  if (error) {
    let msg = ''
    try { msg = (await error.context.json()).erro } catch { /* sem corpo */ }
    if (!msg && /Failed to send|fetch/i.test(error.message)) msg = 'O assistente de IA ainda não foi publicado no Supabase. Veja o passo "Assistente de IA" no README.'
    throw new Error(msg || 'Não foi possível falar com a IA. Tente de novo.')
  }
  if (!data?.resultado) throw new Error(data?.erro || 'A IA não devolveu resposta.')
  return data.resultado
}

// Fichas da IA no formato de modelo (o mesmo que "Aplicar modelo" usa), com o vídeo dos exercícios do personal.
export function fichasDaIA(resultado, meusExercicios = []) {
  const video = new Map(meusExercicios.map((e) => [e.nome, e.video_url]))
  return (resultado.fichas || []).map((f) => ({
    nome: f.nome, foco: f.foco,
    exercicios: (f.exercicios || []).map((e) => ({ nome: e.nome, series: e.series || 3, reps: e.reps, carga: '—', descanso: e.descanso, obs: e.obs || null, video_url: video.get(e.nome) || null })),
  }))
}

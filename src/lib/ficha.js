// Quando a ficha do aluno deve ser trocada.
import { diasEntre } from './atencao.js'

// Dia em que a ficha atual começou: a ficha mais nova (não guardada) ou o "já revisei" do personal.
export function inicioDaFicha(aluno) {
  const datas = (aluno.treinos || []).filter((t) => !t.arquivado).map((t) => (t.created_at || '').slice(0, 10)).filter(Boolean)
  if (aluno.ficha_renovada_em) datas.push(aluno.ficha_renovada_em)
  return datas.sort().at(-1) || null
}

// { inicio, semanas, dias, vence, vencida } da ficha atual (null sem ficha).
export function situacaoFicha(aluno, hoje, semanasLimite = 6) {
  const inicio = inicioDaFicha(aluno)
  if (!inicio || !(aluno.treinos || []).some((t) => !t.arquivado)) return null
  const dias = diasEntre(inicio, hoje)
  const faltam = semanasLimite * 7 - dias
  return { inicio, dias, semanas: Math.floor(dias / 7), faltam, vencida: faltam <= 0, perto: faltam > 0 && faltam <= 7 }
}

// Alunos ativos com a ficha vencida ou vencendo em 7 dias; quem já tem fase programada fica de fora.
export function fichasParaTrocar(alunos, hoje, semanasLimite = 6, comFase = new Set()) {
  return alunos
    .filter((a) => a.status !== 'pausado' && !comFase.has(a.id))
    .map((a) => ({ aluno: a, ...situacaoFicha(a, hoje, semanasLimite) }))
    .filter((x) => x.inicio && (x.vencida || x.perto))
    .sort((x, y) => x.faltam - y.faltam)
}

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

// Reavaliação física: a cada 60 dias (mesmo prazo do aviso "Reavaliar" do Painel).
export const DIAS_REAVALIACAO = 60

// Datas que o aluno acompanha no Início: última avaliação, próxima reavaliação e troca de treino.
// `em` = dias que faltam (negativo = atrasado).
export function minhasDatas({ ultimaAvaliacao, situacao, proximaFase, hoje, intervalo = DIAS_REAVALIACAO }) {
  const somar = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10)
  const reavaliacao = ultimaAvaliacao ? { data: somar(ultimaAvaliacao, intervalo), em: intervalo - diasEntre(ultimaAvaliacao, hoje) } : null
  const troca = proximaFase ? { data: proximaFase.inicio, em: diasEntre(hoje, proximaFase.inicio), fase: proximaFase.nome }
    : situacao ? { data: somar(hoje, situacao.faltam), em: situacao.faltam } : null
  return { avaliacao: ultimaAvaliacao ? { data: ultimaAvaliacao, ha: diasEntre(ultimaAvaliacao, hoje) } : null, reavaliacao, troca }
}

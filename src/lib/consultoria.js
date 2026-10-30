// Consultoria online: medidas que o aluno envia e comparação com o envio anterior.
import { diasEntre } from './atencao.js'

export const MEDIDAS = [
  ['pescoco', 'Pescoço'], ['ombros', 'Ombros'], ['peitoral', 'Peitoral'], ['cintura', 'Cintura'], ['abdomen', 'Abdômen'],
  ['quadril', 'Quadril'], ['braco_d', 'Braço dir.'], ['braco_e', 'Braço esq.'], ['coxa_d', 'Coxa dir.'], ['coxa_e', 'Coxa esq.'],
  ['panturrilha', 'Panturrilha'],
]

export const COMO_MEDIR = {
  cintura: 'na parte mais fina, acima do umbigo',
  abdomen: 'na altura do umbigo, relaxado',
  quadril: 'na parte mais larga do bumbum',
  braco_d: 'no meio do braço, relaxado',
  coxa_d: 'no meio da coxa, em pé',
}

export const NOTAS = { sono: 'Sono', energia: 'Energia', dieta: 'Dieta' }

// Linhas para a tabela: valor atual e diferença para o envio anterior (só o que tem número).
export function compararMedidas(atual = {}, anterior = {}) {
  const linhas = []
  for (const [k, rotulo] of MEDIDAS) {
    const v = atual?.[k]
    if (v == null || v === '') continue
    const a = anterior?.[k]
    linhas.push({ chave: k, rotulo, valor: Number(v), delta: a == null || a === '' ? null : Math.round((Number(v) - Number(a)) * 10) / 10 })
  }
  return linhas
}

// Envio vira avaliação: mesmos campos que a avaliação presencial guarda.
export function paraAvaliacao(envio) {
  const m = envio.medidas || {}
  return {
    data: envio.data,
    peso: envio.peso ?? '',
    gordura: envio.gordura ?? '',
    cintura: m.cintura ?? '',
    quadril: m.quadril ?? '',
    braco: m.braco_d ?? m.braco_e ?? '',
    coxa: m.coxa_d ?? m.coxa_e ?? '',
    medidas: { ...m, ...(m.panturrilha != null ? { panturrilha_d: m.panturrilha } : {}) },
  }
}

// Só os campos preenchidos, já como número.
export function limparMedidas(form) {
  const out = {}
  for (const [k] of MEDIDAS) {
    const v = String(form[k] ?? '').replace(',', '.').trim()
    if (v !== '' && !Number.isNaN(Number(v))) out[k] = Number(v)
  }
  return out
}

// Relato da semana no Início do aluno online: pede um novo a cada 7 dias.
export function situacaoRelato(ultimo, hoje) {
  if (!ultimo) return { pendente: true, primeiro: true }
  const dias = diasEntre(ultimo.data, hoje)
  return { pendente: dias >= 7, dias, respondido: !!ultimo.resposta }
}

// Alunos online (não pausados) sem mandar o relato há 7 dias ou mais. Quem nunca mandou conta a partir do início.
export function relatosAtrasados(alunos, envios, hoje) {
  const ultimo = {}
  for (const e of envios) if (!ultimo[e.aluno_id] || e.data > ultimo[e.aluno_id]) ultimo[e.aluno_id] = e.data
  return alunos
    .filter((a) => a.modalidade === 'online' && a.status !== 'pausado')
    .map((a) => {
      const desde = ultimo[a.id] || a.inicio
      return { aluno: a, ultimo: ultimo[a.id] || null, dias: desde ? diasEntre(desde, hoje) : null }
    })
    .filter((r) => r.dias !== null && r.dias >= 7)
    .sort((x, y) => y.dias - x.dias)
}

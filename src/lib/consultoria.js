// Consultoria online: medidas que o aluno envia e comparação com o envio anterior.

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

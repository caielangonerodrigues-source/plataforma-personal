// Regras da comunidade: sequência de dias, ranking do mês e formatação dos nomes.

export function somarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const inicioDoMes = (hoje) => `${hoje.slice(0, 7)}-01`

// Dias seguidos com check-in. Conta a partir de hoje, ou de ontem se ainda não treinou hoje.
export function sequencia(datas, hoje) {
  const dias = new Set(datas)
  let dia = dias.has(hoje) ? hoje : somarDias(hoje, -1)
  let n = 0
  while (dias.has(dia)) { n += 1; dia = somarDias(dia, -1) }
  return n
}

// Dias distintos com check-in por aluno; empate fica em ordem alfabética.
export function ranking(checkins, membros) {
  const dias = new Map(membros.map((m) => [m.id, new Set()]))
  for (const c of checkins) dias.get(c.aluno_id)?.add(c.data)
  return membros
    .map((m) => ({ ...m, dias: dias.get(m.id).size }))
    .sort((a, b) => b.dias - a.dias || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function nomeCurto(nome = '') {
  const partes = nome.trim().split(/\s+/)
  return partes.length > 1 ? `${partes[0]} ${partes.at(-1)[0]}.` : partes[0]
}

export function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase()
}

export function quandoFoi(createdAt, agora = Date.now()) {
  const min = Math.floor((agora - new Date(createdAt).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  if (h < 48) return 'ontem'
  const d = new Date(createdAt)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

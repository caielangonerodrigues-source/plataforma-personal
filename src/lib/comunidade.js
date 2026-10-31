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

// Ranking separado: academia (presencial) e consultoria online. Sem a coluna nova, todo mundo é da academia.
export const grupoDe = (m) => (m?.modalidade === 'online' ? 'online' : 'academia')
export const doGrupo = (membros, grupo) => membros.filter((m) => grupoDe(m) === grupo)

// Fotos da turma no Início (estilo GymRats): posts com foto, do mais novo para o mais antigo,
// quantas são novas desde a última vez que o aluno abriu (as dele não contam) e quando foi a última.
// Sem registro de visita, conta como novas as das últimas 24 h.
export function fotosDaTurma(feed, membros, fotos, vistoEm, eu, agora = Date.now()) {
  const ids = new Set(membros.map((m) => m.id))
  const lista = feed.filter((c) => c.foto && fotos[c.foto] && (c.personal_id || ids.has(c.aluno_id)))
  const corte = vistoEm ? new Date(vistoEm).getTime() : agora - 24 * 3600 * 1000
  const novas = lista.filter((c) => new Date(c.created_at).getTime() > corte && c.aluno_id !== eu).length
  return { lista, novas, ultima: lista[0]?.created_at || null }
}

// Quem assina o post: o personal que postou (autor_id), senão o personal da turma; post de aluno é do aluno.
export function autorDoPost(c, personal, personais, membro) {
  if (!c.personal_id) return membro[c.aluno_id]
  return { ...personal, ...(c.autor_id && personais?.[c.autor_id]), personal: true }
}

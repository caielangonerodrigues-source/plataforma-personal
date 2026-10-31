// Rede social da turma: card do treino no post, card de corrida/bike, conquistas automáticas no feed.
import { cargaMaxima, volume } from './progressao.js'

// Recordes de carga de hoje: exercícios em que a carga máxima de hoje passou a melhor anterior.
export function recordesDoDia(registros, exercicios, hoje) {
  const nome = Object.fromEntries(exercicios.map((e) => [e.id, e.nome]))
  return registros
    .filter((r) => r.data === hoje && !r.troca && nome[r.exercicio_id])
    .map((r) => {
      const hojeMax = cargaMaxima(r.series)
      const antes = registros.filter((x) => x.exercicio_id === r.exercicio_id && x.data < hoje && !x.troca).map((x) => cargaMaxima(x.series)).filter((n) => n != null)
      return hojeMax != null && antes.length && hojeMax > Math.max(...antes) ? { exercicio_id: r.exercicio_id, nome: nome[r.exercicio_id], carga: hojeMax } : null
    })
    .filter(Boolean)
}

// Resumo do treino de hoje para o post (estilo Strava): exercícios feitos, séries, volume e recordes.
export function resumoTreino(ficha, registros, hoje) {
  if (!ficha) return null
  const ids = new Set(ficha.exercicios.map((e) => e.id))
  const doDia = registros.filter((r) => r.data === hoje && ids.has(r.exercicio_id))
  if (!doDia.length) return null
  return {
    tipo: 'treino',
    feitos: doDia.length,
    total: ficha.exercicios.length,
    series: doDia.reduce((t, r) => t + (r.series?.length || 0), 0),
    volume: Math.round(doDia.reduce((t, r) => t + volume(r.series), 0)),
    recordes: recordesDoDia(registros, ficha.exercicios, hoje).slice(0, 3).map(({ nome, carga }) => ({ nome, carga })),
  }
}

export const ESPORTES = { corrida: ['Corrida', '🏃'], bike: ['Pedal', '🚴'], caminhada: ['Caminhada', '🚶'] }

// Check-in de musculação sem ficha: o aluno marca os grupos e a duração; o card acende os músculos no bonequinho.
export const GRUPOS_MUSCULACAO = {
  peito: ['Peito', ['peito']], costas: ['Costas', ['dorsais', 'trapezio', 'lombar']], ombros: ['Ombros', ['ombro']],
  bracos: ['Braços', ['biceps', 'triceps', 'antebraco']], pernas: ['Pernas', ['quadriceps', 'posterior', 'adutores', 'panturrilha']],
  gluteos: ['Glúteos', ['gluteos']], abdomen: ['Abdômen', ['abdomen', 'obliquos']],
}

export function resumoMusculacao(grupos, minutos) {
  const lista = [...new Set(grupos)].filter((g) => GRUPOS_MUSCULACAO[g])
  const min = Math.round(Number(String(minutos || '').replace(',', '.')))
  return { tipo: 'musculacao', grupos: lista, minutos: min > 0 && min < 600 ? min : null }
}

// Cardio na academia (esteira, bike, elíptico...): só a duração e, se quiser, o aparelho. Sem distância.
export const APARELHOS_CARDIO = { esteira: 'Esteira', bike: 'Bike ergométrica', eliptico: 'Elíptico', escada: 'Escada', remo: 'Remo', corda: 'Pular corda' }

export function resumoCardioLivre(aparelho, minutos) {
  const min = Math.round(Number(String(minutos || '').replace(',', '.')))
  if (!(min > 0 && min < 600)) return null
  return { tipo: 'cardio', esporte: 'cardio', aparelho: APARELHOS_CARDIO[aparelho] ? aparelho : null, minutos: min }
}

export const tituloCardioLivre = (r) => `Cardio${r.aparelho ? ` · ${APARELHOS_CARDIO[r.aparelho]}` : ''} · ${r.minutos} min`

export const tituloMusculacao = (grupos) =>
  `Musculação${grupos.length ? ` · ${grupos.map((g) => GRUPOS_MUSCULACAO[g][0]).join(', ')}` : ''}`

// "32:15" ou "1:05:30" → segundos.
export function lerTempo(texto) {
  const partes = String(texto || '').trim().split(':').map((p) => p.trim())
  if (!partes.length || partes.length > 3 || partes.some((p) => !/^\d{1,3}$/.test(p))) return null
  const [h, m, s] = partes.length === 3 ? partes.map(Number) : partes.length === 2 ? [0, ...partes.map(Number)] : [0, Number(partes[0]), 0]
  if (m > 59 && partes.length > 1 || s > 59) return null
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

export function fmtTempo(seg) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

// Ritmo (min/km) para corrida e caminhada; velocidade média (km/h) para bike.
export function ritmo(esporte, km, seg) {
  if (!km || !seg) return null
  if (esporte === 'bike') return `${(km / (seg / 3600)).toFixed(1).replace('.', ',')} km/h`
  const p = Math.round(seg / km)
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, '0')} /km`
}

export function resumoCardio(esporte, km, tempo) {
  const seg = lerTempo(tempo)
  const dist = Number(String(km).replace(',', '.'))
  if (!ESPORTES[esporte] || !(dist > 0 && dist < 1000) || !seg) return null
  return { tipo: 'cardio', esporte, km: Math.round(dist * 100) / 100, segundos: seg }
}

// Conquistas que viram post no feed: medalhas ganhas e recordes de carga de hoje.
export function conquistasAtuais(listaMedalhas, recordesHoje, hoje) {
  return [
    ...listaMedalhas.filter((m) => m.ganhou).map((m) => ({ chave: `medalha:${m.id}`, tipo: 'medalha', icone: m.icone, titulo: m.titulo, texto: m.descricao })),
    ...recordesHoje.map((r) => ({ chave: `recorde:${r.exercicio_id}:${hoje}`, tipo: 'recorde', icone: '💪', titulo: `Recorde no ${r.nome}`.slice(0, 80), texto: `Nova melhor carga: ${String(r.carga).replace('.', ',')} kg` })),
  ]
}

// O que ainda não foi publicado. Na primeira vez (nada salvo), guarda tudo sem mostrar no feed,
// para não encher o feed com medalhas antigas.
export function conquistasParaPublicar(atuais, jaSalvas) {
  const salvas = new Set(jaSalvas.map((c) => c.chave))
  const visivel = jaSalvas.length > 0
  return atuais.filter((c) => !salvas.has(c.chave)).map((c) => ({ ...c, visivel }))
}

// Feed com check-ins e conquistas misturados, do mais novo para o mais velho.
export const montarFeed = (checkins, conquistas) =>
  [...checkins.map((c) => ({ ...c, tipoItem: 'checkin' })), ...conquistas.map((c) => ({ ...c, tipoItem: 'conquista' }))]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

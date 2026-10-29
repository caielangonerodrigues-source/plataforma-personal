// Histórico de cargas por exercício a partir dos registros do aluno.

export const cargaMaxima = (series) => {
  const cargas = (series || []).map((s) => Number(s.carga)).filter((n) => Number.isFinite(n) && n > 0)
  return cargas.length ? Math.max(...cargas) : null
}

export const volume = (series) => (series || []).reduce((t, s) => t + (Number(s.carga) || 0) * (Number(s.reps) || 0), 0)

// { [exercicio_id]: [{ data, max, volume, series }] } em ordem de data.
export function historicoPorExercicio(registros) {
  const mapa = {}
  for (const r of registros) {
    if (r.troca) continue // dia em que o aluno fez outro exercício no lugar
    const max = cargaMaxima(r.series)
    if (max == null) continue
    ;(mapa[r.exercicio_id] ||= []).push({ data: r.data, max, volume: volume(r.series), series: r.series })
  }
  for (const k of Object.keys(mapa)) mapa[k].sort((a, b) => (a.data < b.data ? -1 : 1))
  return mapa
}

// Última sessão anterior a hoje, para pré-preencher as séries.
export function ultimaSessao(registros, exercicioId, hoje) {
  return registros
    .filter((r) => r.exercicio_id === exercicioId && r.data < hoje && r.series?.length && !r.troca)
    .sort((a, b) => (a.data < b.data ? 1 : -1))[0]
}

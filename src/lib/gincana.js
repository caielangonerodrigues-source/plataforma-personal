// Placar da gincana: pontos das provas cumpridas + pontos por dia de treino (check-in) dentro do prazo.
// Gincana por equipe soma tudo por equipe (os treinos de cada membro contam para a equipe dele).
export function placarGincana(gincana, provas, pontos, checkins, membros, equipes) {
  const daGincana = new Set(provas.filter((p) => p.gincana_id === gincana.id).map((p) => p.id))
  const valorProva = Object.fromEntries(provas.map((p) => [p.id, p.pontos]))
  const marcados = pontos.filter((x) => daGincana.has(x.prova_id))
  const diasPorAluno = new Map()
  for (const c of checkins) {
    if (c.data < gincana.inicio || c.data > gincana.fim) continue
    if (!diasPorAluno.has(c.aluno_id)) diasPorAluno.set(c.aluno_id, new Set())
    diasPorAluno.get(c.aluno_id).add(c.data)
  }
  const dias = (alunoId) => diasPorAluno.get(alunoId)?.size || 0
  const porTreino = gincana.pontos_por_treino || 0
  const linhas = gincana.por_equipe
    ? equipes.map((e) => {
      const doTime = membros.filter((m) => m.equipe_id === e.id)
      const feitas = marcados.filter((x) => x.equipe_id === e.id)
      const treinos = doTime.reduce((t, m) => t + dias(m.id), 0)
      return { id: e.id, nome: e.nome, cor: e.cor, equipe: true, provas: feitas.length, treinos, pontos: feitas.reduce((t, x) => t + valorProva[x.prova_id], 0) + treinos * porTreino }
    })
    : membros.map((m) => {
      const feitas = marcados.filter((x) => x.aluno_id === m.id)
      const treinos = dias(m.id)
      return { id: m.id, nome: m.nome, avatar: m.avatar, provas: feitas.length, treinos, pontos: feitas.reduce((t, x) => t + valorProva[x.prova_id], 0) + treinos * porTreino }
    })
  return linhas.sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Gincana em destaque: a que está acontecendo (a que termina primeiro), senão a próxima, senão a última que acabou.
export function gincanaAtual(gincanas, hoje) {
  const ordem = (a, b) => (a.fim < b.fim ? -1 : 1)
  return gincanas.filter((g) => g.inicio <= hoje && g.fim >= hoje).sort(ordem)[0]
    || gincanas.filter((g) => g.inicio > hoje).sort((a, b) => (a.inicio < b.inicio ? -1 : 1))[0]
    || gincanas.filter((g) => g.fim < hoje).sort(ordem).at(-1)
    || null
}

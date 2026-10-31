// Reações com emoji (posts da comunidade e mensagens do chat). Cada pessoa tem uma reação por item.
export const EMOJIS = ['❤️', '🔥', '💪', '👏', '😂', '😮'] // os rápidos, sempre à mão
// Os outros aparecem no "+" da lista de reações.
export const MAIS_EMOJIS = ['🙌', '👊', '💯', '🏆', '🥇', '⚡', '🚀', '👑', '🎉', '🤩', '😍', '😎', '🥵', '😅', '😢', '🙏', '🤝', '👀', '🏋️', '🏃', '🚴', '🥗', '💦', '✅']
export const TODOS_EMOJIS = [...EMOJIS, ...MAIS_EMOJIS]

// Junta as reações de um item: [{ emoji, total }] na ordem de TODOS_EMOJIS, e qual é a minha.
// Curtidas antigas (sem emoji) contam como ❤️.
export function resumirReacoes(reacoes, eu) {
  const conta = new Map()
  let minha = null
  for (const r of reacoes) {
    const emoji = TODOS_EMOJIS.includes(r.emoji) ? r.emoji : EMOJIS[0]
    conta.set(emoji, (conta.get(emoji) || 0) + 1)
    if (r.user_id === eu) minha = emoji
  }
  return { lista: TODOS_EMOJIS.filter((e) => conta.has(e)).map((emoji) => ({ emoji, total: conta.get(emoji) })), minha, total: reacoes.length }
}

// O que fazer quando a pessoa toca num emoji: mesmo emoji tira, outro troca, sem reação coloca.
export const acaoReacao = (minha, emoji) => (minha === emoji ? 'tirar' : minha ? 'trocar' : 'colocar')

// Quem reagiu a um item, com nome e avatar: `pessoas` mapeia user_id -> { nome, avatar, personal }.
// Eu primeiro (como "Você"), depois os personais, depois os demais na ordem em que reagiram.
export function quemReagiu(reacoes, pessoas = {}, eu) {
  const lista = reacoes.map((r) => {
    const p = pessoas[r.user_id] || {}
    return {
      user_id: r.user_id,
      nome: p.nome || (r.user_id === eu ? 'Você' : 'Aluno'),
      avatar: p.avatar,
      personal: !!p.personal,
      voce: r.user_id === eu,
      emoji: TODOS_EMOJIS.includes(r.emoji) ? r.emoji : EMOJIS[0],
    }
  })
  const peso = (p) => (p.voce ? 0 : p.personal ? 1 : 2)
  return lista.map((p, i) => [p, i]).sort((a, b) => peso(a[0]) - peso(b[0]) || a[1] - b[1]).map(([p]) => p)
}

// Linha no estilo do Instagram: "Curtido por **Ana S.**", "**Ana S.** e **João P.**" ou "**Ana S.** e **outras pessoas**".
// Devolve os trechos em negrito; o primeiro nome é de outra pessoa (você só aparece quando é a única).
export function curtidoPor(lista, curto = (n) => n) {
  if (!lista.length) return []
  const nome = (p) => (p.voce ? 'você' : curto(p.nome))
  const ordem = [...lista.filter((p) => !p.voce), ...lista.filter((p) => p.voce)]
  if (ordem.length === 1) return [nome(ordem[0])]
  if (ordem.length === 2) return [nome(ordem[0]), nome(ordem[1])]
  return [nome(ordem[0]), 'outras pessoas']
}

// Reações com emoji (posts da comunidade e mensagens do chat). Cada pessoa tem uma reação por item.
export const EMOJIS = ['❤️', '🔥', '💪', '👏', '😂', '😮']

// Junta as reações de um item: [{ emoji, total }] na ordem dos EMOJIS, e qual é a minha.
// Curtidas antigas (sem emoji) contam como ❤️.
export function resumirReacoes(reacoes, eu) {
  const conta = new Map()
  let minha = null
  for (const r of reacoes) {
    const emoji = EMOJIS.includes(r.emoji) ? r.emoji : EMOJIS[0]
    conta.set(emoji, (conta.get(emoji) || 0) + 1)
    if (r.user_id === eu) minha = emoji
  }
  return { lista: EMOJIS.filter((e) => conta.has(e)).map((emoji) => ({ emoji, total: conta.get(emoji) })), minha, total: reacoes.length }
}

// O que fazer quando a pessoa toca num emoji: mesmo emoji tira, outro troca, sem reação coloca.
export const acaoReacao = (minha, emoji) => (minha === emoji ? 'tirar' : minha ? 'trocar' : 'colocar')

// Avatares prontos ("p:0" a "p:11"): emoji sobre um círculo colorido.
export const AVATARES = [
  ['🏋️', '#fc4c02'], ['🏃', '#2f80ed'], ['🚴', '#27ae60'], ['🧘', '#9b51e0'], ['🥊', '#eb5757'], ['⚽', '#219653'],
  ['🏊', '#2d9cdb'], ['🤸', '#f2994a'], ['💪', '#242428'], ['🔥', '#e2541b'], ['⚡', '#c99a06'], ['🦁', '#a0522d'],
]

// { tipo: 'pronto', emoji, cor } | { tipo: 'foto', caminho } | null
export function lerAvatar(valor) {
  const pronto = /^p:(\d{1,2})$/.exec(valor || '')
  if (pronto) {
    const a = AVATARES[Number(pronto[1])]
    return a ? { tipo: 'pronto', emoji: a[0], cor: a[1] } : null
  }
  if (/^[0-9a-f-]{36}\/[A-Za-z0-9-]+\.jpg$/.test(valor || '')) return { tipo: 'foto', caminho: valor }
  return null
}

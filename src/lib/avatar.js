// Avatares prontos ("p:0" a "p:11"): ícone de traço laranja num círculo claro, no padrão do site.
// [nome, chave do ícone em ICONES (components/IconeLinha.jsx)]
export const AVATARES = [
  ['Musculação', 'haltere'], ['Corrida', 'correr'], ['Pedal', 'bike'], ['Foco', 'alvo'], ['Força', 'raio'], ['Campeão', 'trofeu'],
  ['Natação', 'onda'], ['Trilha', 'montanha'], ['Coração', 'coracao'], ['Fogo', 'chama'], ['Sol', 'sol'], ['Medalha', 'medalha'],
]

// { tipo: 'pronto', nome, icone } | { tipo: 'foto', caminho } | null
export function lerAvatar(valor) {
  const pronto = /^p:(\d{1,2})$/.exec(valor || '')
  if (pronto) {
    const a = AVATARES[Number(pronto[1])]
    return a ? { tipo: 'pronto', nome: a[0], icone: a[1] } : null
  }
  if (/^[0-9a-f-]{36}\/[A-Za-z0-9-]+\.jpg$/.test(valor || '')) return { tipo: 'foto', caminho: valor }
  return null
}

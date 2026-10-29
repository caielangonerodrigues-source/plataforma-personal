// Notificação de motivação para quem está sumido: aos 3, 7, 14, 21 e 30 dias sem treinar.
// A função `notificacoes` (supabase/functions/notificacoes/index.ts) usa uma cópia destas regras e frases.
export const DIAS_MOTIVACAO = [3, 7, 14, 21, 30]

// Marco atingido (3, 7, 14...) e o tom da frase. Depois de 45 dias para de mandar.
export function nivelMotivacao(dias) {
  const marco = DIAS_MOTIVACAO.filter((d) => d <= dias).at(-1)
  if (!marco || dias > 45) return null
  return { marco, nivel: marco === 3 ? 'leve' : marco === 7 ? 'semana' : 'volta' }
}

// Manda se ainda não avisou depois de chegar no marco (assim, se a função não rodar num dia, avisa no seguinte).
export const deveMotivar = (dias, diasDesdeAviso) => {
  const n = nivelMotivacao(dias)
  return n && (diasDesdeAviso == null || diasDesdeAviso > dias - n.marco) ? n.nivel : null
}

// {nome} vira o primeiro nome; {lugar} vira "a academia" (presencial) ou "o treino" (online).
export const FRASES_MOTIVACAO = {
  leve: [
    ['Bora treinar hoje? 💪', '{nome}, 3 dias sem treino já dá saudade. Hoje é um ótimo dia para voltar!'],
    ['Seu corpo está te chamando 🔥', '{nome}, um treino hoje e a semana já muda de cara. Partiu {lugar}?'],
    ['Não deixa esfriar!', '{nome}, o difícil é começar, e você já começou. Bora manter o ritmo hoje!'],
    ['Só 1 hora por você ⏱️', '{nome}, separa uma horinha hoje para {lugar}. Você sempre sai melhor do que entrou.'],
  ],
  semana: [
    ['Sentimos sua falta! 👀', '{nome}, já faz uma semana. Que tal voltar hoje? O primeiro treino de volta é o mais importante.'],
    ['Uma semana sem você', '{nome}, a turma sentiu sua falta. Bora voltar para {lugar} hoje, mesmo que seja um treino leve?'],
    ['Recomeçar também é progresso 💪', '{nome}, não precisa ser perfeito, precisa ser hoje. Te espero!'],
  ],
  volta: [
    ['Bora recomeçar? 🧡', '{nome}, nunca é tarde para voltar. Seu treino está te esperando no app, é só abrir e começar.'],
    ['Seu lugar continua aqui', '{nome}, fica tranquilo: a gente ajusta o treino para você voltar no seu ritmo. Bora?'],
    ['Um passo de cada vez 🚶', '{nome}, um treino curto hoje já é uma vitória. Me chama se quiser ajuda para recomeçar!'],
  ],
}

// Escolhe uma frase que muda de aluno para aluno e de dia para dia.
export function mensagemMotivacao(nivel, { id, nome, online }, hoje) {
  const frases = FRASES_MOTIVACAO[nivel]
  let h = 0
  for (const c of `${id}${hoje}`) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const [titulo, corpo] = frases[h % frases.length]
  const primeiro = String(nome || '').trim().split(/\s+/)[0] || 'Ei'
  return { titulo, corpo: corpo.replace('{nome}', primeiro).replace('{lugar}', online ? 'o treino' : 'a academia') }
}

import { useState } from 'react'

// Explicação curta de cada aba. Aberta na primeira visita; depois que a pessoa fecha, fica fechada naquele aparelho.
export default function ComoFunciona({ chave, itens }) {
  const guardada = `ajuda-fechada-${chave}`
  const [aberta, setAberta] = useState(() => { try { return !localStorage.getItem(guardada) } catch { return true } })
  function alternar(e) {
    const abriu = e.currentTarget.open
    setAberta(abriu)
    try { if (abriu) localStorage.removeItem(guardada); else localStorage.setItem(guardada, '1') } catch { /* sem armazenamento */ }
  }
  return (
    <details className="como-funciona" open={aberta} onToggle={alternar}>
      <summary>ℹ️ Como funciona</summary>
      <ul>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
    </details>
  )
}

// Textos das abas da área do aluno.
export const AJUDA_ALUNO = {
  treino: [
    'Escolha a ficha do dia (A, B, C…) e siga os exercícios na ordem.',
    'Toque na bolinha de cada série quando terminar: o cronômetro do descanso começa sozinho. A última série conclui o exercício.',
    'Em "Anotar cargas" você registra o peso de cada série; o app mostra o que você fez da última vez para você tentar superar.',
    '"Trocar" serve para quando o aparelho está ocupado: escolha um exercício parecido.',
  ],
  aulas: ['Aqui está a grade de aulas da academia na semana. A aula de hoje aparece em destaque.'],
  consultoria: [
    'Uma vez por semana, mande seu relato: peso, medidas, fotos e como foi a semana.',
    'Seu personal responde e ajusta treino e dieta com base no que você mandou.',
    'O Início avisa quando chega a hora do próximo relato.',
  ],
  videos: [
    'Grave você fazendo o exercício (de lado, mostrando o corpo inteiro) e mande aqui.',
    'Seu personal assiste e responde com as correções. Você recebe aviso no celular.',
  ],
  mensagens: [
    'Conversa particular com seu personal: dúvidas, dores, ajustes no treino. Só vocês dois veem.',
    'Quando um de vocês manda mensagem, o outro recebe um aviso no celular.',
  ],
  novidades: ['Avisos da academia: feriados, eventos, mudanças de horário e novidades.'],
  comunidade: [
    'Cada check-in vira um post no feed. Reaja com emoji e comente nos treinos da turma.',
    'O ranking conta os dias com check-in no mês. Alunos da academia e da consultoria online têm rankings separados.',
    'Medalhas e recordes aparecem no feed sozinhos. No chat da turma todo mundo conversa junto.',
  ],
  dieta: [
    'Marque cada refeição quando comer. Se quiser, tire uma foto do prato para seu personal ver.',
    'O contador mostra quanto já foi e quanto falta de calorias, proteína, carboidrato e gordura.',
    'Comeu algo fora do plano? Anote em "Comeu algo fora do plano?" para a conta ficar certa.',
    'Se no fim do dia faltar algum macro, aparece uma dica de lanche. Comeu? Toque em "Comi ✓".',
  ],
  voce: [
    'Seu perfil: Progresso (avaliações, cargas, medalhas e fotos), Atividades (seus check-ins) e Galeria (suas fotos).',
    'Em "Mais" ficam as outras áreas do app e a sua conta.',
  ],
  spinning: ['Reserve sua bike na aula de spinning. A reserva fica guardada por 30 minutos até o pagamento ser confirmado.'],
  conta: ['Troque sua foto, ligue as notificações, veja a mensalidade, indique amigos e preencha a anamnese.'],
}

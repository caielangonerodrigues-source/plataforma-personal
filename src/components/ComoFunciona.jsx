import { useLocation } from 'react-router-dom'

// Explicação curta de cada aba: um link discreto, sempre fechado; abre só quando a pessoa toca.
export default function ComoFunciona({ itens }) {
  return (
    <details className="como-funciona">
      <summary>Como funciona</summary>
      <ul>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
    </details>
  )
}

// Telas do personal: a explicação da tela atual, logo abaixo do título.
export function AjudaDaPagina() {
  const { pathname } = useLocation()
  const itens = AJUDA_PERSONAL[pathname]
  return itens ? <ComoFunciona key={pathname} chave={`personal${pathname}`} itens={itens} /> : null
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
  inicio: [
    'Seu resumo: treinos da semana, próximo treino, ranking e medalhas.',
    'Ofensiva: são as semanas seguidas em que você treinou pelo menos 2 vezes. Se a semana estiver acabando e faltar treino, você recebe um aviso para não perder.',
    'Toda segunda chega no celular o resumo da sua semana.',
  ],
  novidades: ['Avisos da academia: feriados, eventos, mudanças de horário e novidades.'],
  comunidade: [
    'Cada check-in vira um post no feed. Reaja com emoji e comente nos treinos da turma.',
    'O ranking conta os dias com check-in no mês. Veja o Geral, só a Academia, só o Online ou só a sua equipe.',
    'No placar das equipes, cada dia de treino de um membro vale 1 ponto para o time. O time com mais pontos no mês ganha a coroa.',
    'Medalhas e recordes aparecem no feed sozinhos. No chat da turma todo mundo conversa junto.',
  ],
  dieta: [
    'Marque cada refeição quando comer. Se quiser, tire uma foto do prato para seu personal ver.',
    'O contador mostra quanto já foi e quanto falta de calorias, proteína, carboidrato e gordura.',
    'Comeu algo fora do plano? Anote em "Comeu algo fora do plano?" para a conta ficar certa.',
    'Se no fim do dia faltar algum macro, aparece uma dica de lanche. Comeu? Toque em "Comi ✓".',
  ],
  montardieta: [
    'Como no MyFitnessPal: toque em "+ Adicionar alimento" no café, almoço, lanches ou jantar, escolha na lista e ajuste as porções.',
    'O anel mostra as calorias que restam: Meta − Alimentos + Exercício. Os três anéis menores são proteína, carbo e gordura.',
    'Toque num alimento para mudar a quantidade ou tirar. "Copiar de ontem" repete a refeição do dia anterior.',
    'A meta vem do seu plano (ou do seu peso e altura). Quer outra? Toque em "Editar meta". Seu personal vê o que você anotou.',
  ],
  voce: [
    'Seu perfil: Progresso (avaliações, cargas, medalhas e fotos), Atividades (seus check-ins) e Galeria (suas fotos).',
    'Em "Mais" ficam as outras áreas do app e a sua conta.',
  ],
  spinning: ['Reserve sua bike na aula de spinning. A reserva fica guardada por 30 minutos até o pagamento ser confirmado.'],
  conta: ['Troque sua foto, ligue as notificações, veja a mensalidade, indique amigos e preencha a anamnese.'],
}

// Textos das telas do personal (por endereço).
export const AJUDA_PERSONAL = {
  '/painel': [
    'Resumo do dia: quem precisa de atenção (sumido, ficha vencida, reavaliação, relato atrasado), aniversários e vídeos para avaliar.',
    'Toque no nome do aluno para abrir a ficha dele, ou no botão de WhatsApp para chamar com a mensagem pronta.',
    'Uma vez por dia o Painel também dispara os avisos automáticos (ficha para trocar, mensalidade, motivação para quem sumiu, resumo da semana e ofensiva em risco).',
  ],
  '/alunos': [
    'Lista de todos os alunos. Use os filtros Academia / Online e a busca para achar alguém.',
    '"Novo aluno" cadastra pelo e-mail: quando o aluno entrar com esse e-mail, a conta dele já fica ligada a você.',
  ],
  '/mensagens': [
    'Conversas particulares com cada aluno. O número laranja mostra as mensagens que você ainda não leu.',
    'Quando você responde, o aluno recebe um aviso no celular (se ativou as notificações).',
  ],
  '/agenda': [
    'Seus horários fixos com cada aluno na semana. Remarque um dia sem mudar o horário fixo; o aluno recebe lembrete na véspera.',
    'As aulas experimentais marcadas pela página de vendas também aparecem aqui, com o botão para confirmar no WhatsApp.',
  ],
  '/comunidade': [
    'O feed com os check-ins de todos os alunos. Reaja, comente e apague posts se precisar.',
    'O ranking tem as visões Geral, Academia e Online. Em "Desafios" você cria metas do mês (ex.: 16 treinos em novembro).',
    'Equipes: cada dia de treino de um membro vale 1 ponto para o time. Crie as equipes em Academia.',
  ],
  '/academia': [
    'Dados da academia que os alunos veem: grade de aulas, avisos (Novidades), grupo do WhatsApp e o QR code do check-in da recepção.',
    'Equipes: crie times (ex.: Laranja × Preta). Aluno novo entra sozinho no time com menos gente, alternando. Cada dia de treino vale 1 ponto e o time com mais pontos no mês ganha a coroa.',
    'Fotos da tela de entrada: suba fotos da academia para aparecerem no login.',
  ],
  '/modelos': ['Fichas prontas para reaproveitar. Monte uma vez e aplique em qualquer aluno pela aba Treinos dele.'],
  '/exercicios': ['Biblioteca de exercícios com vídeo. Os que você criar aparecem na hora de montar fichas.'],
  '/assistente': ['A IA monta um rascunho de treino, dieta ou relatório para você revisar antes de mandar ao aluno.'],
  '/aulas': ['Aulas de spinning: bikes reservadas, pagamentos para confirmar, lista de espera e pacotes.'],
  '/vendas': [
    'Página de vendas da consultoria online e os contatos de quem se interessou (leads).',
    'Aula experimental: em "Página e planos" coloque seus horários livres. A pessoa marca pela tela de entrada do site (Aula experimental) e aparece aqui e na Agenda.',
  ],
  '/financeiro': ['Mensalidades do mês: quem pagou, quem está para vencer e quem está atrasado. Marque o pagamento quando receber o Pix.'],
  '/configuracoes': ['Seus dados, chave Pix, prazo para trocar ficha, mensagem de motivação automática e notificações neste celular.'],
}

// Textos das abas dentro do aluno (área do personal).
export const AJUDA_ALUNO_DETALHE = {
  treinos: [
    'As fichas (A, B, C…) que o aluno vê no app. Use "Aplicar modelo" para uma ficha pronta ou "Nova ficha" para montar do zero.',
    'Depois de mexer, toque em "Avisar aluno 🔔" para ele receber "Treino novo pronto" no celular.',
    'Em "Fases" você programa a próxima ficha para entrar sozinha numa data.',
  ],
  consultoria: ['Relatos semanais do aluno online: peso, medidas, fotos e como foi a semana. Responda e, se quiser, transforme em avaliação.'],
  videos: ['Vídeos de execução que o aluno mandou. Assista e responda com as correções; ele recebe a resposta no app.'],
  mensagens: ['Conversa particular com este aluno. Só vocês dois veem.'],
  avaliacoes: ['Avaliações físicas com dobras (Pollock 3 ou 7), peso e medidas. A reavaliação é sugerida a cada 60 dias.'],
  progressao: ['Evolução das cargas que o aluno anotou em cada exercício.'],
  nutricao: [
    'Defina as metas do dia (a sugestão vem da última avaliação) e monte as refeições.',
    '"Usar modelo pronto" preenche uma dieta inteira ajustada à meta de calorias; depois é só trocar o que quiser e salvar.',
    'No "Diário da dieta" você vê o que o aluno marcou nos últimos 7 dias, com as fotos dos pratos.',
  ],
  relatorio: ['Relatório do mês para mandar ao aluno: treinos, cargas e avaliação.', '"Baixar PDF" monta uma folha com números, cargas, medidas e as fotos de antes e agora para salvar ou mandar no WhatsApp.'],
  anamnese: ['Histórico de saúde e PAR-Q que o aluno preencheu.'],
  fotos: ['Fotos de evolução (frente, lado e costas) por data.'],
}

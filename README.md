# Plataforma do Personal

Site para o personal gerenciar alunos, fichas de treino e avaliações físicas, e para cada aluno entrar com o próprio login e ver o treino do dia e a evolução.

## O que tem

**Área do personal**
- Painel com alunos ativos, quem treinou hoje, quem precisa de reavaliação (mais de 60 dias) e quem está sem ficha.
- Cadastro de alunos com e-mail de acesso, objetivo, plano e status (ativo, pendente, pausado).
- Fichas A/B/C com exercícios, séries, repetições, carga, descanso e observação.
- Avaliações físicas com % de gordura por **Pollock 7 dobras**, **Pollock 3 dobras** (dobras diferentes para homem e mulher) ou valor informado manualmente. Calcula densidade (Jackson & Pollock), % de gordura (Siri), massa gorda, massa magra, IMC e classificação (faixas do ACE), com gráfico de evolução.

**Área do aluno**
- Treino do dia, com os exercícios marcados como feitos (o personal vê quantos dias o aluno treinou).
- Check-in com foto e comentário, sequência de dias seguidos e treinos no mês.
- Comunidade: feed com os check-ins da turma, curtidas e ranking do mês (dias com check-in).
- Última avaliação e gráfico de evolução.

**Comunidade**
- Só alunos do mesmo personal se veem, e só mostram nome e check-ins (nunca e-mail, telefone ou avaliações).
- No cadastro do aluno dá para desmarcar "Participa da comunidade": ele continua fazendo check-in, mas some do feed e do ranking dos colegas.
- O personal vê tudo em **Comunidade**, pode curtir e apagar posts.
- As fotos ficam no Supabase Storage (bucket privado `checkins`, criado pelo `schema.sql`) e são reduzidas antes do envio. O plano gratuito tem 1 GB, o que dá para milhares de fotos.

**Treino e evolução**
- Carga e repetições de cada série, já preenchidas com o último treino; o personal vê a progressão de cada exercício (aba **Cargas** do aluno).
- Link de vídeo de execução em cada exercício (YouTube, Instagram etc.).
- Desafios com prazo criados pelo personal (ex.: "20 treinos em novembro") e medalhas automáticas (10, 50 e 100 treinos; 7 e 30 dias seguidos).
- Anamnese e PAR-Q: o aluno preenche na área dele (aba **Conta**) ou o personal preenche. Resposta "sim" no PAR-Q gera um alerta.
- Fotos de evolução (frente, lado, costas) com comparação antes e depois. São privadas: só o aluno e o personal veem.

**App no celular**
- O site pode ser instalado na tela inicial (Android: botão "Instalar"; iPhone: Safari > Compartilhar > Adicionar à Tela de Início) e abre como app.

**WhatsApp e mensalidades**
- Botões que abrem o WhatsApp do aluno com a mensagem pronta (reavaliação e cobrança).
- Mensalidade por Pix sem taxa: em **Configurações** você cadastra a chave Pix; no cadastro do aluno, o valor e o dia do vencimento. O aluno vê o QR Code e o copia e cola na aba **Conta**, e você marca quem pagou em **Financeiro**. Antes de divulgar, use o código de teste de R$ 1,00 de Configurações no app do seu banco para conferir se aparece o seu nome.

**Spinning (aberto para quem não é aluno)**
- Página pública `/spinning`, sem login: a pessoa escolhe a aula, escolhe a bike num mapa da sala igual ao de cinema (14 bikes: na frente a 1, a do instrutor no meio e a 2; atrás, fileiras de 3), informa nome e WhatsApp e recebe o QR Code Pix com o valor da aula.
- A bike fica segurada por 30 minutos esperando o Pix. Se ninguém pagar, ela volta a ficar livre sozinha. Cada WhatsApp reserva no máximo 2 bikes por aula, e duas pessoas nunca ficam com a mesma bike (o banco garante).
- A pessoa recebe um link da reserva com um código (vai no Pix como identificador) para ver a situação, avisar no WhatsApp que pagou ou cancelar.
- Em **Spinning**, você cria aulas (pode repetir toda semana), vê o mapa com o nome de quem está em cada bike, confirma os pagamentos, reserva para quem pagou na hora, coloca bike em manutenção e copia o link para divulgar. Aula com valor 0 é confirmada na hora.

**Consultoria online**
- No cadastro do aluno, escolha a modalidade **Consultoria online**. Ele ganha a aba **Consultoria**, onde envia peso, % de gordura da balança (opcional), 11 medidas (pescoço, ombros, peitoral, cintura, abdômen, quadril, braços, coxas e panturrilha), fotos de frente, lado e costas, notas de sono, energia e dieta e um comentário.
- Você vê os envios no Painel e na aba **Consultoria** do aluno, com a variação de cada medida desde o envio anterior e as fotos de antes e agora lado a lado. Escreve a resposta (o aluno vê na área dele) e, com um clique, registra o envio como avaliação física.

**Treinos modelo**
- Em **Modelos** ficam fichas prontas (vem com 3: iniciante, hipertrofia ABC e emagrecimento). No aluno, **Aplicar modelo** cria as fichas com um clique; **Salvar como modelo** guarda as fichas de um aluno para reaproveitar.

**Spinning: lista de espera e pacotes**
- Aula lotada mostra **Entrar na lista de espera**. Na aula, em **Spinning**, você vê a fila em ordem e o botão **Avisar no WhatsApp** já manda o link da aula para o próximo.
- Na aba **Pacotes** você cria pacotes (ex.: 10 aulas por R$ 250, válido por 90 dias). A pessoa compra em `/spinning/pacotes`, paga o Pix e recebe um código; ao reservar, toca em **Usar meu pacote** e a bike já fica confirmada. Cancelando até 2 horas antes, a aula volta ao saldo. Dá para registrar venda feita no balcão.

**Página de vendas da consultoria online**
- Em **Vendas > Página e planos** você escreve o texto, cadastra os planos e coloca a página no ar em `/consultoria` (para a bio do Instagram). Quem preenche o formulário aparece em **Vendas > Interessados** e no Painel, com botão de WhatsApp e **Cadastrar como aluno** (já como consultoria online).

**Biblioteca de exercícios**
- Mais de 230 exercícios separados por grupo muscular (peito, costas, ombros, braços, pernas, glúteos, core, cardio, funcional e mobilidade), com busca sem acento. Na ficha, **Adicionar exercícios** abre a lista para marcar vários de uma vez.
- Em **Exercícios** você cadastra os seus, com o seu vídeo de execução; eles aparecem primeiro. Exercício sem vídeo mostra para o aluno o link **Como fazer** (busca no YouTube).

**Nutrição**
- Aba **Nutrição** no aluno: o site calcula o gasto do dia pela última avaliação (Katch-McArdle com % de gordura, ou Mifflin-St Jeor) e sugere calorias, proteína, carboidrato, gordura e água pelo objetivo. Você monta as refeições; escolhendo o alimento da lista e os gramas, as calorias saem sozinhas (tabela TACO, valores aproximados).
- O aluno vê o plano na aba **Dieta**. É orientação nutricional para acompanhar o treino; dieta clínica é com nutricionista.

**Assistente IA**
- Em **Assistente IA** (ou no botão **Gerar com IA** das abas Treinos e Nutrição) você escolhe o aluno e a IA monta um rascunho de fichas ou dieta usando a avaliação física, a anamnese/PAR-Q e o objetivo. Nada é salvo até você clicar em **Aplicar**. Precisa do passo 7 abaixo.

**Rotina do dia a dia**
- **Painel > Precisam de atenção**: quem está há 7 dias ou mais sem treinar e quem está com a mensalidade do mês atrasada, com mensagem pronta no WhatsApp.
- **Cronômetro de descanso**: quando o aluno marca o exercício (ou toca em **Descansar**), o celular conta o descanso da ficha ("60s", "1 min", "1'30"...) e vibra/apita no fim.
- **Trocar exercício**: com o aparelho ocupado, o aluno toca em **Trocar** e escolhe outro do mesmo grupo muscular, só naquele dia. Você vê no Painel e na aba **Cargas**; as cargas desse dia não entram na evolução.
- **Agenda**: horários fixos de cada aluno presencial, semana a semana. Remarque ou desmarque um dia sem mexer no horário fixo, e mande o lembrete de amanhã pelo WhatsApp. O aluno vê o próximo treino na área dele.
- **Relatório do mês** (aba **Relatório** do aluno ou no Assistente IA): os números saem sozinhos (dias de treino, cargas que subiram, avaliação). O texto você escreve ou pede para a IA; depois manda no WhatsApp e/ou mostra na aba Evolução do aluno.
- **Aniversários**: o Painel mostra quem faz aniversário nos próximos 7 dias (precisa da data de nascimento no cadastro), com parabéns pronto no WhatsApp.
- **Como foi o treino**: depois de marcar exercícios, o aluno dá uma nota de esforço de 1 a 10 e diz se sentiu dor. Dor ou esforço no limite aparecem no Painel; o histórico fica na aba **Cargas**.
- **Indique um amigo**: cada aluno tem um link na aba **Conta** que leva para a sua página de vendas com "Fulana te indicou". Em **Vendas** aparece "Indicado por"; quando fecha, um botão dá o desconto (valor em **Configurações**) na mensalidade do mês seguinte de quem indicou. O Financeiro e o Pix já descontam.
- **Periodização**: na aba **Treinos** do aluno, **Programar fase** escolhe as fichas (cópia das atuais, seus modelos ou os prontos) e a data de início. No dia, as fichas antigas saem da tela do aluno (o histórico de cargas continua) e as novas entram sozinhas.
- **Notificações no celular**: o aluno ativa em **Conta** (no iPhone, com o app instalado na tela de início). Ele recebe o lembrete dos treinos de amanhã (botão **Lembrar todos pelo app** na Agenda) e o aviso de relatório novo.

Aluno pausado não consegue ver treinos. Cada personal só vê os próprios alunos, e cada aluno só vê os próprios dados. Isso é garantido pelo banco (Row Level Security), não só pela tela.

## Como colocar no ar (gratuito)

Você vai usar duas contas gratuitas: **Supabase** (login e banco de dados) e **Vercel** (hospedagem do site).

### 1. Supabase
1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**. Escolha a região **South America (São Paulo)** e anote a senha do banco.
2. Quando o projeto terminar de criar, abra **SQL Editor**, clique em **New query**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Abra **Project Settings > API** e copie dois valores: **Project URL** e a chave **anon public**.

### 2. Vercel
1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o GitHub.
2. Clique em **Add New > Project** e importe o repositório `plataforma-personal`.
3. Em **Environment Variables**, cadastre:
   - `VITE_SUPABASE_URL` = o Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = a chave anon public
4. Clique em **Deploy**. No fim, a Vercel mostra o endereço do site (algo como `plataforma-personal.vercel.app`).

### 3. Ligar o endereço do site ao login
No Supabase, abra **Authentication > URL Configuration**:
- **Site URL**: o endereço da Vercel, por exemplo `https://plataforma-personal.vercel.app`
- **Redirect URLs**: adicione `https://plataforma-personal.vercel.app/**`

Links para divulgar (Instagram, WhatsApp): reservas de spinning em `https://plataforma-personal.vercel.app/spinning`, pacotes em `/spinning/pacotes` e a página da consultoria em `/consultoria`.

Isso faz os links de confirmação de e-mail e de "esqueci a senha" voltarem para o seu site.

### 4. Liberar você como personal
1. No site, clique em **Primeiro acesso** e crie sua conta com o seu e-mail. Confirme pelo link que chega no e-mail.
2. No Supabase, abra o **SQL Editor** e rode (trocando o e-mail e o nome):
   ```sql
   insert into personais (user_id, nome)
   select id, 'Seu Nome' from auth.users where email = 'seu@email.com';
   ```
3. Entre no site de novo. Você vai cair no Painel.

### 5. Dar acesso a um aluno
1. No Painel, vá em **Alunos > Novo aluno** e preencha o **e-mail de acesso** do aluno.
2. Mande o endereço do site para o aluno. Ele clica em **Primeiro acesso**, usa esse mesmo e-mail e cria a senha.
3. A conta dele é ligada ao cadastro automaticamente. Na lista de alunos aparece "acesso ativo".

> O Supabase gratuito envia poucos e-mails por hora. Se muitos alunos forem criar conta no mesmo dia, configure um SMTP próprio em **Authentication > Emails** ou desative a confirmação de e-mail em **Authentication > Sign In / Providers > Email**.

### 6. Pix automático pelo Mercado Pago (opcional)
Sem isso, o site usa o Pix da sua chave (sem taxa) e você confirma os pagamentos à mão. Com isso, reservas, pacotes e mensalidades se confirmam sozinhos quando o Pix cai. O Mercado Pago cobra uma taxa por Pix recebido (confira o valor no app deles).
1. Em [mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app), clique em **Criar aplicação** (tipo "Pagamentos online", sem loja). Abra **Credenciais de produção** e copie o **Access Token** (começa com `APP_USR-`). Não mostre esse token para ninguém.
2. No Supabase, abra **Edge Functions > Secrets** e adicione `MP_ACCESS_TOKEN` com o token.
3. Ainda em **Edge Functions**, clique em **Deploy a new function > Via Editor**, dê o nome `pix-mercadopago`, apague o código de exemplo, cole o conteúdo de [`supabase/functions/pix-mercadopago/index.ts`](supabase/functions/pix-mercadopago/index.ts) e clique em **Deploy**.
4. Repita com o nome `mp-webhook` e o arquivo [`supabase/functions/mp-webhook/index.ts`](supabase/functions/mp-webhook/index.ts). Depois, nos detalhes da função `mp-webhook`, desligue **Enforce JWT verification** (o Mercado Pago não manda login). A função confere cada aviso direto no Mercado Pago, então um aviso falso não confirma nada.
5. Na Vercel, em **Settings > Environment Variables**, adicione `VITE_PIX_AUTOMATICO` = `1` e faça **Redeploy**.
6. Teste: crie uma aula de spinning de R$ 1,00, reserve e pague. Em até um minuto a reserva muda para "Confirmada".

Se o Mercado Pago falhar, a tela volta sozinha para o Pix da sua chave.

### 7. Biblioteca de exercícios, nutrição e assistente IA
1. No Supabase, abra **SQL Editor > New query**, cole o conteúdo de [`supabase/migracao-exercicios-nutricao.sql`](supabase/migracao-exercicios-nutricao.sql) e clique em **Run** (só precisa se o banco foi criado antes dessa versão; pode rodar mais de uma vez).
2. Para a IA: em [console.anthropic.com](https://console.anthropic.com), crie a conta, coloque créditos em **Billing** e crie uma chave em **API Keys** (começa com `sk-ant-`). Não mostre essa chave para ninguém.
3. No Supabase, em **Edge Functions > Secrets**, adicione `ANTHROPIC_API_KEY` com a chave.
4. Em **Edge Functions > Deploy a new function > Via Editor**, dê o nome `ia-assistente`, cole o conteúdo de [`supabase/functions/ia-assistente/index.ts`](supabase/functions/ia-assistente/index.ts) e clique em **Deploy**. Deixe **Enforce JWT verification** ligado.
5. Teste em **Assistente IA**. Cada sugestão custa cerca de US$ 0,10 a US$ 0,30 na conta da Anthropic.

### 8. Agenda, relatório, indicação, periodização e notificações
1. No Supabase, abra **SQL Editor > New query**, cole o conteúdo de [`supabase/migracao-melhorias.sql`](supabase/migracao-melhorias.sql) e clique em **Run** (pode rodar mais de uma vez).
2. Se a função `ia-assistente` já estiver publicada, abra-a em **Edge Functions**, cole de novo o conteúdo de [`supabase/functions/ia-assistente/index.ts`](supabase/functions/ia-assistente/index.ts) e clique em **Deploy** para a IA escrever o relatório.
3. Notificações no celular: em **Edge Functions > Deploy a new function > Via Editor**, dê o nome `notificacoes`, cole o conteúdo de [`supabase/functions/notificacoes/index.ts`](supabase/functions/notificacoes/index.ts) e clique em **Deploy** (deixe **Enforce JWT verification** ligado). Não precisa de chave: a função cria as chaves de envio sozinha na primeira vez.
4. (Opcional) Lembrete automático todo dia às 19h, sem precisar clicar na Agenda: em **Edge Functions > Secrets** crie `CRON_SECRET` com uma senha qualquer; em **Database > Extensions** ligue `pg_cron` e `pg_net`; no **SQL Editor** rode (troque `SUA-SENHA` e `SUA-CHAVE-ANON`, que fica em **Project Settings > API**):
   ```sql
   select cron.schedule('lembretes-treino', '0 22 * * *', $$
     select net.http_post(
       url := 'https://eguirjrzpnedzontfycy.supabase.co/functions/v1/notificacoes',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA-CHAVE-ANON", "x-cron-secret": "SUA-SENHA"}'::jsonb,
       body := '{"acao": "lembretes"}'::jsonb)
   $$);
   ```
   (22h no horário do servidor = 19h de Brasília.)

### 9. Comentários, avatar, troca de ficha e login com Google/Apple
1. No Supabase, abra **SQL Editor > New query**, cole o conteúdo de [`supabase/migracao-comunidade-fichas.sql`](supabase/migracao-comunidade-fichas.sql) e clique em **Run** (pode rodar mais de uma vez).
2. Em **Edge Functions**, abra `notificacoes`, cole de novo o conteúdo de [`supabase/functions/notificacoes/index.ts`](supabase/functions/notificacoes/index.ts) e clique em **Deploy** (agora ela também avisa das fichas para trocar).
3. Entrar com Google: em [console.cloud.google.com](https://console.cloud.google.com) crie um projeto, abra **APIs e serviços > Tela de consentimento OAuth** (tipo Externo) e depois **Credenciais > Criar credenciais > ID do cliente OAuth** (Aplicativo da Web). Em "URIs de redirecionamento autorizados" coloque `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Copie o ID e a chave secreta para o Supabase em **Authentication > Sign In / Providers > Google** e ligue.
4. Entrar com Apple: precisa de uma conta no Apple Developer Program (US$ 99 por ano). Siga o passo a passo em **Authentication > Sign In / Providers > Apple** no Supabase.
5. Em **Authentication > URL Configuration**, confira se o endereço do site está em **Site URL** e em **Redirect URLs**.
6. Os botões "Continuar com Google/Apple" só aparecem na tela de entrada depois que o provedor é ligado no Supabase. Quem entra assim pela primeira vez vira aluno com o nome da conta Google/Apple (o personal completa telefone e o resto).

### 10. Academia: grade de aulas, novidades, WhatsApp, equipes, chat, QR code e fotos da entrada

1. No Supabase, abra **SQL Editor › New query**, cole o arquivo `supabase/migracao-academia.sql` e toque em **Run** (pode rodar mais de uma vez). Ele já coloca a grade de aulas atual e o link do grupo do WhatsApp.
2. Publique de novo a função `notificacoes` (Edge Functions › notificacoes › cole o `supabase/functions/notificacoes/index.ts` › Deploy). Ela passa a mandar o lembrete da mensalidade (2 dias antes, no dia e 3 dias depois do vencimento, se não estiver paga).
3. No site, entre em **Academia** para publicar novidades, editar a grade, imprimir o QR code da recepção, montar as equipes e subir as fotos da tela de entrada.

### 11. Rede social, mensagens, vídeos de execução e motivação

1. No Supabase, abra **SQL Editor › New query**, cole o arquivo `supabase/migracao-social.sql` e toque em **Run** (pode rodar mais de uma vez). As curtidas antigas viram ❤️.
2. Publique de novo a função `notificacoes` (Edge Functions › notificacoes › cole o `supabase/functions/notificacoes/index.ts` › Deploy).
3. O que passa a funcionar:
   - Reações com emoji (❤️ 🔥 💪 👏 😂 😮) nos posts, nas conquistas e no chat da turma (no chat, é só tocar na mensagem).
   - Card do treino no post (exercícios, séries, volume e recordes) e check-in de corrida, pedal e caminhada com km, tempo e ritmo.
   - Medalhas e recordes de carga viram post sozinhos no feed; tocando no nome do aluno, abre o perfil dele.
   - **Mensagens**: conversa particular de cada aluno com você (menu Mensagens).
   - **Vídeos**: o aluno da consultoria online manda o vídeo do exercício e você responde com a correção (aba Vídeos do aluno e card no Painel). Vídeos de até 50 MB.
   - Motivação: quem fica 3, 7, 14, 21 ou 30 dias sem treinar recebe uma frase no celular (se ativou as notificações). Dá para desligar em **Configurações**.

### 12. Ofensiva semanal, resumo da semana, equipes automáticas e aula experimental

1. No Supabase, abra **SQL Editor › New query**, cole o arquivo `supabase/migracao-rotina.sql` e toque em **Run** (pode rodar mais de uma vez).
2. Publique de novo a função `notificacoes` (Edge Functions › notificacoes › cole o `supabase/functions/notificacoes/index.ts` › Deploy).
3. O que passa a funcionar:
   - **Ofensiva**: semanas seguidas com pelo menos 2 treinos, no Início do aluno. No fim da semana, quem ainda não bateu a meta recebe um aviso no celular.
   - **Resumo da semana**: toda segunda, o aluno recebe quantas vezes treinou na semana anterior e a comparação com as outras semanas.
   - **Equipes automáticas**: aluno novo entra sozinho na equipe com menos gente. Em **Academia › Equipes**, o botão "Dividir entre as equipes" distribui quem está sem equipe.
   - **Aula experimental**: em **Vendas › Página e planos**, coloque os horários livres. A pessoa marca pela página de vendas, e a aula aparece em Interessados e na Agenda.
   - **Check-in de musculação**: o aluno marca os grupos treinados e a duração; o post mostra o bonequinho.
   - **Métodos de treino** no exercício (rest-pause, drop set, bi-set, tri-set, superset, série gigante, pirâmide, cluster, FST-7...): escolha em **Editar** no exercício. Para bi-set e afins, marque o mesmo método nos exercícios seguidos (use ↑ para mudar a ordem).

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:5173
npm test                     # testa os cálculos de Pollock, IMC e classificação
npm run build
```

Feito com React + Vite e Supabase (`@supabase/supabase-js`).

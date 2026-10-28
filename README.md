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

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:5173
npm test                     # testa os cálculos de Pollock, IMC e classificação
npm run build
```

Feito com React + Vite e Supabase (`@supabase/supabase-js`).

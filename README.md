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

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:5173
npm test                     # testa os cálculos de Pollock, IMC e classificação
npm run build
```

Feito com React + Vite e Supabase (`@supabase/supabase-js`).

import { Link } from 'react-router-dom'
import { SimboloCA } from '../components/Logo.jsx'

// Política de privacidade (pública). O Google pede o link dela para liberar o "Entrar com Google".
export default function Privacidade() {
  return (
    <div className="privacidade">
      <header className="row" style={{ gap: 10 }}>
        <SimboloCA size={36} />
        <strong style={{ fontFamily: 'var(--display)', fontSize: 20 }}>Corpo Atlético<span style={{ color: 'var(--accent)' }}>.</span></strong>
      </header>
      <h1>Política de privacidade</h1>
      <p className="meta">Atualizada em 30 de outubro de 2026.</p>

      <p>Este app é da academia Corpo Atlético e serve para alunos acompanharem treinos, dieta, avaliações e a comunidade da academia. Aqui explicamos quais dados usamos e por quê, de acordo com a Lei Geral de Proteção de Dados (LGPD).</p>

      <h2>Quais dados guardamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail, telefone, data de nascimento e plano.</li>
        <li><strong>Login com Google:</strong> só o nome, o e-mail e a foto da sua conta Google. Não temos acesso à sua senha nem a outros dados do Google.</li>
        <li><strong>Treino e saúde:</strong> fichas, cargas, check-ins, avaliações físicas, medidas, anamnese e fotos de evolução que você ou seu personal registram.</li>
        <li><strong>Comunidade:</strong> fotos, comentários e reações que você publica no feed da turma.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Montar e acompanhar seu treino e sua dieta.</li>
        <li>Mostrar sua evolução, medalhas e ranking.</li>
        <li>Mandar avisos no celular (lembretes de treino e de mensalidade), se você ativar as notificações.</li>
        <li>Controlar mensalidades e o acesso à academia.</li>
      </ul>

      <h2>Quem vê seus dados</h2>
      <p>Só você e seu personal veem seus dados de treino, saúde e avaliações. O que você publica na comunidade aparece para os outros alunos da academia. Não vendemos nem repassamos seus dados para ninguém.</p>
      <p>Os dados ficam guardados com segurança nos serviços Supabase (banco de dados) e Vercel (site), que só os armazenam para o app funcionar.</p>

      <h2>Seus direitos</h2>
      <p>Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou para sair do app. É só falar com seu personal ou com a recepção da academia. Fotos e posts da comunidade você mesmo pode apagar pelo app.</p>

      <p style={{ marginTop: 28 }}><Link to="/">← Voltar para o app</Link></p>
    </div>
  )
}

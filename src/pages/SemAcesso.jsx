import { supabase } from '../supabase.js'

export default function SemAcesso({ email }) {
  return (
    <div className="centro">
      <div className="panel stack" style={{ maxWidth: 460 }}>
        <h2>Acesso ainda não liberado</h2>
        <p style={{ margin: 0 }}>
          Sua conta <strong>{email}</strong> foi criada, mas ainda não está ligada a nenhum cadastro de aluno.
          Peça ao seu personal para cadastrar você com este mesmo e-mail e entre de novo.
        </p>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </div>
  )
}

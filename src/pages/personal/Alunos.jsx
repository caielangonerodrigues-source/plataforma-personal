import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Status from '../../components/Status.jsx'
import FormAluno from './FormAluno.jsx'

export default function Alunos() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState(null)
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)

  useEffect(() => {
    supabase.from('alunos').select('id, nome, objetivo, plano, status, modalidade, user_id, treinos(id)').order('nome').then(({ data }) => setAlunos(data || []))
  }, [])

  if (!alunos) return <p className="carregando">Carregando…</p>
  const lista = alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <>
      <div className="row between">
        <div><h1>Alunos</h1><p className="sub">{alunos.length} cadastrado(s)</p></div>
        <button className="primary" onClick={() => setNovo(true)}>Novo aluno</button>
      </div>
      <div className="panel">
        <input id="busca" placeholder="Buscar pelo nome" aria-label="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="list" style={{ marginTop: 8 }}>
          {lista.map((a) => (
            <Link className="item" key={a.id} to={`/alunos/${a.id}`}>
              <div>
                <div className="name">{a.nome}</div>
                <div className="meta">{[a.modalidade === 'online' && 'Online', a.objetivo, a.plano, `${a.treinos.length} ficha(s)`, a.user_id ? 'acesso ativo' : 'ainda sem login'].filter(Boolean).join(' · ')}</div>
              </div>
              <Status status={a.status} />
            </Link>
          ))}
          {!lista.length && <p className="empty">{alunos.length ? 'Nenhum aluno com esse nome.' : 'Nenhum aluno ainda. Clique em "Novo aluno".'}</p>}
        </div>
      </div>
      {novo && <FormAluno onFechar={() => setNovo(false)} onSalvo={(a) => navigate(`/alunos/${a.id}`)} />}
    </>
  )
}

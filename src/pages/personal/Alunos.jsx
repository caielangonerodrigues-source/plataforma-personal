import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Status from '../../components/Status.jsx'
import FormAluno from './FormAluno.jsx'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

export default function Alunos() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState(null)
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [tipo, setTipo] = useState('todos') // todos | presencial | online

  useEffect(() => {
    supabase.from('alunos').select('id, nome, objetivo, plano, status, modalidade, user_id, treinos(id)').order('nome').then(({ data }) => setAlunos(data || []))
  }, [])

  if (!alunos) return <p className="carregando">Carregando…</p>
  const ehOnline = (a) => a.modalidade === 'online'
  const qtdOnline = alunos.filter(ehOnline).length
  const lista = alunos
    .filter((a) => tipo === 'todos' || (tipo === 'online') === ehOnline(a))
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <>
      <div className="row between">
        <div><h1>Alunos</h1><p className="sub">{alunos.length} cadastrado(s)</p></div>
        <button className="primary" onClick={() => setNovo(true)}>Novo aluno</button>
      </div>
      <AjudaDaPagina />
      <div className="panel">
        <input id="busca" placeholder="Buscar pelo nome" aria-label="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="segmentos" role="group" aria-label="Tipo de aluno">
          {[['todos', `Todos (${alunos.length})`], ['presencial', `Academia (${alunos.length - qtdOnline})`], ['online', `Online (${qtdOnline})`]].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tipo === k} onClick={() => setTipo(k)}>{l}</button>
          ))}
        </div>
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
          {!lista.length && <p className="empty">{alunos.length ? (busca ? 'Nenhum aluno com esse nome.' : tipo === 'online' ? 'Nenhum aluno da consultoria online ainda.' : 'Nenhum aluno da academia ainda.') : 'Nenhum aluno ainda. Clique em "Novo aluno".'}</p>}
        </div>
      </div>
      {novo && <FormAluno onFechar={() => setNovo(false)} onSalvo={(a) => navigate(`/alunos/${a.id}`)} />}
    </>
  )
}

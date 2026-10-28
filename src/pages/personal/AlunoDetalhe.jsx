import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Status from '../../components/Status.jsx'
import { fmtData, hojeISO, porData, porOrdem } from '../../lib/formato.js'
import FormAluno from './FormAluno.jsx'
import Treinos from './Treinos.jsx'
import Avaliacoes from './Avaliacoes.jsx'

export default function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'avaliacoes' ? 'avaliacoes' : 'treinos'
  const [aluno, setAluno] = useState(null)
  const [diasTreinados, setDiasTreinados] = useState(0)
  const [editando, setEditando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('alunos').select('*, treinos(*, exercicios(*)), avaliacoes(*)').eq('id', id).maybeSingle()
    if (error || !data) return setErro('Aluno não encontrado.')
    data.treinos.sort(porOrdem).forEach((t) => t.exercicios.sort(porOrdem))
    data.avaliacoes.sort(porData)
    setAluno(data)
    const desde = new Date(Date.now() - 30 * 864e5).toLocaleDateString('sv-SE')
    const { data: regs } = await supabase.from('registros').select('data').eq('aluno_id', id).gte('data', desde).lte('data', hojeISO())
    setDiasTreinados(new Set((regs || []).map((r) => r.data)).size)
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function excluir() {
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (error) return setErro(`Não foi possível excluir: ${error.message}`)
    navigate('/alunos')
  }

  if (erro && !aluno) return <><Link to="/alunos">← Alunos</Link><p className="erro">{erro}</p></>
  if (!aluno) return <p className="carregando">Carregando…</p>

  return (
    <>
      <Link to="/alunos" className="meta">← Alunos</Link>
      <div className="row between" style={{ marginTop: 6 }}>
        <div>
          <h1>{aluno.nome}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {[aluno.idade && `${aluno.idade} anos`, aluno.sexo === 'M' ? 'Masculino' : 'Feminino', aluno.objetivo, aluno.plano, aluno.inicio && `desde ${fmtData(aluno.inicio)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="row"><Status status={aluno.status} /><button className="small" onClick={() => setEditando(true)}>Editar dados</button></div>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>
        {aluno.telefone && <>WhatsApp <span style={{ userSelect: 'all' }}>{aluno.telefone}</span> · </>}
        {aluno.email ? <>{aluno.email} · {aluno.user_id ? 'acesso ativo' : 'ainda não criou a senha'}</> : 'sem e-mail de acesso'}
        {' · '}treinou em {diasTreinados} dia(s) nos últimos 30
      </p>
      {erro && <p className="erro">{erro}</p>}

      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={aba === 'treinos'} onClick={() => setParams({})}>Treinos</button>
        <button className="tab" role="tab" aria-selected={aba === 'avaliacoes'} onClick={() => setParams({ aba: 'avaliacoes' })}>Avaliações físicas</button>
      </div>
      {aba === 'treinos' ? <Treinos aluno={aluno} recarregar={carregar} /> : <Avaliacoes aluno={aluno} recarregar={carregar} />}

      <div className="row" style={{ marginTop: 40 }}>
        {confirmarExclusao ? (
          <>
            <span className="meta">Excluir {aluno.nome} apaga fichas, avaliações e registros. Não dá para desfazer.</span>
            <button className="small" onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
            <button className="small" style={{ color: 'var(--warn)' }} onClick={excluir}>Excluir definitivamente</button>
          </>
        ) : <button className="ghost small" onClick={() => setConfirmarExclusao(true)}>Excluir aluno</button>}
      </div>

      {editando && <FormAluno aluno={aluno} onFechar={() => setEditando(false)} onSalvo={() => { setEditando(false); carregar() }} />}
    </>
  )
}

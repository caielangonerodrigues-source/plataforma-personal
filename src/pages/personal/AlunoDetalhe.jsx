import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Status from '../../components/Status.jsx'
import { fmtData, hojeISO, porData, porOrdem, primeiroNome } from '../../lib/formato.js'
import FormAluno from './FormAluno.jsx'
import Treinos from './Treinos.jsx'
import Avaliacoes from './Avaliacoes.jsx'
import Progressao from '../../components/Progressao.jsx'
import Anamnese, { temAlertaParq } from '../../components/Anamnese.jsx'
import FotosEvolucao from '../../components/FotosEvolucao.jsx'
import Consultoria from '../../components/Consultoria.jsx'
import Nutricao from '../../components/Nutricao.jsx'
import Relatorio from '../../components/Relatorio.jsx'
import { ListaFeedbacks } from '../../components/ComoFoiTreino.jsx'
import { linkWhatsApp } from '../../lib/whatsapp.js'

const ABAS = [['treinos', 'Treinos'], ['consultoria', 'Consultoria'], ['avaliacoes', 'Avaliações físicas'], ['progressao', 'Cargas'], ['nutricao', 'Nutrição'], ['relatorio', 'Relatório'], ['anamnese', 'Anamnese'], ['fotos', 'Fotos']]

export default function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const abaPedida = ABAS.some(([k]) => k === params.get('aba')) ? params.get('aba') : 'treinos'
  const [aluno, setAluno] = useState(null)
  const [diasTreinados, setDiasTreinados] = useState(0)
  const [registros, setRegistros] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [alertaParq, setAlertaParq] = useState(false)
  const [editando, setEditando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    await supabase.rpc('aplicar_fases') // fase nova da periodização, se chegou o dia
    const { data, error } = await supabase.from('alunos').select('*, treinos(*, exercicios(*)), avaliacoes(*)').eq('id', id).maybeSingle()
    if (error || !data) return setErro('Aluno não encontrado.')
    data.treinos.sort(porOrdem).forEach((t) => t.exercicios.sort(porOrdem))
    // Fichas de fases anteriores (periodização) ficam guardadas para o histórico de cargas.
    data.todosTreinos = data.treinos
    data.treinos = data.treinos.filter((t) => !t.arquivado)
    data.avaliacoes.sort(porData)
    setAluno(data)
    const desde = new Date(Date.now() - 30 * 864e5).toLocaleDateString('sv-SE')
    const [{ data: regs }, { data: an }] = await Promise.all([
      supabase.from('registros').select('*').eq('aluno_id', id).lte('data', hojeISO()),
      supabase.from('anamneses').select('parq').eq('aluno_id', id).maybeSingle(),
    ])
    setRegistros(regs || [])
    supabase.from('feedbacks_treino').select('*').eq('aluno_id', id).order('data', { ascending: false }).limit(20).then(({ data: fb }) => setFeedbacks(fb || []))
    setDiasTreinados(new Set((regs || []).filter((r) => r.data >= desde).map((r) => r.data)).size)
    setAlertaParq(temAlertaParq(an))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function excluir() {
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (error) return setErro(`Não foi possível excluir: ${error.message}`)
    navigate('/alunos')
  }

  if (erro && !aluno) return <><Link to="/alunos">← Alunos</Link><p className="erro">{erro}</p></>
  if (!aluno) return <p className="carregando">Carregando…</p>
  const abas = ABAS.filter(([k]) => k !== 'consultoria' || aluno.modalidade === 'online')
  const aba = abas.some(([k]) => k === abaPedida) ? abaPedida : 'treinos'

  return (
    <>
      <Link to="/alunos" className="meta">← Alunos</Link>
      <div className="row between" style={{ marginTop: 6 }}>
        <div>
          <h1>{aluno.nome}</h1>
          <p className="sub" style={{ margin: 0 }}>
            {[aluno.modalidade === 'online' && 'Consultoria online', aluno.idade && `${aluno.idade} anos`, aluno.sexo === 'M' ? 'Masculino' : 'Feminino', aluno.objetivo, aluno.plano, aluno.inicio && `desde ${fmtData(aluno.inicio)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="row"><Status status={aluno.status} /><button className="small" onClick={() => setEditando(true)}>Editar dados</button></div>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>
        {aluno.telefone && <>WhatsApp <a href={linkWhatsApp(aluno.telefone, `Oi, ${primeiroNome(aluno.nome)}! Tudo bem?`)} target="_blank" rel="noreferrer">{aluno.telefone}</a> · </>}
        {aluno.email ? <>{aluno.email} · {aluno.user_id ? 'acesso ativo' : 'ainda não criou a senha'}</> : 'sem e-mail de acesso'}
        {' · '}treinou em {diasTreinados} dia(s) nos últimos 30
      </p>
      {erro && <p className="erro">{erro}</p>}
      {alertaParq && <p className="erro" style={{ marginTop: 6 }}>PAR-Q com resposta "sim": veja a anamnese antes de aumentar a intensidade.</p>}

      <div className="tabs" role="tablist">
        {abas.map(([k, l]) => <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => setParams(k === 'treinos' ? {} : { aba: k })}>{l}</button>)}
      </div>
      {aba === 'treinos' && <Treinos aluno={aluno} recarregar={carregar} />}
      {aba === 'consultoria' && <Consultoria aluno={aluno} personal onAvaliacao={carregar} />}
      {aba === 'avaliacoes' && <Avaliacoes aluno={aluno} recarregar={carregar} />}
      {aba === 'progressao' && (
        <div className="stack">
          <div className="panel"><Progressao treinos={aluno.todosTreinos} registros={registros} /></div>
          {feedbacks.length > 0 && <div className="panel"><h2>Como foi o treino</h2><p className="meta" style={{ marginTop: 0 }}>Esforço de 1 a 10 e dor que o aluno marcou no fim de cada treino.</p><ListaFeedbacks feedbacks={feedbacks} /></div>}
          <TrocasDoAluno treinos={aluno.todosTreinos} registros={registros} />
        </div>
      )}
      {aba === 'relatorio' && <Relatorio aluno={aluno} />}
      {aba === 'nutricao' && <Nutricao aluno={aluno} />}
      {aba === 'anamnese' && <Anamnese alunoId={aluno.id} onSalva={carregar} intro={<p className="meta" style={{ margin: 0 }}>O aluno também pode preencher pela área dele.</p>} />}
      {aba === 'fotos' && <FotosEvolucao alunoId={aluno.id} podeApagar />}

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

// Exercícios que o aluno trocou no dia (aparelho ocupado), dos últimos 60 dias.
function TrocasDoAluno({ treinos, registros }) {
  const nomes = new Map(treinos.flatMap((t) => t.exercicios.map((e) => [e.id, `${t.nome} · ${e.nome}`])))
  const desde = new Date(Date.now() - 60 * 864e5).toLocaleDateString('sv-SE')
  const trocas = registros.filter((r) => r.troca && r.data >= desde).sort((a, b) => (a.data < b.data ? 1 : -1))
  if (!trocas.length) return null
  return (
    <div className="panel">
      <h2>Trocas de exercício</h2>
      <p className="meta" style={{ marginTop: 0 }}>Quando o aparelho estava ocupado, o aluno fez outro exercício no lugar. As cargas desses dias não entram na evolução acima.</p>
      <div className="list">
        {trocas.map((r) => (
          <div className="item" key={`${r.exercicio_id}${r.data}`} style={{ cursor: 'default' }}>
            <div style={{ minWidth: 0 }}><div className="name">{r.troca}</div><div className="meta">no lugar de {nomes.get(r.exercicio_id) || 'exercício removido'}</div></div>
            <span className="meta mono">{fmtData(r.data)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

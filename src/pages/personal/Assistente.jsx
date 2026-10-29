import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { useBiblioteca } from '../../components/SeletorExercicios.jsx'
import { VerDieta, salvarDieta } from '../../components/Nutricao.jsx'
import { temAlertaParq } from '../../components/Anamnese.jsx'
import { f1, fmtData, porData, porOrdem, primeiroNome } from '../../lib/formato.js'
import { fichasDaIA, pedirIA } from '../../lib/ia.js'
import { resumoModelo } from '../../lib/modelos.js'
import { FormModelo, aplicarModelo } from './Modelos.jsx'

const DIAS = ['2', '3', '4', '5', '6']

export default function Assistente() {
  const [params, setParams] = useSearchParams()
  const [alunos, setAlunos] = useState(null)
  const [aluno, setAluno] = useState(null)
  const [parq, setParq] = useState(false)
  const tipo = params.get('tipo') === 'dieta' ? 'dieta' : 'treino'
  const alunoId = params.get('aluno') || ''
  const [opcoes, setOpcoes] = useState({ dias: '3', tempo: '60 min', local: 'Academia completa', refeicoes: '5', restricoes: '', extra: '' })
  const [estado, setEstado] = useState({}) // { carregando } | { erro } | { resultado } | { aplicado }
  const [salvarModelo, setSalvarModelo] = useState(false)
  const { meus } = useBiblioteca()

  useEffect(() => {
    supabase.from('alunos').select('id, nome, status').order('nome').then(({ data }) => setAlunos(data || []))
  }, [])
  async function carregarAluno(id) {
    if (!id) return setAluno(null)
    const [{ data }, { data: an }] = await Promise.all([
      supabase.from('alunos').select('*, treinos(*, exercicios(*)), avaliacoes(*)').eq('id', id).maybeSingle(),
      supabase.from('anamneses').select('parq').eq('aluno_id', id).maybeSingle(),
    ])
    if (data) { data.treinos.sort(porOrdem); data.avaliacoes.sort(porData) }
    setAluno(data); setParq(temAlertaParq(an))
  }
  useEffect(() => { carregarAluno(alunoId); setEstado({}) }, [alunoId])

  const escolher = (k, v) => { const p = { aluno: alunoId, tipo, [k]: v }; setParams(Object.fromEntries(Object.entries(p).filter(([, x]) => x))) }
  const campo = (k) => ({ id: `ia-${k}`, value: opcoes[k], onChange: (e) => setOpcoes({ ...opcoes, [k]: e.target.value }) })

  async function gerar() {
    const pedido = tipo === 'treino'
      ? [`${opcoes.dias} treinos por semana`, `cerca de ${opcoes.tempo} por treino`, `local/equipamentos: ${opcoes.local}`, opcoes.restricoes && `cuidados: ${opcoes.restricoes}`, opcoes.extra].filter(Boolean).join('. ')
      : [`${opcoes.refeicoes} refeições por dia`, opcoes.restricoes && `restrições e preferências: ${opcoes.restricoes}`, opcoes.extra].filter(Boolean).join('. ')
    setEstado({ carregando: true })
    try {
      setEstado({ resultado: await pedirIA({ tipo, alunoId, pedido, meusExercicios: meus }) })
    } catch (e) {
      setEstado({ erro: e.message })
    }
  }
  async function aplicar() {
    const r = estado.resultado
    setEstado({ ...estado, salvando: true })
    const falha = tipo === 'treino'
      ? await aplicarModelo(aluno, { fichas: fichasDaIA(r, meus) })
      : await salvarDieta(aluno.id, r)
    if (falha) return setEstado({ ...estado, salvando: false, erroAplicar: `Não foi possível salvar: ${falha}` })
    setEstado({ aplicado: true })
    carregarAluno(aluno.id)
  }

  const ultima = aluno?.avaliacoes.at(-1)
  const r = estado.resultado

  return (
    <>
      <h1>Assistente IA</h1>
      <p className="sub">A IA monta um rascunho de treino ou dieta com base na avaliação física, na anamnese e no objetivo do aluno. Você revisa e decide se aplica.</p>

      <div className="panel ia-caixa stack">
        <div className="form">
          <label>Aluno
            <select id="ia-aluno" value={alunoId} onChange={(e) => escolher('aluno', e.target.value)}>
              <option value="">Escolha o aluno</option>
              {(alunos || []).map((a) => <option key={a.id} value={a.id}>{a.nome}{a.status === 'pausado' ? ' (pausado)' : ''}</option>)}
            </select>
          </label>
          <label>Criar
            <select id="ia-tipo" value={tipo} onChange={(e) => escolher('tipo', e.target.value)}>
              <option value="treino">Fichas de treino</option>
              <option value="dieta">Dieta (plano alimentar)</option>
            </select>
          </label>
        </div>

        {aluno && (
          <div className="meta" style={{ color: 'var(--ink)' }}>
            <strong>{aluno.nome}</strong>{' · '}
            {[aluno.idade && `${aluno.idade} anos`, aluno.sexo === 'M' ? 'masculino' : 'feminino', aluno.objetivo ? `objetivo: ${aluno.objetivo}` : 'sem objetivo no cadastro'].filter(Boolean).join(' · ')}
            <br />
            {ultima
              ? `Avaliação de ${fmtData(ultima.data)}: ${[ultima.peso && `${f1(ultima.peso)} kg`, ultima.altura && `${f1(ultima.altura)} m`, ultima.gordura && `${f1(ultima.gordura)}% de gordura`].filter(Boolean).join(', ')}`
              : 'Sem avaliação física: a sugestão fica mais genérica.'}
            {aluno.treinos.length > 0 && tipo === 'treino' && ` · já tem ${aluno.treinos.length} ficha(s)`}
            {parq && <p className="erro" style={{ marginTop: 4 }}>PAR-Q com resposta "sim": a IA vai considerar, mas revise com atenção.</p>}
            {!aluno.objetivo && <p style={{ margin: '4px 0 0' }}><Link to={`/alunos/${aluno.id}`}>Coloque o objetivo no cadastro</Link> para a sugestão ficar melhor.</p>}
          </div>
        )}

        {tipo === 'treino' ? (
          <div className="form">
            <label>Treinos por semana<select {...campo('dias')}>{DIAS.map((d) => <option key={d} value={d}>{d}x</option>)}</select></label>
            <label>Tempo por treino<input {...campo('tempo')} /></label>
            <label className="full">Local e equipamentos<input placeholder="Ex.: academia completa, em casa com halteres e elástico" {...campo('local')} /></label>
            <label className="full">Cuidados<input placeholder="Ex.: dor no joelho direito, evitar impacto" {...campo('restricoes')} /></label>
          </div>
        ) : (
          <div className="form">
            <label>Refeições por dia<select {...campo('refeicoes')}>{['3', '4', '5', '6'].map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
            <label className="full">Restrições e preferências<input placeholder="Ex.: sem lactose, não come peixe, treina às 18h, orçamento simples" {...campo('restricoes')} /></label>
          </div>
        )}
        <label>Algo mais para a IA saber?<textarea rows={2} maxLength={1000} placeholder="Opcional" {...campo('extra')} /></label>
        <div className="row between">
          <span className="meta">Leva de 20 segundos a 1 minuto.</span>
          <button className="primary" disabled={!aluno || estado.carregando} onClick={gerar}>{estado.carregando ? 'A IA está montando…' : r ? 'Gerar de novo' : 'Gerar sugestão'}</button>
        </div>
        {estado.erro && <p className="erro">{estado.erro}</p>}
      </div>

      {estado.aplicado && (
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="ok">{tipo === 'treino' ? 'Fichas aplicadas.' : 'Dieta salva.'} {primeiroNome(aluno.nome)} já vê na área do aluno.</p>
          <Link to={`/alunos/${aluno.id}${tipo === 'dieta' ? '?aba=nutricao' : ''}`}>Abrir {tipo === 'treino' ? 'as fichas' : 'a dieta'} para ajustar</Link>
        </div>
      )}

      {r && (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Sugestão da IA</h2>
            <p style={{ margin: 0 }}>{r.resumo}</p>
            {tipo === 'treino' && <p className="meta" style={{ marginBottom: 0 }}>{resumoModelo({ fichas: r.fichas || [] })}</p>}
          </div>
          {tipo === 'treino' ? (
            <>
              <div className="grid2">
                {(r.fichas || []).map((f, i) => (
                  <div className="panel" key={i}>
                    <div className="row" style={{ gap: 0 }}><span className="letter">{f.nome}</span><h3>{f.foco}</h3></div>
                    <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                      {f.exercicios.map((e, j) => <li key={j}>{e.nome} <span className="meta">{e.series} × {e.reps} · {e.descanso}{e.obs ? ` · ${e.obs}` : ''}</span></li>)}
                    </ol>
                  </div>
                ))}
              </div>
              {r.observacoes && <div className="panel"><h3 style={{ marginTop: 0 }}>Observações</h3><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.observacoes}</p></div>}
            </>
          ) : <VerDieta dieta={r} />}
          {estado.erroAplicar && <p className="erro">{estado.erroAplicar}</p>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {tipo === 'treino' && <button onClick={() => setSalvarModelo(true)}>Salvar como modelo</button>}
            <button className="primary" disabled={estado.salvando} onClick={aplicar}>
              {estado.salvando ? 'Salvando…' : tipo === 'treino' ? `Aplicar em ${primeiroNome(aluno.nome)}` : `Salvar como dieta de ${primeiroNome(aluno.nome)}`}
            </button>
          </div>
          <p className="meta" style={{ margin: 0, textAlign: 'right' }}>
            {tipo === 'treino'
              ? (aluno.treinos.length ? 'As fichas atuais continuam; as novas entram com as próximas letras.' : 'Depois de aplicar, dá para editar cada exercício.')
              : 'Substitui a dieta atual do aluno. Depois de salvar, dá para editar na aba Nutrição.'}
          </p>
        </div>
      )}
      {salvarModelo && r && <FormModelo fichas={fichasDaIA(r, meus)} onFechar={() => setSalvarModelo(false)} onSalvo={() => setSalvarModelo(false)} />}
    </>
  )
}

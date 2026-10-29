import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Grafico from '../../components/Grafico.jsx'
import Composicao from '../../components/Composicao.jsx'
import Comunidade from '../../components/Comunidade.jsx'
import FormCheckin from '../../components/FormCheckin.jsx'
import InstalarApp from '../../components/InstalarApp.jsx'
import Progressao from '../../components/Progressao.jsx'
import Medalhas from '../../components/Medalhas.jsx'
import FotosEvolucao from '../../components/FotosEvolucao.jsx'
import Mensalidade from '../../components/Mensalidade.jsx'
import Anamnese from '../../components/Anamnese.jsx'
import Consultoria from '../../components/Consultoria.jsx'
import AulasSpinning from '../spinning/AulasSpinning.jsx'
import { DietaAluno } from '../../components/Nutricao.jsx'
import { SimboloCA } from '../../components/Logo.jsx'
import { buscaVideo } from '../../lib/exercicios.js'
import { useComunidade } from '../../hooks/useComunidade.js'
import { inicioDoMes, sequencia, somarDias } from '../../lib/comunidade.js'
import { ultimaSessao } from '../../lib/progressao.js'
import { f1, hojeISO, num, porData, porOrdem, primeiroNome } from '../../lib/formato.js'

export default function AreaAluno({ aluno }) {
  const [aba, setAba] = useState('treino')
  const [treinos, setTreinos] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [registros, setRegistros] = useState([])
  const [diasCheckin, setDiasCheckin] = useState([])
  const [temAnamnese, setTemAnamnese] = useState(true)
  const [fichaId, setFichaId] = useState(null)
  const [aberto, setAberto] = useState(null) // exercício com as séries abertas
  const [checkinAberto, setCheckinAberto] = useState(false)
  const [erro, setErro] = useState('')
  const comunidade = useComunidade()
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    const [t, a, r, c, an] = await Promise.all([
      supabase.from('treinos').select('*, exercicios(*)').eq('aluno_id', aluno.id),
      supabase.from('avaliacoes').select('*').eq('aluno_id', aluno.id),
      supabase.from('registros').select('exercicio_id, data, series').eq('aluno_id', aluno.id).gte('data', somarDias(hoje, -365)),
      supabase.from('checkins').select('data').eq('aluno_id', aluno.id).gte('data', somarDias(hoje, -400)),
      supabase.from('anamneses').select('aluno_id').eq('aluno_id', aluno.id),
    ])
    const lista = (t.data || []).sort(porOrdem)
    lista.forEach((x) => x.exercicios.sort(porOrdem))
    setTreinos(lista)
    setAvaliacoes((a.data || []).sort(porData))
    setRegistros(r.data || [])
    setDiasCheckin((c.data || []).map((x) => x.data))
    setTemAnamnese(!!an.data?.length)
  }, [aluno.id, hoje])

  useEffect(() => { carregar() }, [carregar])

  const deHoje = (id) => registros.find((r) => r.exercicio_id === id && r.data === hoje)

  async function marcar(exercicioId, feito) {
    setRegistros((rs) => (feito ? [...rs, { exercicio_id: exercicioId, data: hoje, series: null }] : rs.filter((r) => !(r.exercicio_id === exercicioId && r.data === hoje))))
    const { error } = feito
      ? await supabase.from('registros').insert({ aluno_id: aluno.id, exercicio_id: exercicioId, data: hoje })
      : await supabase.from('registros').delete().eq('exercicio_id', exercicioId).eq('data', hoje)
    if (error && error.code !== '23505') { setErro('Não foi possível salvar. Verifique a internet e tente de novo.'); carregar() } else setErro('')
  }

  async function salvarSeries(exercicioId, series) {
    const { error } = await supabase.from('registros').upsert({ aluno_id: aluno.id, exercicio_id: exercicioId, data: hoje, series }, { onConflict: 'exercicio_id,data' })
    if (error) return setErro('Não foi possível salvar as cargas. Tente de novo.')
    setErro(''); setAberto(null); carregar()
  }

  if (aluno.status === 'pausado') {
    return (
      <div className="solo">
        <Cabecalho aluno={aluno} />
        <div className="panel" style={{ marginTop: 20 }}>Seu acesso está pausado. Fale com seu personal.</div>
      </div>
    )
  }

  const ficha = treinos?.find((t) => t.id === fichaId) || treinos?.[0]
  const qtdFeitos = ficha ? ficha.exercicios.filter((e) => deHoje(e.id)).length : 0
  const pct = ficha?.exercicios.length ? Math.round((qtdFeitos / ficha.exercicios.length) * 100) : 0
  const ultima = avaliacoes.at(-1)
  const fezHoje = diasCheckin.includes(hoje)
  const seq = sequencia(diasCheckin, hoje)
  const noMes = new Set(diasCheckin.filter((d) => d >= inicioDoMes(hoje))).size
  const abas = [['treino', 'Treino'], ...(aluno.modalidade === 'online' ? [['consultoria', 'Consultoria']] : []), ...(aluno.comunidade ? [['comunidade', 'Comunidade']] : []), ['dieta', 'Dieta'], ['evolucao', 'Evolução'], ['spinning', 'Spinning'], ['conta', 'Conta']]

  return (
    <div className="solo">
      <Cabecalho aluno={aluno} />
      <InstalarApp />
      {!temAnamnese && (
        <div className="panel row between" style={{ marginTop: 16, borderColor: 'var(--accent)' }}>
          <div className="meta" style={{ color: 'var(--ink)', flex: 1, minWidth: 0 }}>Preencha sua anamnese e o PAR-Q para seu personal conhecer seu histórico de saúde.</div>
          <button className="small" onClick={() => setAba('conta')}>Preencher</button>
        </div>
      )}

      <div className="streak">
        <div className="panel kpi"><div className="n">{seq}</div><div className="l">{seq === 1 ? 'Dia seguido' : 'Dias seguidos'}</div></div>
        <div className="panel kpi"><div className="n">{noMes}</div><div className="l">Treinos no mês</div></div>
        <div className="panel kpi"><div className="n">{new Set(diasCheckin).size}</div><div className="l">Check-ins no total</div></div>
      </div>
      <div className="checkin-cta">
        <p>{fezHoje ? `Check-in de hoje feito. ${seq > 1 ? `São ${seq} dias seguidos!` : 'Bora manter a sequência amanhã.'}` : 'Treinou hoje? Registre e apareça no ranking.'}</p>
        <button onClick={() => setCheckinAberto(true)}>{fezHoje ? 'Novo check-in' : 'Fazer check-in'}</button>
      </div>

      <div className="tabs" role="tablist">
        {abas.map(([k, l]) => <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>{l}</button>)}
      </div>

      {aba === 'comunidade' && <Comunidade comunidade={comunidade} meuAlunoId={aluno.id} minhasDatas={diasCheckin} />}

      {aba === 'consultoria' && <Consultoria aluno={aluno} />}

      {aba === 'dieta' && <DietaAluno alunoId={aluno.id} />}
      {aba === 'spinning' && <AulasSpinning embutido />}
      {aba === 'conta' && (
        <div className="stack">
          <Mensalidade aluno={aluno} />
          <Anamnese alunoId={aluno.id} onSalva={() => setTemAnamnese(true)} intro={<p className="meta" style={{ margin: 0 }}>Responda com sinceridade: isso ajuda seu personal a montar um treino seguro.</p>} />
        </div>
      )}

      {!['comunidade', 'conta', 'consultoria', 'dieta'].includes(aba) && !treinos && <p className="carregando">Carregando…</p>}

      {aba === 'treino' && treinos && (
        <div className="phone">
          {!ficha ? <p className="empty">Seu personal ainda está montando sua ficha.</p> : (
            <>
              <div className="row" style={{ gap: 6, marginBottom: 14 }}>
                {treinos.map((t) => <button key={t.id} className={`small${t.id === ficha.id ? ' primary' : ''}`} onClick={() => setFichaId(t.id)}>{t.nome}</button>)}
              </div>
              <div className="meta" style={{ marginBottom: 6 }}>{ficha.foco} · {qtdFeitos} de {ficha.exercicios.length} feitos</div>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              {erro && <p className="erro" style={{ marginTop: 10 }}>{erro}</p>}
              <div>
                {ficha.exercicios.map((e) => {
                  const hojeReg = deHoje(e.id)
                  const anterior = ultimaSessao(registros, e.id, hoje)
                  return (
                    <div key={e.id}>
                      <div className={`check${hojeReg ? ' done' : ''}`}>
                        <input type="checkbox" id={`ex-${e.id}`} aria-label={`Concluir ${e.nome}`} checked={!!hojeReg} onChange={(ev) => marcar(e.id, ev.target.checked)} />
                        <div style={{ minWidth: 0 }}>
                          <label htmlFor={`ex-${e.id}`} className="name" style={{ display: 'block', textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'inherit' }}>{e.nome}</label>
                          <div className="meta">{e.series} × {e.reps} · descanso {e.descanso}{e.obs ? ` · ${e.obs}` : ''}</div>
                          <div className="row" style={{ gap: 12, marginTop: 2 }}>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
                              {hojeReg?.series?.length ? `Cargas: ${hojeReg.series.map((s) => f1(s.carga)).join(' / ')} kg` : 'Anotar cargas'}
                            </button>
                            <a href={e.video_url || buscaVideo(e.nome)} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>{e.video_url ? 'Ver execução' : 'Como fazer'}</a>
                          </div>
                          {anterior && <div className="meta" style={{ fontSize: 12 }}>Última vez: {anterior.series.map((s) => `${f1(s.carga)}×${s.reps}`).join(', ')}</div>}
                        </div>
                        <div className="meta mono">{e.carga}</div>
                      </div>
                      {aberto === e.id && <Series exercicio={e} inicial={hojeReg?.series || anterior?.series} onSalvar={(s) => salvarSeries(e.id, s)} onFechar={() => setAberto(null)} />}
                    </div>
                  )
                })}
              </div>
              {pct === 100 && (
                <div className="row between" style={{ marginTop: 16 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)' }}>Treino concluído. Bom trabalho!</p>
                  {!fezHoje && <button className="primary small" onClick={() => setCheckinAberto(true)}>Fazer check-in</button>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {aba === 'evolucao' && treinos && (
        <div className="stack">
          {ultima ? <Composicao avaliacao={ultima} sexo={aluno.sexo} titulo="Última avaliação" /> : <div className="panel empty">Seu personal ainda não registrou nenhuma avaliação.</div>}
          {avaliacoes.length > 0 && <div className="panel"><h2 style={{ marginBottom: 10 }}>Peso e gordura</h2><Grafico avaliacoes={avaliacoes} /></div>}
          <div className="panel"><h2 style={{ marginBottom: 10 }}>Evolução das cargas</h2><Progressao treinos={treinos} registros={registros} /></div>
          <Medalhas datas={diasCheckin} desafios={comunidade.dados?.desafios || []} />
          <FotosEvolucao alunoId={aluno.id} />
        </div>
      )}

      {checkinAberto && (
        <FormCheckin
          aluno={aluno}
          treinos={treinos || []}
          treinoInicial={ficha?.id}
          onFechar={() => setCheckinAberto(false)}
          onFeito={() => { setCheckinAberto(false); carregar(); comunidade.carregar(); if (aluno.comunidade) setAba('comunidade') }}
        />
      )}
    </div>
  )
}

// Carga e repetições de cada série, pré-preenchidas com o treino anterior.
function Series({ exercicio, inicial, onSalvar, onFechar }) {
  const n = Math.max(1, Number(exercicio.series) || 1)
  const [linhas, setLinhas] = useState(() => Array.from({ length: n }, (_, i) => ({
    carga: inicial?.[i]?.carga ?? inicial?.at(-1)?.carga ?? '',
    reps: inicial?.[i]?.reps ?? String(exercicio.reps || '').match(/\d+/)?.[0] ?? '',
  })))
  const muda = (i, k, v) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  function salvar() {
    onSalvar(linhas.filter((l) => l.carga !== '' || l.reps !== '').map((l) => ({ carga: num(l.carga), reps: num(l.reps) })))
  }
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, margin: '0 0 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr', gap: 8, alignItems: 'center' }}>
        <span className="meta">Série</span><span className="meta">Carga (kg)</span><span className="meta">Reps</span>
        {linhas.map((l, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span className="mono">{i + 1}</span>
            <input id={`serie-${exercicio.id}-${i}-carga`} inputMode="decimal" aria-label={`Carga da série ${i + 1}`} value={l.carga ?? ''} onChange={(e) => muda(i, 'carga', e.target.value)} />
            <input id={`serie-${exercicio.id}-${i}-reps`} inputMode="numeric" aria-label={`Repetições da série ${i + 1}`} value={l.reps ?? ''} onChange={(e) => muda(i, 'reps', e.target.value)} />
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="small" onClick={onFechar}>Cancelar</button>
        <button className="primary small" onClick={salvar}>Salvar e concluir</button>
      </div>
    </div>
  )
}

function Cabecalho({ aluno }) {
  return (
    <div className="row between">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
        <SimboloCA size={44} />
        <div><p className="meta" style={{ margin: 0 }}>Corpo Atlético · Área do aluno</p><h1>Olá, {primeiroNome(aluno.nome)}</h1></div>
      </div>
      <button className="small" onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  )
}

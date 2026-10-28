import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import Grafico from '../../components/Grafico.jsx'
import Composicao from '../../components/Composicao.jsx'
import Comunidade from '../../components/Comunidade.jsx'
import FormCheckin from '../../components/FormCheckin.jsx'
import { useComunidade } from '../../hooks/useComunidade.js'
import { inicioDoMes, sequencia, somarDias } from '../../lib/comunidade.js'
import { hojeISO, porData, porOrdem, primeiroNome } from '../../lib/formato.js'

export default function AreaAluno({ aluno }) {
  const [aba, setAba] = useState('treino')
  const [treinos, setTreinos] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [feitos, setFeitos] = useState(new Set())
  const [diasCheckin, setDiasCheckin] = useState([])
  const [fichaId, setFichaId] = useState(null)
  const [checkinAberto, setCheckinAberto] = useState(false)
  const [erro, setErro] = useState('')
  const comunidade = useComunidade()
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    const [t, a, r, c] = await Promise.all([
      supabase.from('treinos').select('*, exercicios(*)').eq('aluno_id', aluno.id),
      supabase.from('avaliacoes').select('*').eq('aluno_id', aluno.id),
      supabase.from('registros').select('exercicio_id').eq('aluno_id', aluno.id).eq('data', hoje),
      supabase.from('checkins').select('data').eq('aluno_id', aluno.id).gte('data', somarDias(hoje, -400)),
    ])
    const lista = (t.data || []).sort(porOrdem)
    lista.forEach((x) => x.exercicios.sort(porOrdem))
    setTreinos(lista)
    setAvaliacoes((a.data || []).sort(porData))
    setFeitos(new Set((r.data || []).map((x) => x.exercicio_id)))
    setDiasCheckin((c.data || []).map((x) => x.data))
  }, [aluno.id, hoje])

  useEffect(() => { carregar() }, [carregar])

  async function marcar(exercicioId, feito) {
    const novo = new Set(feitos)
    feito ? novo.add(exercicioId) : novo.delete(exercicioId)
    setFeitos(novo)
    const { error } = feito
      ? await supabase.from('registros').insert({ aluno_id: aluno.id, exercicio_id: exercicioId, data: hoje })
      : await supabase.from('registros').delete().eq('exercicio_id', exercicioId).eq('data', hoje)
    if (error && error.code !== '23505') { setErro('Não foi possível salvar. Verifique a internet e tente de novo.'); carregar() } else setErro('')
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
  const qtdFeitos = ficha ? ficha.exercicios.filter((e) => feitos.has(e.id)).length : 0
  const pct = ficha?.exercicios.length ? Math.round((qtdFeitos / ficha.exercicios.length) * 100) : 0
  const ultima = avaliacoes.at(-1)
  const fezHoje = diasCheckin.includes(hoje)
  const seq = sequencia(diasCheckin, hoje)
  const noMes = new Set(diasCheckin.filter((d) => d >= inicioDoMes(hoje))).size

  return (
    <div className="solo">
      <Cabecalho aluno={aluno} />

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
        <button className="tab" role="tab" aria-selected={aba === 'treino'} onClick={() => setAba('treino')}>Treino</button>
        {aluno.comunidade && <button className="tab" role="tab" aria-selected={aba === 'comunidade'} onClick={() => setAba('comunidade')}>Comunidade</button>}
        <button className="tab" role="tab" aria-selected={aba === 'evolucao'} onClick={() => setAba('evolucao')}>Evolução</button>
      </div>

      {aba === 'comunidade' ? <Comunidade comunidade={comunidade} meuAlunoId={aluno.id} /> : !treinos ? <p className="carregando">Carregando…</p> : aba === 'treino' ? (
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
                {ficha.exercicios.map((e) => (
                  <label key={e.id} className={`check${feitos.has(e.id) ? ' done' : ''}`}>
                    <input type="checkbox" id={`ex-${e.id}`} checked={feitos.has(e.id)} onChange={(ev) => marcar(e.id, ev.target.checked)} />
                    <div>
                      <div className="name">{e.nome}</div>
                      <div className="meta">{e.series} × {e.reps} · descanso {e.descanso}{e.obs ? ` · ${e.obs}` : ''}</div>
                    </div>
                    <div className="meta mono">{e.carga}</div>
                  </label>
                ))}
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
      ) : (
        <div className="stack">
          {ultima ? <Composicao avaliacao={ultima} sexo={aluno.sexo} titulo="Última avaliação" /> : <div className="panel empty">Seu personal ainda não registrou nenhuma avaliação.</div>}
          {avaliacoes.length > 0 && <div className="panel"><h2 style={{ marginBottom: 10 }}>Sua evolução</h2><Grafico avaliacoes={avaliacoes} /></div>}
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

function Cabecalho({ aluno }) {
  return (
    <div className="row between">
      <div><p className="meta" style={{ margin: 0 }}>Área do aluno</p><h1>Olá, {primeiroNome(aluno.nome)}</h1></div>
      <button className="small" onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  )
}

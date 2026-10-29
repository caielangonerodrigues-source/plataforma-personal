import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import Modal from './Modal.jsx'
import { fmtData, hojeISO, primeiroNome } from '../lib/formato.js'
import { somarDias } from '../lib/comunidade.js'
import { MODELOS_PRONTOS, fichasDoAluno, resumoModelo } from '../lib/modelos.js'
import { useModelos } from '../pages/personal/Modelos.jsx'

// Periodização: fases com data de início. No dia, as fichas atuais são guardadas
// (o histórico de cargas continua) e as da fase entram no lugar, sozinhas.
export default function Fases({ aluno, recarregar }) {
  const [fases, setFases] = useState(null)
  const [nova, setNova] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('fases').select('*').eq('aluno_id', aluno.id).order('inicio')
    setFases(error ? false : data)
  }, [aluno.id])
  useEffect(() => { carregar() }, [carregar])

  async function comecarAgora(f) {
    if (!confirm(`Começar "${f.nome}" hoje? As fichas atuais saem da área do aluno (o histórico de cargas continua).`)) return
    const { error } = await supabase.from('fases').update({ inicio: hojeISO() }).eq('id', f.id)
    if (!error) await supabase.rpc('aplicar_fases')
    setErro(error ? `Não foi possível: ${error.message}` : '')
    carregar(); recarregar()
  }
  async function apagar(f) {
    if (!confirm(`Apagar a fase "${f.nome}"?`)) return
    await supabase.from('fases').delete().eq('id', f.id)
    carregar()
  }

  if (fases === false) return null // SQL novo ainda não rodou
  const pendentes = (fases || []).filter((f) => !f.aplicada_em)
  const atual = (fases || []).filter((f) => f.aplicada_em).at(-1)

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="row between">
        <div>
          <h2 style={{ margin: 0 }}>Periodização</h2>
          <p className="meta" style={{ margin: '2px 0 0' }}>{atual ? `Fase atual: ${atual.nome} (desde ${fmtData(atual.inicio)})` : 'Programe as próximas fases e o site troca as fichas sozinho na data.'}</p>
        </div>
        <button className="small" onClick={() => setNova(true)}>Programar fase</button>
      </div>
      {erro && <p className="erro">{erro}</p>}
      {pendentes.length > 0 && (
        <div className="list">
          {pendentes.map((f) => (
            <div className="item" key={f.id} style={{ cursor: 'default' }}>
              <div style={{ minWidth: 0 }}>
                <div className="name">{f.nome}</div>
                <div className="meta">Começa em {fmtData(f.inicio)} · {resumoModelo({ fichas: f.fichas })}</div>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <button className="ghost small" onClick={() => comecarAgora(f)}>Começar hoje</button>
                <button className="ghost small" aria-label={`Apagar ${f.nome}`} onClick={() => apagar(f)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {nova && <FormFase aluno={aluno} fases={fases || []} onFechar={() => setNova(false)} onSalvo={() => { setNova(false); carregar() }} />}
    </div>
  )
}

function FormFase({ aluno, fases, onFechar, onSalvo }) {
  const { modelos } = useModelos()
  const ultima = fases.at(-1)
  const [d, setD] = useState({
    nome: `Fase ${Math.max(fases.length, 1) + 1}`,
    inicio: somarDias(ultima && ultima.inicio > hojeISO() ? ultima.inicio : hojeISO(), 28),
    origem: aluno.treinos.length ? 'atuais' : '',
  })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `fase-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  const opcoes = [
    ...(aluno.treinos.length ? [['atuais', 'Cópia das fichas atuais (ajuste depois que começar)', fichasDoAluno(aluno.treinos)]] : []),
    ...(modelos || []).map((m) => [`m:${m.id}`, `Modelo: ${m.nome}`, m.fichas]),
    ...MODELOS_PRONTOS.filter((p) => !(modelos || []).some((m) => m.nome === p.nome)).map((p, i) => [`p:${i}`, `Pronto: ${p.nome}`, p.fichas]),
  ]
  const escolhida = opcoes.find(([k]) => k === d.origem)

  async function salvar() {
    if (!d.nome.trim()) return setErro('Dê um nome para a fase.')
    if (!d.inicio) return setErro('Escolha a data de início.')
    if (!escolhida) return setErro('Escolha as fichas da fase.')
    const { error } = await supabase.from('fases').insert({ aluno_id: aluno.id, nome: d.nome.trim(), inicio: d.inicio, fichas: escolhida[2] })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo="Programar fase" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label>Nome<input maxLength={80} placeholder="Ex.: Fase 2 · Força" {...campo('nome')} /></label>
      <label>Começa em<input type="date" {...campo('inicio')} /></label>
      <label className="full">Fichas da fase
        <select {...campo('origem')}>
          <option value="">Escolha</option>
          {opcoes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      {escolhida && <p className="meta full" style={{ margin: 0 }}>{resumoModelo({ fichas: escolhida[2] })}: {escolhida[2].map((f) => `${f.nome}${f.foco ? ` (${f.foco})` : ''}`).join(', ')}</p>}
      <p className="meta full" style={{ margin: 0 }}>
        No dia {d.inicio ? fmtData(d.inicio) : '—'}, quando você ou {primeiroNome(aluno.nome)} abrirem o site, as fichas atuais são guardadas e as da fase entram no lugar. O histórico de cargas continua.
      </p>
    </Modal>
  )
}

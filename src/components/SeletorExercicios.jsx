import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { GRUPOS, buscaVideo, filtrarExercicios, juntarBiblioteca } from '../lib/exercicios.js'

// Exercícios do personal (tabela exercicios_biblioteca) somados aos prontos.
export function useBiblioteca() {
  const [meus, setMeus] = useState([])
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    supabase.from('exercicios_biblioteca').select('*').order('nome').then(({ data }) => setMeus(data || []))
  }, [versao])
  const lista = useMemo(() => juntarBiblioteca(meus), [meus])
  return { lista, meus, recarregar: () => setVersao((v) => v + 1) }
}

// Busca + filtro por grupo muscular. Com onAlternar, cada linha tem caixa de seleção.
export function ListaExercicios({ lista, selecionados, onAlternar, acoes, grupoInicial = '' }) {
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState(grupoInicial)
  const achados = filtrarExercicios(lista, { busca, grupo })
  return (
    <div className="stack" style={{ gap: 10 }}>
      <input id="busca-exercicio" type="search" placeholder="Buscar exercício, músculo ou equipamento" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar exercício" />
      <div className="chips" role="group" aria-label="Grupo muscular">
        <button type="button" className={`chip${grupo ? '' : ' on'}`} onClick={() => setGrupo('')}>Todos</button>
        {GRUPOS.map((g) => <button type="button" key={g} className={`chip${grupo === g ? ' on' : ''}`} onClick={() => setGrupo(grupo === g ? '' : g)}>{g}</button>)}
      </div>
      <div className="biblioteca">
        {achados.map((e) => {
          const chave = `${e.grupo}|${e.nome}`
          const conteudo = (
            <div style={{ minWidth: 0 }}>
              <div className="name">{e.nome}{e.meu && <span className="pill ativo" style={{ marginLeft: 6 }}>meu</span>}</div>
              <div className="meta">{[e.grupo, e.equipamento].filter(Boolean).join(' · ')}</div>
            </div>
          )
          return onAlternar ? (
            <label key={chave} className={`ex-item${selecionados?.has(chave) ? ' on' : ''}`}>
              <input type="checkbox" checked={!!selecionados?.has(chave)} onChange={() => onAlternar(chave, e)} />
              {conteudo}
            </label>
          ) : (
            <div key={chave} className="ex-item">
              {conteudo}
              <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                <a className="meta" href={e.video_url || buscaVideo(e.nome)} target="_blank" rel="noreferrer">Vídeo</a>
                {acoes?.(e)}
              </div>
            </div>
          )
        })}
        {!achados.length && <p className="empty">Nenhum exercício encontrado.</p>}
      </div>
    </div>
  )
}

// Modal de escolha de vários exercícios de uma vez para uma ficha.
export default function SeletorExercicios({ treino, onFechar, onPersonalizado, onAdicionar }) {
  const { lista } = useBiblioteca()
  const [sel, setSel] = useState(() => new Map())
  const [padrao, setPadrao] = useState({ series: '3', reps: '12', descanso: '60s' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  function alternar(chave, e) {
    const m = new Map(sel)
    if (m.has(chave)) m.delete(chave); else m.set(chave, e)
    setSel(m)
  }
  async function adicionar() {
    if (!sel.size) return setErro('Marque pelo menos um exercício.')
    setSalvando(true)
    const falha = await onAdicionar([...sel.values()].map((e) => ({
      nome: e.nome, series: Number(padrao.series) || 3, reps: padrao.reps, carga: '—', descanso: padrao.descanso, obs: null, video_url: e.video_url || null,
    })))
    setSalvando(false)
    if (falha) setErro(falha)
  }
  const campo = (k) => ({ value: padrao[k], onChange: (e) => setPadrao({ ...padrao, [k]: e.target.value }) })

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal stack" style={{ width: 'min(680px, 100%)' }}>
        <div className="row between">
          <h2>Exercícios para a ficha {treino.nome}</h2>
          <button type="button" className="link" onClick={onPersonalizado}>Exercício fora da lista</button>
        </div>
        <ListaExercicios lista={lista} selecionados={sel} onAlternar={alternar} />
        <div className="form" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <label>Séries<input id="sel-series" type="number" min="1" {...campo('series')} /></label>
          <label>Repetições<input id="sel-reps" {...campo('reps')} /></label>
          <label>Descanso<input id="sel-descanso" {...campo('descanso')} /></label>
        </div>
        <p className="meta" style={{ margin: 0 }}>Depois dá para ajustar carga, séries e observações de cada um em "Editar".</p>
        {erro && <p className="erro">{erro}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar}>Cancelar</button>
          <button type="button" className="primary" disabled={salvando} onClick={adicionar}>
            {salvando ? 'Salvando…' : sel.size ? `Adicionar ${sel.size} ${sel.size === 1 ? 'exercício' : 'exercícios'}` : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

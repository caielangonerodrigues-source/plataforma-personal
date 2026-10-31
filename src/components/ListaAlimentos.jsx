import { useEffect, useMemo, useState } from 'react'
import { ALIMENTOS, CATEGORIAS_ALIMENTOS } from '../lib/nutricao.js'
import { semAcento } from '../lib/exercicios.js'

// Lista grande de alimentos em tela cheia (busca + grupos). Toque no alimento e ele entra com a medida caseira.
// onEscolher(alimento | { nome } digitado), onFechar(). `recentes`: nomes usados por último, mostrados no topo.
export default function ListaAlimentos({ onEscolher, onFechar, titulo = 'Escolher alimento', recentes = [] }) {
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  const termo = semAcento(busca.trim())
  const lista = useMemo(() => ALIMENTOS.filter((a) => (!grupo || a.grupo === grupo) && (!termo || semAcento(a.nome).includes(termo))), [grupo, termo])
  const grupos = (grupo ? [grupo] : CATEGORIAS_ALIMENTOS).map((g) => [g, lista.filter((a) => a.grupo === g)]).filter(([, l]) => l.length)
  const usados = !grupo && !termo ? recentes.map((n) => ALIMENTOS.find((a) => a.nome === n) || { nome: n }) : []

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal lista-alimentos" role="dialog" aria-label={titulo}>
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <h2 style={{ margin: 0 }}>{titulo}</h2>
          <button type="button" className="ghost small" aria-label="Fechar" onClick={onFechar}>✕</button>
        </div>
        <input id="busca-alimento" type="search" placeholder={`Buscar entre ${ALIMENTOS.length} alimentos`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="segmentos chips-alimentos" role="tablist">
          <button type="button" aria-pressed={!grupo} onClick={() => setGrupo('')}>Todos</button>
          {CATEGORIAS_ALIMENTOS.map((g) => <button type="button" key={g} aria-pressed={grupo === g} onClick={() => setGrupo(grupo === g ? '' : g)}>{g}</button>)}
        </div>
        <div className="lista-alimentos-itens">
          {usados.length > 0 && (
            <div>
              <div className="secao">Recentes</div>
              {usados.map((a) => (
                <button type="button" key={a.nome} className="item-alimento" onClick={() => onEscolher(a)}>
                  <span className="name">{a.nome}</span>
                  <span className="meta">{a.kcal != null ? `${a.medida} (${a.gramas} g) · ${Math.round((a.kcal * a.gramas) / 100)} kcal` : 'Fora da lista'}</span>
                </button>
              ))}
            </div>
          )}
          {grupos.map(([g, itens]) => (
            <div key={g}>
              <div className="secao">{g}</div>
              {itens.map((a) => (
                <button type="button" key={a.nome} className="item-alimento" onClick={() => onEscolher(a)}>
                  <span className="name">{a.nome}</span>
                  <span className="meta">{a.medida} ({a.gramas} g) · {Math.round((a.kcal * a.gramas) / 100)} kcal · P {Math.round((a.proteina * a.gramas) / 10) / 10} g</span>
                </button>
              ))}
            </div>
          ))}
          {!grupos.length && <p className="meta">Nenhum alimento com esse nome na lista.</p>}
          {busca.trim() && (
            <button type="button" className="item-alimento outro" onClick={() => onEscolher({ nome: busca.trim() })}>
              <span className="name">Usar “{busca.trim()}”</span>
              <span className="meta">Fora da lista: você coloca as calorias à mão.</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

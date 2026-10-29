import { useEffect, useState } from 'react'

// Ícones da barra (traço, 24×24).
const ICONES = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  treino: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  aulas: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  comunidade: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c2 .6 3 2.3 3 5',
  novidades: 'M4 10v4h3l6 4V6l-6 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
  mais: 'M5 12h.01M12 12h.01M19 12h.01',
  painel: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  alunos: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  agenda: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4M8 14h3',
  academia: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  dieta: 'M12 7c-1-3-4-4-6-2-3 3-1 11 3 13 1 .5 2 .5 3 0 1 .5 2 .5 3 0 4-2 6-10 3-13-2-2-5-1-6 2zM12 7c0-2 1-3 3-4',
  evolucao: 'M4 20V4M4 20h16M7 15l4-4 3 3 5-6',
  spinning: 'M6 18a3 3 0 1 0 0-.01M18 18a3 3 0 1 0 0-.01M6 18l4-8h5l3 8M10 10l-1-3H7M15 10l1-4h2',
  conta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0',
  consultoria: 'M4 5h16v11H9l-5 4z',
  modelos: 'M8 8h12v12H8zM4 16V4h12',
  exercicios: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  assistente: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
  vendas: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  financeiro: 'M12 3v18M16 7c0-1.5-1.8-2.5-4-2.5S8 5.5 8 7.5s1.8 2.7 4 3.2 4 1.3 4 3.3-1.8 3.5-4 3.5-4-1-4-2.5',
  configuracoes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
}

export function Icone({ nome, tamanho = 22 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={nome === 'mais' ? 3.2 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONES[nome] || ICONES.mais} />
    </svg>
  )
}

// Barra de app fixa embaixo (só no celular). `itens`: [{ chave, rotulo, icone, ativo, badge, onClick }].
// `mais`: itens que vão para a gaveta "Mais".
export default function BarraApp({ itens, mais = [] }) {
  const [aberta, setAberta] = useState(false)
  useEffect(() => {
    if (!aberta) return
    const esc = (e) => e.key === 'Escape' && setAberta(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta])
  const maisAtivo = mais.some((m) => m.ativo)
  const badgeMais = mais.reduce((t, m) => t + (m.badge || 0), 0)

  return (
    <>
      {aberta && (
        <div className="gaveta-fundo" onClick={() => setAberta(false)}>
          <div className="gaveta" role="dialog" aria-label="Mais opções" onClick={(e) => e.stopPropagation()}>
            <div className="gaveta-alca" aria-hidden="true" />
            {mais.map((m) => (
              <button key={m.chave} className={`gaveta-item${m.ativo ? ' ativo' : ''}${m.perigo ? ' perigo' : ''}`} onClick={() => { setAberta(false); m.onClick() }}>
                <span>{m.icone && <Icone nome={m.icone} />}{m.rotulo}</span>
                {m.badge > 0 && <span className="tab-badge">{m.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="barra-app" aria-label="Navegação">
        {itens.map((i) => (
          <button key={i.chave} className={i.ativo ? 'ativo' : ''} aria-current={i.ativo ? 'page' : undefined} onClick={i.onClick}>
            <span className="barra-icone"><Icone nome={i.icone} />{i.badge > 0 && <i className="barra-badge">{i.badge}</i>}</span>
            <span>{i.rotulo}</span>
          </button>
        ))}
        {mais.length > 0 && (
          <button className={maisAtivo ? 'ativo' : ''} aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
            <span className="barra-icone"><Icone nome="mais" />{badgeMais > 0 && <i className="barra-badge">{badgeMais}</i>}</span>
            <span>Mais</span>
          </button>
        )}
      </nav>
    </>
  )
}

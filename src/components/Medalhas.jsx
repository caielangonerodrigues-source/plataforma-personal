import { medalhas, proximaMedalha } from '../lib/medalhas.js'

function Icone({ ganhou, emoji }) {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
      <path d="M8 0h7l3 9h-7zM26 0h-7l-3 9h7z" fill={ganhou ? 'var(--chart2)' : 'var(--line)'} />
      <circle cx="17" cy="25" r="13" fill={ganhou ? 'var(--accent)' : 'var(--line)'} />
      <text x="17" y="30" textAnchor="middle" fontSize="14" style={{ filter: ganhou ? 'none' : 'grayscale(1)' }}>{emoji}</text>
    </svg>
  )
}

// `datas`: dias com check-in; `registros` e `avaliacoes` liberam as medalhas de força e de avaliação.
export default function Medalhas({ datas, registros = [], avaliacoes = 0, desafios }) {
  const lista = medalhas({ datas, registros, avaliacoes }, desafios)
  const ganhas = lista.filter((m) => m.ganhou).length
  const proxima = proximaMedalha(lista)
  const grupos = [...new Set(lista.map((m) => m.grupo))]
  return (
    <div className="panel">
      <div className="row between"><h2>Medalhas</h2><span className="meta">{ganhas} de {lista.length}</span></div>
      {proxima && (
        <div className="medalha-proxima">
          <span aria-hidden="true" style={{ fontSize: 22 }}>{proxima.icone}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>Próxima: {proxima.titulo}</div>
            <div className="meta">{proxima.descricao} · faltam {proxima.meta - proxima.valor}</div>
            <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.round((proxima.valor / proxima.meta) * 100)}%` }} /></div>
          </div>
        </div>
      )}
      {grupos.map((g) => (
        <div key={g} style={{ marginTop: 14 }}>
          <div className="meta" style={{ fontWeight: 600, marginBottom: 6 }}>{g}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12 }}>
            {lista.filter((m) => m.grupo === g).map((m) => (
              <div key={m.id} title={m.descricao} style={{ textAlign: 'center', opacity: m.ganhou ? 1 : 0.6 }}>
                <Icone ganhou={m.ganhou} emoji={m.icone} />
                <div className="meta" style={{ color: m.ganhou ? 'var(--ink)' : undefined, fontWeight: m.ganhou ? 600 : 400, lineHeight: 1.3 }}>{m.titulo}</div>
                {!m.ganhou && <div className="meta" style={{ fontSize: 11 }}>{m.valor}/{m.meta}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

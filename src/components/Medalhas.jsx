import { medalhas } from '../lib/medalhas.js'

function Icone({ ganhou }) {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
      <path d="M8 0h7l3 9h-7zM26 0h-7l-3 9h7z" fill={ganhou ? 'var(--chart2)' : 'var(--line)'} />
      <circle cx="17" cy="25" r="13" fill={ganhou ? 'var(--accent)' : 'var(--line)'} />
      <path d="M17 17l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill={ganhou ? 'var(--accent-ink)' : 'var(--surface)'} />
    </svg>
  )
}

export default function Medalhas({ datas, desafios }) {
  const lista = medalhas(datas, desafios)
  const ganhas = lista.filter((m) => m.ganhou).length
  return (
    <div className="panel">
      <div className="row between"><h2>Medalhas</h2><span className="meta">{ganhas} de {lista.length}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12, marginTop: 12 }}>
        {lista.map((m) => (
          <div key={m.id} style={{ textAlign: 'center', opacity: m.ganhou ? 1 : 0.55 }}>
            <Icone ganhou={m.ganhou} />
            <div className="meta" style={{ color: m.ganhou ? 'var(--ink)' : undefined, fontWeight: m.ganhou ? 600 : 400, lineHeight: 1.3 }}>{m.titulo}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

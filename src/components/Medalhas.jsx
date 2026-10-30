import { useEffect, useRef, useState } from 'react'
import { medalhas, proximaMedalha } from '../lib/medalhas.js'
import { ICONES, ICONE_MEDALHA } from './IconeLinha.jsx'

// Unidade que vai embaixo do número da medalha.
const UNIDADE = { Treinos: 'treinos', 'Dias seguidos': 'dias', 'Semanas firmes': 'semanas', 'Mês forte': 'no mês', 'Fim de semana': 'fins de sem.', Força: 'recordes', Avaliação: 'avaliações', Desafios: 'dias' }

// Moeda da medalha: laranja cheia quando ganha, contorno laranja na próxima, cinza nas bloqueadas.
export function Moeda({ m, tamanho = 120, estado }) {
  const e = estado || (m.ganhou ? 'ganhou' : 'bloqueada')
  const cheia = e === 'ganhou'
  const cor = e === 'bloqueada' ? 'var(--muted)' : cheia ? '#fff' : 'var(--accent)'
  const id = `g-${m.id}`
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" className={`moeda ${e}`} role="img" aria-label={`${m.titulo}${cheia ? ' (conquistada)' : ''}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" /><stop offset=".55" stopColor="#fc4c02" /><stop offset="1" stopColor="#b83800" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={cheia ? `url(#${id})` : 'var(--surface)'} stroke={cheia ? 'none' : e === 'bloqueada' ? 'var(--line)' : 'var(--accent)'} strokeWidth="3" />
      <circle cx="60" cy="60" r="47" fill="none" stroke={cheia ? 'rgb(255 255 255 / .45)' : e === 'bloqueada' ? 'var(--line)' : 'var(--accent)'} strokeWidth="1.5" strokeDasharray={e === 'proxima' ? '3 4' : undefined} />
      <svg x="44" y="20" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONE_MEDALHA[m.grupo] || ICONES.medalha} /></svg>
      <line x1="34" x2="86" y1="58" y2="58" stroke={cor} strokeWidth="1.2" opacity=".6" />
      <text x="60" y="84" textAnchor="middle" fontSize={String(m.meta).length > 2 ? 24 : 28} fontWeight="800" fill={cor} fontFamily="var(--display)">{m.meta}</text>
      <text x="60" y="98" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing=".08em" fill={cor} fontFamily="inherit">{(UNIDADE[m.grupo] || '').toUpperCase()}</text>
    </svg>
  )
}

// "Minhas conquistas": um grupo por vez, a próxima medalha no centro do carrossel e o progresso dela embaixo.
// `datas`: dias com check-in; `registros` e `avaliacoes` liberam as medalhas de força e de avaliação.
export default function Medalhas({ datas, registros = [], avaliacoes = 0, desafios }) {
  const lista = medalhas({ datas, registros, avaliacoes }, desafios)
  const ganhas = lista.filter((m) => m.ganhou).length
  const proximaGeral = proximaMedalha(lista)
  const grupos = [...new Set(lista.map((m) => m.grupo))]
  const [grupo, setGrupo] = useState(proximaGeral?.grupo || grupos[0])
  const doGrupo = lista.filter((m) => m.grupo === grupo)
  const alvo = doGrupo.find((m) => !m.ganhou) || doGrupo.at(-1)
  const [sel, setSel] = useState(null)
  const m = doGrupo.find((x) => x.id === sel) || alvo
  const trilho = useRef(null)
  const pilulas = useRef(null)

  // Centraliza a medalha escolhida (ou a próxima) no carrossel.
  useEffect(() => {
    const el = trilho.current?.querySelector(`[data-id="${m.id}"]`)
    if (el) trilho.current.scrollTo({ left: el.offsetLeft - (trilho.current.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
    const p = pilulas.current?.querySelector('.on')
    if (p) pilulas.current.scrollTo({ left: p.offsetLeft - 16, behavior: 'smooth' })
  }, [m.id, grupo])

  const falta = m.meta - m.valor
  return (
    <div className="panel conquistas">
      <div className="row between"><h2>Minhas conquistas</h2><span className="meta">{ganhas} de {lista.length}</span></div>
      <div className="conquistas-grupos" role="tablist" ref={pilulas}>
        {grupos.map((g) => (
          <button key={g} role="tab" aria-selected={g === grupo} className={g === grupo ? 'on' : ''} onClick={() => { setGrupo(g); setSel(null) }}>{g}</button>
        ))}
      </div>
      <p className="conquistas-frase">
        {m.ganhou ? <>Você conquistou <strong>{m.titulo}</strong>.</> : <>Falta{falta > 1 ? 'm' : ''} <strong>{falta}</strong> para conquistar <strong>{m.titulo}</strong>.</>}
      </p>
      <div className="conquistas-trilho" ref={trilho}>
        {doGrupo.map((x) => (
          <button key={x.id} data-id={x.id} className={`conquista-item${x.id === m.id ? ' foco' : ''}${x.ganhou ? ' ganha' : ''}`} onClick={() => setSel(x.id)} title={x.descricao}>
            <Moeda m={x} estado={x.ganhou ? 'ganhou' : x.id === alvo.id ? 'proxima' : 'bloqueada'} tamanho={x.id === m.id ? 150 : 96} />
          </button>
        ))}
      </div>
      <div className="conquista-detalhe">
        <div className="conquista-titulo">{m.titulo}</div>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <span>{m.ganhou ? 'Conquistada' : m.descricao !== m.titulo ? m.descricao : 'Seu progresso'}</span>
          <span className="conquista-num"><strong>{m.valor}</strong> / {m.meta}</span>
        </div>
        <div className="bar grossa"><i style={{ width: `${Math.round((m.valor / m.meta) * 100)}%` }} /></div>
      </div>
    </div>
  )
}

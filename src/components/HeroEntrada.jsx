import { useEffect, useState } from 'react'
import Boneco from './Boneco.jsx'

// Ilustrações da tela de entrada (trocam sozinhas, como no Strava). Desenho chapado nas cores da marca.
const B = '#fff'
const ESCURO = '#161618'
const LARANJA = '#fc4c02'

function Musculacao() {
  return (
    <svg viewBox="0 0 400 300" aria-hidden="true">
      <circle cx="200" cy="160" r="120" fill="rgb(255 255 255 / .12)" />
      <g transform="translate(134 38)"><Boneco cor={B} altura={240} /></g>
    </svg>
  )
}

function Spinning() {
  return (
    <svg viewBox="0 0 400 300" aria-hidden="true">
      <circle cx="200" cy="160" r="120" fill="rgb(255 255 255 / .12)" />
      <g fill="none" stroke={ESCURO} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="290" cy="225" r="42" strokeWidth="12" />
        <path d="M150 268 H310" strokeWidth="12" />
        <path d="M170 268 L205 160 L268 160 L290 225" strokeWidth="11" />
        <path d="M205 160 L222 232 L290 225" strokeWidth="9" />
        <path d="M268 160 L276 126 L300 122" strokeWidth="9" />
        <path d="M190 148 H222" strokeWidth="9" />
      </g>
      <g fill="none" stroke={B} strokeLinecap="round" strokeLinejoin="round">
        <path d="M208 140 L262 100" strokeWidth="20" />
        <path d="M262 104 L298 124" strokeWidth="10" />
        <path d="M208 142 L250 172 L222 230" strokeWidth="15" />
        <path d="M206 144 L230 196 L214 236" strokeWidth="13" opacity=".75" />
      </g>
      <circle cx="279" cy="76" r="17" fill={B} />
      <path d="M70 120 H130 M55 150 H120 M75 180 H125" stroke={B} strokeWidth="7" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}

function Corrida() {
  return (
    <svg viewBox="0 0 400 300" aria-hidden="true">
      <circle cx="200" cy="160" r="120" fill="rgb(255 255 255 / .12)" />
      <g fill="none" stroke={B} strokeLinecap="round" strokeLinejoin="round">
        <path d="M225 108 L190 180" strokeWidth="30" />
        <path d="M222 112 L262 140 L292 122" strokeWidth="16" />
        <path d="M218 112 L172 124 L148 160" strokeWidth="16" />
        <path d="M190 180 L236 214 L224 268" strokeWidth="18" />
        <path d="M190 180 L156 222 L110 216" strokeWidth="18" />
      </g>
      <circle cx="240" cy="70" r="24" fill={B} />
      <path d="M60 120 H118 M44 160 H104 M70 200 H112" stroke={ESCURO} strokeWidth="9" strokeLinecap="round" />
    </svg>
  )
}

function ComunidadeIlustracao() {
  return (
    <svg viewBox="0 0 400 300" aria-hidden="true">
      <circle cx="200" cy="160" r="120" fill="rgb(255 255 255 / .12)" />
      <g transform="translate(200 150)">
        <path d="M-30 -110 L-8 -40 H8 L30 -110 Z" fill={ESCURO} />
        <circle r="62" fill={B} />
        <circle r="46" fill={LARANJA} />
        <path d="M0 -26 L8 -8 L28 -6 L13 7 L17 27 L0 17 L-17 27 L-13 7 L-28 -6 L-8 -8 Z" fill={B} />
      </g>
      <g transform="translate(40 200)"><rect width="120" height="44" rx="22" fill={ESCURO} /><text x="60" y="29" textAnchor="middle" fill={B} fontSize="18" fontWeight="700" fontFamily="Figtree, sans-serif">🔥 12 dias</text></g>
      <g transform="translate(250 54)"><rect width="118" height="44" rx="22" fill={B} /><text x="59" y="29" textAnchor="middle" fill={LARANJA} fontSize="18" fontWeight="700" fontFamily="Figtree, sans-serif">❤ 8 curtidas</text></g>
    </svg>
  )
}

export const SLIDES = [
  { titulo: 'Seu treino no bolso', texto: 'Ficha, cargas e cronômetro de descanso direto no celular.', Desenho: Musculacao, fundo: LARANJA },
  { titulo: 'Reserve sua bike', texto: 'Aulas de spinning com a bike escolhida, sem fila.', Desenho: Spinning, fundo: ESCURO },
  { titulo: 'Bora treinar', texto: 'Check-in com foto, sequência de dias e ranking do mês.', Desenho: Corrida, fundo: LARANJA },
  { titulo: 'A turma motiva', texto: 'Desafios, medalhas, curtidas e comentários da comunidade.', Desenho: ComunidadeIlustracao, fundo: ESCURO },
]

export default function HeroEntrada({ intervalo = 5000 }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), intervalo)
    return () => clearInterval(t)
  }, [intervalo])

  return (
    <div className="hero-entrada" style={{ background: SLIDES[i].fundo }}>
      {SLIDES.map(({ titulo, texto, Desenho }, k) => (
        <div key={titulo} className={`hero-slide${k === i ? ' ativo' : ''}`} aria-hidden={k !== i}>
          <div className="hero-desenho"><Desenho /></div>
          <div className="hero-texto">
            <strong>{titulo}</strong>
            <span>{texto}</span>
          </div>
        </div>
      ))}
      <div className="hero-pontos" role="tablist" aria-label="Imagens">
        {SLIDES.map((s, k) => <button key={s.titulo} role="tab" aria-selected={k === i} aria-label={s.titulo} onClick={() => setI(k)} />)}
      </div>
    </div>
  )
}

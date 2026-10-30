// Ícone de traço fino (24×24) no estilo do site do Strava, usado no lugar dos emojis.
export default function IconeLinha({ d, tamanho = 44, traco = 1.4 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d={d} /></svg>
  )
}

export const ICONES = {
  bike: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8 7.5 5H5M12 14.5 15 8M14 5h2.5',
  celular: 'M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5zM10.5 18.5h3M9 9l2 2 4-4',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  marcar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  prato: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  aviso: 'M4 10v4h3l6 4V6l-6 4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  trofeu: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4',
  medalha: 'M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 11.5 6 3h4l2 5 2-5h4l-3 8.5',
  presente: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.5S10 7 12 7zM12 7c1.5-3 5-3.5 5-1.5S14 7 12 7z',
  sino: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  rosto: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 0 0 7 0',
  prancheta: 'M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M9 12h6M9 16h4',
  instalar: 'M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5zM12 7v7M9 11l3 3 3-3M10.5 18.5h3',
  camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  haltere: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  regua: 'M3 15.5 15.5 3 21 8.5 8.5 21zM7 11.5l2 2M10 8.5l2 2M13 5.5l2 2',
  correr: 'M14 5a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 14 5zM6 21l3.5-5 3 2.5V22M9.5 16l1.5-6.5 3.5 3 3.5.5M11 9.5 7.5 10 6 13',
  alvo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  raio: 'M13 2.5 5 13.5h6l-1 8 8-11h-6z',
  onda: 'M3 15c1.5 0 1.5-1.5 3-1.5s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5M3 19c1.5 0 1.5-1.5 3-1.5s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5M8 10l4-4 3 3M15 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  montanha: 'M2.5 20 9 9l4 6 2.5-3.5L21.5 20zM7 12.5l2 1.5 2-1.5',
  coracao: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  brilho: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  relogio: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M5 4 2.5 6.5M19 4l2.5 2.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  pino: 'M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21zM12 12.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  chama: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3-5.6 3.5-9.3 2 1.3 3 3 3 5 .8-.6 1.5-1.8 1.5-3 2.6 1.9 5 4.6 5 7.6 0 3.4-2.6 5.9-6.5 5.9z',
}

// Ícone de cada grupo de medalhas (desenhado dentro do selo laranja).
export const ICONE_MEDALHA = { Treinos: ICONES.marcar, 'Dias seguidos': ICONES.chama, 'Semanas firmes': ICONES.calendario, 'Mês forte': ICONES.marcar, 'Fim de semana': ICONES.sol, Força: ICONES.haltere, Avaliação: ICONES.regua, Desafios: ICONES.trofeu, Toneladas: ICONES.montanha, Variedade: ICONES.alvo, 'Meses ativos': ICONES.calendario, 'Tempo de casa': ICONES.coracao, 'Volta por cima': ICONES.raio }

// Ícone de cada tipo de aviso da academia (a cor vem do CSS: .tipo-novidade, .tipo-lembrete, .tipo-informacao).
export const ICONE_AVISO = { novidade: ICONES.brilho, lembrete: ICONES.relogio, informacao: ICONES.info }

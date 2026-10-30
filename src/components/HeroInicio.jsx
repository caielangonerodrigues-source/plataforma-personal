import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { primeiroNome } from '../lib/formato.js'

const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`
// Foto escolhida para o topo do Início: turma treinando junto, que em preto e branco fica no clima da referência.
export const FOTO_TOPO = unsplash('1571902943202-507ec2618e8f')
const RESERVA = [unsplash('1534438327276-14e5300c3a48'), unsplash('1534787238916-9ba6764efd4f'), unsplash('1517836357463-d25dfeac3438')]

// Fotos que o personal subiu para a tela de entrada (bucket público "entrada"); sem elas, fotos de academia de reserva.
export function useFotosAcademia() {
  const [fotos, setFotos] = useState(RESERVA)
  useEffect(() => {
    supabase?.from('fotos_entrada').select('caminho').order('ordem').order('created_at').limit(8).then(({ data, error }) => {
      if (!error && data?.length) setFotos(data.map((f) => supabase.storage.from('entrada').getPublicUrl(f.caminho).data.publicUrl))
    })
  }, [])
  return fotos
}

// Uma foto por dia, para o topo não ficar sempre igual.
export const fotoDoDia = (fotos, hoje, desloca = 0) => fotos[(Number(hoje.replaceAll('-', '')) + desloca) % fotos.length]

// Topo do Início: foto em preto e branco com a pergunta do dia por cima.
export default function HeroInicio({ nome, foto, fezHoje }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <div className="hero-inicio">
      {!falhou && <img src={foto} alt="" onError={() => setFalhou(true)} />}
      <h1>{fezHoje ? `Mandou bem hoje, ${primeiroNome(nome)}!` : `Pronto pra treinar, ${primeiroNome(nome)}?`}</h1>
    </div>
  )
}

// Cartão com foto da academia, no estilo de banner, para divulgar spinning, aula experimental ou consultoria.
export function BannerAcademia({ foto, online }) {
  const [titulo, linha2, acao, href] = online
    ? ['Treine de onde estiver,', 'com seu personal no app.', 'Ver planos', '/consultoria']
    : ['Musculação e spinning,', 'num só lugar.', 'Reservar uma bike', '/spinning']
  return (
    <a className="banner-academia" href={href}>
      <img src={foto} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div>
        <span className="banner-marca">CORPO ATLÉTICO<i>.</i></span>
        <strong>{titulo}<em>{linha2}</em></strong>
        <span className="banner-acao">{acao} ›</span>
      </div>
    </a>
  )
}

// Título de seção: ícone de traço + título à esquerda, ação sublinhada à direita.
export function TituloSecao({ icone, titulo, acao, onClick, children }) {
  return (
    <div className="titulo-secao">
      <h2>{icone}{titulo}</h2>
      {acao && <button type="button" className="link-sublinhado" onClick={onClick}>{acao}</button>}
      {children}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { primeiroNome } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import Logo from '../components/Logo.jsx'
import AulaExperimental from '../components/AulaExperimental.jsx'

// Aula experimental na academia (pública): quem ainda não treina na Corpo Atlético escolhe um horário livre do personal.
export default function Experimental() {
  const [p, setP] = useState(undefined)
  const [vagas, setVagas] = useState([])
  const [indicacao] = useState(() => new URLSearchParams(window.location.search).get('indicacao')?.slice(0, 12) || '')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('pagina_vendas')
      const pessoal = data?.[0] || null
      if (pessoal) {
        const { data: hs } = await supabase.rpc('horarios_experimental', { p_personal: pessoal.personal_id })
        setVagas(hs || [])
      }
      setP(pessoal)
    })()
  }, [])

  const zap = p && linkWhatsApp(p.telefone, `Oi, ${primeiroNome(p.nome)}! Queria marcar uma aula experimental na Corpo Atlético.`)
  return (
    <div className="solo" style={{ paddingBlock: 24 }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}><Logo sub="Aula experimental" /></Link>
      <h1>Venha conhecer a academia</h1>
      <p className="sub">Escolha um horário, treine com a gente e veja se a Corpo Atlético é para você.</p>
      {p === undefined ? <p className="carregando">Carregando…</p>
        : vagas.length > 0 ? <AulaExperimental personalId={p.personal_id} vagas={vagas} indicacao={indicacao} zap={zap} />
        : (
          <div className="panel empty" style={{ marginTop: 20 }}>
            Nenhum horário livre nos próximos dias.{zap && <> <a href={zap} target="_blank" rel="noreferrer">Fale no WhatsApp</a> que a gente combina.</>}
          </div>
        )}
      <p className="meta" style={{ marginTop: 24 }}>Já é aluno? <Link to="/">Entrar na área do aluno</Link></p>
    </div>
  )
}

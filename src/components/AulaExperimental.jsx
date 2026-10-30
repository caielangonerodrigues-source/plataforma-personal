import { useState } from 'react'
import { supabase } from '../supabase.js'
import { DIAS_SEMANA, diaDaSemana } from '../lib/agenda.js'

// Aula experimental: escolhe o dia e a hora entre os horários livres do personal e deixa nome e WhatsApp.
export default function AulaExperimental({ personalId, vagas, indicacao, zap }) {
  const dias = [...new Set(vagas.map((v) => v.data))]
  const [dia, setDia] = useState(dias[0])
  const [hora, setHora] = useState('')
  const [d, setD] = useState({ nome: '', telefone: '', objetivo: '' })
  const [estado, setEstado] = useState({})
  const campo = (k) => ({ id: `exp-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  const rotulo = (iso) => `${DIAS_SEMANA[diaDaSemana(iso)].slice(0, 3)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  async function marcar(e) {
    e.preventDefault()
    if (!hora) return setEstado({ erro: 'Escolha um horário.' })
    setEstado({ enviando: true })
    const { error } = await supabase.rpc('marcar_experimental', {
      p_personal: personalId, p_nome: d.nome, p_telefone: d.telefone, p_objetivo: d.objetivo, p_data: dia, p_hora: hora, p_indicacao: indicacao || null,
    })
    setEstado(error ? { erro: error.message } : { ok: true })
  }
  return (
    <form id="experimental" className="panel stack" style={{ marginTop: 36, maxWidth: 560 }} onSubmit={marcar}>
      {estado.ok ? (
        <>
          <h2>Aula marcada! 💪</h2>
          <p style={{ margin: 0 }}>Te espero na Corpo Atlético {rotulo(dia).toLowerCase()} às {hora}. Vou te chamar no WhatsApp para confirmar.</p>
          {zap && <a href={zap} target="_blank" rel="noreferrer">Falar agora no WhatsApp</a>}
        </>
      ) : (
        <>
          <h2>Agende sua aula experimental</h2>
          <p className="meta" style={{ margin: 0 }}>Escolha o dia e o horário. Vou te chamar no WhatsApp para confirmar.</p>
          <div className="segmentos" style={{ flexWrap: 'wrap', marginTop: 0 }}>
            {dias.map((x) => <button type="button" key={x} aria-pressed={x === dia} onClick={() => { setDia(x); setHora('') }}>{rotulo(x)}</button>)}
          </div>
          <div className="segmentos" style={{ flexWrap: 'wrap', marginTop: 0 }}>
            {vagas.filter((v) => v.data === dia).map((v) => <button type="button" key={v.hora} aria-pressed={v.hora === hora} onClick={() => setHora(v.hora)}>{v.hora}</button>)}
          </div>
          <div className="form">
            <label>Nome<input required minLength={2} maxLength={80} autoComplete="name" {...campo('nome')} /></label>
            <label>WhatsApp com DDD<input required type="tel" autoComplete="tel" placeholder="(11) 98765-4321" {...campo('telefone')} /></label>
            <label className="full">Objetivo<select {...campo('objetivo')}><option value="">Escolha</option>{['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Saúde e qualidade de vida', 'Performance esportiva'].map((o) => <option key={o}>{o}</option>)}</select></label>
          </div>
          {estado.erro && <p className="erro">{estado.erro}</p>}
          <button className="primary" disabled={estado.enviando}>{estado.enviando ? 'Marcando…' : hora ? `Marcar ${rotulo(dia).toLowerCase()} às ${hora}` : 'Marcar aula'}</button>
        </>
      )}
    </form>
  )
}

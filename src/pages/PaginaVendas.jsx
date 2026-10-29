import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { brl, primeiroNome } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'

const PASSOS = [
  ['Conversa inicial', 'Você conta seu objetivo, sua rotina e seu histórico de saúde (anamnese e PAR-Q pelo app).'],
  ['Treino no celular', 'Sua ficha fica no app, com vídeo de cada exercício e as cargas da última vez já preenchidas.'],
  ['Acompanhamento', 'Você envia peso, medidas e fotos pelo app e recebe a análise e os ajustes do treino.'],
  ['Comunidade', 'Check-in a cada treino, sequência de dias, ranking e desafios com a turma.'],
]

// Página pública de vendas da consultoria online, com formulário de interesse.
export default function PaginaVendas() {
  const [p, setP] = useState(undefined)
  const [planos, setPlanos] = useState([])
  const [d, setD] = useState({ nome: '', telefone: '', email: '', objetivo: '', plano: '', mensagem: '' })
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Link de indicação de um aluno: /consultoria?indicacao=ABC123
  const [indicacao] = useState(() => new URLSearchParams(window.location.search).get('indicacao')?.slice(0, 12) || '')
  const [quemIndicou, setQuemIndicou] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('pagina_vendas')
      const pessoal = data?.[0] || null
      if (indicacao) supabase.rpc('quem_indicou', { p_codigo: indicacao }).then(({ data: nome }) => setQuemIndicou(nome || ''))
      setP(pessoal)
      if (pessoal) {
        const { data: pl } = await supabase.from('planos_consultoria').select('*').eq('personal_id', pessoal.personal_id).order('ordem').order('preco')
        setPlanos(pl || [])
      }
    })()
  }, [])

  const campo = (k) => ({ id: `lead-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function enviar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    const { error } = await supabase.rpc('quero_contratar', {
      p_personal: p.personal_id, p_plano: d.plano || null, p_nome: d.nome, p_telefone: d.telefone, p_email: d.email, p_objetivo: d.objetivo, p_mensagem: d.mensagem,
      ...(indicacao ? { p_indicacao: indicacao } : {}),
    })
    setEnviando(false)
    if (error) return setErro(error.message)
    setEnviado(true)
  }
  function escolher(id) {
    setD({ ...d, plano: id })
    document.getElementById('quero')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (p === undefined) return <div className="centro carregando">Carregando…</div>
  if (!p) return <div className="centro"><div className="panel empty">Página em construção. <Link to="/">Área do aluno</Link></div></div>
  const zap = linkWhatsApp(p.telefone, `Oi, ${primeiroNome(p.nome)}! Vim pela página da consultoria online e queria saber mais.`)

  return (
    <div className="vendas">
      <header className="vendas-hero">
        <div className="solo" style={{ paddingBlock: '40px 48px' }}>
          <div className="brand" style={{ color: 'inherit' }}>{p.nome}<small style={{ color: 'inherit', opacity: .8 }}>{[p.cref && `CREF ${p.cref}`, p.instagram && `@${p.instagram.replace(/^@/, '')}`].filter(Boolean).join(' · ') || 'Personal trainer'}</small></div>
          {quemIndicou && <p className="indicado-por">{quemIndicou} te indicou 💪</p>}
          <h1 style={{ fontSize: 46, marginTop: quemIndicou ? 8 : 24 }}>{p.titulo || 'Consultoria online'}</h1>
          {p.texto && <p className="vendas-texto">{p.texto}</p>}
          <div className="row" style={{ marginTop: 20 }}>
            <a className="botao-claro" href="#quero">Quero começar</a>
            {zap && <a href={zap} target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 600 }}>Falar no WhatsApp</a>}
          </div>
        </div>
      </header>

      <div className="solo">
        <h2 style={{ marginBottom: 12 }}>Como funciona</h2>
        <div className="passos">
          {PASSOS.map(([t, x], i) => (
            <div key={t} className="panel"><div className="letter" style={{ display: 'block', marginBottom: 6 }}>{i + 1}</div><h3>{t}</h3><p className="meta" style={{ margin: '4px 0 0' }}>{x}</p></div>
          ))}
        </div>

        {planos.length > 0 && (
          <>
            <h2 style={{ margin: '36px 0 12px' }}>Planos</h2>
            <div className="planos">
              {planos.map((pl) => (
                <div key={pl.id} className={`panel plano${pl.destaque ? ' destaque' : ''}`}>
                  {pl.destaque && <span className="pill pendente" style={{ alignSelf: 'flex-start' }}>Mais escolhido</span>}
                  <h3 style={{ fontSize: 20 }}>{pl.nome}</h3>
                  <div><span className="preco">{brl(pl.preco)}</span> <span className="meta">/ {pl.periodo}</span></div>
                  {pl.itens && <ul>{pl.itens.split('\n').filter((x) => x.trim()).map((x, i) => <li key={i}>{x.trim()}</li>)}</ul>}
                  <button className={pl.destaque ? 'primary' : ''} onClick={() => escolher(pl.id)}>Escolher este plano</button>
                </div>
              ))}
            </div>
          </>
        )}

        <form id="quero" className="panel stack" style={{ marginTop: 36, maxWidth: 560 }} onSubmit={enviar}>
          {enviado ? (
            <>
              <h2>Recebi seu contato!</h2>
              <p style={{ margin: 0 }}>Vou te chamar no WhatsApp para a gente conversar sobre seu objetivo.</p>
              {zap && <a href={zap} target="_blank" rel="noreferrer">Ou me chame agora no WhatsApp</a>}
            </>
          ) : (
            <>
              <h2>Quero fazer a consultoria</h2>
              <div className="form">
                <label>Nome<input required minLength={2} maxLength={80} autoComplete="name" {...campo('nome')} /></label>
                <label>WhatsApp com DDD<input required type="tel" autoComplete="tel" placeholder="(11) 98765-4321" {...campo('telefone')} /></label>
                <label>E-mail<input type="email" autoComplete="email" maxLength={120} {...campo('email')} /></label>
                <label>Objetivo<select {...campo('objetivo')}><option value="">Escolha</option>{['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Saúde e qualidade de vida', 'Performance esportiva'].map((o) => <option key={o}>{o}</option>)}</select></label>
                {planos.length > 0 && <label className="full">Plano<select {...campo('plano')}><option value="">Ainda não sei</option>{planos.map((pl) => <option key={pl.id} value={pl.id}>{pl.nome} · {brl(pl.preco)}</option>)}</select></label>}
                <label className="full">Conte um pouco sobre você<textarea rows={3} maxLength={1000} placeholder="Rotina, se já treina, alguma lesão…" {...campo('mensagem')} /></label>
              </div>
              {erro && <p className="erro">{erro}</p>}
              <button className="primary" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar'}</button>
            </>
          )}
        </form>
        <p className="meta" style={{ marginTop: 24 }}>Já é aluno? <Link to="/">Entrar na área do aluno</Link></p>
      </div>
    </div>
  )
}

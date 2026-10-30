import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import FormAluno from './FormAluno.jsx'
import { brl, fmtData, num, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import { DIAS_SEMANA, diaDaSemana, hhmm } from '../../lib/agenda.js'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

const STATUS = [['novo', 'Novo'], ['conversando', 'Conversando'], ['fechou', 'Fechou'], ['nao_fechou', 'Não fechou']]
const COR = { novo: 'pendente', conversando: 'pendente', fechou: 'ativo', nao_fechou: 'pausado' }

// Consultoria online: interessados que vieram da página de vendas e a configuração da página.
export default function Vendas() {
  const [aba, setAba] = useState('interessados')
  return (
    <>
      <h1>Vendas</h1>
      <p className="sub">Sua página de consultoria online e quem pediu contato por ela.</p>
      <AjudaDaPagina />
      <div className="tabs" role="tablist">
        {[['interessados', 'Interessados'], ['pagina', 'Página e planos']].map(([k, l]) => <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === 'interessados' ? <Interessados /> : <Pagina />}
    </>
  )
}

function Interessados() {
  const navigate = useNavigate()
  const [lista, setLista] = useState(null)
  const [virando, setVirando] = useState(null)
  const [indicacao, setIndicacao] = useState({ nomes: {}, dados: {}, desconto: null }) // quem indicou e descontos já dados
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('interessados').select('*, planos_consultoria(nome, preco)').order('created_at', { ascending: false }).limit(200)
    setLista(data || [])
    const ids = [...new Set((data || []).map((i) => i.indicado_por).filter(Boolean))]
    if (!ids.length) return
    const [a, d, me] = await Promise.all([
      supabase.from('alunos').select('id, nome').in('id', ids),
      supabase.from('descontos').select('interessado_id, competencia').not('interessado_id', 'is', null),
      supabase.from('personais').select('*').maybeSingle(),
    ])
    setIndicacao({
      nomes: Object.fromEntries((a.data || []).map((x) => [x.id, x.nome])),
      dados: Object.fromEntries((d.data || []).map((x) => [x.interessado_id, x.competencia])),
      desconto: me.data?.desconto_indicacao ?? null,
    })
  }, [])

  // Desconto na mensalidade do mês que vem de quem indicou.
  async function darDesconto(i) {
    const hoje = new Date(), prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    const competencia = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}`
    const { error } = await supabase.from('descontos').insert({ aluno_id: i.indicado_por, competencia, valor: indicacao.desconto, motivo: `Indicou ${i.nome}`, interessado_id: i.id })
    setErro(error ? `Não foi possível dar o desconto: ${error.message}` : '')
    carregar()
  }
  useEffect(() => { carregar() }, [carregar])

  async function mudar(i, status) {
    await supabase.from('interessados').update({ status }).eq('id', i.id)
    carregar()
  }

  if (!lista) return <p className="carregando">Carregando…</p>
  if (!lista.length) return <div className="panel empty">Ninguém pediu contato ainda. Ative e divulgue sua página na aba "Página e planos".</div>
  return (
    <div className="stack">
      {erro && <p className="erro">{erro}</p>}
      {lista.map((i) => {
        const indicou = i.indicado_por && (indicacao.nomes[i.indicado_por] || 'um aluno')
        const descontoDado = indicacao.dados[i.id]
        const zap = linkWhatsApp(i.telefone, i.experimental_data
          ? `Oi, ${primeiroNome(i.nome)}! Recebi sua aula experimental para ${fmtData(i.experimental_data).slice(0, 5)} às ${hhmm(i.experimental_hora)}. Está confirmada, te espero! 💪`
          : `Oi, ${primeiroNome(i.nome)}! Aqui é da consultoria online, recebi seu contato pela página. Vamos conversar sobre seu objetivo${i.objetivo ? ` (${i.objetivo.toLowerCase()})` : ''}?`)
        return (
          <div className="panel" key={i.id}>
            <div className="row between">
              <div>
                <div className="name" style={{ fontSize: 17 }}>{i.nome}</div>
                <div className="meta">{[fmtData(i.created_at), i.telefone, i.email, i.objetivo, i.planos_consultoria && `${i.planos_consultoria.nome} (${brl(i.planos_consultoria.preco)})`].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={`pill ${COR[i.status]}`}>{STATUS.find(([k]) => k === i.status)[1]}</span>
            </div>
            {indicou && <p className="meta" style={{ margin: '6px 0 0', color: 'var(--accent)', fontWeight: 600 }}>Indicado por {indicou}{descontoDado ? ` · desconto dado na mensalidade de ${descontoDado.slice(5)}/${descontoDado.slice(0, 4)}` : ''}</p>}
            {i.experimental_data && <p className="aviso-experimental">📅 Aula experimental: {DIAS_SEMANA[diaDaSemana(i.experimental_data)].toLowerCase()}, {fmtData(i.experimental_data).slice(0, 5)} às {hhmm(i.experimental_hora)}</p>}
            {i.mensagem && i.mensagem !== 'Aula experimental' && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>“{i.mensagem}”</p>}
            <div className="row" style={{ marginTop: 10 }}>
              {zap && <a className="pill pendente" style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer" onClick={() => i.status === 'novo' && mudar(i, 'conversando')}>Chamar no WhatsApp</a>}
              <select aria-label="Situação" value={i.status} onChange={(e) => mudar(i, e.target.value)} style={{ width: 'auto' }}>
                {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {i.status !== 'fechou' && <button className="primary small" onClick={() => setVirando(i)}>Cadastrar como aluno</button>}
              {i.status === 'fechou' && indicou && !descontoDado && (indicacao.desconto
                ? <button className="small" onClick={() => darDesconto(i)}>Dar {brl(indicacao.desconto)} de desconto para {primeiroNome(indicou)}</button>
                : <span className="meta">Defina o desconto por indicação em Configurações</span>)}
            </div>
          </div>
        )
      })}
      {virando && (
        <FormAluno
          inicial={{ nome: virando.nome, email: virando.email || '', telefone: virando.telefone, objetivo: virando.objetivo || '', modalidade: virando.experimental_data ? 'presencial' : 'online', plano: virando.planos_consultoria?.nome || '', valor_mensal: virando.planos_consultoria?.preco ?? '' }}
          onFechar={() => setVirando(null)}
          onSalvo={async (aluno) => { await mudar(virando, 'fechou'); setVirando(null); navigate(`/alunos/${aluno.id}`) }}
        />
      )}
    </div>
  )
}

// Planos e texto prontos da consultoria do Caiê: um toque em "Usar planos sugeridos" cria tudo (depois dá para editar).
const PLANOS_SUGERIDOS = [
  { nome: 'Consultoria Online', preco: 149.9, periodo: 'mês', destaque: false, ordem: 0, itens: 'Treino personalizado no app\nAvaliação física por fotos e medidas\nAjustes mensais do treino\nAcompanhamento pelo aplicativo\nSuporte por mensagens' },
  { nome: 'Consultoria Premium', preco: 199.9, periodo: 'mês', destaque: true, ordem: 1, itens: 'Tudo do plano Consultoria Online\nAvaliação física presencial\nReavaliação presencial no fim do ciclo\nCheck-in semanal e ajustes conforme a evolução\nAcompanhamento mais próximo' },
]
const TITULO_SUGERIDO = 'Treine comigo de onde estiver'
const TEXTO_SUGERIDO = 'Na consultoria online você recebe um treino montado para o seu objetivo e a sua rotina, acompanha tudo pelo app e recebe meus ajustes conforme evolui. Serve para quem treina em qualquer academia ou em casa. No fim de cada ciclo a gente reavalia e você decide se renova.'

function Pagina() {
  const [d, setD] = useState(null)
  const [planos, setPlanos] = useState([])
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [p, pl] = await Promise.all([
      supabase.from('personais').select('user_id, nome, venda_ativa, venda_titulo, venda_texto, instagram, cref').maybeSingle(),
      supabase.from('planos_consultoria').select('*').order('ordem').order('preco'),
    ])
    setD(p.data); setPlanos(pl.data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (!d) return <p className="carregando">Carregando…</p>
  const campo = (k) => ({ id: `venda-${k}`, value: d[k] ?? '', onChange: (e) => { setAviso(''); setD({ ...d, [k]: e.target.value }) } })
  const link = `${window.location.origin}/consultoria`

  async function salvar(e) {
    e.preventDefault()
    const { error } = await supabase.from('personais').update({
      venda_ativa: d.venda_ativa, venda_titulo: d.venda_titulo?.trim() || null, venda_texto: d.venda_texto?.trim() || null,
      instagram: d.instagram?.trim().replace(/^@/, '') || null, cref: d.cref?.trim() || null,
    }).eq('user_id', d.user_id)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setAviso('Página salva.')
  }
  async function usarSugeridos() {
    const { error } = await supabase.from('planos_consultoria').insert(PLANOS_SUGERIDOS)
    if (error) return setErro(`Não foi possível criar os planos: ${error.message}`)
    const pagina = { venda_ativa: true, venda_titulo: d.venda_titulo?.trim() || TITULO_SUGERIDO, venda_texto: d.venda_texto?.trim() || TEXTO_SUGERIDO }
    await supabase.from('personais').update(pagina).eq('user_id', d.user_id)
    setD({ ...d, ...pagina }); setErro(''); setAviso('Planos criados e página no ar.')
    carregar()
  }
  async function apagarPlano(p) {
    if (!confirm(`Apagar o plano "${p.nome}"?`)) return
    await supabase.from('planos_consultoria').delete().eq('id', p.id)
    carregar()
  }

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <form className="panel form" onSubmit={salvar}>
        <label className="full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--ink)' }}>
          <input id="venda-ativa" type="checkbox" style={{ width: 18, height: 18 }} checked={d.venda_ativa} onChange={(e) => { setAviso(''); setD({ ...d, venda_ativa: e.target.checked }) }} />
          Página no ar
        </label>
        <p className="meta full" style={{ margin: 0 }}>Endereço para divulgar na bio do Instagram: <a href={link} target="_blank" rel="noreferrer">{link}</a></p>
        <label className="full">Título<input maxLength={80} placeholder="Ex.: Treine comigo de onde estiver" {...campo('venda_titulo')} /></label>
        <label className="full">Sobre você e a consultoria<textarea rows={5} maxLength={3000} placeholder="Sua formação, sua experiência e para quem é a consultoria" {...campo('venda_texto')} /></label>
        <label>Instagram<input maxLength={40} placeholder="seuperfil" {...campo('instagram')} /></label>
        <label>CREF<input maxLength={30} placeholder="000000-G/SP" {...campo('cref')} /></label>
        {erro && <p className="erro full">{erro}</p>}
        {aviso && <p className="ok full">{aviso}</p>}
        <div className="full"><button className="primary">Salvar página</button></div>
      </form>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 8 }}><h2>Planos</h2><button className="small" onClick={() => setEditando({})}>Novo plano</button></div>
        {planos.length === 0 ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="empty" style={{ margin: 0 }}>Sem planos, a página mostra só o formulário de contato.</p>
            <p className="meta" style={{ margin: 0 }}>Sugestão: Consultoria Online (R$ 149,90) e Consultoria Premium (R$ 199,90, com avaliação presencial). Também preenche o título e o texto da página, se estiverem vazios, e coloca a página no ar.</p>
            <div><button className="primary" onClick={usarSugeridos}>Usar planos sugeridos</button></div>
          </div>
        ) : (
          <div className="list">
            {planos.map((p) => (
              <div key={p.id} className="item" style={{ cursor: 'default' }}>
                <div><span className="name">{p.nome}</span>{p.destaque && <span className="post-tag" style={{ marginLeft: 8 }}>destaque</span>}<div className="meta">{brl(p.preco)} / {p.periodo}{p.itens ? ` · ${p.itens.split('\n').filter(Boolean).length} itens` : ''}</div></div>
                <div className="row" style={{ gap: 6 }}><button className="small" onClick={() => setEditando(p)}>Editar</button><button className="ghost small" onClick={() => apagarPlano(p)}>Apagar</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <HorariosExperimental />
      {editando && <FormPlano plano={editando} onFechar={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar() }} />}
    </div>
  )
}

function FormPlano({ plano, onFechar, onSalvo }) {
  const [d, setD] = useState({ nome: plano.nome || '', preco: plano.preco ?? '', periodo: plano.periodo || 'mês', itens: plano.itens || '', destaque: !!plano.destaque })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `plano-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.nome.trim() || num(d.preco) == null) return setErro('Informe o nome e o preço.')
    const dados = { nome: d.nome.trim(), preco: num(d.preco), periodo: d.periodo.trim() || 'mês', itens: d.itens.trim() || null, destaque: d.destaque }
    const { error } = plano.id ? await supabase.from('planos_consultoria').update(dados).eq('id', plano.id) : await supabase.from('planos_consultoria').insert(dados)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={plano.id ? 'Editar plano' : 'Novo plano'} onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Nome<input maxLength={60} placeholder="Ex.: Trimestral" {...campo('nome')} /></label>
      <label>Preço (R$)<input inputMode="decimal" {...campo('preco')} /></label>
      <label>Por<input maxLength={20} placeholder="mês, trimestre…" {...campo('periodo')} /></label>
      <label className="full">O que inclui (um item por linha)<textarea rows={5} maxLength={1000} placeholder={'Treino no app com vídeos\nAvaliação online a cada 15 dias\nSuporte no WhatsApp'} {...campo('itens')} /></label>
      <label className="full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)' }}>
        <input type="checkbox" style={{ width: 18, height: 18 }} checked={d.destaque} onChange={(e) => setD({ ...d, destaque: e.target.checked })} /> Destacar como "minha recomendação"
      </label>
    </Modal>
  )
}

// Horários livres para aula experimental: a pessoa escolhe um deles em /experimental e cai na Agenda.
function HorariosExperimental() {
  const [lista, setLista] = useState(null)
  const [userId, setUserId] = useState(null)
  const [novo, setNovo] = useState({ dia: '1', hora: '18:00' })
  const [erro, setErro] = useState('')
  useEffect(() => {
    supabase.from('personais').select('user_id, experimental_horarios').maybeSingle().then(({ data, error }) => {
      if (error) return setErro('Para usar a aula experimental, rode o arquivo supabase/migracao-rotina.sql no Supabase (SQL Editor).')
      setUserId(data?.user_id); setLista(data?.experimental_horarios || [])
    })
  }, [])
  async function salvar(nova) {
    const ordenada = nova.slice().sort((a, b) => a.dia - b.dia || (a.hora < b.hora ? -1 : 1))
    const { error } = await supabase.from('personais').update({ experimental_horarios: ordenada }).eq('user_id', userId)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setLista(ordenada)
  }
  function adicionar(e) {
    e.preventDefault()
    if (!/^\d{2}:\d{2}$/.test(novo.hora)) return setErro('Escolha a hora.')
    if (lista.some((x) => x.dia === Number(novo.dia) && x.hora === novo.hora)) return
    salvar([...lista, { dia: Number(novo.dia), hora: novo.hora }])
  }
  return (
    <div className="panel">
      <h2>Aula experimental</h2>
      <p className="meta" style={{ margin: '2px 0 12px' }}>
        Coloque os horários em que você pode dar uma aula experimental. Na tela de entrada do site aparece "Aula experimental" (link direto: /experimental); a pessoa escolhe um dia dos próximos 14 dias e já aparece aqui em Interessados e na sua Agenda. Cada horário só pode ser marcado por uma pessoa por dia.
      </p>
      {erro && <p className="erro">{erro}</p>}
      {lista && (
        <>
          <form className="row" style={{ gap: 8, flexWrap: 'nowrap' }} onSubmit={adicionar}>
            <select id="exp-dia" aria-label="Dia da semana" value={novo.dia} onChange={(e) => setNovo({ ...novo, dia: e.target.value })} style={{ flex: 1, minWidth: 0 }}>
              {DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            <input id="exp-hora" aria-label="Hora" type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={{ width: 110 }} />
            <button className="primary small">Adicionar</button>
          </form>
          {lista.length === 0 ? <p className="meta" style={{ margin: '10px 0 0' }}>Sem horários, a página não mostra a aula experimental.</p> : (
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              {lista.map((x) => (
                <span key={`${x.dia}${x.hora}`} className="pill pendente" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {DIAS_SEMANA[x.dia].slice(0, 3)} {x.hora}
                  <button type="button" className="ghost small" style={{ padding: '0 4px' }} aria-label={`Tirar ${DIAS_SEMANA[x.dia]} ${x.hora}`} onClick={() => salvar(lista.filter((y) => y !== x))}>✕</button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

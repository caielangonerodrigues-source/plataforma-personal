import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import FormAluno from './FormAluno.jsx'
import { brl, fmtData, num, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'

const STATUS = [['novo', 'Novo'], ['conversando', 'Conversando'], ['fechou', 'Fechou'], ['nao_fechou', 'Não fechou']]
const COR = { novo: 'pendente', conversando: 'pendente', fechou: 'ativo', nao_fechou: 'pausado' }

// Consultoria online: interessados que vieram da página de vendas e a configuração da página.
export default function Vendas() {
  const [aba, setAba] = useState('interessados')
  return (
    <>
      <h1>Vendas</h1>
      <p className="sub">Sua página de consultoria online e quem pediu contato por ela.</p>
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

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('interessados').select('*, planos_consultoria(nome, preco)').order('created_at', { ascending: false }).limit(200)
    setLista(data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function mudar(i, status) {
    await supabase.from('interessados').update({ status }).eq('id', i.id)
    carregar()
  }

  if (!lista) return <p className="carregando">Carregando…</p>
  if (!lista.length) return <div className="panel empty">Ninguém pediu contato ainda. Ative e divulgue sua página na aba "Página e planos".</div>
  return (
    <div className="stack">
      {lista.map((i) => {
        const zap = linkWhatsApp(i.telefone, `Oi, ${primeiroNome(i.nome)}! Aqui é da consultoria online, recebi seu contato pela página. Vamos conversar sobre seu objetivo${i.objetivo ? ` (${i.objetivo.toLowerCase()})` : ''}?`)
        return (
          <div className="panel" key={i.id}>
            <div className="row between">
              <div>
                <div className="name" style={{ fontSize: 17 }}>{i.nome}</div>
                <div className="meta">{[fmtData(i.created_at), i.telefone, i.email, i.objetivo, i.planos_consultoria && `${i.planos_consultoria.nome} (${brl(i.planos_consultoria.preco)})`].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={`pill ${COR[i.status]}`}>{STATUS.find(([k]) => k === i.status)[1]}</span>
            </div>
            {i.mensagem && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>“{i.mensagem}”</p>}
            <div className="row" style={{ marginTop: 10 }}>
              {zap && <a className="pill pendente" style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer" onClick={() => i.status === 'novo' && mudar(i, 'conversando')}>Chamar no WhatsApp</a>}
              <select aria-label="Situação" value={i.status} onChange={(e) => mudar(i, e.target.value)} style={{ width: 'auto' }}>
                {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {i.status !== 'fechou' && <button className="primary small" onClick={() => setVirando(i)}>Cadastrar como aluno</button>}
            </div>
          </div>
        )
      })}
      {virando && (
        <FormAluno
          inicial={{ nome: virando.nome, email: virando.email || '', telefone: virando.telefone, objetivo: virando.objetivo || '', modalidade: 'online', plano: virando.planos_consultoria?.nome || '', valor_mensal: virando.planos_consultoria?.preco ?? '' }}
          onFechar={() => setVirando(null)}
          onSalvo={async (aluno) => { await mudar(virando, 'fechou'); setVirando(null); navigate(`/alunos/${aluno.id}`) }}
        />
      )}
    </div>
  )
}

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
        {planos.length === 0 ? <p className="empty">Sem planos, a página mostra só o formulário de contato.</p> : (
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
        <input type="checkbox" style={{ width: 18, height: 18 }} checked={d.destaque} onChange={(e) => setD({ ...d, destaque: e.target.checked })} /> Destacar como "mais escolhido"
      </label>
    </Modal>
  )
}

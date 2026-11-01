import { useState } from 'react'
import { supabase } from '../supabase.js'
import Modal from './Modal.jsx'
import { Podio, ListaRanking } from './PodioRanking.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { gincanaAtual, placarGincana } from '../lib/gincana.js'
import { nomeCurto } from '../lib/comunidade.js'
import { fmtData, hojeISO, num } from '../lib/formato.js'

const pts = (n) => (n === 1 ? 'pt' : 'pts')

// Gincana na tela do Ranking: placar (alunos ou equipes), provas com pontos e quem cumpriu.
// O personal cria a gincana, as provas e marca quem cumpriu; o aluno acompanha.
export default function Gincana({ gin, dados, meuAlunoId, podeGerenciar, onAbrirPerfil }) {
  const [escolhida, setEscolhida] = useState(null)
  const [form, setForm] = useState(null) // 'gincana' | 'prova' | { marcar: prova }
  const hoje = hojeISO()
  if (gin.semSql) {
    return podeGerenciar
      ? <div className="panel empty">Para usar a gincana, rode o arquivo <code>supabase/migracao-gincana.sql</code> no SQL Editor do Supabase (passo 27 do README).</div>
      : null
  }
  if (!gin.gincanas) return <p className="carregando">Carregando…</p>

  const g = gin.gincanas.find((x) => x.id === escolhida) || gincanaAtual(gin.gincanas, hoje)
  const novaGincana = podeGerenciar && <button className="primary small" onClick={() => setForm('gincana')}>Nova gincana</button>
  const formGincana = form === 'gincana' && <FormGincana temEquipes={(dados.equipes || []).length > 0} onFechar={() => setForm(null)} onSalvo={(id) => { setForm(null); setEscolhida(id); gin.carregar() }} />
  if (!g) {
    return (
      <div className="stack">
        <div className="gincana-vazia">
          <IconeLinha d={ICONES.trofeu} tamanho={36} />
          <h3>{podeGerenciar ? 'Monte uma gincana' : 'Nenhuma gincana agora'}</h3>
          <p className="meta">{podeGerenciar ? 'Crie provas que valem pontos, como "trazer um amigo" ou "foto com a camiseta da academia", e marque quem cumpriu. Pode ser por aluno ou por equipe.' : 'Quando seu personal abrir uma gincana, o placar e as provas aparecem aqui.'}</p>
          {novaGincana}
        </div>
        {formGincana}
      </div>
    )
  }

  const equipes = dados.equipes || []
  const linhas = placarGincana(g, gin.provas, gin.pontos, gin.checkins, dados.membros, equipes)
    .map((r) => ({ ...r, valor: r.pontos, rotulo: `${r.pontos} ${pts(r.pontos)}`, detalhe: [r.provas && `${r.provas} ${r.provas === 1 ? 'prova' : 'provas'}`, g.pontos_por_treino && `${r.treinos} ${r.treinos === 1 ? 'treino' : 'treinos'}`].filter(Boolean).join(' · ') }))
  const eu = dados.membros.find((m) => m.id === meuAlunoId)
  const meuId = g.por_equipe ? eu?.equipe_id : meuAlunoId
  const minhaPos = linhas.findIndex((r) => r.id === meuId)
  const provas = gin.provas.filter((p) => p.gincana_id === g.id)
  const quando = g.inicio > hoje ? `Começa ${fmtData(g.inicio).slice(0, 5)}` : g.fim < hoje ? `Terminou ${fmtData(g.fim).slice(0, 5)}` : `Até ${fmtData(g.fim).slice(0, 5)}`

  async function apagarGincana() {
    if (!window.confirm(`Apagar a gincana "${g.titulo}" com as provas e os pontos?`)) return
    await supabase.from('gincanas').delete().eq('id', g.id)
    setEscolhida(null)
    gin.carregar()
  }
  async function apagarProva(p) {
    if (!window.confirm(`Apagar a prova "${p.titulo}" e os pontos dela?`)) return
    await supabase.from('gincana_provas').delete().eq('id', p.id)
    gin.carregar()
  }

  return (
    <div className="stack gincana">
      {(gin.gincanas.length > 1 || podeGerenciar) && (
        <div className="row between" style={{ gap: 8 }}>
          {gin.gincanas.length > 1 ? (
            <div className="segmentos" role="tablist" style={{ margin: 0, flex: 1 }}>
              {gin.gincanas.map((x) => <button key={x.id} role="tab" aria-pressed={x.id === g.id} aria-selected={x.id === g.id} onClick={() => setEscolhida(x.id)}>{x.titulo}</button>)}
            </div>
          ) : <span />}
          {novaGincana}
        </div>
      )}

      <div className="gincana-topo">
        <span className="atalho-rotulo">{g.por_equipe ? 'Gincana por equipe' : 'Gincana'} · {quando}</span>
        <h3>{g.titulo}</h3>
        {g.descricao && <p className="meta">{g.descricao}</p>}
        <p className="meta">Cada prova vale os pontos ao lado{g.pontos_por_treino ? ` · cada dia de treino vale ${g.pontos_por_treino} ${pts(g.pontos_por_treino)}` : ''}.</p>
        {podeGerenciar && (
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <button className="small" onClick={() => setForm('prova')}>Nova prova</button>
            <button className="ghost small" onClick={apagarGincana}>Apagar gincana</button>
          </div>
        )}
      </div>

      {minhaPos >= 0 && (
        <div className="ranking-eu">
          <span className="pos">{minhaPos + 1}º</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>{g.por_equipe ? `Sua equipe: ${linhas[minhaPos].nome}` : 'Sua posição'}</strong>
            <div className="meta">{linhas[minhaPos].pontos} {pts(linhas[minhaPos].pontos)}{minhaPos > 0 ? ` · faltam ${linhas[minhaPos - 1].pontos - linhas[minhaPos].pontos + 1} para passar ${g.por_equipe ? linhas[minhaPos - 1].nome : nomeCurto(linhas[minhaPos - 1].nome).replace(/\.$/, '')}` : linhas[0].pontos ? ' · em primeiro!' : ''}</div>
          </div>
        </div>
      )}

      <Podio linhas={linhas} fotos={dados.fotos} euId={meuId} onAbrir={onAbrirPerfil} />
      <ListaRanking linhas={linhas} fotos={dados.fotos} euId={meuId} onAbrir={onAbrirPerfil} unidade={pts} vazio={g.por_equipe ? 'Nenhuma equipe cadastrada. Crie as equipes em Academia.' : 'Ninguém na turma ainda.'} />

      <div className="stack" style={{ gap: 0 }}>
        <h3 className="titulo-icone" style={{ margin: '4px 0 6px' }}><IconeLinha d={ICONES.alvo || ICONES.trofeu} tamanho={22} />Provas</h3>
        {provas.map((p) => {
          const feitos = gin.pontos.filter((x) => x.prova_id === p.id)
          const cumpri = meuId && feitos.some((x) => (g.por_equipe ? x.equipe_id : x.aluno_id) === meuId)
          return (
            <div key={p.id} className="gincana-prova">
              <span className={`prova-pontos${cumpri ? ' feita' : ''}`}>{cumpri ? '✓' : `+${p.pontos}`}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong>{p.titulo}</strong> <span className="meta">· {p.pontos} {pts(p.pontos)}</span>
                {p.descricao && <div className="meta">{p.descricao}</div>}
                <div className="meta" style={{ fontSize: 12.5 }}>
                  {cumpri ? (g.por_equipe ? 'Sua equipe cumpriu · ' : 'Você cumpriu · ') : ''}
                  {feitos.length ? `${feitos.length} ${g.por_equipe ? (feitos.length === 1 ? 'equipe cumpriu' : 'equipes cumpriram') : (feitos.length === 1 ? 'aluno cumpriu' : 'alunos cumpriram')}` : 'Ninguém cumpriu ainda'}
                </div>
                {podeGerenciar && (
                  <div className="row" style={{ gap: 8, marginTop: 6 }}>
                    <button className="small" onClick={() => setForm({ marcar: p })}>Marcar quem cumpriu</button>
                    <button className="ghost small" onClick={() => apagarProva(p)}>Apagar</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {!provas.length && <p className="meta">{podeGerenciar ? 'Nenhuma prova ainda. Toque em "Nova prova" para criar a primeira.' : 'As provas aparecem aqui assim que o personal criar.'}</p>}
      </div>

      {formGincana}
      {form === 'prova' && <FormProva gincanaId={g.id} onFechar={() => setForm(null)} onSalvo={() => { setForm(null); gin.carregar() }} />}
      {form?.marcar && (
        <MarcarCumpriu prova={form.marcar} porEquipe={g.por_equipe} opcoes={g.por_equipe ? equipes : [...dados.membros].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))}
          marcados={gin.pontos.filter((x) => x.prova_id === form.marcar.id)} onFechar={() => setForm(null)} onSalvo={() => { setForm(null); gin.carregar() }} />
      )}
    </div>
  )
}

function FormGincana({ temEquipes, onFechar, onSalvo }) {
  const hoje = hojeISO()
  const fimDoMes = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).toLocaleDateString('sv-SE')
  const [d, setD] = useState({ titulo: '', descricao: '', inicio: hoje, fim: fimDoMes, por_equipe: false, treino: '10' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => ({ id: `gincana-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.titulo.trim()) return setErro('Dê um nome à gincana.')
    if (d.fim < d.inicio) return setErro('O fim precisa ser depois do início.')
    setSalvando(true)
    const { data, error } = await supabase.from('gincanas').insert({ titulo: d.titulo.trim(), descricao: d.descricao.trim() || null, inicio: d.inicio, fim: d.fim, por_equipe: d.por_equipe, pontos_por_treino: Math.max(0, num(d.treino) || 0) }).select('id').single()
    setSalvando(false)
    if (error) return setErro(`Não foi possível criar: ${error.message}`)
    onSalvo(data.id)
  }
  return (
    <Modal titulo="Nova gincana" botao="Criar gincana" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label className="full">Nome<input maxLength={80} placeholder="Ex.: Gincana de verão" {...campo('titulo')} /></label>
      <label className="full">Descrição<input maxLength={280} placeholder="Opcional, ex.: a equipe campeã ganha um açaí" {...campo('descricao')} /></label>
      <label>Início<input type="date" {...campo('inicio')} /></label>
      <label>Fim<input type="date" {...campo('fim')} /></label>
      <label>Pontos por dia de treino<input type="number" min="0" max="1000" {...campo('treino')} /></label>
      {temEquipes && (
        <label className="full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" style={{ width: 18, height: 18 }} checked={d.por_equipe} onChange={(e) => setD({ ...d, por_equipe: e.target.checked })} />
          Por equipe (os pontos vão para as equipes, não para cada aluno)
        </label>
      )}
    </Modal>
  )
}

function FormProva({ gincanaId, onFechar, onSalvo }) {
  const [d, setD] = useState({ titulo: '', descricao: '', pontos: '50' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `prova-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.titulo.trim()) return setErro('Dê um nome à prova.')
    const { error } = await supabase.from('gincana_provas').insert({ gincana_id: gincanaId, titulo: d.titulo.trim(), descricao: d.descricao.trim() || null, pontos: Math.min(10000, Math.max(1, num(d.pontos) || 1)) })
    if (error) return setErro(`Não foi possível criar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo="Nova prova" botao="Criar prova" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Prova<input maxLength={80} placeholder="Ex.: Trazer um amigo para treinar" {...campo('titulo')} /></label>
      <label className="full">Como vale<input maxLength={280} placeholder="Opcional, ex.: o amigo precisa fazer a aula experimental" {...campo('descricao')} /></label>
      <label>Pontos<input type="number" min="1" max="10000" {...campo('pontos')} /></label>
    </Modal>
  )
}

function MarcarCumpriu({ prova, porEquipe, opcoes, marcados, onFechar, onSalvo }) {
  const chave = porEquipe ? 'equipe_id' : 'aluno_id'
  const [sel, setSel] = useState(() => new Set(marcados.map((x) => x[chave])))
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const visiveis = opcoes.filter((o) => o.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  const alternar = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  async function salvar() {
    setSalvando(true)
    const antes = new Set(marcados.map((x) => x[chave]))
    const novos = [...sel].filter((id) => !antes.has(id)).map((id) => ({ prova_id: prova.id, [chave]: id }))
    const sair = marcados.filter((x) => !sel.has(x[chave])).map((x) => x.id)
    const r1 = novos.length ? await supabase.from('gincana_pontos').insert(novos) : {}
    const r2 = sair.length ? await supabase.from('gincana_pontos').delete().in('id', sair) : {}
    setSalvando(false)
    const falha = r1.error || r2.error
    if (falha) return setErro(`Não foi possível salvar: ${falha.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={`Quem cumpriu: ${prova.titulo}`} botao={`Salvar (${sel.size})`} onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      {!porEquipe && opcoes.length > 8 && <label className="full">Buscar<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do aluno" /></label>}
      <div className="full marcar-lista">
        {visiveis.map((o) => (
          <label key={o.id} className="marcar-item">
            <input type="checkbox" checked={sel.has(o.id)} onChange={() => alternar(o.id)} />
            {porEquipe && <span className="equipe-cor" style={{ background: o.cor }} />}
            <span>{porEquipe ? o.nome : nomeCurto(o.nome)}</span>
            <span className="meta" style={{ marginLeft: 'auto' }}>+{prova.pontos}</span>
          </label>
        ))}
        {!visiveis.length && <p className="meta">{porEquipe ? 'Nenhuma equipe. Crie as equipes em Academia.' : 'Ninguém encontrado.'}</p>}
      </div>
    </Modal>
  )
}

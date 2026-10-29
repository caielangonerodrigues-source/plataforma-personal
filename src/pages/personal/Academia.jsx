import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../supabase.js'
import GradeAulas from '../../components/GradeAulas.jsx'
import { avisarNoApp } from '../../lib/push.js'
import { reduzirFoto } from '../../lib/foto.js'
import { DIAS_LONGOS, dividirEquipes, TIPOS_AVISO, fmtHora, limparLinkGrupo, linkCheckinQR, ordenarAvisos, placarEquipes } from '../../lib/academia.js'
import { quandoFoi } from '../../lib/comunidade.js'
import { hojeISO } from '../../lib/formato.js'

const CORES_EQUIPE = ['#fc4c02', '#161618', '#1a7f37', '#3d5a80', '#b5523b', '#7a3ea8']

// Página da academia: novidades, grade de aulas, grupo do WhatsApp, QR code da recepção, equipes e fotos da entrada.
export default function Academia() {
  const [d, setD] = useState(null)
  const [semSql, setSemSql] = useState(false)

  const carregar = useCallback(async () => {
    const [p, aulas, avisos, equipes, alunos, fotos, mes] = await Promise.all([
      supabase.from('personais').select('*').maybeSingle(),
      supabase.from('aulas_grade').select('*').order('hora'),
      supabase.from('avisos').select('*').order('created_at', { ascending: false }),
      supabase.from('equipes').select('*').order('nome'),
      supabase.from('alunos').select('*').neq('status', 'pausado').order('nome'),
      supabase.from('fotos_entrada').select('*').order('ordem').order('created_at'),
      supabase.from('checkins').select('aluno_id, data').gte('data', `${hojeISO().slice(0, 7)}-01`),
    ])
    if (aulas.error || avisos.error || equipes.error) return setSemSql(true)
    setD({ personal: p.data, aulas: aulas.data, avisos: avisos.data, equipes: equipes.data, alunos: alunos.data || [], fotos: fotos.error ? null : fotos.data, mes: mes.data || [] })
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (semSql) {
    return (
      <>
        <h1>Academia</h1>
        <div className="panel" style={{ maxWidth: 640 }}>
          Falta rodar o SQL novo: no Supabase, abra <strong>SQL Editor › New query</strong>, cole o arquivo <code>supabase/migracao-academia.sql</code> e toque em <strong>Run</strong>. Depois recarregue esta página.
        </div>
      </>
    )
  }
  if (!d) return <p className="carregando">Carregando…</p>

  return (
    <>
      <h1>Academia</h1>
      <p className="sub">Novidades, grade de aulas, grupo do WhatsApp, QR code da recepção, equipes e fotos da tela de entrada.</p>
      <div className="academia">
        <div className="stack">
          <Novidades avisos={d.avisos} alunos={d.alunos} recarregar={carregar} />
          <EditarGrade aulas={d.aulas} recarregar={carregar} />
        </div>
        <div className="stack">
          <QrRecepcao personal={d.personal} recarregar={carregar} />
          <GrupoWhatsApp personal={d.personal} recarregar={carregar} />
          <Equipes equipes={d.equipes} alunos={d.alunos} mes={d.mes} recarregar={carregar} />
          {d.fotos && <FotosEntrada fotos={d.fotos} personalId={d.personal?.user_id} recarregar={carregar} />}
        </div>
      </div>
    </>
  )
}

function Novidades({ avisos, alunos, recarregar }) {
  const vazio = { tipo: 'novidade', titulo: '', texto: '', fixado: false, notificar: true }
  const [f, setF] = useState(vazio)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function publicar(e) {
    e.preventDefault()
    if (!f.titulo.trim()) return setErro('Escreva o título.')
    setSalvando(true); setOk('')
    const { error } = await supabase.from('avisos').insert({ tipo: f.tipo, titulo: f.titulo.trim(), texto: f.texto.trim() || null, fixado: f.fixado })
    if (error) { setSalvando(false); return setErro(`Não foi possível publicar: ${error.message}`) }
    let msg = 'Publicado na aba Novidades dos alunos.'
    if (f.notificar) {
      const r = await avisarNoApp(alunos.map((a) => a.id), `${TIPOS_AVISO[f.tipo][1]} ${f.titulo.trim()}`, f.texto.trim() || 'Veja na aba Novidades.', '/')
      msg += r ? ` Notificação enviada para ${r.enviadas} ${r.enviadas === 1 ? 'celular' : 'celulares'}.` : ' (A notificação não saiu: confira se a função notificacoes está publicada.)'
    }
    setSalvando(false); setErro(''); setOk(msg); setF(vazio); recarregar()
  }
  async function fixar(a) { await supabase.from('avisos').update({ fixado: !a.fixado }).eq('id', a.id); recarregar() }
  async function apagar(a) {
    if (!confirm(`Apagar "${a.titulo}"?`)) return
    await supabase.from('avisos').delete().eq('id', a.id); recarregar()
  }

  return (
    <div className="panel">
      <h2>Novidades</h2>
      <p className="meta" style={{ margin: '2px 0 12px' }}>Aparecem na aba Novidades do aluno, com aviso de "novo".</p>
      <form className="form" onSubmit={publicar}>
        <label>Tipo
          <select id="aviso-tipo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {Object.entries(TIPOS_AVISO).map(([k, [r, i]]) => <option key={k} value={k}>{i} {r}</option>)}
          </select>
        </label>
        <label style={{ gridColumn: 'span 2' }}>Título<input id="aviso-titulo" maxLength={80} placeholder="Ex.: Feriado: academia fecha dia 15" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
        <label className="full">Texto<textarea id="aviso-texto" rows={3} maxLength={1000} placeholder="Opcional" value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} /></label>
        <label className="full checkbox"><input type="checkbox" checked={f.fixado} onChange={(e) => setF({ ...f, fixado: e.target.checked })} /> Fixar no topo</label>
        <label className="full checkbox"><input type="checkbox" checked={f.notificar} onChange={(e) => setF({ ...f, notificar: e.target.checked })} /> Mandar notificação no celular dos alunos</label>
        {erro && <p className="erro full" style={{ margin: 0 }}>{erro}</p>}
        {ok && <p className="ok full" style={{ margin: 0 }}>{ok}</p>}
        <div className="full"><button className="primary" disabled={salvando}>{salvando ? 'Publicando…' : 'Publicar'}</button></div>
      </form>
      <div className="stack" style={{ gap: 0, marginTop: 14 }}>
        {ordenarAvisos(avisos).map((a) => (
          <div key={a.id} className="linha-lista">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="name">{TIPOS_AVISO[a.tipo]?.[1]} {a.titulo}{a.fixado && <span className="meta"> · 📌 fixado</span>}</div>
              <div className="meta">{quandoFoi(a.created_at)}{a.texto ? ` · ${a.texto.slice(0, 80)}${a.texto.length > 80 ? '…' : ''}` : ''}</div>
            </div>
            <button className="ghost small" onClick={() => fixar(a)}>{a.fixado ? 'Desafixar' : 'Fixar'}</button>
            <button className="ghost small" aria-label={`Apagar ${a.titulo}`} onClick={() => apagar(a)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function EditarGrade({ aulas, recarregar }) {
  const [f, setF] = useState({ dia_semana: '1', hora: '18:10', nome: '', obs: '' })
  const [erro, setErro] = useState('')
  async function adicionar(e) {
    e.preventDefault()
    if (!f.nome.trim() || !f.hora) return setErro('Preencha a aula e o horário.')
    const { error } = await supabase.from('aulas_grade').insert({ dia_semana: Number(f.dia_semana), hora: f.hora, nome: f.nome.trim(), obs: f.obs.trim() || null })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setF({ ...f, nome: '', obs: '' }); recarregar()
  }
  async function apagar(a) { await supabase.from('aulas_grade').delete().eq('id', a.id); recarregar() }
  const porDia = [1, 2, 3, 4, 5, 6, 0].map((dia) => [dia, aulas.filter((a) => a.dia_semana === dia)]).filter(([, l]) => l.length)

  return (
    <>
      <GradeAulas aulas={aulas} />
      <div className="panel">
        <h2>Editar a grade</h2>
        <form className="form" style={{ marginTop: 10 }} onSubmit={adicionar}>
          <label>Dia<select id="grade-dia" value={f.dia_semana} onChange={(e) => setF({ ...f, dia_semana: e.target.value })}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DIAS_LONGOS[d]}</option>)}</select></label>
          <label>Horário<input id="grade-hora" type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></label>
          <label>Aula<input id="grade-nome" maxLength={40} placeholder="Ex.: Jump" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label>Observação<input id="grade-obs" maxLength={60} placeholder="Opcional" value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></label>
          {erro && <p className="erro full" style={{ margin: 0 }}>{erro}</p>}
          <div className="full"><button className="primary">Adicionar aula</button></div>
        </form>
        <div style={{ marginTop: 12 }}>
          {porDia.map(([dia, lista]) => (
            <div key={dia} style={{ marginTop: 10 }}>
              <div className="secao">{DIAS_LONGOS[dia]}</div>
              {lista.map((a) => (
                <div key={a.id} className="linha-lista">
                  <span className="mono" style={{ width: 48 }}>{fmtHora(a.hora)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{a.nome}{a.obs && <span className="meta"> · {a.obs}</span>}</span>
                  <button className="ghost small" aria-label={`Apagar ${a.nome} de ${DIAS_LONGOS[dia]}`} onClick={() => apagar(a)}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function QrRecepcao({ personal, recarregar }) {
  const [img, setImg] = useState('')
  const link = personal?.codigo_checkin && linkCheckinQR(window.location.origin, personal.codigo_checkin)
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 2, width: 720, color: { dark: '#161618' } }).then(setImg) }, [link])

  async function novoCodigo() {
    if (!confirm('Gerar um QR code novo? O antigo (impresso) para de funcionar.')) return
    await supabase.from('personais').update({ codigo_checkin: crypto.randomUUID().replace(/-/g, '').slice(0, 12) }).eq('user_id', personal.user_id)
    recarregar()
  }

  if (!link) return null
  return (
    <div className="panel qr-recepcao">
      <h2>QR code da recepção</h2>
      <p className="meta" style={{ margin: '2px 0 12px' }}>Imprima e cole na recepção. O aluno aponta a câmera do celular, abre o app e o check-in do dia é feito sozinho (conta para sequência, ranking, medalhas e equipes).</p>
      {img && (
        <div className="qr-cartaz" id="qr-cartaz">
          <img src={img} alt="QR code do check-in na academia" />
          <strong>Check-in na Corpo Atlético<span style={{ color: 'var(--accent)' }}>.</span></strong>
          <span>Aponte a câmera do celular</span>
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <a className="botao-link" href={img} download="qr-checkin-corpo-atletico.png">Baixar QR code</a>
        <button className="small" onClick={() => window.print()}>Imprimir</button>
        <button className="ghost small" onClick={novoCodigo}>Gerar novo código</button>
      </div>
    </div>
  )
}

function GrupoWhatsApp({ personal, recarregar }) {
  const [link, setLink] = useState(personal?.whatsapp_grupo || '')
  const [msg, setMsg] = useState('')
  async function salvar(e) {
    e.preventDefault()
    const limpo = link.trim() ? limparLinkGrupo(link) : null
    if (link.trim() && !limpo) return setMsg('Cole o link de convite do grupo (começa com https://chat.whatsapp.com/).')
    const { error } = await supabase.from('personais').update({ whatsapp_grupo: limpo }).eq('user_id', personal.user_id)
    setMsg(error ? `Não foi possível salvar: ${error.message}` : limpo ? 'Salvo. O botão do grupo aparece para os alunos.' : 'Removido. O botão do grupo some para os alunos.')
    setLink(limpo || ''); recarregar()
  }
  return (
    <form className="panel stack" style={{ gap: 10 }} onSubmit={salvar}>
      <h2>Grupo do WhatsApp</h2>
      <p className="meta" style={{ margin: 0 }}>O botão verde aparece no topo da área do aluno, no Início, em Novidades e na Comunidade.</p>
      <input id="whatsapp-grupo" aria-label="Link do grupo do WhatsApp" placeholder="https://chat.whatsapp.com/..." value={link} onChange={(e) => { setLink(e.target.value); setMsg('') }} />
      {msg && <p className="meta" style={{ margin: 0 }}>{msg}</p>}
      <div><button className="primary small">Salvar link</button></div>
    </form>
  )
}

function Equipes({ equipes, alunos, mes, recarregar }) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const placar = placarEquipes(equipes, alunos, mes)
  async function criar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    const { error } = await supabase.from('equipes').insert({ nome: nome.trim(), cor: CORES_EQUIPE[equipes.length % CORES_EQUIPE.length] })
    if (error) return setErro(`Não foi possível criar: ${error.message}`)
    setErro(''); setNome(''); recarregar()
  }
  async function apagar(eq) {
    if (!confirm(`Apagar a equipe ${eq.nome}? Os alunos ficam sem equipe.`)) return
    await supabase.from('equipes').delete().eq('id', eq.id); recarregar()
  }
  const semEquipe = dividirEquipes(equipes, alunos)
  async function dividir() {
    for (const x of semEquipe) {
      const { error } = await supabase.from('alunos').update({ equipe_id: x.equipe_id }).eq('id', x.aluno_id)
      if (error) { setErro(`Não foi possível dividir: ${error.message}`); break }
    }
    recarregar()
  }
  async function mover(aluno, equipeId) {
    const { error } = await supabase.from('alunos').update({ equipe_id: equipeId || null }).eq('id', aluno.id)
    if (error) setErro(`Não foi possível mudar: ${error.message}`)
    recarregar()
  }
  return (
    <div className="panel">
      <h2>Equipes e pontos</h2>
      <p className="meta" style={{ margin: '2px 0 12px' }}>Cada dia de treino de um aluno vale 1 ponto para a equipe dele. O placar do mês aparece na Comunidade. Aluno novo entra sozinho na equipe com menos gente, então os cadastros vão se alternando entre as equipes.</p>
      <form className="row" style={{ gap: 8, flexWrap: 'nowrap' }} onSubmit={criar}>
        <input id="equipe-nome" aria-label="Nome da equipe" maxLength={30} placeholder="Ex.: Equipe Laranja" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
        <button className="primary small">Criar equipe</button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {placar.map((eq) => (
        <div key={eq.id} className="linha-lista">
          <span className="equipe-cor" style={{ background: eq.cor }} />
          <span className="name" style={{ flex: 1 }}>{eq.nome}</span>
          <span className="meta">{eq.membros.length} {eq.membros.length === 1 ? 'aluno' : 'alunos'} · <strong style={{ color: 'var(--ink)' }}>{eq.pontos} pts</strong></span>
          <button className="ghost small" aria-label={`Apagar ${eq.nome}`} onClick={() => apagar(eq)}>✕</button>
        </div>
      ))}
      {semEquipe.length > 0 && (
        <div className="row between" style={{ marginTop: 12, gap: 8 }}>
          <span className="meta">{semEquipe.length} {semEquipe.length === 1 ? 'aluno está' : 'alunos estão'} sem equipe.</span>
          <button className="primary small" onClick={dividir}>Dividir entre as equipes</button>
        </div>
      )}
      {equipes.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="link">Escolher a equipe de cada aluno</summary>
          <div style={{ marginTop: 8 }}>
            {alunos.map((a) => (
              <div key={a.id} className="linha-lista">
                <span style={{ flex: 1, minWidth: 0 }}>{a.nome}</span>
                <select aria-label={`Equipe de ${a.nome}`} value={a.equipe_id || ''} onChange={(e) => mover(a, e.target.value)}>
                  <option value="">Sem equipe</option>
                  {equipes.map((eq) => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                </select>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function FotosEntrada({ fotos, personalId, recarregar }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  async function enviar(e) {
    const arquivos = [...e.target.files].slice(0, 8 - fotos.length)
    e.target.value = ''
    if (!arquivos.length) return
    setEnviando(true); setErro('')
    for (const [k, arq] of arquivos.entries()) {
      const caminho = `${personalId}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from('entrada').upload(caminho, await reduzirFoto(arq, 1600, 0.82), { contentType: 'image/jpeg' })
      if (up.error) { setErro(`Não foi possível enviar: ${up.error.message}`); break }
      const { error } = await supabase.from('fotos_entrada').insert({ caminho, ordem: fotos.length + k })
      if (error) { setErro(`Não foi possível salvar: ${error.message}`); break }
    }
    setEnviando(false); recarregar()
  }
  async function salvarTexto(f, campo, valor) {
    await supabase.from('fotos_entrada').update({ [campo]: valor.trim() || null }).eq('id', f.id)
  }
  async function apagar(f) {
    if (!confirm('Tirar esta foto da tela de entrada?')) return
    await supabase.storage.from('entrada').remove([f.caminho])
    await supabase.from('fotos_entrada').delete().eq('id', f.id); recarregar()
  }
  return (
    <div className="panel">
      <h2>Fotos da tela de entrada</h2>
      <p className="meta" style={{ margin: '2px 0 12px' }}>Fotos reais da academia (aluno treinando, spinning, a turma) passam sozinhas na tela de login, como no Strava. Até 8 fotos; de preferência na horizontal. Sem fotos suas, a tela usa fotos de academia do Unsplash.</p>
      <div className="fotos-entrada">
        {fotos.map((f) => (
          <div key={f.id} className="foto-entrada">
            <img src={supabase.storage.from('entrada').getPublicUrl(f.caminho).data.publicUrl} alt="" />
            <input aria-label="Título da foto" maxLength={40} placeholder="Título (opcional)" defaultValue={f.titulo || ''} onBlur={(e) => salvarTexto(f, 'titulo', e.target.value)} />
            <input aria-label="Frase da foto" maxLength={90} placeholder="Frase (opcional)" defaultValue={f.texto || ''} onBlur={(e) => salvarTexto(f, 'texto', e.target.value)} />
            <button className="ghost small" onClick={() => apagar(f)}>Remover</button>
          </div>
        ))}
      </div>
      {fotos.length < 8 && (
        <label className="botao-link" style={{ display: 'inline-flex', marginTop: 12, cursor: 'pointer' }}>
          {enviando ? 'Enviando…' : 'Adicionar fotos'}
          <input type="file" accept="image/*" multiple hidden disabled={enviando} onChange={enviar} />
        </label>
      )}
      {erro && <p className="erro">{erro}</p>}
    </div>
  )
}

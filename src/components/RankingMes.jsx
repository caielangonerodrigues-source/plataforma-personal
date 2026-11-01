import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { doGrupo, grupoDe, inicioDoMes, nomeCurto, ranking, somarDias } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'
import { Podio, ListaRanking } from './PodioRanking.jsx'
import Gincana from './Gincana.jsx'
import DesafiosAmigos from './DesafiosAmigos.jsx'
import { useGincana, checkinsDesde } from '../hooks/useGincana.js'
import PerfilAluno from './PerfilAluno.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'

const nomeDoMes = () => new Date().toLocaleDateString('pt-BR', { month: 'long' })
const PERIODOS = [['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']]
const titulo = (p) => (p === 'semana' ? 'Ranking da semana' : p === 'ano' ? `Ranking de ${new Date().getFullYear()}` : `Ranking de ${nomeDoMes()}`)
const nesse = { semana: 'nesta semana', mes: 'neste mês', ano: 'neste ano' }
// Começo do período: segunda-feira da semana, dia 1 do mês ou 1º de janeiro.
function inicioDe(p, hoje) {
  if (p === 'semana') return somarDias(hoje, -((new Date(`${hoje}T12:00:00Z`).getUTCDay() + 6) % 7))
  if (p === 'ano') return `${hoje.slice(0, 4)}-01-01`
  return inicioDoMes(hoje)
}
// Dias com post de cada personal (autor do post; sem o SQL do autor, o personal da turma).
async function postsDosPersonaisDesde(desde) {
  let r = await supabase.from('checkins').select('personal_id, autor_id, data').not('personal_id', 'is', null).gte('data', desde)
  if (r.error) r = await supabase.from('checkins').select('personal_id, data').not('personal_id', 'is', null).gte('data', desde)
  return r.data || []
}
function cafeComLeite(posts, dados) {
  const dias = new Map()
  for (const p of posts) {
    const quem = p.autor_id || p.personal_id
    if (!dias.has(quem)) dias.set(quem, new Set())
    dias.get(quem).add(p.data)
  }
  return [...dias].map(([id, d]) => {
    const pessoa = dados.personais?.[id] || dados.personal || { nome: 'Personal' }
    return { id: `p-${id}`, nome: pessoa.nome, avatar: pessoa.avatar, valor: d.size, rotulo: plural(d.size), cafe: true }
  })
}
const plural = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`

// Tela própria do ranking (semana, mês ou ano) (botão "Ranking" na barra de baixo): pódio com os 3 primeiros,
// a posição do aluno logado e a lista completa. O personal vê o mesmo e pode mandar o ranking no grupo. Filtros Geral / Academia / Online / Minha equipe.
export default function RankingMes({ comunidade, meuAlunoId, online, onCheckin, podeCompartilhar, convite, onConviteUsado }) {
  const { dados, erro } = comunidade
  const [grupo, setGrupo] = useState(null)
  const [perfilDe, setPerfilDe] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [periodo, setPeriodo] = useState('mes')
  const [secao, setSecao] = useState(convite ? 'amigos' : 'ranking') // ranking | gincana | amigos
  const [semAmigos, setSemAmigos] = useState(false) // SQL do desafio entre amigos ainda não rodou
  useEffect(() => { if (convite) setSecao('amigos') }, [convite])
  const gin = useGincana()
  const [checkins, setCheckins] = useState({}) // semana / ano: carregados quando o aluno escolhe
  useEffect(() => {
    if (periodo === 'mes' || checkins[periodo]) return
    checkinsDesde(inicioDe(periodo, hojeISO()))
      .then((lista) => setCheckins((c) => ({ ...c, [periodo]: lista })))
      .catch(() => setCheckins((c) => ({ ...c, [periodo]: [] })))
  }, [periodo, checkins])
  // Posts dos personais no período: entram no ranking como "café com leite" (aparecem, mas não disputam).
  const [postsPersonais, setPostsPersonais] = useState({})
  useEffect(() => {
    if (postsPersonais[periodo]) return
    postsDosPersonaisDesde(inicioDe(periodo, hojeISO())).then((lista) => setPostsPersonais((c) => ({ ...c, [periodo]: lista })))
  }, [periodo, postsPersonais])
  const marcarSemAmigos = useCallback(() => { setSemAmigos(true); setSecao((s) => (s === 'amigos' ? 'ranking' : s)) }, [])
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const temOnline = dados.membros.some((m) => grupoDe(m) === 'online')
  const eu = dados.membros.find((m) => m.id === meuAlunoId)
  const equipeMinha = (dados.equipes || []).find((e) => e.id === eu?.equipe_id)
  const visoes = [['geral', 'Geral'], ...(temOnline ? [['academia', 'Academia'], ['online', 'Online']] : []), ...(equipeMinha ? [['equipe', 'Minha equipe']] : [])]
  // Começa no grupo de quem treina do mesmo jeito (igual ao card do Início).
  const atual = visoes.some(([k]) => k === grupo) ? grupo : temOnline && eu ? (online ? 'online' : 'academia') : 'geral'
  const membros = atual === 'geral' ? dados.membros : atual === 'equipe' ? dados.membros.filter((m) => m.equipe_id === equipeMinha.id) : doGrupo(dados.membros, atual)
  const doPeriodo = periodo === 'mes' ? dados.mes : checkins[periodo]
  const tabela = doPeriodo ? ranking(doPeriodo, membros) : []
  const minhaPos = tabela.findIndex((r) => r.id === meuAlunoId)
  const acima = minhaPos > 0 ? tabela[minhaPos - 1] : null
  const faltam = acima ? acima.dias - tabela[minhaPos].dias + 1 : 0
  const alunos = tabela.map((r) => ({ ...r, valor: r.dias, rotulo: plural(r.dias) }))
  const cafe = atual === 'equipe' ? [] : cafeComLeite(postsPersonais[periodo] || [], dados)
  // Personais entram na lista na altura dos dias deles, sem posição e fora do pódio.
  const linhas = [...alunos, ...cafe].sort((a, b) => b.valor - a.valor || (a.cafe ? 1 : 0) - (b.cafe ? 1 : 0))
  const temGincana = podeCompartilhar || (gin.gincanas || []).length > 0 // o personal sempre vê (para criar)
  const secoes = [['ranking', 'Ranking'], ...(temGincana ? [['gincana', 'Gincana']] : []), ...(meuAlunoId && !semAmigos ? [['amigos', 'Desafios']] : [])]
  const compartilhar = (t) => compartilharTexto(t, titulo(periodo), setCopiado)
  const abrir = (r) => setPerfilDe(dados.membros.find((m) => m.id === r.id))

  return (
    <div className="ranking-tela stack">
      {secoes.length > 1 && (
        <div className="ranking-secoes" role="tablist">
          {secoes.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={secao === k} onClick={() => setSecao(k)}>{l}</button>)}
        </div>
      )}
      {secao === 'amigos' && meuAlunoId && <DesafiosAmigos meuAlunoId={meuAlunoId} fotos={dados.fotos} convite={convite} onConviteUsado={onConviteUsado} onIndisponivel={marcarSemAmigos} />}
      {secao === 'gincana' && <Gincana gin={gin} dados={dados} meuAlunoId={meuAlunoId} podeGerenciar={podeCompartilhar} onAbrirPerfil={abrir} />}
      {secao === 'ranking' && <>
      <div className="ranking-cabeca">
        <div className="ranking-periodos" role="tablist" aria-label="Período">
          {PERIODOS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={periodo === k} onClick={() => setPeriodo(k)}>{l}</button>)}
        </div>
        <h2 className="titulo-icone"><IconeLinha d={ICONES.trofeu} tamanho={26} />{titulo(periodo)}</h2>
        <p className="meta">Quem fez mais dias de check-in {nesse[periodo]}</p>
        {podeCompartilhar && tabela.length > 0 && (
          <button type="button" className="link-sublinhado" style={{ alignSelf: 'flex-start' }} onClick={() => compartilhar(tabela)}>{copiado ? 'Ranking copiado!' : 'Mandar ranking no grupo'}</button>
        )}
        {visoes.length > 1 && (
          <div className="segmentos" role="tablist" style={{ flexWrap: 'wrap' }}>
            {visoes.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={atual === k} aria-pressed={atual === k} onClick={() => setGrupo(k)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {!doPeriodo && <p className="carregando">Carregando…</p>}
      <Podio linhas={alunos} fotos={dados.fotos} euId={meuAlunoId} onAbrir={abrir} />

      {minhaPos >= 0 && (
        <div className="ranking-eu">
          <span className="pos">{minhaPos + 1}º</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>Sua posição</strong>
            <div className="meta">
              {minhaPos === 0 ? (tabela[0].dias ? 'Você está em primeiro. Continue assim!' : 'Faça o primeiro check-in do mês e saia na frente.')
                : `Falta${faltam > 1 ? 'm' : ''} ${plural(faltam)} de treino para passar ${nomeCurto(acima.nome).replace(/\.$/, '')}.`}
            </div>
          </div>
          {onCheckin && <button className="primary small" onClick={onCheckin}>Check-in</button>}
        </div>
      )}

      {doPeriodo && <ListaRanking linhas={linhas} fotos={dados.fotos} euId={meuAlunoId} onAbrir={abrir} unidade={(n) => (n === 1 ? 'dia' : 'dias')} />}
      </>}
      {perfilDe && <PerfilAluno membro={perfilDe} dados={dados} equipe={(dados.equipes || []).find((e) => e.id === perfilDe.equipe_id)} onFechar={() => setPerfilDe(null)} onAbrirPost={() => setPerfilDe(null)} />}
    </div>
  )
}

// Texto do top 10 para o personal mandar no WhatsApp (compartilhar do celular ou copiar no computador).
async function compartilharTexto(tabela, tituloRanking, setCopiado) {
  const medalha = ['🥇', '🥈', '🥉']
  const linhas = tabela.slice(0, 10).map((r, i) => `${medalha[i] || `${i + 1}.`} ${nomeCurto(r.nome)} · ${plural(r.dias)}`)
  const texto = `🏆 ${tituloRanking}\n\n${linhas.join('\n')}\n\nBora treinar e subir no ranking! 💪`
  try {
    if (navigator.share) return await navigator.share({ text: texto })
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  } catch { /* cancelou */ }
}

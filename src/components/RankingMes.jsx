import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { doGrupo, grupoDe, inicioDoMes, nomeCurto, ranking, somarDias } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'
import Avatar from './Avatar.jsx'
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
// Check-ins de alunos desde `desde`, em páginas de 1000 (limite do Supabase por consulta).
async function checkinsDesde(desde) {
  const todos = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('checkins').select('aluno_id, data').not('aluno_id', 'is', null).gte('data', desde).range(de, de + 999)
    if (error) throw error
    todos.push(...data)
    if (data.length < 1000) return todos
  }
}
const plural = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`

// Tela própria do ranking (semana, mês ou ano) (botão "Ranking" na barra de baixo): pódio com os 3 primeiros,
// a posição do aluno logado e a lista completa. O personal vê o mesmo e pode mandar o ranking no grupo. Filtros Geral / Academia / Online / Minha equipe.
export default function RankingMes({ comunidade, meuAlunoId, online, onCheckin, podeCompartilhar }) {
  const { dados, erro } = comunidade
  const [grupo, setGrupo] = useState(null)
  const [perfilDe, setPerfilDe] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [periodo, setPeriodo] = useState('mes')
  const [checkins, setCheckins] = useState({}) // semana / ano: carregados quando o aluno escolhe
  useEffect(() => {
    if (periodo === 'mes' || checkins[periodo]) return
    checkinsDesde(inicioDe(periodo, hojeISO()))
      .then((lista) => setCheckins((c) => ({ ...c, [periodo]: lista })))
      .catch(() => setCheckins((c) => ({ ...c, [periodo]: [] })))
  }, [periodo, checkins])
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
  const podio = tabela.slice(0, 3)
  const compartilhar = (t) => compartilharTexto(t, titulo(periodo), setCopiado)
  const abrir = (r) => setPerfilDe(dados.membros.find((m) => m.id === r.id))

  return (
    <div className="ranking-tela stack">
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
      {podio.length > 0 && (
        <div className="podio">
          {[podio[1], podio[0], podio[2]].map((r, i) => r && (
            <button key={r.id} type="button" className={`podio-lugar p${[2, 1, 3][i]}${r.id === meuAlunoId ? ' eu' : ''}`} onClick={() => abrir(r)} aria-label={`${[2, 1, 3][i]}º lugar: ${nomeCurto(r.nome)}, ${plural(r.dias)}`}>
              <span className="podio-foto">
                <Avatar nome={r.nome} avatar={r.avatar} fotos={dados.fotos} tamanho={[2, 1, 3][i] === 1 ? 76 : 60} ampliar={false} />
                <i>{[2, 1, 3][i]}</i>
              </span>
              <strong>{nomeCurto(r.nome)}</strong>
              <span className="meta">{plural(r.dias)}</span>
              <span className="podio-degrau" />
            </button>
          ))}
        </div>
      )}

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

      <div className="panel ranking-lista">
        {tabela.map((r, i) => (
          <div key={r.id} className={`rank${i < 3 && r.dias > 0 ? ' top' : ''}${r.id === meuAlunoId ? ' eu' : ''}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }}
            onClick={() => abrir(r)} onKeyDown={(e) => e.key === 'Enter' && abrir(r)} aria-label={`Ver perfil de ${nomeCurto(r.nome)}`}>
            <span className="pos">{i + 1}</span>
            <Avatar nome={r.nome} avatar={r.avatar} fotos={dados.fotos} ampliar={false} />
            <span className="name" style={{ minWidth: 0 }}>{nomeCurto(r.nome)}{r.id === meuAlunoId && <span className="meta"> (você)</span>}</span>
            <span><span className="dias">{r.dias}</span> <span className="meta">{r.dias === 1 ? 'dia' : 'dias'}</span></span>
          </div>
        ))}
        {doPeriodo && !tabela.length && <p className="empty">Ninguém na turma ainda.</p>}
      </div>
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

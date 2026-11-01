import { useState } from 'react'
import { doGrupo, grupoDe, nomeCurto, ranking } from '../lib/comunidade.js'
import Avatar from './Avatar.jsx'
import PerfilAluno from './PerfilAluno.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'

const nomeDoMes = () => new Date().toLocaleDateString('pt-BR', { month: 'long' })
const plural = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`

// Tela própria do ranking do mês (botão "Ranking" na barra de baixo): pódio com os 3 primeiros,
// a posição do aluno logado e a lista completa. O personal vê o mesmo e pode mandar o ranking no grupo. Filtros Geral / Academia / Online / Minha equipe.
export default function RankingMes({ comunidade, meuAlunoId, online, onCheckin, podeCompartilhar }) {
  const { dados, erro } = comunidade
  const [grupo, setGrupo] = useState(null)
  const [perfilDe, setPerfilDe] = useState(null)
  const [copiado, setCopiado] = useState(false)
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const temOnline = dados.membros.some((m) => grupoDe(m) === 'online')
  const eu = dados.membros.find((m) => m.id === meuAlunoId)
  const equipeMinha = (dados.equipes || []).find((e) => e.id === eu?.equipe_id)
  const visoes = [['geral', 'Geral'], ...(temOnline ? [['academia', 'Academia'], ['online', 'Online']] : []), ...(equipeMinha ? [['equipe', 'Minha equipe']] : [])]
  // Começa no grupo de quem treina do mesmo jeito (igual ao card do Início).
  const atual = visoes.some(([k]) => k === grupo) ? grupo : temOnline && eu ? (online ? 'online' : 'academia') : 'geral'
  const membros = atual === 'geral' ? dados.membros : atual === 'equipe' ? dados.membros.filter((m) => m.equipe_id === equipeMinha.id) : doGrupo(dados.membros, atual)
  const tabela = ranking(dados.mes, membros)
  const minhaPos = tabela.findIndex((r) => r.id === meuAlunoId)
  const acima = minhaPos > 0 ? tabela[minhaPos - 1] : null
  const faltam = acima ? acima.dias - tabela[minhaPos].dias + 1 : 0
  const podio = tabela.slice(0, 3)
  const compartilhar = (t) => compartilharTexto(t, setCopiado)
  const abrir = (r) => setPerfilDe(dados.membros.find((m) => m.id === r.id))

  return (
    <div className="ranking-tela stack">
      <div className="ranking-cabeca">
        <h2 className="titulo-icone"><IconeLinha d={ICONES.trofeu} tamanho={26} />Ranking de {nomeDoMes()}</h2>
        <p className="meta">Quem fez mais dias de check-in neste mês</p>
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
        {!tabela.length && <p className="empty">Ninguém na turma ainda.</p>}
      </div>
      {perfilDe && <PerfilAluno membro={perfilDe} dados={dados} equipe={(dados.equipes || []).find((e) => e.id === perfilDe.equipe_id)} onFechar={() => setPerfilDe(null)} onAbrirPost={() => setPerfilDe(null)} />}
    </div>
  )
}

// Texto do top 10 para o personal mandar no WhatsApp (compartilhar do celular ou copiar no computador).
async function compartilharTexto(tabela, setCopiado) {
  const medalha = ['🥇', '🥈', '🥉']
  const linhas = tabela.slice(0, 10).map((r, i) => `${medalha[i] || `${i + 1}.`} ${nomeCurto(r.nome)} · ${plural(r.dias)}`)
  const texto = `🏆 Ranking de ${nomeDoMes()}\n\n${linhas.join('\n')}\n\nBora treinar e subir no ranking! 💪`
  try {
    if (navigator.share) return await navigator.share({ text: texto })
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  } catch { /* cancelou */ }
}

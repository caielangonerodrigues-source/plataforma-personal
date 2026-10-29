import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import Boneco from './Boneco.jsx'
import { ehIphone, inscricaoAtual, instalado, suportado } from '../lib/push.js'
import { medalhas, progressoDesafio, proximaMedalha } from '../lib/medalhas.js'
import { inicioDoMes, nomeCurto, ranking, sequencia, somarDias } from '../lib/comunidade.js'
import { fmtData, primeiroNome } from '../lib/formato.js'

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const segunda = (iso) => somarDias(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7))

// Aba "Início" da área do aluno: perfil e semana à esquerda, primeiros passos e treino do dia no meio,
// comunidade, desafio e medalhas à direita (no celular vira uma coluna só).
export default function InicioAluno({ aluno, avatar, hoje, dias, registros, avaliacoes, treinos, temAnamnese, comunidade, agenda, ficha, fichaVencida, irPara, onCheckin }) {
  const [notificacoes, setNotificacoes] = useState(true)
  const [comoInstalar, setComoInstalar] = useState(false)
  useEffect(() => { inscricaoAtual().then((s) => setNotificacoes(!!s)).catch(() => setNotificacoes(false)) }, [])

  const dados = comunidade.dados
  const todosDias = [...new Set([...dias, ...registros.map((r) => r.data)])]
  const seq = sequencia(todosDias, hoje)
  const lista = medalhas({ datas: dias, registros, avaliacoes: avaliacoes.length }, dados?.desafios || [])
  const ganhas = lista.filter((m) => m.ganhou).length
  const proxima = proximaMedalha(lista)
  const semana = segunda(hoje)
  const diasSemana = LETRAS.map((l, i) => ({ l, data: somarDias(semana, i) }))
  const naSemana = diasSemana.filter((d) => todosDias.includes(d.data)).length
  const noMes = todosDias.filter((d) => d >= inicioDoMes(hoje)).length
  const ultimasSemanas = Array.from({ length: 8 }, (_, i) => {
    const ini = somarDias(semana, -7 * (7 - i))
    return todosDias.filter((d) => d >= ini && d <= somarDias(ini, 6)).length
  })
  const maxSemana = Math.max(3, ...ultimasSemanas)

  const passos = [
    { feito: !!avatar, icone: '🙂', titulo: 'Escolha seu avatar', texto: 'Tire uma foto ou escolha um avatar pronto para aparecer na comunidade.', botao: 'Escolher avatar', acao: () => irPara('conta') },
    { feito: temAnamnese, icone: '📋', titulo: 'Preencha sua anamnese', texto: 'Seu histórico de saúde e o PAR-Q ajudam seu personal a montar um treino seguro.', botao: 'Preencher', acao: () => irPara('conta') },
    { feito: notificacoes || (!suportado() && !ehIphone()), icone: '🔔', titulo: 'Ative as notificações', texto: 'Lembrete do treino, aviso de ficha nova e relatório do mês no celular.', botao: 'Ativar', acao: () => irPara('conta') },
    { feito: instalado(), icone: '📱', titulo: 'Instale o app', texto: comoInstalar ? 'No iPhone: Compartilhar › "Adicionar à Tela de Início". No Android: menu ⋮ › "Instalar app".' : 'Abra o Corpo Atlético direto pelo ícone, como um aplicativo.', botao: 'Como instalar', acao: () => setComoInstalar(true) },
    { feito: dias.length > 0, icone: '📸', titulo: 'Faça seu primeiro check-in', texto: 'Registre o treino com uma foto e comece sua sequência de dias.', botao: 'Fazer check-in', acao: onCheckin },
  ]
  const faltam = passos.filter((p) => !p.feito)

  const membros = dados?.membros || []
  const tabela = dados ? ranking(dados.mes, membros).slice(0, 3) : []
  const desafio = (dados?.desafios || []).find((d) => d.inicio <= hoje && d.fim >= hoje)
  const feitosHoje = ficha ? ficha.exercicios.filter((e) => registros.some((r) => r.exercicio_id === e.id && r.data === hoje)).length : 0

  return (
    <div className="inicio">
      <aside className="stack inicio-esq">
        <div className="panel perfil">
          <Avatar nome={aluno.nome} avatar={avatar} fotos={dados?.fotos} tamanho={84} />
          <div className="perfil-nome">{aluno.nome}</div>
          {aluno.objetivo && <div className="meta">{aluno.objetivo}</div>}
          <div className="perfil-numeros">
            <div><span>Treinos</span><strong>{todosDias.length}</strong></div>
            <div><span>Sequência</span><strong>{seq}</strong></div>
            <div><span>Medalhas</span><strong>{ganhas}</strong></div>
          </div>
          <button className="link" onClick={onCheckin}>{dias.includes(hoje) ? 'Novo check-in ›' : 'Fazer o check-in de hoje ›'}</button>
        </div>
        <div className="panel">
          <div className="secao" style={{ marginTop: 0 }}>Esta semana</div>
          <div className="semana-num"><strong>{naSemana}</strong> {naSemana === 1 ? 'treino' : 'treinos'}</div>
          <div className="semana-dias">
            {diasSemana.map((d) => (
              <span key={d.data} className={`${todosDias.includes(d.data) ? 'on' : ''}${d.data === hoje ? ' hoje' : ''}`} title={fmtData(d.data)}>{d.l}</span>
            ))}
          </div>
          <div className="mini-barras" aria-label="Treinos nas últimas 8 semanas">
            {ultimasSemanas.map((n, i) => <i key={i} style={{ height: `${Math.max(6, (n / maxSemana) * 100)}%` }} className={i === 7 ? 'atual' : ''} title={`${n} treinos`} />)}
          </div>
          <div className="meta">Últimas 8 semanas · {noMes} {noMes === 1 ? 'treino' : 'treinos'} neste mês</div>
        </div>
      </aside>

      <div className="stack inicio-meio">
        {faltam.length > 0 && (
          <div className="panel comecar">
            <div className="comecar-banner">
              <Boneco cor="#fff" altura={120} />
              <div>
                <strong>Bem-vindo, {primeiroNome(aluno.nome)}!</strong>
                <span>Alguns passos para aproveitar tudo da Corpo Atlético.</span>
              </div>
            </div>
            <div className="row between" style={{ padding: '14px 18px 0' }}>
              <h2 style={{ margin: 0 }}>Começar</h2>
              <span className="meta">{passos.length - faltam.length} de {passos.length} feitos</span>
            </div>
            <div className="passos">
              {faltam.map((p) => (
                <div className="passo" key={p.titulo}>
                  <span className="passo-icone" aria-hidden="true">{p.icone}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="name">{p.titulo}</div>
                    <div className="meta">{p.texto}</div>
                    <button className="primary small" style={{ marginTop: 8 }} onClick={p.acao}>{p.botao}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row between"><h2 style={{ margin: 0 }}>Treino de hoje</h2>{agenda && <span className="meta">Com o personal: {agenda.data === hoje ? 'hoje' : fmtData(agenda.data).slice(0, 5)} às {agenda.hora}</span>}</div>
          {fichaVencida && <div className="aviso-ficha" style={{ margin: 0 }}><strong>Hora de trocar a ficha 💪</strong><span className="meta" style={{ color: 'inherit' }}>{fichaVencida.semanas} semanas na mesma ficha. Seu personal já foi avisado.</span></div>}
          {ficha ? (
            <>
              <div><span className="name">{ficha.nome}</span>{ficha.foco && <span className="meta"> · {ficha.foco}</span>}</div>
              <div className="meta">{feitosHoje} de {ficha.exercicios.length} exercícios feitos hoje</div>
              <div className="bar"><i style={{ width: `${ficha.exercicios.length ? Math.round((feitosHoje / ficha.exercicios.length) * 100) : 0}%` }} /></div>
              <div><button className="primary" onClick={() => irPara('treino')}>{feitosHoje ? 'Continuar treino' : 'Começar treino'}</button></div>
            </>
          ) : <p className="meta" style={{ margin: 0 }}>{treinos ? 'Seu personal ainda está montando sua ficha.' : 'Carregando…'}</p>}
        </div>
      </div>

      <aside className="stack inicio-dir">
        {aluno.comunidade && dados && (
          <div className="panel stack" style={{ gap: 10 }}>
            <div className="row between"><h2 style={{ margin: 0 }}>Comunidade</h2><button className="link" onClick={() => irPara('comunidade')}>Ver feed ›</button></div>
            <div className="meta">Ranking do mês</div>
            {tabela.map((r, i) => (
              <div key={r.id} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                <span className="meta" style={{ width: 14 }}>{i + 1}</span>
                <Avatar nome={r.nome} avatar={r.avatar} fotos={dados.fotos} tamanho={30} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: r.id === aluno.id ? 700 : 500 }}>{nomeCurto(r.nome)}</span>
                <span className="meta">{r.dias} {r.dias === 1 ? 'dia' : 'dias'}</span>
              </div>
            ))}
          </div>
        )}
        {desafio && (
          <div className="panel stack" style={{ gap: 6 }}>
            <div className="meta">🏆 Desafio</div>
            <div className="name">{desafio.titulo}</div>
            <div className="meta">{Math.min(progressoDesafio(desafio, dias), desafio.meta_dias)} de {desafio.meta_dias} dias · até {fmtData(desafio.fim).slice(0, 5)}</div>
            <div className="bar"><i style={{ width: `${Math.min(100, Math.round((progressoDesafio(desafio, dias) / desafio.meta_dias) * 100))}%` }} /></div>
          </div>
        )}
        {proxima && (
          <button className="panel stack cartao-link" style={{ gap: 6 }} onClick={() => irPara('evolucao')}>
            <div className="meta">{proxima.icone} Próxima medalha</div>
            <div className="name">{proxima.titulo}</div>
            <div className="meta">{proxima.descricao} · faltam {proxima.meta - proxima.valor}</div>
            <div className="bar"><i style={{ width: `${Math.round((proxima.valor / proxima.meta) * 100)}%` }} /></div>
          </button>
        )}
        {aluno.codigo_indicacao && (
          <button className="panel stack cartao-link" style={{ gap: 4 }} onClick={() => irPara('conta')}>
            <div className="name">🎁 Indique um amigo</div>
            <div className="meta">Treinar junto é melhor. Mande seu link e ganhe desconto na mensalidade.</div>
          </button>
        )}
      </aside>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { assinarFotos } from '../lib/fotosAssinadas.js'
import Avatar from './Avatar.jsx'
import CardTreino from './CardTreino.jsx'
import { Icone } from './BarraApp.jsx'
import { quandoFoi } from '../lib/comunidade.js'
import { fmtData } from '../lib/formato.js'

const SUBABAS = [['progresso', 'Progresso', 'evolucao'], ['atividades', 'Atividades', 'atividades'], ['galeria', 'Galeria', 'galeria'], ['mais', 'Mais', 'menu']]

// Aba "Você" (como no Strava): perfil no topo e Progresso, Atividades, Galeria e Mais.
// `progresso` é o conteúdo da evolução; `itens` são as outras seções do app para a lista do "Mais".
export default function Voce({ aluno, avatar, fotosAvatar, totalTreinos, progresso, itens, onEditar, onSair }) {
  const [sub, setSub] = useState('progresso')
  const [checkins, setCheckins] = useState(null)
  const [fotos, setFotos] = useState({})

  useEffect(() => {
    if (sub === 'progresso' || sub === 'mais' || checkins) return
    ;(async () => {
      const { data } = await supabase.from('checkins').select('*').eq('aluno_id', aluno.id).order('created_at', { ascending: false }).limit(60)
      const lista = data || []
      const caminhos = lista.map((c) => c.foto).filter(Boolean)
      const assinadas = caminhos.length ? (await assinarFotos('checkins', caminhos)).data || [] : []
      setFotos(Object.fromEntries(assinadas.filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])))
      setCheckins(lista)
    })()
  }, [sub, aluno.id, checkins])

  const comFoto = (checkins || []).filter((c) => c.foto && fotos[c.foto])

  return (
    <div className="voce">
      <div className="voce-topo">
        <Avatar nome={aluno.nome} avatar={avatar} fotos={fotosAvatar} tamanho={76} />
        <div style={{ minWidth: 0 }}>
          <h2 className="voce-nome">{aluno.nome}</h2>
          <div className="meta">{totalTreinos} {totalTreinos === 1 ? 'treino' : 'treinos'}{aluno.objetivo ? ` · ${aluno.objetivo}` : ''}</div>
        </div>
      </div>
      <div className="voce-botoes">
        <button onClick={onEditar}>Editar perfil</button>
        <button onClick={() => setSub('progresso')}>Compartilhar</button>
      </div>

      <div className="subabas" role="tablist">
        {SUBABAS.map(([k, rotulo, icone]) => (
          <button key={k} role="tab" aria-selected={sub === k} onClick={() => setSub(k)}>
            <Icone nome={icone} tamanho={26} /><span>{rotulo}</span>
          </button>
        ))}
      </div>

      {sub === 'progresso' && progresso}

      {sub === 'atividades' && (!checkins ? <p className="carregando">Carregando…</p> : (
        <div className="stack">
          {checkins.map((c) => (
            <article key={c.id} className="panel atividade">
              <div className="meta">{fmtData(c.data)} · {quandoFoi(c.created_at)}</div>
              <h3>{c.titulo || 'Treino'}</h3>
              <div style={{ margin: '0 -14px' }}><CardTreino resumo={c.resumo} /></div>
              {c.comentario && <p style={{ margin: '0 0 8px' }}>{c.comentario}</p>}
              {c.foto && fotos[c.foto] && <img className="atividade-foto" src={fotos[c.foto]} alt="" loading="lazy" />}
            </article>
          ))}
          {!checkins.length && <div className="panel empty">Nenhum check-in ainda. Toque no botão do meio para registrar seu treino.</div>}
        </div>
      ))}

      {sub === 'galeria' && (!checkins ? <p className="carregando">Carregando…</p> : comFoto.length ? (
        <div className="grade-fotos galeria">
          {comFoto.map((c) => <button key={c.id} aria-label={`Foto de ${fmtData(c.data)}`} onClick={() => window.open(fotos[c.foto], '_blank')}><img src={fotos[c.foto]} alt="" loading="lazy" /></button>)}
        </div>
      ) : <div className="panel empty">Suas fotos dos check-ins aparecem aqui.</div>)}

      {sub === 'mais' && (
        <div className="panel lista-mais">
          {itens.map((i) => (
            <button key={i.chave} onClick={i.onClick}>
              <Icone nome={i.icone} />
              <span style={{ flex: 1, minWidth: 0 }}><span className="name" style={{ display: 'block' }}>{i.rotulo}</span>{i.texto && <span className="meta">{i.texto}</span>}</span>
              {i.badge > 0 && <span className="tab-badge">{i.badge}</span>}
              <span aria-hidden="true" className="chevron">›</span>
            </button>
          ))}
          <button onClick={onSair} className="perigo"><Icone nome="sair" /><span style={{ flex: 1 }}>Sair da conta</span></button>
        </div>
      )}
    </div>
  )
}

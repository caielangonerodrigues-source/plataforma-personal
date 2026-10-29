import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { inicioDoMes } from '../lib/comunidade.js'
import { EMOJIS, acaoReacao } from '../lib/reacoes.js'
import { avisarInteracao } from '../lib/push.js'

// Curtidas com o emoji de cada reação; sem o SQL das reações, lê só as curtidas (viram ❤️).
async function lerCurtidas(ids) {
  const r = await supabase.from('curtidas').select('checkin_id, user_id, emoji').in('checkin_id', ids)
  if (!r.error) return r
  return { ...(await supabase.from('curtidas').select('checkin_id, user_id').in('checkin_id', ids)), simples: true }
}

// Feed (últimos 30 check-ins), check-ins do mês para o ranking, curtidas, comentários, fotos, avatares e equipes.
export function useComunidade() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const hoje = hojeISO()
    const [sessao, membros, feed, conquistas, desafios, equipes] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc('comunidade_membros'),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(30), // * traz o card do treino (resumo) quando o SQL novo rodou
      supabase.from('conquistas').select('*').eq('visivel', true).order('created_at', { ascending: false }).limit(20),
      supabase.from('desafios').select('*').order('fim'),
      supabase.from('equipes').select('*').order('nome'), // SQL novo: sem ele, sem equipes
    ])
    // Check-ins desde o começo do mês ou do desafio ativo mais antigo (para ranking e desafios).
    const desde = [inicioDoMes(hoje), ...(desafios.data || []).filter((d) => d.fim >= hoje).map((d) => d.inicio)].sort()[0]
    const periodo = await supabase.from('checkins').select('aluno_id, data').gte('data', desde)
    const falha = membros.error || feed.error || periodo.error || desafios.error
    if (falha) return setErro(`Não foi possível carregar a comunidade: ${falha.message}`)
    const ids = feed.data.map((c) => c.id)
    const caminhos = feed.data.map((c) => c.foto).filter(Boolean)
    const avatares = membros.data.map((m) => m.avatar).filter((a) => a && !a.startsWith('p:'))
    // Comentários e avatares são do SQL novo: se ainda não rodou, só não aparecem.
    const idsConquistas = conquistas.error ? [] : conquistas.data.map((c) => c.id)
    const [curtidas, fotos, comentarios, fotosAvatar, reacoesConquistas] = await Promise.all([
      ids.length ? lerCurtidas(ids) : { data: [] },
      caminhos.length ? supabase.storage.from('checkins').createSignedUrls(caminhos, 3600) : { data: [] },
      ids.length ? supabase.from('comentarios_checkin').select('*').in('checkin_id', ids).order('created_at') : { data: [] },
      avatares.length ? supabase.storage.from('avatares').createSignedUrls(avatares, 3600) : { data: [] },
      idsConquistas.length ? supabase.from('reacoes_conquista').select('conquista_id, user_id, emoji').in('conquista_id', idsConquistas) : { data: [] },
    ])
    setErro('')
    setDados({
      eu: sessao.data.session?.user.id,
      membros: membros.data,
      feed: feed.data,
      conquistas: conquistas.error ? [] : conquistas.data, // SQL novo: sem ele, sem conquistas no feed
      reacoesConquistas: reacoesConquistas.data || [],
      mes: periodo.data.filter((c) => c.data >= inicioDoMes(hoje)),
      periodo: periodo.data,
      desafios: desafios.data,
      equipes: equipes.error ? [] : equipes.data || [],
      curtidas: curtidas.data || [],
      reacoesSimples: !!curtidas.simples, // SQL das reações ainda não rodou: só ❤️
      comentarios: comentarios.error ? null : comentarios.data || [],
      fotos: Object.fromEntries([...(fotos.data || []), ...(fotosAvatar.data || [])].filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])),
    })
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Reação com emoji: o mesmo emoji tira, outro troca. Antes do SQL novo, só curtida (❤️).
  async function reagir(checkinId, emoji) {
    const minha = dados.curtidas.find((k) => k.checkin_id === checkinId && k.user_id === dados.eu)
    const acao = acaoReacao(minha ? minha.emoji || EMOJIS[0] : null, emoji)
    const tabela = supabase.from('curtidas')
    const { error } = acao === 'tirar'
      ? await tabela.delete().eq('checkin_id', checkinId).eq('user_id', dados.eu)
      : acao === 'trocar'
        ? await tabela.update({ emoji }).eq('checkin_id', checkinId).eq('user_id', dados.eu)
        : await tabela.insert(dados.reacoesSimples ? { checkin_id: checkinId } : { checkin_id: checkinId, emoji })
    if (error && error.code !== '23505') setErro('Não foi possível reagir agora. Tente de novo.')
    else if (!error && acao === 'colocar') avisarInteracao('reacao', { checkin_id: checkinId })
    carregar()
  }

  async function reagirConquista(conquistaId, emoji) {
    const minha = dados.reacoesConquistas.find((k) => k.conquista_id === conquistaId && k.user_id === dados.eu)
    const acao = acaoReacao(minha?.emoji || null, emoji)
    const tabela = supabase.from('reacoes_conquista')
    const { error } = acao === 'tirar'
      ? await tabela.delete().eq('conquista_id', conquistaId).eq('user_id', dados.eu)
      : acao === 'trocar'
        ? await tabela.update({ emoji }).eq('conquista_id', conquistaId).eq('user_id', dados.eu)
        : await tabela.insert({ conquista_id: conquistaId, emoji })
    if (error && error.code !== '23505') setErro('Não foi possível reagir agora. Tente de novo.')
    carregar()
  }

  async function apagar(checkin) {
    if (checkin.foto) await supabase.storage.from('checkins').remove([checkin.foto])
    const { error } = await supabase.from('checkins').delete().eq('id', checkin.id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    carregar()
  }

  async function comentar(checkinId, texto) {
    const { error } = await supabase.from('comentarios_checkin').insert({ checkin_id: checkinId, texto })
    if (error) return 'Não foi possível comentar agora. Tente de novo.'
    avisarInteracao('comentario', { checkin_id: checkinId })
    await carregar()
    return ''
  }

  async function apagarComentario(id) {
    const { error } = await supabase.from('comentarios_checkin').delete().eq('id', id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    carregar()
  }

  return { dados, erro, carregar, reagir, reagirConquista, apagar, comentar, apagarComentario }
}

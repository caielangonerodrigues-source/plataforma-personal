import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { inicioDoMes } from '../lib/comunidade.js'

// Feed (últimos 30 check-ins), check-ins do mês para o ranking, curtidas, comentários, fotos, avatares e equipes.
export function useComunidade() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const hoje = hojeISO()
    const [sessao, membros, feed, desafios, equipes] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc('comunidade_membros'),
      supabase.from('checkins').select('id, aluno_id, data, titulo, comentario, foto, created_at').order('created_at', { ascending: false }).limit(30),
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
    const [curtidas, fotos, comentarios, fotosAvatar] = await Promise.all([
      ids.length ? supabase.from('curtidas').select('checkin_id, user_id').in('checkin_id', ids) : { data: [] },
      caminhos.length ? supabase.storage.from('checkins').createSignedUrls(caminhos, 3600) : { data: [] },
      ids.length ? supabase.from('comentarios_checkin').select('*').in('checkin_id', ids).order('created_at') : { data: [] },
      avatares.length ? supabase.storage.from('avatares').createSignedUrls(avatares, 3600) : { data: [] },
    ])
    setErro('')
    setDados({
      eu: sessao.data.session?.user.id,
      membros: membros.data,
      feed: feed.data,
      mes: periodo.data.filter((c) => c.data >= inicioDoMes(hoje)),
      periodo: periodo.data,
      desafios: desafios.data,
      equipes: equipes.error ? [] : equipes.data || [],
      curtidas: curtidas.data || [],
      comentarios: comentarios.error ? null : comentarios.data || [],
      fotos: Object.fromEntries([...(fotos.data || []), ...(fotosAvatar.data || [])].filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])),
    })
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function curtir(checkinId, curtido) {
    const { error } = curtido
      ? await supabase.from('curtidas').delete().eq('checkin_id', checkinId).eq('user_id', dados.eu)
      : await supabase.from('curtidas').insert({ checkin_id: checkinId })
    if (error && error.code !== '23505') setErro('Não foi possível curtir agora. Tente de novo.')
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
    await carregar()
    return ''
  }

  async function apagarComentario(id) {
    const { error } = await supabase.from('comentarios_checkin').delete().eq('id', id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    carregar()
  }

  return { dados, erro, carregar, curtir, apagar, comentar, apagarComentario }
}

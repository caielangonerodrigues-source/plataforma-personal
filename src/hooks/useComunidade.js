import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { inicioDoMes } from '../lib/comunidade.js'

// Feed (últimos 30 check-ins), check-ins do mês para o ranking, curtidas e fotos.
export function useComunidade() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [sessao, membros, feed, mes] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc('comunidade_membros'),
      supabase.from('checkins').select('id, aluno_id, data, titulo, comentario, foto, created_at').order('created_at', { ascending: false }).limit(30),
      supabase.from('checkins').select('aluno_id, data').gte('data', inicioDoMes(hojeISO())),
    ])
    const falha = membros.error || feed.error || mes.error
    if (falha) return setErro(`Não foi possível carregar a comunidade: ${falha.message}`)
    const ids = feed.data.map((c) => c.id)
    const caminhos = feed.data.map((c) => c.foto).filter(Boolean)
    const [curtidas, fotos] = await Promise.all([
      ids.length ? supabase.from('curtidas').select('checkin_id, user_id').in('checkin_id', ids) : { data: [] },
      caminhos.length ? supabase.storage.from('checkins').createSignedUrls(caminhos, 3600) : { data: [] },
    ])
    setErro('')
    setDados({
      eu: sessao.data.session?.user.id,
      membros: membros.data,
      feed: feed.data,
      mes: mes.data,
      curtidas: curtidas.data || [],
      fotos: Object.fromEntries((fotos.data || []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])),
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

  return { dados, erro, carregar, curtir, apagar }
}

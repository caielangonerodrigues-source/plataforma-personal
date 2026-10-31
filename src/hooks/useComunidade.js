import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { inicioDoMes } from '../lib/comunidade.js'
import { EMOJIS, acaoReacao } from '../lib/reacoes.js'
import { avisarInteracao } from '../lib/push.js'
import { reduzirFoto } from '../lib/foto.js'
import { assinarFotos } from '../lib/fotosAssinadas.js'

// Nome e avatar do personal da turma, para as fotos e comentários dele no feed.
// Sem o SQL do avatar do personal, cai no nome (cadastro próprio ou o do personal do aluno).
async function personalDoGrupo() {
  const r = await supabase.rpc('personal_do_grupo')
  if (!r.error && r.data?.[0]) return { nome: r.data[0].nome || 'Personal', avatar: r.data[0].avatar }
  const { data: eu } = await supabase.from('personais').select('nome').limit(1)
  if (eu?.[0]?.nome) return { nome: eu[0].nome }
  const { data } = await supabase.rpc('pix_do_personal')
  return { nome: data?.[0]?.nome || 'Personal' }
}

// Nome e avatar de cada personal da turma (dono e equipe), para cada post sair com o nome de quem postou.
// Sem o SQL do autor do post, fica vazio e o post sai com o nome do personal da turma.
async function personaisDoGrupo() {
  const r = await supabase.rpc('personais_do_grupo')
  if (r.error) return {}
  return Object.fromEntries((r.data || []).map((p) => [p.user_id, { nome: p.nome || 'Personal', avatar: p.avatar }]))
}

// Nome e avatar de quem reagiu (alunos e personais), por login. Sem o SQL de quem curtiu, só os personais.
function juntarPessoas(r, personais) {
  const alunos = r.error ? [] : (r.data || []).map((a) => [a.user_id, { nome: a.nome, avatar: a.avatar }])
  const equipe = Object.entries(personais).map(([id, p]) => [id, { ...p, personal: true }])
  return Object.fromEntries([...alunos, ...equipe])
}

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
    const [sessao, membros, feed, conquistas, desafios, equipes, personal, personais, reagiram] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc('comunidade_membros'),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(30), // * traz o card do treino (resumo) quando o SQL novo rodou
      supabase.from('conquistas').select('*').eq('visivel', true).order('created_at', { ascending: false }).limit(20),
      supabase.from('desafios').select('*').order('fim'),
      supabase.from('equipes').select('*').order('nome'), // SQL novo: sem ele, sem equipes
      personalDoGrupo(), // para assinar as fotos que o personal posta no feed
      personaisDoGrupo(), // cada personal da equipe com o próprio nome
      supabase.rpc('quem_reagiu'), // quem curtiu: nome e avatar de cada aluno que reagiu
    ])
    const pessoas = juntarPessoas(reagiram, personais)
    // Check-ins desde o começo do mês ou do desafio ativo mais antigo (para ranking e desafios).
    const desde = [inicioDoMes(hoje), ...(desafios.data || []).filter((d) => d.fim >= hoje).map((d) => d.inicio)].sort()[0]
    const periodo = await supabase.from('checkins').select('aluno_id, data').not('aluno_id', 'is', null).gte('data', desde) // posts do personal não contam
    const falha = membros.error || feed.error || periodo.error || desafios.error
    if (falha) return setErro(`Não foi possível carregar a comunidade: ${falha.message}`)
    const ids = feed.data.map((c) => c.id)
    const caminhos = feed.data.map((c) => c.foto).filter(Boolean)
    const avatares = [...new Set([...membros.data.map((m) => m.avatar), personal.avatar, ...Object.values(personais).map((p) => p.avatar), ...Object.values(pessoas).map((p) => p.avatar)])].filter((a) => a && !a.startsWith('p:'))
    // Comentários e avatares são do SQL novo: se ainda não rodou, só não aparecem.
    const idsConquistas = conquistas.error ? [] : conquistas.data.map((c) => c.id)
    const [curtidas, fotos, comentarios, fotosAvatar, reacoesConquistas] = await Promise.all([
      ids.length ? lerCurtidas(ids) : { data: [] },
      caminhos.length ? assinarFotos('checkins', caminhos) : { data: [] },
      ids.length ? supabase.from('comentarios_checkin').select('*').in('checkin_id', ids).order('created_at') : { data: [] },
      avatares.length ? assinarFotos('avatares', avatares) : { data: [] },
      idsConquistas.length ? supabase.from('reacoes_conquista').select('conquista_id, user_id, emoji').in('conquista_id', idsConquistas) : { data: [] },
    ])
    setErro('')
    setDados({
      eu: sessao.data.session?.user.id,
      personal,
      personais,
      pessoas,
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

  // Foto do personal no feed: não é check-in, só motivação. Fica na pasta do personal no bucket dos check-ins.
  // Personal da equipe posta na turma do dono (meu_grupo), na pasta dele.
  async function postarFoto(foto, legenda) {
    const grupo = (await supabase.rpc('meu_grupo')).data || dados.eu
    const caminho = `${grupo}/${crypto.randomUUID()}.jpg`
    const envio = await supabase.storage.from('checkins').upload(caminho, await reduzirFoto(foto), { contentType: 'image/jpeg' })
    if (envio.error) return `Não foi possível enviar a foto: ${envio.error.message}`
    const { error } = await supabase.from('checkins').insert({ personal_id: grupo, data: hojeISO(), comentario: legenda.trim() || null, foto: caminho })
    if (error) {
      await supabase.storage.from('checkins').remove([caminho])
      return /personal_id/.test(error.message) ? 'Falta rodar o SQL das fotos do personal (veja o README, passo 13).' : `Não foi possível postar: ${error.message}`
    }
    await carregar()
    return ''
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

  return { dados, erro, carregar, reagir, reagirConquista, apagar, comentar, apagarComentario, postarFoto }
}

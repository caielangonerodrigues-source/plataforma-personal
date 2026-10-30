// Assistente de IA do personal: sugere fichas de treino ou dieta a partir da avaliação física,
// da anamnese e do objetivo do aluno, e escreve o relatório mensal de evolução. Usa a API do Claude (Anthropic).
// Segredo necessário no Supabase: ANTHROPIC_API_KEY (chave criada em console.anthropic.com).
// A sugestão só volta para a tela; nada é gravado sem o personal clicar em "Aplicar".
import Anthropic from 'npm:@anthropic-ai/sdk@1'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CHAVE = Deno.env.get('ANTHROPIC_API_KEY')
const MODELO = Deno.env.get('IA_MODELO') || 'claude-haiku-5-5' // o mais barato; troque com o secret IA_MODELO
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const texto = { type: 'string' }
const numero = { type: 'number' }

const ESQUEMA_TREINO = obj({
  resumo: texto,
  fichas: {
    type: 'array',
    items: obj({
      nome: texto,
      foco: texto,
      exercicios: { type: 'array', items: obj({ nome: texto, series: { type: 'integer' }, reps: texto, descanso: texto, obs: texto }) },
    }),
  },
  observacoes: texto,
})

const ESQUEMA_DIETA = obj({
  resumo: texto,
  calorias: { type: 'integer' }, proteina: { type: 'integer' }, carboidrato: { type: 'integer' }, gordura: { type: 'integer' }, agua: numero,
  refeicoes: {
    type: 'array',
    items: obj({
      nome: texto,
      horario: texto,
      itens: { type: 'array', items: obj({ alimento: texto, quantidade: texto, gramas: numero, kcal: numero, proteina: numero, carboidrato: numero, gordura: numero }) },
    }),
  },
  orientacoes: texto,
})

const lista = { type: 'array', items: texto }
const ESQUEMA_RELATORIO = obj({ titulo: texto, resumo: texto, destaques: lista, atencao: lista, proximo_mes: texto, mensagem: texto })

const SISTEMA = `Você é o assistente de um personal trainer brasileiro. Você prepara rascunhos que o personal revisa antes de entregar ao aluno.
Escreva em português do Brasil, linguagem simples.
Regras:
- Respeite o PAR-Q e a anamnese: com dor, lesão, doença, cirurgia ou remédio relevante, evite o que agrava, prefira variações seguras e diga isso nas observações.
- Treino: use os nomes da biblioteca de exercícios enviada sempre que possível (exatamente como estão escritos). Fichas com letras A, B, C... Séries e repetições compatíveis com o nível e o objetivo. Descanso no formato "60s" ou "2 min". Em "obs" coloque cadência, técnica ou cuidado, ou deixe vazio.
- Dieta: é orientação nutricional geral para quem treina, não dieta clínica. Use alimentos comuns no Brasil, medidas caseiras em "quantidade" e o peso em "gramas". Estime kcal e macros de cada item. A soma das refeições deve ficar perto das metas. Se houver condição clínica (diabetes, doença renal, gestação, alergias, transtorno alimentar), diga nas orientações que o aluno precisa de nutricionista.
- "resumo": 2 a 3 frases explicando a lógica para o personal.
- Relatório mensal: o texto é para o ALUNO (fale com ele por "você"), em tom de treinador animado e honesto. Use só os números enviados, não invente dados. "titulo" curto (ex.: "Seu outubro em números"). "resumo" com 2 a 4 frases. "destaques": 2 a 4 conquistas concretas com números. "atencao": 0 a 2 pontos para melhorar, sem culpa. "proximo_mes": a meta ou o foco do próximo mês em 1 ou 2 frases. "mensagem": texto pronto para o WhatsApp, até 700 caracteres, com quebras de linha, pode ter 1 ou 2 emojis, assinado como o personal (sem colocar nome).`

type Pedido = { tipo?: string; aluno_id?: string; pedido?: string; exercicios?: string[]; mes?: string; numeros?: unknown }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!CHAVE) return resposta({ erro: 'O assistente de IA ainda não foi configurado. Veja o passo "Assistente de IA" no README.' }, 503)
  try {
    const { tipo, aluno_id, pedido, exercicios, mes, numeros }: Pedido = await req.json()
    if (tipo !== 'treino' && tipo !== 'dieta' && tipo !== 'relatorio') return resposta({ erro: 'Escolha treino, dieta ou relatório.' }, 400)

    // Lê com o login de quem chamou: as regras do banco garantem que só o personal do aluno enxerga.
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await db.auth.getUser()
    if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401)
    // Qualquer personal da academia (equipe, supabase/migracao-equipe-localizacao.sql) usa o assistente.
    const eq = await db.rpc('eh_personal')
    const ehPersonal = eq.error ? !!(await db.from('personais').select('user_id').eq('user_id', user.id).maybeSingle()).data : eq.data === true
    if (!ehPersonal) return resposta({ erro: 'Só o personal usa o assistente.' }, 403)
    const { data: aluno } = await db.from('alunos')
      .select('nome, sexo, idade, objetivo, modalidade, avaliacoes(data, peso, altura, gordura, cintura, quadril, braco, coxa), treinos(nome, foco, exercicios(nome, series, reps))')
      .eq('id', String(aluno_id)).maybeSingle()
    if (!aluno) return resposta({ erro: 'Aluno não encontrado.' }, 404)
    const { data: anamnese } = await db.from('anamneses').select('*').eq('aluno_id', String(aluno_id)).maybeSingle()
    const avaliacoes = (aluno.avaliacoes || []).sort((a: { data: string }, b: { data: string }) => (a.data < b.data ? -1 : 1)).slice(-3)
    const { avaliacoes: _a, ...cadastro } = aluno
    const { aluno_id: _b, id: _c, ...saude } = anamnese || {}

    const PEDIDOS = { treino: 'montar as fichas de treino', dieta: 'montar o plano alimentar do dia', relatorio: `escrever o relatório de evolução do mês ${String(mes || '').slice(0, 7)}` }
    const contexto = [
      `Pedido: ${PEDIDOS[tipo]}.`,
      `Aluno: ${JSON.stringify({ ...cadastro, nome: String(cadastro.nome || '').split(' ')[0] })}`,
      `Avaliações físicas (mais recentes por último; altura em metros, gordura em %, medidas em cm): ${avaliacoes.length ? JSON.stringify(avaliacoes) : 'nenhuma'}`,
      `Anamnese e PAR-Q: ${anamnese ? JSON.stringify(saude) : 'não preenchida'}`,
      tipo === 'relatorio' ? `Números do mês calculados pelo sistema (diasTreinados, checkins, cargas com de/para em kg comparando com o mês anterior, subiram = quantos exercícios aumentaram carga, avaliacao com diferenças para a anterior, fotos, trocas de exercício): ${JSON.stringify(numeros ?? {}).slice(0, 6000)}` : '',
      tipo === 'treino' && Array.isArray(exercicios) ? `Biblioteca de exercícios: ${exercicios.slice(0, 400).join('; ')}` : '',
      `Instruções do personal: ${String(pedido || '').slice(0, 2000) || 'nenhuma'}`,
    ].filter(Boolean).join('\n\n')

    const client = new Anthropic({ apiKey: CHAVE })
    const r = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // O Haiku não tem fallback no servidor; os outros modelos trocam de modelo sozinhos se recusarem.
      ...(MODELO.includes('haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
      system: SISTEMA,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: { treino: ESQUEMA_TREINO, dieta: ESQUEMA_DIETA, relatorio: ESQUEMA_RELATORIO }[tipo] } },
      messages: [{ role: 'user', content: contexto }],
    // deno-lint-ignore no-explicit-any
    } as any)
    if (r.stop_reason === 'refusal') return resposta({ erro: 'A IA não quis responder este pedido. Tente reescrever as instruções.' }, 422)
    if (r.stop_reason === 'max_tokens') return resposta({ erro: 'A resposta ficou grande demais. Peça menos fichas ou refeições.' }, 422)
    // deno-lint-ignore no-explicit-any
    const bloco = r.content.find((b: any) => b.type === 'text') as { text: string } | undefined
    if (!bloco) return resposta({ erro: 'A IA não devolveu resposta.' }, 502)
    return resposta({ resultado: JSON.parse(bloco.text) })
  } catch (e) {
    console.error(e)
    if (e instanceof Anthropic.AuthenticationError) return resposta({ erro: 'A chave da IA (ANTHROPIC_API_KEY) está errada.' }, 502)
    if (e instanceof Anthropic.RateLimitError) return resposta({ erro: 'Muitos pedidos seguidos. Espere um minuto e tente de novo.' }, 429)
    if (e instanceof Anthropic.APIError) return resposta({ erro: `A IA está indisponível agora (${e.status}). Tente de novo em instantes.` }, 502)
    return resposta({ erro: 'Erro ao falar com a IA.' }, 500)
  }
})

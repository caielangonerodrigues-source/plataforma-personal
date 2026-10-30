// Métodos de treino que o personal marca no exercício. `junta`: quantos exercícios seguidos fazem parte
// do mesmo bloco (bi-set = 2, tri-set = 3; série gigante = todos os seguidos com o mesmo método).
export const METODOS = {
  rest_pause: { nome: 'Rest-pause', texto: 'Vá até a falha, descanse 10 a 15 segundos e faça mais repetições. Repita 2 ou 3 vezes.' },
  drop_set: { nome: 'Drop set', texto: 'Na última série, ao chegar na falha, tire 20 a 30% da carga e continue sem descanso. Pode repetir 2 vezes.' },
  biset: { nome: 'Bi-set', junta: 2, texto: 'Faça os 2 exercícios em seguida, sem descanso entre eles. Descanse só no fim dos dois.' },
  triset: { nome: 'Tri-set', junta: 3, texto: 'Faça os 3 exercícios em seguida, sem descanso entre eles. Descanse só no fim dos três.' },
  superserie: { nome: 'Superset', junta: 2, texto: 'Dois exercícios de músculos opostos em seguida, sem descanso entre eles.' },
  gigante: { nome: 'Série gigante', junta: Infinity, texto: '4 ou mais exercícios em seguida, sem descanso entre eles. Descanse só no fim da volta.' },
  pre_exaustao: { nome: 'Pré-exaustão', junta: 2, texto: 'Primeiro o exercício isolado, depois o composto, sem descanso entre eles.' },
  piramide: { nome: 'Pirâmide crescente', texto: 'A cada série, aumente a carga e diminua as repetições.' },
  piramide_inversa: { nome: 'Pirâmide decrescente', texto: 'Comece com a carga mais pesada e, a cada série, tire carga e faça mais repetições.' },
  cluster: { nome: 'Cluster set', texto: 'Divida cada série em blocos curtos, com 10 a 20 segundos de pausa entre eles.' },
  negativa: { nome: 'Negativa', texto: 'Desça a carga bem devagar, em 3 a 5 segundos, controlando o movimento.' },
  isometria: { nome: 'Isometria', texto: 'Segure parado na posição de maior contração pelo tempo combinado antes de voltar.' },
  parciais: { nome: 'Parciais', texto: 'Depois da falha, continue com repetições curtas na parte mais difícil do movimento.' },
  fst7: { nome: 'FST-7', texto: '7 séries de 10 a 12 repetições com só 30 a 45 segundos de descanso, no fim do treino.' },
  gvt: { nome: 'GVT 10×10', texto: '10 séries de 10 repetições com a mesma carga e 60 a 90 segundos de descanso.' },
}

export const nomeMetodo = (id) => METODOS[id]?.nome || ''

// Para cada exercício da ficha: null, ou o bloco do método combinado em que ele está
// ({ metodo, indice, total }), juntando os seguidos com o mesmo método de `junta` em `junta`.
export function blocosDeMetodo(exercicios) {
  const blocos = exercicios.map(() => null)
  let i = 0
  while (i < exercicios.length) {
    const m = exercicios[i].metodo
    const junta = METODOS[m]?.junta
    if (!junta) { i++; continue }
    let fim = i
    while (fim + 1 < exercicios.length && exercicios[fim + 1].metodo === m && fim + 1 - i < junta) fim++
    const total = fim - i + 1
    if (total > 1) for (let k = i; k <= fim; k++) blocos[k] = { metodo: m, indice: k - i + 1, total }
    i = fim + 1
  }
  return blocos
}

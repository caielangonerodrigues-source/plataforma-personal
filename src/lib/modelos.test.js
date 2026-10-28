import test from 'node:test'
import assert from 'node:assert/strict'
import { MODELOS_PRONTOS, fichasDoAluno, letrasAoAplicar, resumoModelo } from './modelos.js'

test('letras continuam depois das fichas que o aluno já tem', () => {
  const modelo = [{ nome: 'A' }, { nome: 'B' }]
  assert.deepEqual(letrasAoAplicar(modelo, []), ['A', 'B'])
  assert.deepEqual(letrasAoAplicar(modelo, [{ nome: 'A' }, { nome: 'C' }]), ['B', 'D'])
})

test('fichas do aluno viram modelo sem ids', () => {
  const f = fichasDoAluno([{ id: 1, nome: 'A', foco: 'Pernas', exercicios: [{ id: 9, treino_id: 1, nome: 'Agachamento', series: 4, reps: '10', carga: '30 kg', descanso: '90s', obs: null, video_url: null, ordem: 0 }] }])
  assert.deepEqual(f, [{ nome: 'A', foco: 'Pernas', exercicios: [{ nome: 'Agachamento', series: 4, reps: '10', carga: '30 kg', descanso: '90s', obs: null, video_url: null }] }])
})

test('modelos prontos têm fichas com exercícios', () => {
  for (const m of MODELOS_PRONTOS) assert.ok(m.fichas.every((f) => f.exercicios.length >= 5), m.nome)
  assert.equal(resumoModelo(MODELOS_PRONTOS[1]), '3 fichas · 18 exercícios')
})

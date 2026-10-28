import test from 'node:test'
import assert from 'node:assert/strict'
import { compararMedidas, limparMedidas, paraAvaliacao } from './consultoria.js'

test('compara com o envio anterior só o que foi medido', () => {
  const linhas = compararMedidas({ cintura: 80, quadril: 98, braco_d: 33 }, { cintura: 82.5, braco_d: 33 })
  assert.deepEqual(linhas.map((l) => [l.chave, l.valor, l.delta]), [['cintura', 80, -2.5], ['quadril', 98, null], ['braco_d', 33, 0]])
})

test('limpa o formulário aceitando vírgula', () => {
  assert.deepEqual(limparMedidas({ cintura: '80,5', quadril: '', braco_d: 'x', coxa_d: ' 55 ' }), { cintura: 80.5, coxa_d: 55 })
})

test('envio vira avaliação com braço e coxa do lado direito', () => {
  const a = paraAvaliacao({ data: '2026-10-28', peso: 70.2, gordura: null, medidas: { cintura: 80, braco_e: 31, coxa_d: 55 } })
  assert.deepEqual(a, { data: '2026-10-28', peso: 70.2, gordura: '', cintura: 80, quadril: '', braco: 31, coxa: 55 })
})

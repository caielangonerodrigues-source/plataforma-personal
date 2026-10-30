import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataBRparaISO, dataISOparaBR, mascaraData } from './formato.js'

test('data digitada ganha as barras sozinha', () => {
  assert.equal(mascaraData('1'), '1')
  assert.equal(mascaraData('150'), '15/0')
  assert.equal(mascaraData('15031998'), '15/03/1998')
  assert.equal(mascaraData('15/03/19985'), '15/03/1998')
})

test('converte dd/mm/aaaa para AAAA-MM-DD e recusa datas que não existem', () => {
  assert.equal(dataBRparaISO('15/03/1998'), '1998-03-15')
  assert.equal(dataBRparaISO('29/02/2000'), '2000-02-29')
  assert.equal(dataBRparaISO('29/02/2001'), '')
  assert.equal(dataBRparaISO('31/04/1990'), '')
  assert.equal(dataBRparaISO('15/03/19'), '')
  assert.equal(dataISOparaBR('1998-03-15'), '15/03/1998')
  assert.equal(dataISOparaBR(null), '')
})

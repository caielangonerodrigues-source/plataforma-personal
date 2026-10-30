import { useEffect, useState } from 'react'
import { dataBRparaISO, dataISOparaBR, mascaraData } from '../lib/formato.js'

// Campo de data para digitar (dd/mm/aaaa) em vez do calendário do celular, que obriga a voltar ano por ano.
// Recebe e devolve a data em AAAA-MM-DD; devolve '' enquanto a data estiver incompleta ou não existir.
export default function CampoData({ value, onChange, max, ...resto }) {
  const [texto, setTexto] = useState(() => dataISOparaBR(value))
  useEffect(() => { if (value && value !== dataBRparaISO(texto)) setTexto(dataISOparaBR(value)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const iso = dataBRparaISO(texto)
  const invalida = texto.length === 10 && (!iso || (max && iso > max))
  return (
    <input
      {...resto}
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      maxLength={10}
      value={texto}
      aria-invalid={invalida || undefined}
      onChange={(e) => {
        const t = mascaraData(e.target.value)
        setTexto(t)
        const novo = dataBRparaISO(t)
        onChange(novo && !(max && novo > max) ? novo : '')
      }}
      onBlur={(e) => { e.target.setCustomValidity(invalida ? 'Data inválida. Use dd/mm/aaaa.' : '') }}
    />
  )
}

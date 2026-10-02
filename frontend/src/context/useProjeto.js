import { createContext, useContext } from 'react'

// Separado do ProjetoContext.jsx para que aquele arquivo exporte só o componente (fast refresh).
export const ProjetoContext = createContext(null)

export function useProjeto() {
  const contexto = useContext(ProjetoContext)
  if (!contexto) throw new Error('useProjeto precisa estar dentro de um ProjetoProvider')
  return contexto
}

import { GLOSSARIO } from '../conteudo/glossario.js'

// Sigla com a definição do glossário no `title` (passar o mouse / leitor de tela).
export default function Termo({ sigla, children }) {
  const termo = GLOSSARIO[sigla]
  if (!termo) return children ?? sigla
  return (
    <abbr className="termo" title={`${termo.nome}: ${termo.definicao}`}>
      {children ?? sigla}
    </abbr>
  )
}

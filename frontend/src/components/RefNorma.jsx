import { useId } from 'react'

function Popover({ id, clausula, children }) {
  return (
    <div id={id} popover="auto" className="ref-norma-popover">
      <div className="ref-norma-cabecalho">
        <span className="ref-norma-titulo">NBR 5410 · {clausula}</span>
        <button
          type="button"
          className="ref-norma-fechar"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      <p>{children}</p>
      <p className="ref-norma-rodape">
        Resumo elaborado pela ferramenta — consulte o texto integral da norma para o projeto formal.
      </p>
    </div>
  )
}

// Chip "NBR 5410 §…" que abre a citação completa num popover nativo — tira o parágrafo de
// referência do caminho de quem só quer preencher. Usado no título de cada etapa.
export default function RefNorma({ clausulas, children }) {
  const id = useId()
  return (
    <>
      <button type="button" className="ref-norma" popoverTarget={id}>
        NBR 5410 {clausulas}{' '}
        <span className="ref-norma-icone" aria-hidden="true">
          i
        </span>
      </button>
      <Popover id={id} clausula={clausulas}>
        {children}
      </Popover>
    </>
  )
}

// Versão compacta — só o ⓘ — para citar uma cláusula dentro de tabelas, itens de checklist e
// parágrafos, sem repetir "NBR 5410" toda hora. `children` é o mesmo texto que already explica
// a cláusula ao lado (Linha, item de checklist etc.): o popover não inventa um resumo novo.
export function ClausulaInfo({ clausula, children }) {
  const id = useId()
  return (
    <>
      <button
        type="button"
        className="ref-norma-icone-btn"
        popoverTarget={id}
        aria-label={`Sobre a NBR 5410 ${clausula}`}
      >
        i
      </button>
      <Popover id={id} clausula={clausula}>
        {children}
      </Popover>
    </>
  )
}

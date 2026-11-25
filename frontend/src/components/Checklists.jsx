import { ADVERTENCIA_QUADRO } from '../calculations/checklists.js'

function Itens({ grupo }) {
  return (
    <>
      <ul>
        {grupo.itens.map((item) => (
          <li key={item.texto}>
            <span className="checklist-caixa" aria-hidden="true">
              ☐
            </span>{' '}
            {item.texto} <span className="texto-fraco">· {item.clausula}</span>
          </li>
        ))}
      </ul>
      {grupo.titulo === 'Quadro de distribuição' && (
        <blockquote className="advertencia-quadro">
          <strong>ADVERTÊNCIA</strong>
          {ADVERTENCIA_QUADRO.map((paragrafo) => (
            <p key={paragrafo.slice(0, 20)}>{paragrafo}</p>
          ))}
        </blockquote>
      )}
    </>
  )
}

// Listas de verificação (§1.3 do PLANO). Na tela, cada grupo recolhe (<details>); no memorial
// (`abertos`), cada grupo é uma seção comum — no papel nada fica recolhido nem com seta.
export default function Checklists({ grupos, abertos = false }) {
  if (abertos) {
    return (
      <>
        {grupos.map((grupo) => (
          <section className="checklist checklist-aberto" key={grupo.titulo}>
            <h3>
              {grupo.titulo} <span className="texto-fraco">({grupo.itens.length})</span>
            </h3>
            <Itens grupo={grupo} />
          </section>
        ))}
      </>
    )
  }
  return (
    <>
      {grupos.map((grupo) => (
        <details className="detalhes-calculo checklist" key={grupo.titulo}>
          <summary>
            {grupo.titulo} <span className="texto-fraco">({grupo.itens.length})</span>
          </summary>
          <Itens grupo={grupo} />
        </details>
      ))}
    </>
  )
}

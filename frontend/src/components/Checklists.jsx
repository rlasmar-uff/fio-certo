import { ADVERTENCIA_QUADRO } from '../calculations/checklists.js'

// Listas de verificação (§1.3 do PLANO). Na tela, cada grupo recolhe; no memorial, sai tudo aberto.
export default function Checklists({ grupos, abertos = false }) {
  return (
    <>
      {grupos.map((grupo) => (
        <details className="detalhes-calculo checklist" key={grupo.titulo} open={abertos || undefined}>
          <summary>
            {grupo.titulo} <span className="texto-fraco">({grupo.itens.length})</span>
          </summary>
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
        </details>
      ))}
    </>
  )
}

// Justificativa longa recolhida numa linha — aberta só por quem quer saber o porquê.
// `aberta`: no memorial impresso, o texto sai como parágrafo (nada fica recolhido no papel).
export default function Nota({ titulo = 'Por que assim?', aberta = false, children }) {
  if (aberta) {
    return (
      <div className="nota nota-aberta">
        <strong>{titulo}</strong> <span className="nota-corpo">{children}</span>
      </div>
    )
  }
  return (
    <details className="nota">
      <summary>{titulo}</summary>
      <div className="nota-corpo">{children}</div>
    </details>
  )
}

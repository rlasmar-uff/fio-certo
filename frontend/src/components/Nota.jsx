// Justificativa longa recolhida numa linha — aberta só por quem quer saber o porquê.
export default function Nota({ titulo = 'Por que assim?', children }) {
  return (
    <details className="nota">
      <summary>{titulo}</summary>
      <div className="nota-corpo">{children}</div>
    </details>
  )
}

import { Children, cloneElement, useId, useState } from 'react'

// Rótulo + controle + ajuda + erro. O erro só aparece depois que o usuário sai do campo (onBlur),
// para não acusar um formulário que ele ainda nem começou a preencher.
export default function Campo({ label, ajuda, erro, unidade, children }) {
  const id = useId()
  const [tocado, setTocado] = useState(false)
  const mostrarErro = tocado && erro
  const controle = Children.only(children)
  const descritoPor = [ajuda && `${id}-ajuda`, mostrarErro && `${id}-erro`].filter(Boolean).join(' ')

  const campo = cloneElement(controle, {
    id,
    'aria-invalid': mostrarErro ? true : undefined,
    'aria-describedby': descritoPor || undefined,
    onBlur: (evento) => {
      setTocado(true)
      controle.props.onBlur?.(evento)
    },
  })

  return (
    <div className="campo-container">
      <label className="campo-label" htmlFor={id}>
        {label}
        {unidade && <span className="sr-only"> ({unidade})</span>}
      </label>
      {unidade ? (
        <span className="campo-com-unidade">
          {campo}
          <span className="campo-unidade" aria-hidden="true">
            {unidade}
          </span>
        </span>
      ) : (
        campo
      )}
      {ajuda && (
        <span id={`${id}-ajuda`} className="campo-ajuda">
          {ajuda}
        </span>
      )}
      {mostrarErro && (
        <span id={`${id}-erro`} className="campo-erro">
          {erro}
        </span>
      )}
    </div>
  )
}

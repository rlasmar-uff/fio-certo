import { useTema } from '../hooks/useTema.js'

// Ícones em SVG inline (traço herda a cor do texto) — emoji renderiza diferente em cada sistema.
const ICONES = {
  sistema: <path d="M3 5h18v11H3zM8 20h8M12 16v4" />,
  claro: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  escuro: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
}

const OPCOES = [
  { valor: 'sistema', label: 'Automático' },
  { valor: 'claro', label: 'Claro' },
  { valor: 'escuro', label: 'Escuro' },
]

export default function SeletorTema() {
  const { tema, setTema } = useTema()

  return (
    <div className="seletor-tema" role="group" aria-label="Tema do sistema">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className={`seletor-tema-opcao ${tema === opcao.valor ? 'ativo' : ''}`}
          aria-pressed={tema === opcao.valor}
          aria-label={opcao.label}
          title={opcao.label}
          onClick={() => setTema(opcao.valor)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {ICONES[opcao.valor]}
          </svg>
        </button>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ROUTES } from '../routes.js'
import SeletorTema from './SeletorTema.jsx'

function LinksNavegacao({ aoNavegar }) {
  const { pathname } = useLocation()
  // "Calculadora" aponta para a 1ª etapa, mas deve aparecer ativo em qualquer etapa.
  const naCalculadora = pathname.startsWith('/calculadora')
  return (
    <>
      <NavLink to={ROUTES.home} end onClick={aoNavegar}>
        Início
      </NavLink>
      <Link
        to={ROUTES.instalacao}
        className={naCalculadora ? 'active' : undefined}
        aria-current={naCalculadora ? 'page' : undefined}
        onClick={aoNavegar}
      >
        Calculadora
      </Link>
      <NavLink to={ROUTES.projetos} onClick={aoNavegar}>
        Projetos
      </NavLink>
      <NavLink to={ROUTES.conformidade} onClick={aoNavegar}>
        Conformidade
      </NavLink>
      <NavLink to={ROUTES.sobre} onClick={aoNavegar}>
        Sobre
      </NavLink>
    </>
  )
}

export default function Navbar() {
  const [menuAberto, setMenuAberto] = useState(false)
  const fecharMenu = () => setMenuAberto(false)

  useEffect(() => {
    if (!menuAberto) return
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setMenuAberto(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [menuAberto])

  return (
    <header className="navbar">
      <div className="navbar-linha">
        <NavLink to={ROUTES.home} className="navbar-titulo" onClick={fecharMenu}>
          <svg className="navbar-logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="var(--logo-tile)" />
            <path
              d="M9 16.5 14 21.5 23 10.5"
              fill="none"
              stroke="var(--logo-acento)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="16.5" r="1.7" fill="var(--logo-acento)" />
            <circle cx="23" cy="10.5" r="1.7" fill="var(--logo-acento)" />
          </svg>
          Fio Certo
        </NavLink>

        <nav className="navbar-links navbar-links-desktop" aria-label="Principal">
          <LinksNavegacao />
        </nav>

        <div className="navbar-tema-desktop">
          <SeletorTema />
        </div>

        <button
          type="button"
          className={`navbar-toggle ${menuAberto ? 'aberto' : ''}`}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-mobile"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuAberto && (
        <nav id="menu-mobile" className="navbar-links navbar-links-mobile" aria-label="Principal">
          <LinksNavegacao aoNavegar={fecharMenu} />
          <div className="navbar-tema-mobile">
            <SeletorTema />
          </div>
        </nav>
      )}
    </header>
  )
}

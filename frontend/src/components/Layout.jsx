import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import LimiteErro from './LimiteErro.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  const primeiraRenderizacao = useRef(true)

  // A cada troca de rota: volta ao topo (senão "Avançar" no fim de uma página longa cai no
  // meio da próxima), põe o título da etapa na aba e leva o foco ao h1 — quem usa leitor de
  // tela ouve a página nova em vez de continuar onde estava. Na carga inicial o foco não é
  // movido, para não roubar o foco de quem acabou de abrir o site.
  useEffect(() => {
    window.scrollTo(0, 0)
    const titulo = document.querySelector('main h1')
    document.title = titulo ? `${titulo.textContent} — Fio Certo` : 'Fio Certo — dimensionamento elétrico residencial'
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    if (titulo) {
      titulo.setAttribute('tabindex', '-1')
      titulo.focus({ preventScroll: true })
    }
  }, [pathname])

  // Ao imprimir, abre todo <details> (senão o "como foi calculado" sai cortado no PDF) e volta
  // ao estado anterior depois.
  useEffect(() => {
    let fechados = []
    const abrir = () => {
      fechados = [...document.querySelectorAll('details:not([open])')]
      fechados.forEach((detalhe) => detalhe.setAttribute('open', ''))
    }
    const restaurar = () => fechados.forEach((detalhe) => detalhe.removeAttribute('open'))
    window.addEventListener('beforeprint', abrir)
    window.addEventListener('afterprint', restaurar)
    return () => {
      window.removeEventListener('beforeprint', abrir)
      window.removeEventListener('afterprint', restaurar)
    }
  }, [])

  return (
    <div className="layout">
      <Navbar />
      <main className="conteudo">
        <LimiteErro key={pathname}>
          <Outlet />
        </LimiteErro>
      </main>
      <Footer />
    </div>
  )
}

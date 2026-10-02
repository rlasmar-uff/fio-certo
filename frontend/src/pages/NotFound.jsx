import { Link } from 'react-router-dom'
import { ROUTES } from '../routes.js'

export default function NotFound() {
  return (
    <section className="not-found">
      <h1>Página não encontrada</h1>
      <Link to={ROUTES.home}>Voltar ao início</Link>
    </section>
  )
}

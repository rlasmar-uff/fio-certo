import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Sobre from './pages/Sobre.jsx'
import NotFound from './pages/NotFound.jsx'
import Conformidade from './pages/Conformidade.jsx'
import Projetos from './pages/Projetos.jsx'
import AbrirLink from './pages/AbrirLink.jsx'
import Instalacao from './pages/calculadora/Instalacao.jsx'
import Comodos from './pages/calculadora/Comodos.jsx'
import Circuitos from './pages/calculadora/Circuitos.jsx'
import Dimensionamento from './pages/calculadora/Dimensionamento.jsx'
import Resultado from './pages/calculadora/Resultado.jsx'
import Memorial from './pages/calculadora/Memorial.jsx'
import Consumo from './pages/calculadora/Consumo.jsx'
import Planta from './pages/calculadora/Planta.jsx'
import VolumesBanheiro from './pages/calculadora/VolumesBanheiro.jsx'
import Comparar from './pages/calculadora/Comparar.jsx'
import { ROUTES } from './routes.js'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<Home />} />
        <Route path={ROUTES.sobre} element={<Sobre />} />
        <Route path={ROUTES.conformidade} element={<Conformidade />} />
        <Route path={ROUTES.projetos} element={<Projetos />} />
        <Route path={ROUTES.abrir} element={<AbrirLink />} />
        <Route path={ROUTES.instalacao} element={<Instalacao />} />
        <Route path={ROUTES.comodos} element={<Comodos />} />
        <Route path={ROUTES.circuitos} element={<Circuitos />} />
        <Route path={ROUTES.dimensionamento} element={<Dimensionamento />} />
        <Route path={ROUTES.resultado} element={<Resultado />} />
        <Route path={ROUTES.memorial} element={<Memorial />} />
        <Route path={ROUTES.consumo} element={<Consumo />} />
        <Route path={ROUTES.planta} element={<Planta />} />
        <Route path={ROUTES.banheiro} element={<VolumesBanheiro />} />
        <Route path={ROUTES.comparar} element={<Comparar />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

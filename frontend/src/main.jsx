import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ProjetoProvider } from './context/ProjetoContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* HashRouter: o GitHub Pages só serve arquivos estáticos, então uma rota como
        /calculadora/resultado recarregada daria 404 — com #/ a rota fica no fragmento. */}
    <HashRouter>
      <ProjetoProvider>
        <App />
      </ProjetoProvider>
    </HashRouter>
  </StrictMode>,
)

// PWA: só no build de produção (no dev o cache atrapalharia o recarregamento do Vite). Caminho
// relativo, para funcionar em qualquer subpasta do GitHub Pages.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // sem service worker o site continua funcionando, só não fica disponível offline
    })
  })
}

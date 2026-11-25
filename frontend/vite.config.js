import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Versão mostrada no memorial (capa e rodapé): commit do build + data. Fora de um repositório Git,
// fica só a data.
function versaoDoBuild() {
  const data = new Date().toLocaleDateString('pt-BR')
  try {
    const commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return `${commit} (${data})`
  } catch {
    return `build ${data}`
  }
}

// base relativa: o build funciona em qualquer caminho do GitHub Pages (usuario.github.io/<repo>/),
// sem depender do nome do repositório — possível porque o roteamento é por hash (main.jsx).
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { 'import.meta.env.VITE_VERSAO': JSON.stringify(versaoDoBuild()) },
})

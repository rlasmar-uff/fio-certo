import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: o build funciona em qualquer caminho do GitHub Pages (usuario.github.io/<repo>/),
// sem depender do nome do repositório — possível porque o roteamento é por hash (main.jsx).
export default defineConfig({
  base: './',
  plugins: [react()],
})

import { defineConfig, devices } from '@playwright/test'

// Testa o build de produção (vite preview), não o servidor de desenvolvimento — é o mesmo
// artefato estático que vai para o GitHub Pages.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173' },
  // Chrome, Firefox e Safari (WebKit): os três motores que o site precisa suportar.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})

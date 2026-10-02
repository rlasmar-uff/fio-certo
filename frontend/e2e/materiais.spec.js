import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Proteção e resultado' })).toBeVisible()
})

test('resultado mostra unifilar, quadro e lista de materiais com folga', async ({ page }) => {
  await expect(page.getByRole('img', { name: /Diagrama unifilar: disjuntor geral 63 A, 6 circuitos/ })).toBeVisible()
  await expect(page.getByRole('list', { name: /Quadro com \d+ módulos/ })).toBeVisible()
  const materiais = page.locator('.secao-materiais')
  await expect(materiais.getByRole('cell', { name: '39 m' })).toBeVisible()
  await materiais.getByLabel('Folga nos comprimentos').fill('10')
  await expect(materiais.getByRole('cell', { name: '43 m' })).toBeVisible()
})

test('instalação existente fora do critério aparece no dimensionamento e no veredito', async ({ page }) => {
  await page.locator('.stepper a', { hasText: 'Dimensionamento' }).click()
  const detalhe = page.locator('details', { hasText: 'TUG — Cozinha/Área de serviço 1' }).first()
  await detalhe.locator('summary').click()
  await detalhe.getByLabel('Seção instalada').selectOption('2.5')
  await detalhe.getByLabel('Disjuntor instalado').selectOption('20')
  await expect(detalhe.getByText('2,5 mm² com 20 A: não atende')).toBeVisible()
  await expect(page.getByText('existente não atende')).toBeVisible()
  await page.locator('.stepper a', { hasText: 'Proteção e resultado' }).click()
  await expect(page.getByRole('heading', { name: 'Há não conformidades' })).toBeVisible()
})

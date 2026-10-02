import { expect, test } from '@playwright/test'

test('preset preenche o equipamento e marca a potência como típica', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByRole('button', { name: '+ Adicionar equipamento' }).click()
  await page.getByLabel('Modelo típico').selectOption('chuveiro')
  await expect(page.getByLabel('Nome').nth(1)).toHaveValue('Chuveiro elétrico')
  await expect(page.getByText('Potência típica — confira a placa do aparelho.')).toBeVisible()
  await page.getByLabel('Potência unitária').last().fill('6800')
  await expect(page.getByText('Potência típica — confira a placa do aparelho.')).toHaveCount(0)
})

test('sauna não pede perímetro e não tem tomada mínima', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Tipo de cômodo').selectOption('sauna')
  await expect(page.getByLabel('Perímetro (m)')).toHaveCount(0)
  await expect(page.getByText('mínimo da norma: 0')).toBeVisible()
  await expect(page.getByText(/Sauna \(§9\.4\): nenhuma tomada/)).toBeVisible()
})

test('comparar cenários e simular consumo a partir do exemplo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.getByRole('link', { name: 'Comparar cenários' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Comparar cenários' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Alimentador' })).toBeVisible()

  await page.goto('/#/calculadora/consumo')
  await page.getByLabel('Dias de uso no mês').fill('30')
  await page.getByLabel('Tarifa (R$/kWh)').fill('0.8')
  await page.getByLabel('Horas por dia de Chuveiro (Banheiro)').fill('0.5')
  await expect(page.getByText('82,5 kWh')).toBeVisible()
  await expect(page.getByText('R$ 66,00')).toBeVisible()
})

test('distribuidora: demanda de iluminação/tomadas aparece só como informação, sem mudar o veredito', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Tudo o que a ferramenta verifica está conforme' })).toBeVisible()

  await page.getByRole('link', { name: 'Instalação' }).click()
  await page.getByLabel('Distribuidora').selectOption('cpfl')

  await page.getByRole('link', { name: 'Proteção e resultado' }).click()
  await expect(page.getByRole('heading', { name: 'Tudo o que a ferramenta verifica está conforme' })).toBeVisible()
  await expect(page.getByText(/Demanda pela distribuidora/)).toBeVisible()
  await expect(page.getByText(/2,58 kW/)).toBeVisible()
  await expect(page.getByText(/CPFL/)).toBeVisible()
})

test('volumes do banheiro: ponto marcado no volume errado aparece como não conforme no veredito', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Tudo o que a ferramenta verifica está conforme' })).toBeVisible()

  await page.getByRole('link', { name: 'Cômodos' }).click()
  await page.getByRole('button', { name: /^Banheiro/ }).click()
  await page.getByRole('link', { name: 'Marcar chuveiro e pontos na planta →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Volumes do banheiro (§9.1.2.1)' })).toBeVisible()

  // Caixa 0,9 × 0,9 m e um ponto a 0,3 m de distância, 1,2 m de altura → volume 1 (proibido p/ tomada).
  await page.getByLabel('Largura (m)').fill('0.9')
  await page.getByLabel('Profundidade (m)').fill('0.9')
  await page.getByRole('button', { name: '+ Adicionar ponto (por número, sem desenhar)' }).click()
  await page.getByLabel('X (a partir da caixa) (m)').fill('-0.3')
  await page.getByLabel('Y (a partir da caixa) (m)').fill('0.4')
  await page.getByLabel('Altura (m)').fill('1.2')
  await expect(page.getByText(/volume 1.*não conforme/)).toBeVisible()

  await page.getByRole('button', { name: /Salvar geometria/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cômodos e previsão de carga' })).toBeVisible()
  await page.getByRole('button', { name: /^Banheiro/ }).click()
  await expect(page.getByText(/1 ponto\(s\) elétrico\(s\) marcado/)).toBeVisible()

  await page.getByRole('link', { name: 'Proteção e resultado' }).click()
  await expect(page.getByText(/1 ponto\(s\) elétrico\(s\) no volume errado do banheiro/)).toBeVisible()
})

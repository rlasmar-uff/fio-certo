import { expect, test } from '@playwright/test'

// Painéis das semanas 3 a 8 do compilado do Grupo de Pesquisa: entradas, saídas e rastreabilidade.
const etapa = (page, nome) => page.locator('.stepper a', { hasText: nome })

test('Instalação: fornecimento de 7%, convenção ρ e dispositivos do compilado aparecem e persistem', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Instalação').click()
  await page.getByLabel('Situação de alimentação').selectOption('transformador-unidade')
  await page.getByLabel('Resistência do condutor').selectOption('cu-1/58')
  await page.getByLabel('Classe AQ de descargas atmosféricas').selectOption('AQ2')
  await expect(page.getByLabel('Linha de disjuntores')).toBeVisible()
  await expect(page.getByLabel('Perfil de demanda')).toHaveValue('creder')
  await page.reload()
  await expect(page.getByLabel('Situação de alimentação')).toHaveValue('transformador-unidade')
  await expect(page.getByLabel('Resistência do condutor')).toHaveValue('cu-1/58')
})

test('Circuitos: maneira de instalar da Tabela 33, DR por exigência e dispersão δ', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Circuitos').click()
  await page.getByLabel('Proteção diferencial (DR)').selectOption('exigidos')
  await expect(page.getByLabel('Proteção diferencial (DR)')).toHaveValue('exigidos')
  await expect(page.getByLabel('Maneira de instalar de Iluminação')).toHaveValue('7')
  await expect(page.getByLabel('Corrente máxima por circuito')).toBeVisible()
})

test('Dimensionamento: agrupamento por forma, catálogo de eletroduto e consulta E/F/G', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Dimensionamento').click()
  await page.getByRole('button', { name: '+ Adicionar grupo de agrupamento' }).click()
  await expect(page.getByLabel('Forma de agrupamento')).toBeVisible()
  await expect(page.getByLabel('Catálogo de eletroduto')).toBeVisible()
  await page.getByText('Consulta de ampacidade: métodos E, F e G').click()
  await expect(page.getByText(/Iz tabelado \d+(,\d+)? A × K1/)).toBeVisible()
})

test('Resultado e memorial trazem demanda Creder, DR por circuito e esquema do DPS', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Proteção e resultado').click()
  await expect(page.getByRole('heading', { name: 'Demanda estimada (Creder, tabela 3.20)' })).toBeVisible()
  await expect(page.getByText(/Estimativa bibliográfica/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Proteção diferencial (DR) por circuito' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'DPS: esquema de conexão e especificação' })).toBeVisible()
  await page.goto('/#/calculadora/memorial')
  await expect(page.getByRole('heading', { name: 'Demanda estimada (Creder, tabela 3.20)' })).toBeVisible()
})

test('Conformidade: mapa de rastreabilidade com as semanas 3 a 8', async ({ page }) => {
  await page.goto('/#/conformidade')
  await expect(page.getByRole('heading', { name: 'Mapa de rastreabilidade' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Semana 8/ })).toBeVisible()
  await expect(page.getByText('Anexo F').first()).toBeVisible()
})

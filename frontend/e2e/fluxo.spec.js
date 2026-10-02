import { expect, test } from '@playwright/test'

// Teste de fumaça: um projeto mínimo atravessa as 5 etapas da calculadora sem erro de execução
// e chega ao resultado. Não confere números — isso é papel do harness de QA
// (QA/scripts/verificar.mjs); aqui o alvo é a interface montar, navegar e mostrar o progresso.
test('um cômodo percorre as 5 etapas até o resultado', async ({ page }) => {
  const erros = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  const etapa = (nome) => page.locator('.stepper a', { hasText: nome })

  await page.goto('/')
  await page.getByRole('navigation').first().getByRole('link', { name: 'Calculadora' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dados da instalação' })).toBeVisible()
  await expect(etapa('Instalação')).toContainText('falta o ramal')
  await page.getByLabel('Comprimento do ramal de entrada (m)').fill('10')
  await expect(etapa('Instalação')).not.toContainText('falta')

  await page.getByRole('link', { name: 'Avançar para cômodos →' }).click()
  await expect(page.getByText('Cadastre ao menos um cômodo para avançar.')).toBeVisible()
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Nome').first().fill('Sala')
  await page.getByLabel('Área (m²)').fill('12')
  await page.getByLabel('Perímetro (m)').fill('14')
  await expect(etapa('Cômodos')).not.toContainText('incompleto')

  await page.getByRole('link', { name: 'Avançar para circuitos →' }).click()
  // O stepper aparece em todas as etapas: esperar o título da página antes de listar os campos,
  // senão `.all()` pode rodar ainda na etapa anterior e não achar nenhum.
  await expect(page.getByRole('heading', { level: 1, name: 'Divisão em circuitos' })).toBeVisible()
  await expect(etapa('Circuitos')).toContainText('sem comprimento')
  for (const campo of await page.getByLabel(/^Comprimento de /).all()) await campo.fill('12')
  await expect(etapa('Circuitos')).not.toContainText('sem comprimento')

  await page.getByRole('link', { name: 'Avançar para dimensionamento →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dimensionamento dos circuitos' })).toBeVisible()

  await page.getByRole('link', { name: 'Ver proteção e resultado →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Proteção e resultado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Proteção geral' })).toBeVisible()
  await expect(page.getByText('Sala').first()).toBeVisible()
  expect(erros).toEqual([])
})

test('campo obrigatório só acusa erro depois de sair dele', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  const area = page.getByLabel('Área (m²)')
  await expect(area).not.toHaveAttribute('aria-invalid', 'true')
  await area.focus()
  await area.blur()
  await expect(area).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Obrigatório.').first()).toBeVisible()
})

test('DR por grupo: escolher na etapa de circuitos aparece no resultado', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Área (m²)').fill('12')
  await page.getByLabel('Perímetro (m)').fill('14')
  await page.getByRole('link', { name: 'Avançar para circuitos →' }).click()
  await page.getByLabel('Proteção diferencial (DR)').selectOption('grupos')
  await page.getByLabel(/^DR de /).last().selectOption('2')
  await expect(page.getByLabel(/^DR de /).last()).toHaveValue('2')
  await page.locator('.stepper a', { hasText: 'Proteção e resultado' }).click()
  // "DR n" também aparece na coluna DR da tabela do quadro; aqui interessa a lista de dispositivos.
  const dispositivo = (nome) => page.locator('td[data-label="Dispositivo"]', { hasText: new RegExp(`^${nome}$`) })
  await expect(dispositivo('DR 1')).toBeVisible()
  await expect(dispositivo('DR 2')).toBeVisible()
})

test('memorial: veredito, advertência do quadro e listas abertas', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Área (m²)').fill('12')
  await page.getByLabel('Perímetro (m)').fill('14')
  await page.locator('.stepper a', { hasText: 'Proteção e resultado' }).click()
  await expect(page.getByRole('heading', { name: 'Faltam dados para verificar tudo' })).toBeVisible()
  await page.getByRole('link', { name: 'Memorial para imprimir / PDF →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Memorial técnico da instalação elétrica' })).toBeVisible()
  await expect(page.getByText('ADVERTÊNCIA', { exact: true })).toBeVisible()
  await expect(page.getByText(/Afixar a advertência obrigatória/)).toBeVisible()
})

test('recarregar uma rota profunda não dá 404 (roteamento por hash)', async ({ page }) => {
  await page.goto('/#/calculadora/resultado')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

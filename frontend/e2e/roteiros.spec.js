import { expect, test } from '@playwright/test'

// Roteiros manuais M1-M9 de QA/referencias/casos-de-teste.md, automatizados. M8 (comparar com
// um projeto real de profissional) continua manual — ver PENDENCIAS.md.
const etapa = (page, nome) => page.locator('.stepper a', { hasText: nome })

async function novoComodo(page, { nome, tipo, area = '10', perimetro = '13' }) {
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  const card = page.locator('.cartao-comodo').last()
  await card.getByLabel('Nome').first().fill(nome)
  if (tipo) await card.getByLabel('Tipo de cômodo').selectOption(tipo)
  await card.getByLabel('Área (m²)').fill(area)
  if (perimetro) await card.getByLabel('Perímetro (m)').fill(perimetro)
  return card
}

test('M1: sem nenhum comprimento, o resultado não declara conformidade', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await novoComodo(page, { nome: 'Sala', tipo: 'social', area: '12', perimetro: '14' })
  await etapa(page, 'Proteção e resultado').click()
  await expect(page.getByRole('heading', { name: 'Faltam dados para verificar tudo' })).toBeVisible()
  await expect(page.getByText(/sem comprimento \(queda de tensão\)/)).toBeVisible()
})

test('M2 e M4: cômodo sem área ou com área negativa é acusado, não vira 100 VA calado', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await expect(etapa(page, 'Cômodos')).toContainText('incompleto')
  const area = page.getByLabel('Área (m²)')
  await area.fill('-5')
  await area.blur()
  await expect(area).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Precisa ser maior que 0.')).toBeVisible()
  await expect(etapa(page, 'Cômodos')).toContainText('incompleto')
})

test('M3: remover um cômodo do meio não passa o comprimento para o circuito errado', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  for (const nome of ['Cozinha A', 'Cozinha B', 'Cozinha C']) await novoComodo(page, { nome, tipo: 'servico' })
  await etapa(page, 'Circuitos').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Divisão em circuitos' })).toBeVisible()
  const comprimentos = { 'Cozinha A': '10', 'Cozinha B': '20', 'Cozinha C': '30' }
  for (const [cozinha, metros] of Object.entries(comprimentos)) {
    await page.locator('tr', { hasText: cozinha }).filter({ hasText: 'TUG' }).getByLabel(/^Comprimento de /).fill(metros)
  }
  await etapa(page, 'Cômodos').click()
  page.once('dialog', (dialogo) => dialogo.accept())
  await page.getByRole('button', { name: 'Remover Cozinha B', exact: true }).click()
  await etapa(page, 'Circuitos').click()
  await expect(page.locator('tr', { hasText: 'Cozinha A' }).filter({ hasText: 'TUG' }).getByLabel(/^Comprimento de /)).toHaveValue('10')
  await expect(page.locator('tr', { hasText: 'Cozinha C' }).filter({ hasText: 'TUG' }).getByLabel(/^Comprimento de /)).toHaveValue('30')
})

test('M5 e M6: TUE fase-fase no trifásico é bipolar; voltando para monofásico, deixa de ser', async ({ page }) => {
  await page.goto('/#/calculadora/instalacao')
  await page.getByLabel('Tipo de instalação').selectOption('trifasica')
  await etapa(page, 'Cômodos').click()
  const card = await novoComodo(page, { nome: 'Banheiro', tipo: 'banheiro', area: '4', perimetro: '' })
  await card.getByRole('button', { name: '+ Adicionar equipamento' }).click()
  await card.getByLabel('Modelo típico').selectOption('chuveiro')
  await expect(card.getByLabel('Ligação')).toHaveValue('fase-fase')
  await etapa(page, 'Dimensionamento').click()
  await expect(page.locator('tr', { hasText: 'Chuveiro elétrico' }).first()).toContainText('(2P)')

  await etapa(page, 'Instalação').click()
  await page.getByLabel('Tipo de instalação').selectOption('monofasica')
  await etapa(page, 'Dimensionamento').click()
  await expect(page.locator('tr', { hasText: 'Chuveiro elétrico' }).first()).not.toContainText('(2P)')
})

test('M7: armazenamento corrompido não quebra a abertura', async ({ page }) => {
  const erros = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  // Semeado antes da página carregar (1ª carga: JSON quebrado; 2ª: um registro ruim e um bom).
  // Gravar pelo evaluate e recarregar logo em seguida perde a gravação no WebKit.
  await page.addInitScript(() => {
    const carga = Number(sessionStorage.getItem('carga') || 0) + 1
    sessionStorage.setItem('carga', String(carga))
    if (carga === 1) localStorage.setItem('fio-certo:v2:projetos', '{isto não é json')
    if (carga === 2)
      localStorage.setItem(
        'fio-certo:v2:projetos',
        JSON.stringify({ ativoId: 'x', projetos: [{ id: 'x', nome: 'Ruim', dados: 42 }, { id: 'y', nome: 'Bom', dados: { comodos: [] } }] }),
      )
  })
  await page.goto('/#/projetos')
  await expect(page.getByLabel('Nome do projeto')).toHaveValue('Meu projeto')
  await page.reload()
  await expect(page.getByLabel('Nome do projeto')).toHaveValue('Bom')
  expect(erros).toEqual([])
})

test('M9: método C recalcula na hora e tira o eletroduto; neutro reduzido não aparece com fase ≤ 25 mm²', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Circuitos').click()
  await page.getByLabel('Método de instalação de Iluminação').selectOption('C')
  await etapa(page, 'Dimensionamento').click()
  const detalhe = page.locator('details', { hasText: 'Iluminação' }).first()
  await detalhe.locator('summary').click()
  await expect(detalhe.locator('.fatos div', { hasText: 'Eletroduto' }).locator('dd')).toHaveText('—')
  await expect(detalhe.getByText('Percurso do eletroduto')).toHaveCount(0)
  await etapa(page, 'Instalação').click()
  await expect(page.getByText(/Reduzir a seção do neutro/)).toHaveCount(0)
})

test('PWA: depois da primeira visita, abre sem internet', async ({ page, context, browserName }) => {
  // No WebKit do Playwright, com a rede desligada o service worker não chega a atender ("internal
  // error" no reload e no goto). O teste no Safari de verdade fica para o celular (PENDENCIAS.md).
  test.skip(browserName === 'webkit', 'WebKit do Playwright não serve pelo service worker offline')
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /Dimensionamento elétrico residencial/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Tudo o que a ferramenta verifica está conforme' })).toBeVisible()
  await context.setOffline(false)
})

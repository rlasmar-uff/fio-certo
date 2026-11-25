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
  await expect(page.getByLabel(/Icn dos disjuntores/)).toBeVisible()
  await expect(page.getByLabel('Linha de disjuntores')).toHaveCount(0)
  await expect(page.getByLabel('Perfil de demanda')).toHaveCount(0)
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

test('Resultado traz DR por circuito e não traz demanda de fora da norma; memorial tem todas as seções', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await etapa(page, 'Proteção e resultado').click()
  await expect(page.getByRole('heading', { name: 'Proteção diferencial (DR) por circuito' })).toBeVisible()
  await expect(page.getByText(/Creder, tabela 3\.20/)).toHaveCount(0)
  await page.goto('/#/calculadora/memorial')
  for (const secao of ['Previsão de carga', 'Memória de cálculo por circuito', 'Alimentador e proteção geral', 'Matriz de conformidade', 'Referências']) {
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(secao) })).toBeVisible()
  }
  // Uma ficha por circuito, cada uma com a fórmula da queda de tensão e a verificação de curto-circuito.
  await expect(page.locator('.relatorio-ficha')).toHaveCount(6)
  await expect(page.locator('.relatorio-ficha').first().getByText(/ΔU = 2 · L · Ib/)).toBeVisible()
  await expect(page.locator('.relatorio-ficha').first().getByText(/I²t = /)).toBeVisible()
  await expect(page.locator('.relatorio details:not([open])')).toHaveCount(0)
})

// Plano de correção, fase 6 e §4.3: o PDF impresso tem todas as seções, numeração "Página N de M"
// (menos na capa), cabeçalho com o projeto, unifilar em página paisagem e nada recolhido.
test('memorial em PDF: seções, numeração de páginas, cabeçalho e unifilar em paisagem', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'page.pdf() só existe no Chromium')
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.goto('/#/calculadora/memorial')
  await expect(page.locator('.relatorio-ficha').first()).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true })

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise
  const paginas = []
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i)
    const [, , largura, altura] = pagina.view
    const texto = (await pagina.getTextContent()).items.map((item) => item.str).join(' ').replace(/\s+/g, ' ')
    paginas.push({ texto, paisagem: largura > altura })
  }
  const total = paginas.length
  expect(total).toBeGreaterThan(10)
  expect(paginas[0].texto).not.toContain('Página 1')
  expect(paginas[0].texto).not.toContain('Memorial técnico · R0')
  paginas.slice(1).forEach((p, i) => {
    expect(p.texto).toContain(`Página ${i + 2} de ${total}`)
    expect(p.texto).toContain('Casa-modelo (exemplo) · Memorial técnico')
  })
  const tudo = paginas.map((p) => p.texto).join(' ')
  for (let n = 1; n <= 15; n++) expect(tudo).toMatch(new RegExp(`\\b${n} [A-ZÁÉÍÓÚ]`))
  expect(tudo).toContain('Diagrama unifilar e quadro de distribuição')
  expect(paginas.find((p) => p.texto.includes('Diagrama unifilar e quadro de distribuição') && !p.texto.includes('Sumário'))?.paisagem).toBe(true)
  expect(tudo).toContain('ΔU% = ΔU / U × 100')
  expect(tudo).not.toMatch(/▼|▶/)
})

test('Conformidade: mapa de rastreabilidade com as semanas 3 a 8', async ({ page }) => {
  await page.goto('/#/conformidade')
  await expect(page.getByRole('heading', { name: 'Mapa de rastreabilidade' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Semana 8/ })).toBeVisible()
  await expect(page.getByText('Anexo F').first()).toBeVisible()
})

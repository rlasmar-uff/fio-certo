import { expect, test } from '@playwright/test'

// Planta sintética: duas salas lado a lado, parede interna com porta. Escala ×3 da planta do G31.
async function plantaSintetica(page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 600, height: 360 })
    const c = canvas.getContext('2d')
    c.fillStyle = '#fff'
    c.fillRect(0, 0, 600, 360)
    c.fillStyle = '#000'
    const pinta = (x0, y0, x1, y1) => c.fillRect(x0 * 3, y0 * 3, (x1 - x0 + 1) * 3, (y1 - y0 + 1) * 3)
    pinta(10, 10, 190, 11)
    pinta(10, 109, 190, 110)
    pinta(10, 10, 11, 110)
    pinta(189, 10, 190, 110)
    pinta(100, 10, 101, 49)
    pinta(100, 62, 101, 110)
    return canvas.toDataURL('image/png')
  })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

// A mesma planta como PDF de 2 páginas (600 × 360 pt; a 2ª em branco), escrito à mão.
function plantaPdf() {
  const paredes = [[10, 10, 190, 11], [10, 109, 190, 110], [10, 10, 11, 110], [189, 10, 190, 110], [100, 10, 101, 49], [100, 62, 101, 110]]
  const desenho = paredes.map(([x0, y0, x1, y1]) => `${x0 * 3} ${360 - (y1 + 1) * 3} ${(x1 - x0 + 1) * 3} ${(y1 - y0 + 1) * 3} re f`).join('\n')
  const conteudos = [`0 g\n${desenho}`, '']
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 360] /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 360] /Contents 6 0 R >>',
    ...conteudos.map((texto) => `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`),
  ]
  let pdf = '%PDF-1.4\n'
  const posicoes = objetos.map((objeto, indice) => {
    const posicao = pdf.length
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`
    return posicao
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posicoes.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

test('planta em PDF: escolhe a página e a detecção acha as duas salas', async ({ page }) => {
  await page.goto('/#/calculadora/planta')
  await page.getByLabel('Abrir planta (imagem ou PDF)…').setInputFiles({ name: 'planta.pdf', mimeType: 'application/pdf', buffer: plantaPdf() })
  const svg = page.getByRole('img', { name: /Planta com/ })
  await expect(svg).toBeVisible()
  await expect(page.getByLabel('Página do PDF').locator('option')).toHaveCount(2)
  await svg.scrollIntoViewIfNeeded()
  const caixa = await svg.boundingBox()
  await page.mouse.click(caixa.x + (30 * caixa.width) / 600, caixa.y + (200 * caixa.height) / 360)
  await page.mouse.click(caixa.x + (570 * caixa.width) / 600, caixa.y + (200 * caixa.height) / 360)
  await page.getByLabel('Distância real entre os dois pontos (m)').fill('9')
  await page.getByRole('button', { name: 'Detectar cômodos (experimental)' }).click()
  await expect(page.getByRole('status')).toContainText('2 sugestão(ões)')

  await page.getByLabel('Página do PDF').selectOption('2')
  await expect(page.getByRole('img', { name: 'Planta com 0 retângulo(s)' })).toBeVisible()
  await expect(page.getByLabel('Página do PDF')).toHaveValue('2')
})

test('planta: escala, detecção automática, aceitar e criar os cômodos', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('link', { name: 'Medir cômodos na planta (imagem ou PDF) →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cômodos a partir da planta' })).toBeVisible()
  await page.getByLabel('Abrir planta (imagem ou PDF)…').setInputFiles({ name: 'planta.png', mimeType: 'image/png', buffer: await plantaSintetica(page) })

  const svg = page.getByRole('img', { name: /Planta com/ })
  const medir = async () => {
    await svg.scrollIntoViewIfNeeded()
    return svg.boundingBox()
  }
  let caixa = await medir()
  const clicar = (x, y) => page.mouse.click(caixa.x + (x * caixa.width) / 600, caixa.y + (y * caixa.height) / 360)
  await clicar(30, 200)
  await clicar(570, 200)
  await page.getByLabel('Distância real entre os dois pontos (m)').fill('9')

  await page.getByRole('button', { name: 'Detectar cômodos (experimental)' }).click()
  await expect(page.getByRole('status')).toContainText('2 sugestão(ões)')
  await expect(page.getByText(/Defina a escala|Desenhe ou aceite/)).toBeVisible()
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Usar esta sugestão' }).first().click()
  await page.getByLabel('Nome do cômodo').first().fill('Sala')
  await page.getByLabel('Nome do cômodo').last().fill('Quarto')

  // desenha um terceiro à mão e descarta
  await page.getByRole('button', { name: '2. Desenhar cômodo' }).click()
  caixa = await medir()
  await page.mouse.move(caixa.x + 50, caixa.y + 20)
  await page.mouse.down()
  await page.mouse.move(caixa.x + 150, caixa.y + 60)
  await page.mouse.up()
  await page.getByRole('button', { name: 'Descartar Cômodo 3' }).click()

  await page.getByRole('button', { name: 'Criar 2 cômodo(s) →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cômodos e previsão de carga' })).toBeVisible()
  // 264 × 291 px a 9 m / 540 px = 4,4 × 4,85 m ≈ 21,3 m² (o clique pode desviar uma fração de pixel)
  const cartao = (nome) => page.locator('.cartao-comodo', { has: page.locator('.cartao-cabecalho-titulo', { hasText: nome }) })
  await expect(cartao('Sala').locator('.cartao-cabecalho-resumo')).toContainText(/· 21\.\d+ m²/)
  await expect(cartao('Quarto').locator('.cartao-cabecalho-resumo')).toContainText(/· 2[01]\.\d+ m²/)
})

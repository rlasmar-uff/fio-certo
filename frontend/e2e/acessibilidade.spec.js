import { expect, test } from '@playwright/test'

// Passada automática de acessibilidade, sem dependência nova: nome acessível em campos, botões e
// links; títulos sem pular nível; ids únicos; aria-describedby apontando para algo que existe.
// Não substitui um leitor de tela, mas pega as regressões mais comuns em todas as telas.
function auditar() {
  const problemas = []
  const nomeDe = (el) =>
    (el.getAttribute('aria-label') ||
      [...(el.getAttribute('aria-labelledby') ?? '').split(' ')].map((id) => document.getElementById(id)?.textContent ?? '').join('') ||
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent) ||
      el.closest('label')?.textContent ||
      (['BUTTON', 'A'].includes(el.tagName) ? el.textContent : '') ||
      el.getAttribute('title') ||
      '').trim()
  const visivel = (el) => el.offsetParent !== null || el.getClientRects().length > 0

  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea, button, a[href]')) {
    if (!visivel(el) && el.type !== 'file') continue
    if (!nomeDe(el)) problemas.push(`sem nome: <${el.tagName.toLowerCase()} class="${el.className}">`)
  }
  for (const el of document.querySelectorAll('svg[role=img]')) if (!nomeDe(el) && !el.querySelector('title')) problemas.push('svg sem título')

  let anterior = 0
  for (const h of document.querySelectorAll('main h1, main h2, main h3, main h4')) {
    const nivel = Number(h.tagName[1])
    if (anterior && nivel > anterior + 1) problemas.push(`título pula de h${anterior} para h${nivel}: "${h.textContent.trim().slice(0, 40)}"`)
    anterior = nivel
  }
  if (document.querySelectorAll('main h1').length !== 1) problemas.push(`${document.querySelectorAll('main h1').length} h1 na página`)

  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id)
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) problemas.push(`id repetido: ${id}`)
  for (const el of document.querySelectorAll('[aria-describedby]'))
    for (const id of el.getAttribute('aria-describedby').split(' ')) if (!document.getElementById(id)) problemas.push(`aria-describedby órfão: ${id}`)
  return problemas
}

const TELAS = [
  '/#/',
  '/#/projetos',
  '/#/conformidade',
  '/#/sobre',
  '/#/calculadora/instalacao',
  '/#/calculadora/comodos',
  '/#/calculadora/circuitos',
  '/#/calculadora/dimensionamento',
  '/#/calculadora/resultado',
  '/#/calculadora/memorial',
  '/#/calculadora/consumo',
  '/#/calculadora/comparar',
  '/#/calculadora/planta',
  '/#/calculadora/banheiro',
]

test('todas as telas com a casa-modelo passam na auditoria básica', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  const encontrados = {}
  for (const tela of TELAS) {
    await page.goto(tela)
    await expect(page.locator('main h1')).toBeVisible()
    // abre todos os detalhes, para auditar também o conteúdo recolhido
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => d.setAttribute('open', '')))
    const problemas = await page.evaluate(auditar)
    if (problemas.length) encontrados[tela] = problemas
  }
  expect(encontrados).toEqual({})

  // O próprio auditor acusa o que deve: um campo sem rótulo e um título que pula nível.
  await page.evaluate(() => document.querySelector('main').insertAdjacentHTML('beforeend', '<input id="x-teste"><h4>pulo</h4>'))
  const plantado = await page.evaluate(auditar)
  expect(plantado.some((p) => p.startsWith('sem nome: <input'))).toBe(true)
  expect(plantado.some((p) => p.startsWith('título pula'))).toBe(true)
})

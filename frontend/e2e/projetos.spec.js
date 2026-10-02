import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const VEREDITO_OK = 'Tudo o que a ferramenta verifica está conforme'

test('ver exemplo abre a casa-modelo com tudo verificado', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Proteção e resultado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: VEREDITO_OK })).toBeVisible()
  await expect(page.getByText('Projeto: Casa-modelo (exemplo)')).toBeVisible()
})

test('projetos: novo, renomear, duplicar, trocar e excluir', async ({ page }) => {
  await page.goto('/#/projetos')
  const nomes = page.getByLabel('Nome do projeto')
  await expect(nomes).toHaveCount(1)
  await nomes.first().fill('Casa da praia')

  await page.getByRole('button', { name: '+ Novo projeto' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dados da instalação' })).toBeVisible()
  await expect(page.getByText('Projeto: Novo projeto')).toBeVisible()

  await page.getByRole('navigation').first().getByRole('link', { name: 'Projetos' }).click()
  await expect(nomes).toHaveCount(2)
  const praia = page.locator('.cartao-projeto', { has: page.locator('input[value="Casa da praia"]') })
  await praia.getByRole('button', { name: 'Duplicar' }).click()
  await expect(page.locator('input[value="Casa da praia (cópia)"]')).toBeVisible()

  await praia.getByRole('button', { name: 'Abrir' }).click()
  await expect(page.getByText('Projeto: Casa da praia')).toBeVisible()

  await page.goto('/#/projetos')
  page.once('dialog', (dialogo) => dialogo.accept())
  await page
    .locator('.cartao-projeto', { has: page.locator('input[value="Casa da praia (cópia)"]') })
    .getByRole('button', { name: 'Excluir' })
    .click()
  await expect(nomes).toHaveCount(2)
})

test('exportar e importar arquivo mantém o projeto', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.goto('/#/projetos')
  const exemplo = page.locator('.cartao-projeto.ativo')
  const [download] = await Promise.all([page.waitForEvent('download'), exemplo.getByRole('button', { name: 'Exportar arquivo' }).click()])
  expect(download.suggestedFilename()).toBe('casa-modelo-exemplo.fio-certo.json')
  const conteudo = await readFile(await download.path())

  await page.getByLabel('Importar arquivo…').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: conteudo })
  await expect(page.getByRole('status')).toContainText('importado e aberto')
  // o "Meu projeto" em branco do primeiro acesso foi substituído pelo exemplo
  await expect(page.getByLabel('Nome do projeto')).toHaveCount(2)

  await page.getByLabel('Importar arquivo…').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(page.getByRole('status')).toContainText('não é um projeto do Fio Certo')
})

test('link compartilhado abre como projeto novo', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.goto('/#/projetos')
  await page.locator('.cartao-projeto.ativo').getByRole('button', { name: 'Copiar link' }).click()
  const url = await page.getByLabel('Link do projeto').inputValue()
  expect(url).toContain('#/abrir?p=')

  // Outro navegador (contexto limpo): quem recebe o link não tem nada salvo.
  const outra = await (await context.browser().newContext()).newPage()
  await outra.goto(url)
  await expect(outra.getByText('Casa-modelo (exemplo)')).toBeVisible()
  await outra.getByRole('button', { name: 'Abrir como novo projeto →' }).click()
  await expect(outra.getByRole('heading', { name: VEREDITO_OK })).toBeVisible()

  await outra.goto(url.replace(/p=.{12}/, 'p=zestragado0'))
  await expect(outra.getByRole('alert')).toContainText('Link inválido')
})

test('projeto salvo no formato antigo vira o primeiro da lista', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('fio-certo:v2:projetos')) {
      localStorage.setItem('fio-certo:projeto', JSON.stringify({ comodos: [{ id: 'a', nome: 'Sala antiga', tipo: 'social', area: '12', perimetro: '14' }] }))
    }
  })
  await page.goto('/#/projetos')
  await expect(page.getByLabel('Nome do projeto')).toHaveValue('Meu projeto')
  await expect(page.getByText('1 cômodo ·')).toBeVisible()
})

test('páginas de conformidade e sobre', async ({ page }) => {
  await page.goto('/#/conformidade')
  await expect(page.getByRole('heading', { name: /Calculado e verificado/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Não verificado/ })).toBeVisible()
  await page.goto('/#/sobre')
  await expect(page.getByRole('heading', { name: 'Glossário' })).toBeVisible()
  await expect(page.getByText('Capacidade de condução de corrente', { exact: false }).first()).toBeVisible()
})

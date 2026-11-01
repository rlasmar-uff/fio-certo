import { expect, test } from '@playwright/test'

const VEREDITO_OK = 'Tudo o que a ferramenta verifica está conforme'

test('veredito sempre lista o que a ferramenta não verifica, também no memorial', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.goto('/#/calculadora/resultado')
  await expect(page.getByRole('heading', { name: VEREDITO_OK })).toBeVisible()
  const resumo = page.getByText(/O que esta ferramenta não verifica/)
  await expect(resumo).toBeVisible()
  await resumo.click()
  await expect(page.getByText(/abaixo de 10 mm²: a Tabela 30/)).toBeVisible()

  await page.goto('/#/calculadora/memorial')
  await expect(page.getByText(/Seletividade entre dispositivos de proteção/)).toBeVisible()
})

test('reserva do quadro: sem declarar vira pendência; declarada, some e entra no alimentador', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver exemplo' }).click()
  await page.goto('/#/calculadora/instalacao')
  await page.getByLabel(/Potência de cada circuito de reserva/).fill('')
  await page.goto('/#/calculadora/resultado')
  await expect(page.getByText(/Reserva do quadro \(Tabela 59\) não considerada/)).toBeVisible()
  await page.goto('/#/calculadora/instalacao')
  await page.getByLabel(/Potência de cada circuito de reserva/).fill('1000')
  await page.goto('/#/calculadora/resultado')
  await expect(page.getByText(/Reserva do quadro \(Tabela 59\) não considerada/)).toHaveCount(0)
})

test('dados inválidos aparecem como não conformidade, e dado ausente como pendência', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Área (m²)').fill('12')
  await page.getByLabel('Perímetro (m)').fill('14')
  await page.getByRole('button', { name: '+ Adicionar equipamento' }).click()
  await page.getByLabel('Potência unitária').last().fill('1000')
  await page.getByLabel('Tipo de carga').last().selectOption('indutiva')
  await page.getByLabel('Fator de potência (cosφ)').fill('1.5')
  await page.locator('.stepper a', { hasText: 'Proteção e resultado' }).click()
  await expect(page.getByRole('heading', { name: 'Há não conformidades' })).toBeVisible()
  await expect(page.getByText(/Dado inválido — .*fator de potência/)).toBeVisible()
})

test('rendimento do motor aumenta a corrente do circuito de equipamento', async ({ page }) => {
  await page.goto('/#/calculadora/comodos')
  await page.getByRole('button', { name: '+ Adicionar cômodo' }).click()
  await page.getByLabel('Área (m²)').fill('12')
  await page.getByLabel('Perímetro (m)').fill('14')
  await page.getByRole('button', { name: '+ Adicionar equipamento' }).click()
  await page.getByLabel('Potência unitária').last().fill('736')
  await page.getByLabel('Tipo de carga').last().selectOption('indutiva')
  await page.getByLabel('Fator de potência (cosφ)').fill('0.85')
  // Potência de placa no eixo: só então a ferramenta divide por η (S3 §12)
  await page.getByLabel('Potência informada').selectOption('saida')
  await expect(page.getByLabel(/Rendimento η/)).toBeVisible()
  await page.getByLabel(/Rendimento η/).fill('0.8')
  await page.goto('/#/calculadora/circuitos')
  // 736 W / 0,8 / 0,85 = 1082 VA (sem rendimento seriam 866 VA)
  await expect(page.getByText(/1082 VA|1 082 VA/).first()).toBeVisible()
})

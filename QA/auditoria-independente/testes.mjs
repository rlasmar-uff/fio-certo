// Auditoria independente do motor do Fio Certo contra a NBR 5410:2004.
// Nada aqui vem do harness do projeto nem dos arquivos de referência dele: cada valor esperado foi
// calculado à mão a partir do texto da norma (extraído do PDF para nbr.txt, número de linha citado).
// Uso: node testes.mjs <raiz do repositório> <nbr.txt>
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [raiz, nbrTxt] = process.argv.slice(2)
const imp = (p) => import(pathToFileURL(`${raiz}/frontend/src/${p}`).href)
const K = await imp('calculations/constantes.js')
const PC = await imp('calculations/previsaoDeCarga.js')
const CI = await imp('calculations/circuitos.js')
const CO = await imp('calculations/condutores.js')
const QT = await imp('calculations/quedaDeTensao.js')
const PG = await imp('calculations/protecaoGeral.js')
const CC = await imp('calculations/curtoCircuito.js')
const DR = await imp('calculations/exigenciaDR.js')
const LE = await imp('calculations/locaisEspeciais.js')
const PE = await imp('calculations/condutorProtecao.js')
const EL = await imp('calculations/eletroduto.js')
const PJ = await imp('calculations/projeto.js')
const { casaModelo } = await imp('projetos/casaModelo.js')

const resultados = []
function t(id, clausula, descricao, ok, evidencia, gravidade = 'medio') {
  resultados.push({ id, clausula, descricao, ok: Boolean(ok), evidencia, gravidade })
}
const perto = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol

// ---------------------------------------------------------------------------------------------
// A. Tabelas 36 e 37 — comparação célula a célula com o texto do PDF (linhas 4775-4798 e 4836-4859)
const linhas = readFileSync(nbrTxt, 'utf8').split('\n').map((l) => l.replace(/^\s*\d+\|\s?/, ''))
function lerTabela(primeira, ultima) {
  const mapa = new Map()
  for (let i = primeira - 1; i <= ultima - 1; i++) {
    const nums = linhas[i].trim().replace(/(\d) (\d{3})/g, '$1$2').split(/\s+/).map((x) => Number(x.replace(',', '.')))
    if (nums.length === 13 && nums.every(Number.isFinite)) mapa.set(nums[0], nums.slice(1))
  }
  return mapa
}
for (const [nome, tabela, ini, fim] of [['36', K.TABELA_36_COBRE_PVC, 4775, 4798], ['37', K.TABELA_37_COBRE_EPR, 4836, 4859]]) {
  const pdf = lerTabela(ini, fim)
  const divergencias = []
  let celulas = 0
  for (const linha of tabela) {
    const ref = pdf.get(linha[0])
    if (!ref) { divergencias.push(`seção ${linha[0]} ausente no PDF`); continue }
    linha.slice(1).forEach((v, j) => { celulas++; if (v !== ref[j]) divergencias.push(`${linha[0]} mm² col ${K.COLUNAS_AMPACIDADE[j]}: código ${v} × norma ${ref[j]}`) })
  }
  t(`A${nome}`, `Tabela ${nome}`, `Tabela ${nome} (cobre) idêntica ao PDF em todas as células`, divergencias.length === 0 && celulas === 180,
    divergencias.length ? divergencias.join('; ') : `${celulas} células conferidas`, 'critico')
}

// A2. Tabelas 38 e 39 (métodos E, F, G — consulta), cobre, 1,5 a 240 mm² (linhas 4907-4924 e 4974-5040;
// a 39 ocupa duas páginas, por isso a faixa maior)
const EFG = await imp('calculations/capacidadesEFG.js')
function lerTabelaEFG(primeira, ultima) {
  const mapa = new Map()
  for (let i = primeira - 1; i <= ultima - 1; i++) {
    const nums = linhas[i].trim().split(/\s+/).map((x) => Number(x.replace(',', '.')))
    if (nums.length === 8 && nums.every(Number.isFinite)) mapa.set(nums[0], nums.slice(1))
  }
  return mapa
}
for (const [nome, tabela, ini, fim] of [['38', EFG.TABELA_38_COBRE_PVC, 4907, 4924], ['39', EFG.TABELA_39_COBRE_EPR, 4974, 5040]]) {
  const pdf = lerTabelaEFG(ini, fim)
  const div = []
  let celulas = 0
  for (const linha of tabela) {
    const ref = pdf.get(linha[0])
    if (!ref) { div.push(`seção ${linha[0]} ausente no PDF`); continue }
    linha.slice(1).forEach((v, j) => { celulas++; if (v !== ref[j]) div.push(`${linha[0]} mm² col ${j + 2}: código ${v} × norma ${ref[j]}`) })
  }
  t(`A${nome}`, `Tabela ${nome}`, `Tabela ${nome} (cobre, E/F/G) idêntica ao PDF`, div.length === 0 && celulas === 105, div.length ? div.join('; ') : `${celulas} células conferidas`, 'medio')
}

// ---------------------------------------------------------------------------------------------
// B. Previsão de carga — §9.5.2.1.2 (linhas 8245-8253) e §9.5.2.2 (8257-8301)
const ilum = [[6, 100], [6.01, 100], [9.99, 100], [10, 160], [13.99, 160], [14, 220], [30, 460]]
t('B1', '§9.5.2.1.2', 'Iluminação: 100 VA até 6 m² + 60 VA a cada 4 m² INTEIROS', ilum.every(([a, e]) => PC.calcularIluminacaoMinimaVA(a) === e),
  ilum.map(([a, e]) => `${a}m²→${PC.calcularIluminacaoMinimaVA(a)} (esp. ${e})`).join(', '), 'alto')

// "ou fração" = teto. Perímetros múltiplos exatos da regra são a fronteira onde ponto flutuante erra.
const tugCasos = [
  ['servico', 7, 2], ['servico', 10.5, 3], ['servico', 14, 4], ['servico', 17.5, 5], ['servico', 21, 6], ['servico', 24.5, 7], ['servico', 10.51, 4],
  ['social', 15, 3], ['social', 15.01, 4], ['social', 13, 3],
]
const tugRes = tugCasos.map(([tipo, per, esp]) => [tipo, per, esp, PC.calcularQuantidadeTugMinima({ tipo, area: 20, perimetro: per })])
t('B2', '§9.5.2.2.1 b) d)', 'Nº mínimo de tomadas "por X m ou fração de perímetro" (teto), inclusive em múltiplos exatos', tugRes.every(([, , e, o]) => e === o),
  tugRes.map(([tipo, p, e, o]) => `${tipo} ${p}m→${o} (esp. ${e})`).join(', '), 'medio')

const outros = [[{ tipo: 'outro', area: 2, perimetro: 6 }, 1], [{ tipo: 'outro', area: 6, perimetro: 10 }, 1], [{ tipo: 'outro', area: 6.5, perimetro: 10.2 }, 3],
  [{ tipo: 'banheiro', area: 4, perimetro: 8 }, 1], [{ tipo: 'varanda', area: 8, perimetro: 12 }, 1]]
t('B3', '§9.5.2.2.1 a) c) e)', 'Banheiro 1, varanda 1, demais cômodos ≤6 m² → 1 ponto; >6 m² → 1 por 5 m ou fração', outros.every(([c, e]) => PC.calcularQuantidadeTugMinima(c) === e),
  outros.map(([c, e]) => `${c.tipo} ${c.area}m²/${c.perimetro}m→${PC.calcularQuantidadeTugMinima(c)} (esp. ${e})`).join(', '), 'medio')

// Área externa / garagem pequena: a garagem é um "demais cômodo" da habitação (alínea e) — 1 ponto se ≤ 6 m².
const garagem = PC.calcularQuantidadeTugMinima({ tipo: 'externa', area: 5, perimetro: 9 })
t('B4', '§9.5.2.2.1 e)', 'Garagem/dependência de 5 m² e 9 m de perímetro → 1 ponto mínimo (alínea e, faixa ≤6 m²)', garagem === 1,
  `motor: ${garagem} pontos (aplica 1 por 5 m de perímetro sem a faixa de área)`, 'baixo')

const coz4 = PC.calcularTugMinima({ tipo: 'servico', area: 10, perimetro: 14 })
t('B5', '§9.5.2.2.2 a)', 'Cozinha com 4 pontos: 3×600 + 1×100 = 1900 VA', coz4.quantidade === 4 && coz4.totalVA === 1900, JSON.stringify(coz4), 'alto')
const doisAmb = [{ id: 'a', tipo: 'servico', area: 10, perimetro: 14 }, { id: 'b', tipo: 'servico', area: 10, perimetro: 14 }]
const semAlt = PC.calcularPrevisaoDeCarga(doisAmb, false).totais.tugVA
const comAlt = PC.calcularPrevisaoDeCarga(doisAmb, true).totais.tugVA
t('B6', '§9.5.2.2.2 a)', '8 tomadas em 2 cozinhas: 3800 VA por padrão; 2800 VA só se o usuário optar pela alternativa (>6 pontos)', semAlt === 3800 && comAlt === 2800,
  `sem alternativa ${semAlt} VA, com alternativa ${comAlt} VA`, 'alto')

const hall = PC.calcularCargaComodo({ id: 'h', tipo: 'manutencao', area: 4, perimetro: 8 })
t('B7', '§4.2.1.2.3 b)', 'Hall de serviço/casa de máquinas: ≥1 tomada e ≥1000 VA', hall.tugQuantidade >= 1 && hall.tugVA >= 1000, `${hall.tugQuantidade} pt, ${hall.tugVA} VA`, 'medio')

const motor = PC.calcularPotenciaAparenteVA({ potenciaW: 746, tipoPotencia: 'saida', rendimento: 0.8, cosPhi: 0.85 })
t('B8', '§4.2.1.2.1 b)', 'Potência de saída: S = P/(η·cosφ) = 746/(0,8·0,85) = 1097,06 VA', perto(motor, 746 / 0.8 / 0.85, 1e-6), `${motor.toFixed(2)} VA`, 'medio')

// ---------------------------------------------------------------------------------------------
// C. Divisão de circuitos — §9.5.3 (linhas 8306-8318) e §4.2.5.5
const cfg127 = K.resolverConfigInstalacao('bifasica', 127)
t('C0', '—', 'Tensão fase-fase de 127 V → 220 V; de 220 V → 380 V', K.calcularTensaoFaseFase(127) === 220 && K.calcularTensaoFaseFase(220) === 380,
  `${K.calcularTensaoFaseFase(127)} / ${K.calcularTensaoFaseFase(220)}`, 'baixo')
const comodosDiv = [
  { id: 's', nome: 'Sala', tipo: 'social', area: 20, perimetro: 18 },
  { id: 'c', nome: 'Cozinha', tipo: 'servico', area: 10, perimetro: 14 },
  { id: 'b', nome: 'Banho', tipo: 'banheiro', area: 4, perimetro: 8, tue: [
    { id: 'e1', nome: 'Exatos 10 A', potenciaW: 1270, ligacao: 'fase-neutro', cosPhi: 1 },
    { id: 'e2', nome: 'Pouco acima de 10 A', potenciaW: 1271, ligacao: 'fase-neutro', cosPhi: 1 },
  ] },
]
const div = CI.gerarCircuitos(comodosDiv, cfg127)
const tugServ = div.filter((c) => c.id.startsWith('tug-servico'))
const tugGeral = div.filter((c) => c.id.startsWith('tug-geral'))
t('C1', '§9.5.3.2', 'Tomadas da cozinha em circuito exclusivo (nunca com sala/banheiro)', tugServ.every((c) => c.comodoIds.every((i) => i === 'c')) && tugGeral.every((c) => !c.comodoIds.includes('c')),
  div.map((c) => `${c.nome}[${c.comodoIds}]`).join('; '), 'alto')
t('C2', '§4.2.5.5', 'Iluminação e tomadas em circuitos distintos por padrão', div.filter((c) => c.tipo === 'iluminacao').every((c) => !c.misto), '', 'medio')
const e2 = div.find((c) => c.equipamentoIds?.includes('e2') || c.equipamentoId === 'e2')
t('C3', '§9.5.3.1', 'Equipamento > 10 A em circuito independente; 10 A exatos não obriga', e2 && !e2.equipamentoIds && e2.independenteObrigatorio === true,
  JSON.stringify(div.filter((c) => c.tipo === 'tue').map((c) => [c.nome, c.potenciaVA, c.independenteObrigatorio])), 'alto')
const misto = CI.validarCircuitoMisto({ correnteProjetoA: 16.01 })
t('C4', '§9.5.3.3 a)', 'Circuito misto com Ib = 16,01 A é recusado', !misto.conforme, JSON.stringify(misto), 'alto')

// Corrente vetorial: duas cargas resistivas iguais em A e B (120°) → neutro com o módulo de UMA delas.
const vet = CI.calcularCorrentesVetoriais([{ potenciaVA: 1270, cosPhi: 1, fases: [1] }, { potenciaVA: 1270, cosPhi: 1, fases: [2] }], 3, 127)
t('C5', '—', 'Duas cargas de 10 A em fases a 120°: corrente de neutro = 10 A', perto(vet.correnteNeutroA, 10, 1e-9), `IN = ${vet.correnteNeutroA}`, 'alto')
// Carga fase-fase de 2200 VA entre A e B em 127/220 V: 10 A nas duas fases, nada no neutro.
const ff = CI.calcularCorrentesVetoriais([{ potenciaVA: 2200, cosPhi: 1, fases: [1, 2] }], 3, 127)
t('C6', '—', 'Carga fase-fase 2200 VA a 220 V: 10 A em cada fase, 0 A no neutro', perto(ff.correntePorFaseA[0], 2200 / (127 * Math.sqrt(3)), 1e-9) && perto(ff.correnteNeutroA, 0, 1e-9),
  `Ia=${ff.correntePorFaseA[0].toFixed(4)} (esp. ${(2200 / (127 * Math.sqrt(3))).toFixed(4)}), IN=${ff.correnteNeutroA.toExponential(2)}`, 'alto')

// ---------------------------------------------------------------------------------------------
// D. Condutores — §6.2.5, Tabelas 40/42/46/47, §5.3.4.1
const chuveiro = { id: 'x', tipo: 'tue', potenciaVA: 5500, tensao: 220, ehFaseFase: true, cosPhi: 1 }
const ch = CO.dimensionarCircuito(chuveiro, 10, { fatorAgrupamento: 1 })
// À mão: Ib = 25 A → In 25 A; B1 2c: 2,5 mm² = 24 A < 25 → 4 mm² = 32 A ≥ 25.
// Queda: R70 = 1/(46,8·4) Ω/m; ΔV = 2·10·25·R = 2,6709 V → 1,214 % de 220 V (cosφ=1, reatância não pesa).
t('D1', '§5.3.4.1 / Tab. 36', 'Chuveiro 5500 W/220 V sozinho, B1, 30 °C: In 25 A, 4 mm² (2,5 mm² = 24 A não atende)', ch.disjuntorA === 25 && ch.secaoMm2 === 4,
  `In=${ch.disjuntorA} S=${ch.secaoMm2} Iz=${ch.ampacidadeA}`, 'critico')
t('D2', '§6.2.7', 'Queda do chuveiro, 10 m, 4 mm²: 1,214 %', perto(ch.quedaPercentual, (2 * 10 * 25 / (46.8 * 4)) / 220 * 100, 1e-3),
  `motor ${ch.quedaPercentual?.toFixed(4)} % × à mão ${((2 * 10 * 25 / (46.8 * 4)) / 220 * 100).toFixed(4)} %`, 'alto')
const quente = CO.dimensionarCircuito({ id: 'q', tipo: 'tug', potenciaVA: 2000, tensao: 127, cosPhi: 1 }, 5, { fatorTemperatura: K.obterFatorTemperatura(40), fatorAgrupamento: 0.7 })
// Ib = 15,75 A → In 16. Iz(2,5) = 24·0,87·0,70 = 14,616 < 16; Iz(4) = 32·0,87·0,70 = 19,488 ≥ 16 → 4 mm².
t('D3', 'Tab. 40/42', 'TUG 2000 VA/127 V a 40 °C com 3 circuitos agrupados: 4 mm² (Iz 2,5 = 14,6 A)', quente.secaoMm2 === 4 && perto(quente.ampacidadeA, 32 * 0.87 * 0.7, 1e-9),
  `S=${quente.secaoMm2} Iz=${quente.ampacidadeA}`, 'critico')
const ilu = CO.dimensionarCircuito({ id: 'i', tipo: 'iluminacao', potenciaVA: 300, tensao: 127, cosPhi: 1 }, 5, {})
t('D4', 'Tab. 47', 'Seção mínima: iluminação 1,5 mm²; tomadas 2,5 mm²', ilu.secaoMm2 === 1.5 && CO.dimensionarCircuito({ id: 't', tipo: 'tug', potenciaVA: 300, tensao: 127 }, 5, {}).secaoMm2 === 2.5,
  `iluminação ${ilu.secaoMm2}`, 'alto')
t('D5', 'Tab. 46', 'Bifásico com neutro = 3 condutores carregados; trifásico com neutro = 3', K.TABELA_46_CONDUTORES_CARREGADOS[K.esquemaDoAlimentador(2)] === 3 && K.TABELA_46_CONDUTORES_CARREGADOS[K.esquemaDoAlimentador(3)] === 3, '', 'alto')
const ffs = [[5, 0.6], [8, 0.52], [9, 0.5], [11, 0.5], [12, 0.45], [19, 0.41], [20, 0.38], [40, 0.38]]
t('D6', 'Tab. 42 ref. 1', 'FCA em conduto fechado por nº de circuitos', ffs.every(([n, f]) => K.obterFatorAgrupamento(n, 'B1') === f),
  ffs.map(([n]) => `${n}→${K.obterFatorAgrupamento(n, 'B1')}`).join(' '), 'alto')
t('D7', 'Tab. 45', 'Eletroduto enterrado: até 6 circuitos tabelado; 7 → sem fator (não extrapola)', K.obterFatorAgrupamento(6, 'D') === 0.6 && K.obterFatorAgrupamento(7, 'D') === null, '', 'medio')
// 4 condutores carregados: 0,86 sobre a coluna de 3 (§6.2.5.6.1 nota 1, linha 5361)
const tr = CO.avaliarTrilhaSecao('geral', { correnteNominalDisjuntorA: 50, correnteProjetoA: 45, comprimentoM: 0, tensaoV: 127, esquema: 'trifasico-com-neutro', neutroCarregado: true })
const linha10 = tr.find((l) => l.secao === 10)
t('D8', '§6.2.5.6.1', '3ª harmônica > 15%: Iz = 0,86 × coluna de 3 (10 mm² B1: 50 × 0,86 = 43 A)', perto(linha10.ampacidadeCorrigida, 43, 1e-9), `Iz=${linha10.ampacidadeCorrigida}`, 'alto')

// ---------------------------------------------------------------------------------------------
// E. Queda de tensão — §6.2.7 (linhas 5538-5564)
const casa = casaModelo()
const cfgCasa = K.resolverConfigInstalacao(casa.tipoInstalacao, casa.tensaoFaseNeutro)
const rCasa = PJ.calcularProjetoCompleto(casa, cfgCasa)
const qa = rCasa.quedaAlimentadorPercentual
t('E1', '§6.2.7.1 c) / 6.2.7.2', 'Orçamento do terminal = min(4 %, 5 % − queda do alimentador)', perto(rCasa.limiteQuedaTerminalDisponivel, Math.min(4, 5 - qa), 1e-12),
  `alimentador ${qa.toFixed(3)} % → terminal ${rCasa.limiteQuedaTerminalDisponivel.toFixed(3)} %`, 'critico')
t('E2', '§6.2.7.1 c)', 'Nenhum circuito da casa-modelo passa do total de 5 % (alimentador + terminal)', rCasa.dimensionados.every((c) => c.quedaPercentual + qa <= 5 + 1e-9),
  rCasa.dimensionados.map((c) => (c.quedaPercentual + qa).toFixed(2)).join(' '), 'critico')
t('E3', '§6.2.7.1 nota 3', 'Acréscimo de 0,005 %/m acima de 100 m só nos casos de 7 %, máx. 0,5 %', K.limiteQuedaTotal('secundario-distribuicao', 300) === 5 && perto(K.limiteQuedaTotal('transformador-unidade', 150), 7.25) && perto(K.limiteQuedaTotal('gerador-proprio', 500), 7.5),
  `${K.limiteQuedaTotal('secundario-distribuicao', 300)} / ${K.limiteQuedaTotal('transformador-unidade', 150)} / ${K.limiteQuedaTotal('gerador-proprio', 500)}`, 'medio')
const semComp = CO.dimensionarCircuitos([{ id: 'z', tipo: 'tug', potenciaVA: 1000, tensao: 127 }], {}, {})[0]
t('E4', '§6.2.6.1.2 e)', 'Comprimento não informado: queda NÃO verificada (nunca 0 % aprovado)', semComp.naoVerificado === true && semComp.conforme === false,
  `naoVerificado=${semComp.naoVerificado} conforme=${semComp.conforme}`, 'critico')
const sigma70 = 1 / ((1 / 56) * (1 + 0.00393 * 50))
t('E5', '—', 'Condutividade do cobre a 70 °C (ρ20 = 1/56, α = 0,00393): 46,80', perto(K.CONDUTIVIDADE_COBRE_70C, sigma70, 0.01), `${K.CONDUTIVIDADE_COBRE_70C} × ${sigma70.toFixed(3)}`, 'baixo')

// ---------------------------------------------------------------------------------------------
// F. Alimentador, neutro, PE — Tabelas 48, 52, 58; §6.2.6.2; §6.4.3.1
const pe = [[1.5, 1.5], [16, 16], [25, 16], [35, 16], [50, 25], [70, 35], [95, 50], [120, 70], [150, 70], [185, 95], [240, 120]]
t('F1', 'Tab. 58 / 6.4.3.1.3', 'PE: S≤16 → S; ≤35 → 16; >35 → S/2 na padronizada mais próxima', pe.every(([s, e]) => K.calcularSecaoTerra(s) === e),
  pe.map(([s, e]) => `${s}→${K.calcularSecaoTerra(s)}${K.calcularSecaoTerra(s) === e ? '' : `(esp. ${e})`}`).join(' '), 'alto')
const nRed = (fases, s, dec) => PG.dimensionarCondutorNeutroGeral(s, { numeroFases: fases, neutroReduzidoDeclarado: dec, equilibrado: dec, protegido: dec, terceiraHarmonica: 'ate-15' })
t('F2', '§6.2.6.2.6 / Tab. 48', 'Neutro reduzido só trifásico, fase > 25 mm², com as 3 condições: 50→25, 95→50', nRed(3, 50, true) === 25 && nRed(3, 95, true) === 50 && nRed(2, 50, true) === 50 && nRed(3, 25, true) === 25 && nRed(3, 50, false) === 50,
  `3F 50→${nRed(3, 50, true)}, 3F 95→${nRed(3, 95, true)}, 2F 50→${nRed(2, 50, true)}, sem declaração→${nRed(3, 50, false)}`, 'critico')
const peFora = PE.dimensionarPE({ secaoFaseMm2: 1.5, foraDoCabo: true, protecaoMecanica: false })
t('F3', '§6.4.3.1.4 b)', 'PE fora do conduto, sem proteção mecânica: mínimo 4 mm²', peFora.secaoMm2 === 4, JSON.stringify(peFora), 'alto')
const peCalc = PE.dimensionarPE({ secaoFaseMm2: 2.5, iFaltaA: 1000, tempoS: 0.4 })
// S ≥ √(I²t)/k = √(1000²·0,4)/115 = 5,499 mm² → 6 mm² (Tabela 55, PE no mesmo cabo/feixe, PVC: k = 115, linha 6983)
t('F4', '§6.4.3.1.2 / Tab. 55', 'PE por cálculo: √(1000²·0,4)/115 = 5,50 → 6 mm²', peCalc.secaoMm2 === 6 && peCalc.kUsado === 115, JSON.stringify(peCalc), 'alto')
t('F5', 'Tab. 52', 'Condutor de aterramento enterrado: 2,5 / 16 / 50 mm² (cobre)', K.CONDICOES_ATERRAMENTO_ENTERRADO['protegido-total'].secaoMinimaMm2 === 2.5 && K.CONDICOES_ATERRAMENTO_ENTERRADO['protegido-corrosao'].secaoMinimaMm2 === 16 && K.CONDICOES_ATERRAMENTO_ENTERRADO['sem-protecao-corrosao'].secaoMinimaMm2 === 50, '', 'medio')

// ---------------------------------------------------------------------------------------------
// G. Curto-circuito — §5.3.5.5.2 e Tabela 30 (linhas 3212-3233)
const cc10 = CC.verificarCurtoCircuito({ correnteDisjuntorA: 50, curvaDisjuntor: 'C', iccPresumidaA: 5000, iccMinimaA: 5000, secaoMm2: 10 })
// I²t = 5000²·0,01 = 2,5e5 A²s; k²S² = (115·10)² = 1,3225e6 → atende.
t('G1', '§5.3.5.5.2', '10 mm² PVC, Icc 5 kA: I²t = 2,5e5 ≤ k²S² = 1,32e6 → conforme', cc10.verificado && cc10.conforme && perto(cc10.energiaSuportadaA2s, 1322500), JSON.stringify(cc10), 'alto')
const cc25 = CC.verificarCurtoCircuito({ correnteDisjuntorA: 16, curvaDisjuntor: 'C', iccPresumidaA: 3000, iccMinimaA: 3000, secaoMm2: 2.5 })
t('G2', 'Tab. 30', 'Circuito de 2,5 mm² PVC com Icc conhecida deve ser verificável (k = 115 é o valor da tabela para PVC ≤ 300 mm²)', cc25.verificado === true,
  `motor: verificado=${cc25.verificado} — "${cc25.motivo}"`, 'alto')
const casaSemCC = rCasa.dimensionados.filter((c) => !c.curtoCircuito.verificado).length
t('G3', '§5.3.5', 'Casa-modelo (Icc 5 kA informada): curto-circuito verificado em todos os circuitos', casaSemCC === 0, `${casaSemCC} de ${rCasa.dimensionados.length} circuitos ficam "não verificado"`, 'alto')
// Coerência interna: o mesmo k = 115 é usado para PE de 2,5 mm² (Tab. 55) mas recusado para a fase de 2,5 mm² (Tab. 30).
t('G4', 'Tab. 30 × Tab. 55', 'Coerência: k do PE de 2,5 mm² (115) e k da fase de 2,5 mm² tratados igual', PE.dimensionarPE({ secaoFaseMm2: 2.5, iFaltaA: 500, tempoS: 0.1 }).kUsado === K.obterK({ secaoMm2: 2.5 }),
  `PE: k=${PE.dimensionarPE({ secaoFaseMm2: 2.5, iFaltaA: 500, tempoS: 0.1 }).kUsado}; fase: k=${K.obterK({ secaoMm2: 2.5 })}`, 'medio')

// ---------------------------------------------------------------------------------------------
// H. DR — §5.1.3.2.2 (linhas 2483-2511)
const com = (tipo, extra = {}) => [{ id: 'k', nome: tipo, tipo, area: 10, perimetro: 13, ...extra }]
const ex = (tipo, circTipo = 'tug', extra) => DR.exigenciaDR({ tipo: circTipo, comodoIds: ['k'] }, com(tipo, extra)).exige
t('H1', '§5.1.3.2.2 a) d)', 'DR exigido: banheiro (tudo), cozinha/serviço (tudo), área externa (tomadas)', ex('banheiro', 'iluminacao') && ex('servico', 'iluminacao') && ex('externa'), '', 'critico')
t('H2', '§5.1.3.2.2 nota 3', 'Iluminação a ≥ 2,50 m na cozinha pode sair do DR; no banheiro, não', !ex('servico', 'iluminacao', { iluminacaoAlturaM: 2.6 }) && ex('banheiro', 'iluminacao', { iluminacaoAlturaM: 2.6 }), '', 'alto')
// A norma não nomeia a varanda: a alínea c) depende de as tomadas "poderem vir a alimentar equipamentos no
// exterior", o que é declaração do usuário. Declarado → DR; não declarado → a norma não exige.
t('H3', '§5.1.3.2.2 c)', 'Varanda com tomadas declaradas como podendo alimentar o exterior exige DR; sem declaração, não', ex('varanda', 'tug', { tomadasAlimentamExterior: true }) && !ex('varanda'),
  `declarado → ${ex('varanda', 'tug', { tomadasAlimentamExterior: true })}; não declarado → ${ex('varanda')}`, 'medio')
const exTT = DR.exigenciaDR({ tipo: 'tug', comodoIds: ['k'] }, com('social'), { esquemaAterramento: 'TT' }).exige
t('H5', '§5.1.2.2.4.3 a)', 'Esquema TT: todo circuito sob DR, mesmo em sala', exTT, `sala em TT → exige=${exTT}`, 'critico')
t('H4', '§9.2 / 5.1.3.2.2 b)', 'Piscina marcada num cômodo que não é "área externa": tomadas exigem DR', ex('social', 'tug', { piscina: true }),
  `motor: piscina num cômodo tipo social → exige=${ex('social', 'tug', { piscina: true })}`, 'alto')

// ---------------------------------------------------------------------------------------------
// I. Banheiro — §9.1.2.1 (linhas 7868-7902) e §9.1.4 (7955-7976)
const box = { wM: 0.9, hM: 0.9, baseM: 0 }
const vol = (x, y, h, b = box) => LE.classificarVolume({ xM: x, yM: y, alturaM: h }, b)
const casosVol = [
  [[0.45, 0.45, 0], 0], [[0.45, 0.45, 2], 1], [[0.45, 0.45, 2.5], 2], [[1.4, 0.45, 2.9], 2], [[1.6, 0.45, 2], 3], [[3.9, 0.45, 2], 3], [[3.95, 0.45, 2], null], [[1.6, 0.45, 2.3], null],
]
t('I1', '§9.1.2.1', 'Volumes com box 0,9×0,9: dentro 0/1; até +0,6 m vol. 2 (≤3 m); até +3,0 m vol. 3 (≤2,25 m)', casosVol.every(([a, e]) => vol(...a) === e),
  casosVol.map(([a, e]) => `(${a})→${vol(...a)}${vol(...a) === e ? '' : `≠${e}`}`).join(' '), 'alto')
const solto = { wM: 0, hM: 0, baseM: 0 }
t('I2', '§9.1.2.1 b)', 'Sem box: volume 1 até 0,6 m do chuveiro; 2 até 1,2 m; 3 até 3,6 m', vol(0.6, 0, 1, solto) === 1 && vol(1.2, 0, 1, solto) === 2 && vol(3.6, 0, 1, solto) === 3 && vol(3.61, 0, 1, solto) === null, '', 'alto')
const pts = LE.verificarPontosBanheiro({ boxLarguraM: 0.9, boxProfundidadeM: 0.9, pontos: [
  { id: 1, tipo: 'tomada', xM: 1.2, yM: 0.4, alturaM: 1.1 }, { id: 2, tipo: 'tomada', xM: 2.0, yM: 0.4, alturaM: 1.1 },
  { id: 3, tipo: 'luminaria', xM: 0.45, yM: 0.45, alturaM: 2.2 }, { id: 4, tipo: 'aquecedor', xM: 0.45, yM: 0.45, alturaM: 2.0 },
  { id: 5, tipo: 'interruptor', xM: 1.3, yM: 0.4, alturaM: 1.1 },
] })
const conf = Object.fromEntries(pts.map((p) => [p.id, p.conforme]))
t('I3', '§9.1.4.3 / 9.1.4.4', 'Tomada e interruptor no vol. 2 proibidos; tomada no vol. 3 admitida; luminária no vol. 1 proibida; aquecedor no vol. 1 admitido',
  conf[1] === false && conf[2] === true && conf[3] === false && conf[4] === true && conf[5] === false, JSON.stringify(pts.map((p) => [p.id, p.volume, p.conforme])), 'alto')

// ---------------------------------------------------------------------------------------------
// J. Eletroduto — §6.2.11.1.6 a) taxa 53 / 31 / 40 %
t('J1', '§6.2.11.1.6 a)', 'Taxa máxima: 1 condutor 53 %, 2 condutores 31 %, 3 ou mais 40 %', K.obterTaxaOcupacaoMaxima(1) === 0.53 && K.obterTaxaOcupacaoMaxima(2) === 0.31 && K.obterTaxaOcupacaoMaxima(5) === 0.4, '', 'medio')
const el = EL.dimensionarEletroduto([2.5, 2.5, 2.5])
// 3 × 10,2 = 30,6 mm²; DN20 roscável Di 16,4 → 211,24 mm² × 0,40 = 84,5 → cabe.
t('J2', '§6.2.11.1.6 a)', '3 cabos de 2,5 mm² cabem em DN20 roscável (30,6 mm² ≤ 0,40 × 211,2)', el.eletrodutoRecomendado?.nominalMm === 20, `${el.eletrodutoRecomendado?.nominalMm} / ${el.trilha[0].ocupacaoPercentual.toFixed(1)} %`, 'medio')

// ---------------------------------------------------------------------------------------------
// K. Agrupamento por cômodo (padrão quando não informado). No banheiro da casa-modelo passam 3 circuitos
// (iluminação, tomadas, chuveiro): FCA = 0,70 (Tab. 42, ref. 1). Chuveiro: Ib 25 A → 4 mm² dá 32 × 0,70 = 22,4 A
// < 25 → 6 mm² dá 41 × 0,70 = 28,7 A ≥ 25 → 6 mm².
const chCasa = rCasa.dimensionados.find((c) => c.nome.startsWith('Chuveiro'))
t('K1', '§6.2.5.5 / 6.2.5.8', 'Chuveiro da casa-modelo, agrupamento por cômodo (3 circuitos no banheiro): FCA 0,70 → 6 mm²',
  chCasa.fatorAgrupamento === 0.7 && chCasa.secaoMm2 === 6 && chCasa.agrupamento?.origem === 'comodo' && chCasa.agrupamento?.n === 3,
  `motor: ${chCasa.secaoMm2} mm², FCA ${chCasa.fatorAgrupamento}, ${JSON.stringify(chCasa.agrupamento)}`, 'medio')
const acCasa = rCasa.dimensionados.find((c) => c.nome.startsWith('Ar-condicionado'))
t('K2', '§6.2.5.8', 'Ar-condicionado do Quarto 1: no quarto passam iluminação, tomadas e o ar → n = 3', acCasa.agrupamento?.n === 3 && acCasa.fatorAgrupamento === 0.7,
  JSON.stringify(acCasa.agrupamento), 'medio')

// P. PEN no TN-C-S (§6.4.3.4.1): alimentador ≥ 10 mm² mesmo com corrente pequena.
const peq = { ...casaModelo(), comodos: [{ id: 'q', nome: 'Quarto', tipo: 'social', area: '9', perimetro: '12', tue: [] }], esquemaAterramento: 'TN-C-S' }
const rPeq = PJ.calcularProjetoCompleto(peq, cfgCasa)
const peqTT = PJ.calcularProjetoCompleto({ ...peq, esquemaAterramento: 'TT' }, cfgCasa)
t('P1', '§6.4.3.4.1 / Tab. 47', 'Alimentador TN-C-S ≥ 10 mm² (PEN); em TT o mínimo é o da Tabela 47', rPeq.protecaoGeral.condutorFase.secaoMm2 === 10 && peqTT.protecaoGeral.condutorFase.secaoMm2 < 10,
  `TN-C-S: ${rPeq.protecaoGeral.condutorFase.secaoMm2} mm²; TT: ${peqTT.protecaoGeral.condutorFase.secaoMm2} mm²`, 'alto')

// Q. Fator de demanda: a norma não traz tabela (§4.2.1.1.2) — o alimentador usa a carga cheia.
const somaFases = rCasa.protecaoGeral.correntePorFaseA.reduce((s, i) => s + i, 0)
t('Q1', '§4.2.1.1.2', 'Sem tabela de demanda na norma: corrente do alimentador pela carga cheia (sem redução)', !('demandaPerfil' in rCasa) && !('demandaConcessionaria' in rCasa) && somaFases > 100,
  `correntes por fase: ${rCasa.protecaoGeral.correntePorFaseA.map((i) => i.toFixed(1)).join(' / ')} A`, 'medio')

// ---------------------------------------------------------------------------------------------
// L. Quadro, unifilar e lista de materiais no modo de DR padrão ("exigidos")
const QD = await imp('calculations/quadro.js')
const MAT = await imp('calculations/materiais.js')
const casaExigidos = { ...casaModelo(), modoDR: 'exigidos' }
const calcExigidos = { configInstalacao: cfgCasa, ...PJ.calcularProjetoCompleto(casaExigidos, cfgCasa) }
const quadroEx = QD.montarQuadro(calcExigidos)
const matEx = MAT.listarMateriais(casaExigidos, calcExigidos, {})
const drsCalculados = calcExigidos.protecaoGeral.drs.grupos.length
t('L1', '§5.1.3.2.2 / §6.1.8.1', 'Modo padrão: o DR calculado aparece no quadro/unifilar com valor', quadroEx.posicoes.some((p) => p.tipo === 'dr' && p.rotulo !== '—'),
  `DRs calculados: ${drsCalculados}; posições DR no quadro: ${JSON.stringify(quadroEx.posicoes.filter((p) => p.tipo === 'dr').map((p) => p.rotulo))}`, 'critico')
t('L2', '§5.1.3.2.2', 'Modo padrão: a lista de materiais inclui o DR que o cálculo exige', matEx.drs.length > 0, `DRs na lista: ${JSON.stringify(matEx.drs)}`, 'critico')
const gruposComDR = quadroEx.grupos.filter((g) => g.dr !== null)
const grupoSemDR = quadroEx.grupos.find((g) => g.dr === null)
const erradosSobDR = gruposComDR.flatMap((g) => g.circuitos).filter((c) => !c.sobDR).map((c) => c.nome)
t('L3', '§6.1.8.1', 'Unifilar: sob DR só circuitos com DR; os sem DR saem direto do barramento',
  erradosSobDR.length === 0 && (grupoSemDR?.circuitos ?? []).every((c) => !c.sobDR) && quadroEx.grupos.flatMap((g) => g.circuitos).length === calcExigidos.dimensionados.length,
  `sob DR sem ter DR: [${erradosSobDR.join(', ')}]; direto do barramento: [${(grupoSemDR?.circuitos ?? []).map((c) => c.nome).join(', ')}]`, 'alto')

// M. DPS só quando exigido (§5.4.2.1.1); exigido, a quantidade segue o esquema de conexão (§6.3.5.2.2).
const semDps = MAT.listarMateriais(casaExigidos, calcExigidos, {})
const casaAerea = { ...casaExigidos, alimentacaoAerea: true, classeAQ: 'AQ2' }
const calcAerea = { configInstalacao: cfgCasa, ...PJ.calcularProjetoCompleto(casaAerea, cfgCasa) }
const comDps = MAT.listarMateriais(casaAerea, calcAerea, {})
t('M1', '§5.4.2.1.1 / §6.3.5.2.2', 'DPS fora da lista quando não exigido; com linha aérea + AQ2 em TN-C-S: esquema 1, um por fase (2), sem neutro–PE',
  semDps.dps.length === 0 && comDps.dps.length === 1 && comDps.dps[0].quantidade === 2,
  `sem exigência: ${JSON.stringify(semDps.dps)}; exigido: ${JSON.stringify(comDps.dps)}`, 'medio')

// ---------------------------------------------------------------------------------------------
const falhas = resultados.filter((r) => !r.ok)
for (const r of resultados) {
  console.log(`${r.ok ? 'OK  ' : 'FALHA'} ${r.id.padEnd(4)} ${r.clausula.padEnd(22)} ${r.descricao}`)
  if (!r.ok || process.argv.includes('--verboso')) console.log(`       ${r.gravidade.toUpperCase()} — ${r.evidencia}`)
}
console.log(`\n${resultados.length - falhas.length} OK · ${falhas.length} falhas`)

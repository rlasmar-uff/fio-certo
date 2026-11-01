#!/usr/bin/env node
/**
 * Harness de verificação de conformidade — ABNT NBR 5410:2004
 * Projeto: Calculadora de Instalações Elétricas Residenciais
 *
 * Executa o motor de cálculo real (frontend/src/calculations/) contra os valores
 * normativos extraídos da norma e reporta PASS/FAIL por cláusula.
 *
 * Zero dependências — roda com o node instalado no projeto:
 *     node QA/scripts/verificar.mjs
 *     node QA/scripts/verificar.mjs --grupo G4      (só um grupo)
 *     node QA/scripts/verificar.mjs --verboso       (mostra os que passaram)
 *
 * Sai com código 1 se houver qualquer FAIL — serve para CI.
 *
 * IMPORTANTE: falhas aqui não são bugs do harness. Cada FAIL é uma divergência
 * entre o código e a norma, com a cláusula citada. Os valores esperados vêm de
 * QA/referencias/valores-normativos.md, que foi extraído do NBR-5410.pdf do repo.
 */

import {
  calcularIluminacaoMinimaVA,
  calcularQuantidadeTugMinima,
  calcularTugMinima,
  calcularTueVA,
  calcularLimite600VA,
  calcularPrevisaoDeCarga,
} from '../../frontend/src/calculations/previsaoDeCarga.js'
import { gerarCircuitos, balancearFases, calcularCorrentesVetoriais } from '../../frontend/src/calculations/circuitos.js'
import {
  dimensionarCircuito,
  dimensionarCircuitos,
  escolherDisjuntor,
} from '../../frontend/src/calculations/condutores.js'
import { calcularQuedaPercentual, calcularQuedaAlimentadorFasorial } from '../../frontend/src/calculations/quedaDeTensao.js'
import { dimensionarProtecaoGeral, recomendarDPS, dimensionarIDR } from '../../frontend/src/calculations/protecaoGeral.js'
import { calcularProjetoCompleto } from '../../frontend/src/calculations/projeto.js'
import { dimensionarEletroduto } from '../../frontend/src/calculations/eletroduto.js'
import { verificarCurtoCircuito, propagarIccFaseFase, propagarIccTerminal } from '../../frontend/src/calculations/curtoCircuito.js'
import {
  calcularEquipotencializacaoPrincipal,
  calcularReservaQuadro,
  especificarDPS,
} from '../../frontend/src/calculations/complementares.js'
import { calcularVeredito } from '../../frontend/src/calculations/veredito.js'
import { TENSAO_CONTATO_LIMITE_V } from '../../frontend/src/calculations/seccionamento.js'
import { TABELA_48_NEUTRO_REDUZIDO, TAXAS_TERCEIRA_HARMONICA } from '../../frontend/src/calculations/constantes.js'
import { ADVERTENCIA_QUADRO, montarChecklists } from '../../frontend/src/calculations/checklists.js'
import { avaliarRequisitosBanheiro, VOLUMES_BANHEIRO, classificarVolume, verificarPontosBanheiro } from '../../frontend/src/calculations/locaisEspeciais.js'
import { casaModelo } from '../../frontend/src/projetos/casaModelo.js'
import { gerarArquivo, lerArquivo, codificarLink, decodificarLink } from '../../frontend/src/projetos/arquivo.js'
import { normalizarProjeto } from '../../frontend/src/projetos/estado.js'
import { listarMateriais } from '../../frontend/src/calculations/materiais.js'
import { montarQuadro } from '../../frontend/src/calculations/quadro.js'
import { verificarExistente } from '../../frontend/src/calculations/existente.js'
import { simularConsumo } from '../../frontend/src/calculations/consumo.js'
import { verificarTrecho } from '../../frontend/src/calculations/percurso.js'
import { detectarComodos, medirRetangulo } from '../../frontend/src/planta/detectar.js'
import {
  COLUNAS_AMPACIDADE,
  TABELA_36_COBRE_PVC,
  TABELA_37_COBRE_EPR,
  TABELA_40_FCT,
  TABELA_41_RESISTIVIDADE_SOLO,
  TABELA_45_AGRUPAMENTO_ENTERRADO,
  TABELA_46_CONDUTORES_CARREGADOS,
  METODOS_INSTALACAO,
  ISOLACOES,
  obterAmpacidade,
  obterK,
  TABELA_REATANCIA_OHM_KM_POR_MM2,
  SECAO_MINIMA_MM2,
  PISO_PRATICO_ALIMENTADOR_MM2,
  CONDUTIVIDADE_COBRE_70C,
  calcularSecaoTerra,
  resolverConfigInstalacao,
  obterTaxaOcupacaoMaxima,
  obterFatorAgrupamento,
  obterFatorResistividadeSolo,
  obterFatorTemperatura,
  listarTemperaturasDisponiveis,
  obterSecaoNeutroReduzida,
  obterReatanciaOhmMetro,
  POTENCIA_MAXIMA_CIRCUITO_TUG_VA,
} from '../../frontend/src/calculations/constantes.js'

// Converte um array simples de VA por fase (cargas resistivas, uma por fase — o padrão usado
// pelos testes deste harness antes do cálculo vetorial existir) no formato que
// `dimensionarProtecaoGeral` espera agora (`correntePorFaseA`/`correnteNeutroA`), reaproveitando
// o cálculo vetorial de verdade — para cargas puramente resistivas isoladas por fase, o resultado
// é numericamente idêntico à antiga soma escalar (mesma magnitude, sem ângulo relativo a
// considerar), preservando os valores exatos que os testes G6.x já verificavam.
function correntesDeVA(cargaPorFaseVA, tensaoFaseNeutro) {
  const circuitosSinteticos = cargaPorFaseVA.map((va, indice) => ({
    potenciaVA: va,
    cosPhi: 1,
    tipoCarga: 'resistiva',
    fases: [indice + 1],
  }))
  return calcularCorrentesVetoriais(circuitosSinteticos, cargaPorFaseVA.length, tensaoFaseNeutro)
}

// ---------------------------------------------------------------------------
// Valores normativos de referência (NBR 5410:2004) — ver QA/referencias/
// ---------------------------------------------------------------------------

/**
 * Tabela 36 — cobre/PVC 70 °C, ar a 30 °C, conferida direto da tabela impressa (renderizada como
 * imagem e lida visualmente — texto corrido via pdftotext desalinha essa tabela, ver
 * valores-normativos.md). B1/B2/C = 2 condutores carregados (todo circuito gerado é F-N ou F-F).
 */
// Testemunha independente da Tabela 36, digitada à mão da página impressa — é ela que pega um
// erro sistemático de fase na extração automática, que uma releitura do mesmo PDF repetiria.
// As colunas b1c2/b1c3/b2c2/cc2 são as originais. b2c3/cc3 foram acrescentadas junto com a
// correção do §6.2.5.6 e conferidas contra a extração do PDF; a coluna b1c3, que já estava aqui
// digitada à mão antes dessa correção, bate 12/12 com a mesma extração — é isso que dá confiança
// no alinhamento de fase das outras duas.
//
// Estendida em 30/09/2026 com A1/A2/D (a1c2/a1c3/a2c2/a2c3/dc2/dc3) — até então só B1/B2/C tinham
// dupla digitação, e A1/A2/D já eram métodos selecionáveis em METODOS_INSTALACAO sem essa guarda
// (G34.11). Re-extraída com `pdftotext -layout` das páginas 109-110 do PDF, em uma passagem
// NOVA e independente da que gerou `TABELA_36_COBRE_PVC`: a extração desalinha a coluna de seções
// nominais em relação às colunas de valores (não é um "achado" da norma, é um artefato da
// ferramenta de extração) — a conferência correta não é "qual rótulo fica ao lado de qual
// número", e sim ler cada sequência de valores (A1-C numa coluna de texto, D noutra) na ordem
// natural em que é impressa e casar a 10-upla inteira contra a tabela já em uso, célula a célula.
// As 288 células de Tabela 36 + Tabela 37 (ver TABELA_37_REFERENCIA, abaixo) bateram 1:1 nesta
// reconferência.
const TABELA_36_REFERENCIA = {
  //        A1/2c A1/3c A2/2c A2/3c B1/2c  B1/3c  B2/2c  B2/3c  C/2c  C/3c   D/2c  D/3c
  1.5: { a1c2: 14.5, a1c3: 13.5, a2c2: 14, a2c3: 13, b1c2: 17.5, b1c3: 15.5, b2c2: 16.5, b2c3: 15, cc2: 19.5, cc3: 17.5, dc2: 22, dc3: 18 },
  2.5: { a1c2: 19.5, a1c3: 18, a2c2: 18.5, a2c3: 17.5, b1c2: 24, b1c3: 21, b2c2: 23, b2c3: 20, cc2: 27, cc3: 24, dc2: 29, dc3: 24 },
  4: { a1c2: 26, a1c3: 24, a2c2: 25, a2c3: 23, b1c2: 32, b1c3: 28, b2c2: 30, b2c3: 27, cc2: 36, cc3: 32, dc2: 38, dc3: 31 },
  6: { a1c2: 34, a1c3: 31, a2c2: 32, a2c3: 29, b1c2: 41, b1c3: 36, b2c2: 38, b2c3: 34, cc2: 46, cc3: 41, dc2: 47, dc3: 39 },
  10: { a1c2: 46, a1c3: 42, a2c2: 43, a2c3: 39, b1c2: 57, b1c3: 50, b2c2: 52, b2c3: 46, cc2: 63, cc3: 57, dc2: 63, dc3: 52 },
  16: { a1c2: 61, a1c3: 56, a2c2: 57, a2c3: 52, b1c2: 76, b1c3: 68, b2c2: 69, b2c3: 62, cc2: 85, cc3: 76, dc2: 81, dc3: 67 },
  25: { a1c2: 80, a1c3: 73, a2c2: 75, a2c3: 68, b1c2: 101, b1c3: 89, b2c2: 90, b2c3: 80, cc2: 112, cc3: 96, dc2: 104, dc3: 86 },
  35: { a1c2: 99, a1c3: 89, a2c2: 92, a2c3: 83, b1c2: 125, b1c3: 110, b2c2: 111, b2c3: 99, cc2: 138, cc3: 119, dc2: 125, dc3: 103 },
  50: { a1c2: 119, a1c3: 108, a2c2: 110, a2c3: 99, b1c2: 151, b1c3: 134, b2c2: 133, b2c3: 118, cc2: 168, cc3: 144, dc2: 148, dc3: 122 },
  70: { a1c2: 151, a1c3: 136, a2c2: 139, a2c3: 125, b1c2: 192, b1c3: 171, b2c2: 168, b2c3: 149, cc2: 213, cc3: 184, dc2: 183, dc3: 151 },
  95: { a1c2: 182, a1c3: 164, a2c2: 167, a2c3: 150, b1c2: 232, b1c3: 207, b2c2: 201, b2c3: 179, cc2: 258, cc3: 223, dc2: 216, dc3: 179 },
  120: { a1c2: 210, a1c3: 188, a2c2: 192, a2c3: 172, b1c2: 269, b1c3: 239, b2c2: 232, b2c3: 206, cc2: 299, cc3: 259, dc2: 246, dc3: 203 },
}

// Tabela 37 (cobre, EPR/XLPE) — mesma reconferência independente de `TABELA_36_REFERENCIA`, desta
// vez cobrindo as 12 colunas inteiras (não só B1/B2/C): até 30/09/2026, a Tabela 37 não tinha
// NENHUMA dupla digitação, só os invariantes relacionais de G17 (EPR > PVC, razão 1,19-1,31) —
// bons para pegar erro de fase, não uma célula trocada por outra plausível da mesma tabela.
const TABELA_37_REFERENCIA = {
  //        A1/2c A1/3c A2/2c A2/3c B1/2c B1/3c B2/2c  B2/3c C/2c  C/3c   D/2c  D/3c
  1.5: { a1c2: 19, a1c3: 17, a2c2: 18.5, a2c3: 16.5, b1c2: 23, b1c3: 20, b2c2: 22, b2c3: 19.5, cc2: 24, cc3: 22, dc2: 26, dc3: 22 },
  2.5: { a1c2: 26, a1c3: 23, a2c2: 25, a2c3: 22, b1c2: 31, b1c3: 28, b2c2: 30, b2c3: 26, cc2: 33, cc3: 30, dc2: 34, dc3: 29 },
  4: { a1c2: 35, a1c3: 31, a2c2: 33, a2c3: 30, b1c2: 42, b1c3: 37, b2c2: 40, b2c3: 35, cc2: 45, cc3: 40, dc2: 44, dc3: 37 },
  6: { a1c2: 45, a1c3: 40, a2c2: 42, a2c3: 38, b1c2: 54, b1c3: 48, b2c2: 51, b2c3: 44, cc2: 58, cc3: 52, dc2: 56, dc3: 46 },
  10: { a1c2: 61, a1c3: 54, a2c2: 57, a2c3: 51, b1c2: 75, b1c3: 66, b2c2: 69, b2c3: 60, cc2: 80, cc3: 71, dc2: 73, dc3: 61 },
  16: { a1c2: 81, a1c3: 73, a2c2: 76, a2c3: 68, b1c2: 100, b1c3: 88, b2c2: 91, b2c3: 80, cc2: 107, cc3: 96, dc2: 95, dc3: 79 },
  25: { a1c2: 106, a1c3: 95, a2c2: 99, a2c3: 89, b1c2: 133, b1c3: 117, b2c2: 119, b2c3: 105, cc2: 138, cc3: 119, dc2: 121, dc3: 101 },
  35: { a1c2: 131, a1c3: 117, a2c2: 121, a2c3: 109, b1c2: 164, b1c3: 144, b2c2: 146, b2c3: 128, cc2: 171, cc3: 147, dc2: 146, dc3: 122 },
  50: { a1c2: 158, a1c3: 141, a2c2: 145, a2c3: 130, b1c2: 198, b1c3: 175, b2c2: 175, b2c3: 154, cc2: 209, cc3: 179, dc2: 173, dc3: 144 },
  70: { a1c2: 200, a1c3: 179, a2c2: 183, a2c3: 164, b1c2: 253, b1c3: 222, b2c2: 221, b2c3: 194, cc2: 269, cc3: 229, dc2: 213, dc3: 178 },
  95: { a1c2: 241, a1c3: 216, a2c2: 220, a2c3: 197, b1c2: 306, b1c3: 269, b2c2: 265, b2c3: 233, cc2: 328, cc3: 278, dc2: 252, dc3: 211 },
  120: { a1c2: 278, a1c3: 249, a2c2: 253, a2c3: 227, b1c2: 354, b1c3: 312, b2c2: 305, b2c3: 268, cc2: 382, cc3: 322, dc2: 287, dc3: 240 },
}

/** Resistividade do cobre (Ω·mm²/m) a 20 °C e na temperatura de operação do PVC (70 °C). */
const RHO_20 = 1 / 56
const RHO_70 = RHO_20 * (1 + 0.00393 * (70 - 20)) // ≈ 0,02137

/** §6.2.7 — orçamento de queda de tensão. */
const LIMITE_TERMINAL = 4 // §6.2.7.2

// ---------------------------------------------------------------------------
// Micro-framework de verificação
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const VERBOSO = args.includes('--verboso') || args.includes('-v')
const GRUPO_FILTRO = (() => {
  const i = args.indexOf('--grupo')
  return i >= 0 ? args[i + 1]?.toUpperCase() : null
})()

const resultados = []
let grupoAtual = null

function grupo(id, titulo) {
  grupoAtual = { id, titulo }
}

function ativo() {
  return !GRUPO_FILTRO || grupoAtual?.id === GRUPO_FILTRO
}

/**
 * @param {string} id        identificador estável (usado no relatório e nos commits de correção)
 * @param {string} clausula  cláusula/tabela da NBR 5410 que fundamenta o critério
 * @param {string} descricao o que está sendo verificado, em linguagem de projeto
 * @param {boolean} ok       resultado
 * @param {string} evidencia números concretos — é o que torna o FAIL acionável
 * @param {'critico'|'alto'|'medio'|'baixo'} severidade
 */
function checar(id, clausula, descricao, ok, evidencia, severidade = 'medio') {
  if (!ativo()) return
  resultados.push({
    grupo: grupoAtual,
    id,
    clausula,
    descricao,
    ok,
    evidencia,
    severidade,
  })
}

const quase = (a, b, tol = 0.01) => Math.abs(a - b) <= tol

// ---------------------------------------------------------------------------
// G1 — Previsão de carga (§9.5.2)
// ---------------------------------------------------------------------------
grupo('G1', 'Previsão de carga (§9.5.2)')

// §9.5.2.1.2 — "100 VA para os primeiros 6 m², acrescida de 60 VA para cada
// aumento de 4 m² INTEIROS". "Inteiros" é piso, não teto: 15 m² → 100 + 2×60.
const casosIluminacao = [
  { area: 4, esperado: 100 },
  { area: 6, esperado: 100 },
  { area: 10, esperado: 160 },
  { area: 12, esperado: 160 },
  { area: 14, esperado: 220 },
  { area: 15, esperado: 220 },
  { area: 20.15, esperado: 280 },
  { area: 25, esperado: 340 },
]
for (const { area, esperado } of casosIluminacao) {
  const obtido = calcularIluminacaoMinimaVA(area)
  checar(
    `G1.1-${area}`,
    '§9.5.2.1.2 b)',
    `Carga de iluminação para ${area} m²`,
    obtido === esperado,
    `esperado ${esperado} VA, obtido ${obtido} VA` +
      (obtido > esperado ? ` (+${obtido - esperado} VA — arredonda 4 m² para cima em vez de "m² inteiros")` : ''),
    'medio',
  )
}

// §9.5.2.2.1 d) — salas e dormitórios: 1 ponto por 5 m "ou fração" (teto).
for (const [perimetro, esperado] of [[10, 2], [11, 3], [15, 3], [16, 4]]) {
  const obtido = calcularQuantidadeTugMinima({ tipo: 'social', perimetro })
  checar(
    `G1.2-${perimetro}`,
    '§9.5.2.2.1 d)',
    `TUG em sala/dormitório com perímetro ${perimetro} m`,
    obtido === esperado,
    `esperado ${esperado} pontos, obtido ${obtido}`,
    'alto',
  )
}

// §9.5.2.2.1 b) — cozinhas/áreas de serviço: 1 ponto por 3,5 m ou fração.
for (const [perimetro, esperado] of [[7, 2], [8, 3], [14, 4], [15, 5]]) {
  const obtido = calcularQuantidadeTugMinima({ tipo: 'servico', perimetro })
  checar(
    `G1.3-${perimetro}`,
    '§9.5.2.2.1 b)',
    `TUG em cozinha/área de serviço com perímetro ${perimetro} m`,
    obtido === esperado,
    `esperado ${esperado} pontos, obtido ${obtido}`,
    'alto',
  )
}

// §9.5.2.2.1 a) — banheiro: pelo menos um ponto junto ao lavatório.
checar(
  'G1.4',
  '§9.5.2.2.1 a)',
  'TUG mínima em banheiro',
  calcularQuantidadeTugMinima({ tipo: 'banheiro', perimetro: 12 }) === 1,
  `obtido ${calcularQuantidadeTugMinima({ tipo: 'banheiro', perimetro: 12 })} ponto(s)`,
  'medio',
)

// §9.5.2.2.2 a) — 600 VA nos 3 primeiros pontos, 100 VA nos excedentes.
const tugServico = calcularTugMinima({ tipo: 'servico', perimetro: 17.5 }) // 5 pontos
checar(
  'G1.5',
  '§9.5.2.2.2 a)',
  'Potência de TUG em área de serviço: 600 VA até 3 pontos, 100 VA excedentes',
  tugServico.quantidade === 5 && tugServico.totalVA === 3 * 600 + 2 * 100,
  `${tugServico.quantidade} pontos → esperado ${3 * 600 + 2 * 100} VA, obtido ${tugServico.totalVA} VA`,
  'alto',
)

// §9.5.2.2.2 b) — demais cômodos: 100 VA por ponto.
const tugSocial = calcularTugMinima({ tipo: 'social', perimetro: 20 })
checar(
  'G1.6',
  '§9.5.2.2.2 b)',
  'Potência de TUG em sala/dormitório: 100 VA por ponto',
  tugSocial.totalVA === tugSocial.quantidade * 100,
  `${tugSocial.quantidade} pontos → esperado ${tugSocial.quantidade * 100} VA, obtido ${tugSocial.totalVA} VA`,
  'alto',
)

// §9.5.2.2.2 a), 2ª parte — acima de 6 pontos no conjunto desses ambientes, a norma
// admite 600 VA até DOIS pontos em cada um. Cenário: cozinha (4 pontos) + área de serviço
// (3 pontos) + banheiro (1 ponto) = 8 pontos > 6 → limite cai para 2.
const projeto6Pontos = [
  { id: 'k', tipo: 'servico', perimetro: 14 }, // 4 pontos
  { id: 'a', tipo: 'servico', perimetro: 10 }, // 3 pontos
  { id: 'b', tipo: 'banheiro', perimetro: 8 }, // 1 ponto
]
// Opt-in explícito (ver G34.10): sem declarar, o limite fica em 3 mesmo com 8 pontos no conjunto;
// só com `aplicarAlternativa=true` a regra dos 6 pontos entra em ação.
const limiteSemDeclarar = calcularLimite600VA(projeto6Pontos)
const limite6Pontos = calcularLimite600VA(projeto6Pontos, true)
const cozinha8 = calcularTugMinima(projeto6Pontos[0], limite6Pontos)
checar(
  'G1.7',
  '§9.5.2.2.2 a)',
  'Regra alternativa dos 6 pontos (600 VA até 2 pontos) disponível como opt-in, não por padrão',
  limiteSemDeclarar === 3 && limite6Pontos === 2 && cozinha8.totalVA === 2 * 600 + 2 * 100,
  `total do conjunto = 8 pontos > 6 → sem declarar: limite=${limiteSemDeclarar}; com aplicarAlternativa=true: limite=${limite6Pontos}; ` +
    `cozinha (4 pontos) = ${cozinha8.totalVA} VA (esperado ${2 * 600 + 2 * 100} VA)`,
  'baixo',
)

// Potência aparente de TUE: S = P / cosφ.
const tueVA = calcularTueVA({ tue: [{ quantidade: 1, potenciaW: 1500, cosPhi: 0.85 }] })
checar(
  'G1.8',
  '§4.2.1.2 / cálculo de corrente',
  'TUE indutiva convertida de W para VA pelo fator de potência',
  quase(tueVA, 1500 / 0.85, 0.5),
  `esperado ${(1500 / 0.85).toFixed(1)} VA, obtido ${tueVA.toFixed(1)} VA`,
  'alto',
)

// ---------------------------------------------------------------------------
// G2 — Integridade da Tabela 36
// ---------------------------------------------------------------------------
grupo('G2', 'Integridade dos dados da Tabela 36')

// Âncoras digitadas à mão: cada célula das 12 colunas (A1/A2/B1/B2/C/D), nas duas contagens de
// condutores carregados, conferida contra a tabela impressa. É um achado por COLUNA, não por
// célula — doze falhas de transcrição na mesma coluna são um erro só. A1/A2/D entraram em
// 30/09/2026 (G34.11) — eram métodos já selecionáveis sem essa guarda.
const ANCORAS_COLUNA = [
  ['A1', 2, 'a1c2'],
  ['A1', 3, 'a1c3'],
  ['A2', 2, 'a2c2'],
  ['A2', 3, 'a2c3'],
  ['B1', 2, 'b1c2'],
  ['B1', 3, 'b1c3'],
  ['B2', 2, 'b2c2'],
  ['B2', 3, 'b2c3'],
  ['C', 2, 'cc2'],
  ['C', 3, 'cc3'],
  ['D', 2, 'dc2'],
  ['D', 3, 'dc3'],
]
for (const [metodo, carregados, chaveRef] of ANCORAS_COLUNA) {
  const divergentes = Object.entries(TABELA_36_REFERENCIA).filter(
    ([secao, ref]) => obterAmpacidade({ metodo, condutoresCarregados: carregados, secaoMm2: Number(secao) }) !== ref[chaveRef],
  )
  checar(
    `G2.1-${metodo}-${carregados}c`,
    'Tabela 36',
    `Coluna ${metodo}/${carregados} condutores carregados bate com a tabela impressa`,
    divergentes.length === 0,
    divergentes.length === 0
      ? `12/12 seções conferem na coluna ${metodo}/${carregados}c`
      : divergentes
          .map(([secao, ref]) => `${secao} mm²: ${obterAmpacidade({ metodo, condutoresCarregados: carregados, secaoMm2: Number(secao) })} A ≠ ${ref[chaveRef]} A`)
          .join('; '),
    'alto',
  )
}

// Mesma dupla digitação, agora para a Tabela 37 (EPR/XLPE) — inexistente até 30/09/2026 (G34.11).
for (const [metodo, carregados, chaveRef] of ANCORAS_COLUNA) {
  const divergentes = Object.entries(TABELA_37_REFERENCIA).filter(
    ([secao, ref]) =>
      obterAmpacidade({ isolacao: 'epr', metodo, condutoresCarregados: carregados, secaoMm2: Number(secao) }) !== ref[chaveRef],
  )
  checar(
    `G2.7-${metodo}-${carregados}c`,
    'Tabela 37',
    `Coluna ${metodo}/${carregados} condutores carregados (EPR/XLPE) bate com a tabela impressa`,
    divergentes.length === 0,
    divergentes.length === 0
      ? `12/12 seções conferem na coluna ${metodo}/${carregados}c (Tabela 37)`
      : divergentes
          .map(
            ([secao, ref]) =>
              `${secao} mm²: ${obterAmpacidade({ isolacao: 'epr', metodo, condutoresCarregados: carregados, secaoMm2: Number(secao) })} A ≠ ${ref[chaveRef]} A`,
          )
          .join('; '),
    'alto',
  )
}

// A coluna de 3 condutores carregados é SEMPRE menor que a de 2, em todos os métodos — é o que
// torna a escolha de coluna uma questão de segurança e não de preferência.
const violamCarregados = TABELA_36_COBRE_PVC.flatMap((linha) =>
  ['A1', 'A2', 'B1', 'B2', 'C', 'D']
    .filter((metodo) => linha[COLUNAS_AMPACIDADE.indexOf(`${metodo}_3`) + 1] >= linha[COLUNAS_AMPACIDADE.indexOf(`${metodo}_2`) + 1])
    .map((metodo) => `${linha[0]} mm² ${metodo}`),
)
checar(
  'G2.2',
  '§6.2.5.6 / Tabela 36',
  '3 condutores carregados sempre dá ampacidade menor que 2, em todos os métodos',
  violamCarregados.length === 0,
  violamCarregados.length === 0 ? '72 pares (12 seções × 6 métodos) conferem' : violamCarregados.join(', '),
  'alto',
)

checar(
  'G2.3',
  'Tabela 36',
  'Todas as 12 colunas estritamente crescentes com a seção',
  COLUNAS_AMPACIDADE.every((_, i) => TABELA_36_COBRE_PVC.every((l, j, a) => j === 0 || l[i + 1] > a[j - 1][i + 1])),
  'monotonicidade das 12 colunas da tabela',
  'baixo',
)

checar(
  'G2.4',
  'Tabela 36',
  'Toda linha tem exatamente 12 valores, todos numéricos',
  TABELA_36_COBRE_PVC.every((l) => l.length === COLUNAS_AMPACIDADE.length + 1 && l.every((v) => typeof v === 'number')),
  `${TABELA_36_COBRE_PVC.length} linhas × ${COLUNAS_AMPACIDADE.length} colunas`,
  'alto',
)

// Ordem física entre métodos na mesma seção: A2 ≤ A1 (cabo multipolar dissipa pior que fios
// soltos), B2 < B1 pelo mesmo motivo, e A1 < B1 < C (quanto menos confinado, melhor a
// dissipação). Pega uma troca de colunas que as âncoras sozinhas poderiam não pegar.
const violamOrdem = TABELA_36_COBRE_PVC.filter((l) => {
  const v = (coluna) => l[COLUNAS_AMPACIDADE.indexOf(coluna) + 1]
  return !(v('A2_2') <= v('A1_2') && v('B2_2') < v('B1_2') && v('A1_2') < v('B1_2') && v('B1_2') < v('C_2'))
})
checar(
  'G2.5',
  'Tabela 36',
  'Ordem física entre métodos (A2 ≤ A1 < B1 < C, B2 < B1) em todas as seções',
  violamOrdem.length === 0,
  violamOrdem.length === 0 ? 'ordem conferida nas 12 seções' : violamOrdem.map((l) => `${l[0]} mm²`).join(', '),
  'alto',
)

checar(
  'G2.6',
  'Tabela 36',
  'Método inexistente devolve null em vez de cair silenciosamente em B1',
  obterAmpacidade({ metodo: 'B9', condutoresCarregados: 2, secaoMm2: 2.5 }) === null &&
    obterAmpacidade({ metodo: 'B1', condutoresCarregados: 4, secaoMm2: 2.5 }) === null,
  'B9/2c e B1/4c → null',
  'medio',
)

// ---------------------------------------------------------------------------
// G3 — Divisão da instalação (§9.5.3)
// ---------------------------------------------------------------------------
grupo('G3', 'Divisão da instalação em circuitos (§9.5.3)')

const cfgMono = resolverConfigInstalacao('monofasica', 127)
const residencia = [
  { id: 'c1', nome: 'Sala', tipo: 'social', area: 20, perimetro: 18, tue: [] },
  { id: 'c2', nome: 'Dormitório', tipo: 'social', area: 12, perimetro: 14, tue: [] },
  { id: 'c3', nome: 'Cozinha', tipo: 'servico', area: 12, perimetro: 14, tue: [] },
  { id: 'c4', nome: 'Área de serviço', tipo: 'servico', area: 6, perimetro: 10, tue: [] },
  {
    id: 'c5',
    nome: 'Banheiro',
    tipo: 'banheiro',
    area: 4,
    perimetro: 8,
    tue: [{ id: 'e1', nome: 'Chuveiro', quantidade: 1, potenciaW: 5500, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 }],
  },
]
const circuitosRes = gerarCircuitos(residencia, cfgMono)

checar(
  'G3.1',
  '§4.2.5.5 / §9.5.3.3',
  'Iluminação e TUG em circuitos separados',
  circuitosRes.every((c) => c.tipo !== 'iluminacao' || !c.comodos.some((n) => false)) &&
    circuitosRes.some((c) => c.tipo === 'iluminacao') &&
    circuitosRes.some((c) => c.tipo === 'tug'),
  `${circuitosRes.filter((c) => c.tipo === 'iluminacao').length} circuito(s) de iluminação, ${circuitosRes.filter((c) => c.tipo === 'tug').length} de TUG`,
  'alto',
)

const tugServicoCirc = circuitosRes.filter((c) => c.tipo === 'tug' && c.nome.includes('Cozinha'))
const comodosNoServico = tugServicoCirc.flatMap((c) => c.comodos)
checar(
  'G3.2',
  '§9.5.3.2',
  'TUG de cozinha/área de serviço em circuito exclusivo',
  comodosNoServico.includes('Cozinha') &&
    comodosNoServico.includes('Área de serviço') &&
    !comodosNoServico.includes('Sala'),
  `circuito exclusivo contém: ${comodosNoServico.join(', ') || '(vazio)'}`,
  'alto',
)

// §9.5.3.2 lista cozinhas, copas, áreas de serviço, lavanderias e locais análogos —
// banheiro NÃO está nessa lista (embora esteja na lista de 600 VA do §9.5.2.2.2).
checar(
  'G3.3',
  '§9.5.3.2',
  'Banheiro fora do circuito exclusivo de cozinha/área de serviço',
  !comodosNoServico.includes('Banheiro'),
  `banheiro ${comodosNoServico.includes('Banheiro') ? 'foi agrupado indevidamente' : 'corretamente fora'}`,
  'alto',
)

// §9.5.3.1 — equipamento acima de 10 A exige circuito independente.
const circChuveiro = circuitosRes.find((c) => c.nome.includes('Chuveiro'))
checar(
  'G3.4',
  '§9.5.3.1',
  'Equipamento acima de 10 A em circuito independente',
  Boolean(circChuveiro) && circChuveiro.comodos.length === 1,
  circChuveiro ? `circuito dedicado: ${circChuveiro.nome} (${circChuveiro.potenciaVA} VA)` : 'circuito de TUE não encontrado',
  'alto',
)

// O teto de VA por circuito é convenção de projeto (não normativo), mas se está declarado no
// código ele precisa valer — senão o agrupamento é enganoso. Perímetro 16 m (não 30 m, usado até
// 30/09/2026): com a alternativa dos 6 pontos virando opt-in (G34.10, default `false`), a leitura
// base de um cômodo isolado grande o bastante já ultrapassa o teto sozinha — "um cômodo nunca é
// dividido" é uma limitação conhecida (ver FUTURO.md), não o que este teste quer verificar.
const cozinhaGrande = gerarCircuitos(
  [{ id: 'k', nome: 'Cozinha', tipo: 'servico', area: 20, perimetro: 16, tue: [] }],
  cfgMono,
)
const estourados = cozinhaGrande.filter((c) => c.tipo === 'tug' && c.potenciaVA > POTENCIA_MAXIMA_CIRCUITO_TUG_VA)
checar(
  'G3.5',
  'convenção de projeto (não normativa)',
  `Nenhum circuito de TUG acima do teto declarado de ${POTENCIA_MAXIMA_CIRCUITO_TUG_VA} VA`,
  estourados.length === 0,
  estourados.length
    ? `${estourados.length} circuito(s) acima do teto: ${estourados.map((c) => `${c.potenciaVA} VA`).join(', ')} — um cômodo nunca é dividido`
    : 'teto respeitado',
  'medio',
)

// ---------------------------------------------------------------------------
// G4 — Condutores e coordenação da proteção (§6.2.6 / §5.3.4)
// ---------------------------------------------------------------------------
grupo('G4', 'Condutores e coordenação da proteção (§6.2.6, §5.3.4)')

const dimensionados = dimensionarCircuitos(circuitosRes, {})

// §6.2.6.1.1 / Tabela 47 — seção mínima: iluminação 1,5 mm²; força (tomadas) 2,5 mm².
checar(
  'G4.1',
  '§6.2.6.1.1 / Tabela 47',
  'Seção mínima de circuito de iluminação = 1,5 mm² Cu',
  SECAO_MINIMA_MM2.iluminacao === 1.5,
  `obtido ${SECAO_MINIMA_MM2.iluminacao} mm²`,
  'alto',
)
checar(
  'G4.2',
  '§6.2.6.1.1 / Tabela 47, nota 2',
  'Seção mínima de circuito de tomadas (força) = 2,5 mm² Cu',
  SECAO_MINIMA_MM2.tug === 2.5 && SECAO_MINIMA_MM2.tue === 2.5,
  `TUG ${SECAO_MINIMA_MM2.tug} mm², TUE ${SECAO_MINIMA_MM2.tue} mm²`,
  'alto',
)
// Os 10 mm² da Tabela 47 são da linha de CONDUTORES NUS. Para cabo isolado em
// instalação fixa o mínimo normativo é 2,5 mm² — o piso de 10 mm² no ramal de
// entrada é exigência de concessionária, não da NBR 5410. Os dois precisam existir
// separados: o mínimo NORMATIVO (SECAO_MINIMA_MM2.geral) e o piso PRÁTICO da
// concessionária (PISO_PRATICO_ALIMENTADOR_MM2), cada um citado como o que realmente é.
checar(
  'G4.3',
  '§6.2.6.1.1 / Tabela 47',
  'Seção mínima do alimentador atribuída à fonte correta',
  SECAO_MINIMA_MM2.geral === 2.5,
  `mínimo normativo (NBR 5410) = ${SECAO_MINIMA_MM2.geral} mm², piso prático (concessionária) = ${PISO_PRATICO_ALIMENTADOR_MM2} mm², citados separadamente`,
  'medio',
)

// §5.3.4.1 a) — Ib ≤ In ≤ Iz, onde Iz já é a ampacidade CORRIGIDA (c.ampacidadeA) pelos fatores
// de temperatura e agrupamento que a própria ferramenta aplica por padrão (FCA inferido do total
// de circuitos gerados — dimensionarCircuitos(circuitosRes, {}) sem overrides).
for (const c of dimensionados) {
  if (!c.secaoMm2) continue
  checar(
    `G4.4-${c.id}`,
    '§5.3.4.1 a)',
    `Ib ≤ In ≤ Iz corrigido em "${c.nome}" (FCT=${c.fatorTemperatura}, FCA=${c.fatorAgrupamento.toFixed(2)} para ${circuitosRes.length} circuitos)`,
    c.correnteProjetoA <= c.disjuntorA && c.disjuntorA <= c.ampacidadeA,
    `Ib=${c.correnteProjetoA.toFixed(1)} A, In=${c.disjuntorA} A, Iz tabela=${c.ampacidadeTabelaA} A, Iz corrigido=${c.ampacidadeA.toFixed(1)} A`,
    'critico',
  )
}

// §5.3.4.1 + §6.2.6.1.2 a) — Iz é a ampacidade AFETADA pelos fatores de correção. Cenário do
// achado original: 3 circuitos no mesmo eletroduto (FCA = 0,70, Tabela 42 ref.1), forçado via
// override para reproduzir exatamente o caso que a auditoria encontrou, independente de quantos
// circuitos esta residência de teste realmente gere.
const dimensionados3Agrupados = dimensionarCircuitos(circuitosRes, {}, { numeroCircuitosAgrupados: 3 })
for (const c of dimensionados3Agrupados) {
  if (!c.secaoMm2) continue
  checar(
    `G4.5-${c.id}`,
    '§5.3.4.1 a) + §6.2.6.1.2 a)',
    `Ib ≤ In ≤ Iz em "${c.nome}" com 3 circuitos agrupados (FCA=${c.fatorAgrupamento})`,
    c.disjuntorA <= c.ampacidadeA,
    `In=${c.disjuntorA} A vs Iz corrigido=${c.ampacidadeA.toFixed(1)} A (Iz tabela ${c.ampacidadeTabelaA} A × FCA ${c.fatorAgrupamento})` +
      (c.disjuntorA > c.ampacidadeA ? ' — condutor desprotegido contra sobrecarga' : ''),
    'critico',
  )
}

// A faixa de disjuntores precisa cobrir a entrada de uma residência trifásica grande.
checar(
  'G4.6',
  '§5.3.4.1',
  'Faixa de disjuntores cobre correntes acima de 100 A',
  escolherDisjuntor(101) !== null,
  `Ib=101 A → ${escolherDisjuntor(101) ?? 'null (circuito inteiro vira erro)'}`,
  'medio',
)

// §9.5.4 — o dispositivo deve seccionar simultaneamente todos os condutores de fase.
// Num circuito fase-fase isso significa disjuntor bipolar; o resultado precisa dizer isso.
const cfgTri = resolverConfigInstalacao('trifasica', 127)
const circFF = gerarCircuitos(
  [{ id: 'b', nome: 'Banheiro', tipo: 'banheiro', area: 4, perimetro: 8, tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 5500, ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 }] }],
  cfgTri,
).find((c) => c.ehFaseFase)
const dimFF = dimensionarCircuito(circFF, 10)
checar(
  'G4.7',
  '§9.5.4',
  'Circuito fase-fase declara disjuntor multipolar (número de polos)',
  dimFF.polos !== undefined && dimFF.polos >= 2,
  dimFF.polos === undefined
    ? `resultado informa apenas "${dimFF.disjuntorA} A", sem número de polos — circuito ocupa 2 fases`
    : `${dimFF.polos} polos`,
  'medio',
)

// §6.2.6.1.2 c) e d) — dependem da corrente de curto-circuito presumida na origem, dado que um
// usuário residencial não tem (exige estudo da concessionária). Decisão de escopo: não calcular
// — mas declarar isso EXPLICITAMENTE no resultado em vez de deixar a lacuna invisível.
const dimSemCC = dimensionarCircuito({ id: 'z', nome: 'Genérico', tipo: 'tug', potenciaVA: 2000, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }, 10)
checar(
  'G4.8',
  '§6.2.6.1.2 c) / §5.3.5',
  'Curto-circuito e solicitação térmica declarados como não verificados (não calculados silenciosamente)',
  dimSemCC.curtoCircuitoVerificado === false && Boolean(dimSemCC.avisoCurtoCircuito),
  dimSemCC.curtoCircuitoVerificado === false
    ? `curtoCircuitoVerificado=false, aviso presente: "${dimSemCC.avisoCurtoCircuito?.slice(0, 60)}..."`
    : 'não declarado — lacuna invisível no resultado',
  'baixo',
)
checar(
  'G4.9',
  '§6.2.6.1.2 d) / §5.1.2.2.4',
  'Seccionamento automático declarado como não verificado (não calculado silenciosamente)',
  dimSemCC.seccionamentoAutomaticoVerificado === false && Boolean(dimSemCC.avisoCurtoCircuito),
  dimSemCC.seccionamentoAutomaticoVerificado === false
    ? 'seccionamentoAutomaticoVerificado=false, aviso presente'
    : 'não declarado — lacuna invisível no resultado',
  'baixo',
)

// ---------------------------------------------------------------------------
// G5 — Queda de tensão (§6.2.7)
// ---------------------------------------------------------------------------
grupo('G5', 'Queda de tensão (§6.2.7)')

// A Tabela 36 é definida para condutor a 70 °C; a queda precisa usar a resistência
// nessa temperatura, senão o resultado é otimista justamente no caso crítico.
const rUsada2p5 = 1 / (CONDUTIVIDADE_COBRE_70C * 2.5)
checar(
  'G5.1',
  '§6.2.7 / Tabela 36 (condutor a 70 °C)',
  'Resistência do condutor tomada na temperatura de operação',
  rUsada2p5 >= RHO_70 / 2.5 - 1e-6,
  `2,5 mm²: usada ${(rUsada2p5 * 1000).toFixed(2)} Ω/km (σ=${CONDUTIVIDADE_COBRE_70C}, 70 °C) vs ${((RHO_70 / 2.5) * 1000).toFixed(2)} Ω/km de referência — ${quase(rUsada2p5, RHO_70 / 2.5, 1e-4) ? 'bate' : 'diverge'}`,
  'alto',
)

// §6.2.7.4 — a queda usa a corrente de projeto do circuito.
const qRef = calcularQuedaPercentual({ comprimentoM: 20, correnteA: 10, secaoMm2: 2.5, tensaoV: 127, cosPhi: 1, tipoCarga: 'resistiva' })
const qDobro = calcularQuedaPercentual({ comprimentoM: 20, correnteA: 20, secaoMm2: 2.5, tensaoV: 127, cosPhi: 1, tipoCarga: 'resistiva' })
checar(
  'G5.2',
  '§6.2.7.4',
  'Queda proporcional à corrente de projeto',
  quase(qDobro, qRef * 2, 0.001),
  `I=10 A → ${qRef.toFixed(2)}%, I=20 A → ${qDobro.toFixed(2)}%`,
  'alto',
)

// §6.2.7.2 — teto de 4% no circuito terminal.
const circLongo = dimensionarCircuito({ id: 't', nome: 'Terminal longo', tipo: 'tug', potenciaVA: 2000, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }, 35)
checar(
  'G5.3',
  '§6.2.7.2',
  'Seção elevada quando a queda no circuito terminal ultrapassa 4%',
  circLongo.secaoMm2 === null || circLongo.quedaPercentual <= LIMITE_TERMINAL,
  `35 m / ${circLongo.correnteProjetoA.toFixed(1)} A → ${circLongo.secaoMm2} mm², queda ${circLongo.quedaPercentual?.toFixed(2)}%`,
  'alto',
)

// §6.2.7.1 c) — em QUALQUER ponto de utilização, a queda total a partir do ponto de entrega não
// pode passar de 5%. O teto de 4% do §6.2.7.2 é só o trecho terminal: alimentador e terminal
// dividem o mesmo orçamento. Projeto de teste: alimentador longo o bastante (35 m, chuveiro de
// 7000 W) para consumir boa parte do orçamento de 5%, verificando que o que sobra para o
// circuito terminal (25 m) é MENOR que 4% — e que a seção do terminal respeita esse valor menor,
// não os 4% fixos do §6.2.7.2 isoladamente.
const projetoAcumulado = {
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 127,
  comodos: [
    {
      id: 'x1',
      nome: 'Banheiro',
      tipo: 'banheiro',
      area: 4,
      perimetro: 8,
      tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 7000, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 }],
    },
  ],
  comprimentos: { 'tue-x1-ch-1': 25 },
  comprimentoRamalEntrada: 35,
}
const resultadoAcum = calcularProjetoCompleto(projetoAcumulado, resolverConfigInstalacao('monofasica', 127))
const circuitoAcum = resultadoAcum.dimensionados.find((c) => c.tipo === 'tue')
checar(
  'G5.4',
  '§6.2.7.1 c)',
  'Orçamento de queda do circuito terminal reduzido pelo que o alimentador já consumiu (não são 4% fixos)',
  resultadoAcum.limiteQuedaTerminalDisponivel < LIMITE_TERMINAL &&
    circuitoAcum.limitePercentual === resultadoAcum.limiteQuedaTerminalDisponivel &&
    (circuitoAcum.secaoMm2 === null || circuitoAcum.quedaPercentual <= circuitoAcum.limitePercentual + 1e-9),
  `alimentador consumiu ${resultadoAcum.quedaAlimentadorPercentual.toFixed(2)}% dos 5% totais → circuito terminal "${circuitoAcum.nome}" recebeu limite de ${resultadoAcum.limiteQuedaTerminalDisponivel.toFixed(2)}% (não os 4% fixos) → seção ${circuitoAcum.secaoMm2} mm², queda ${circuitoAcum.quedaPercentual?.toFixed(2)}%`,
  'critico',
)

// Comprimento não informado (bruto ausente, não passado como 0) deve ser declarado NÃO
// VERIFICADO — não "conforme" por omissão.
const semComprimento = dimensionarCircuitos(
  [{ id: 's', nome: 'Sem comprimento', tipo: 'tug', potenciaVA: 2000, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }],
  {},
)[0]
checar(
  'G5.5',
  '§6.2.6.1.2 e)',
  'Circuito sem comprimento informado é declarado NÃO VERIFICADO (não conforme por omissão)',
  semComprimento.conforme === false && semComprimento.naoVerificado === true,
  `comprimento não informado → conforme=${semComprimento.conforme}, naoVerificado=${semComprimento.naoVerificado} (queda só seria 0% se o comprimento realmente fosse 0, o que não foi declarado)`,
  'alto',
)

// ---------------------------------------------------------------------------
// G6 — Alimentador, proteção geral e aterramento
// ---------------------------------------------------------------------------
grupo('G6', 'Alimentador, proteção geral e aterramento')

// Uma carga fase-fase percorre as DUAS fases com a mesma corrente I = S/Vff.
// Em VA referidos à tensão fase-neutro isso equivale a S/√3 por fase, não S/2.
const cargaFF = 5500
const circsFF = gerarCircuitos(
  [{ id: 'x', nome: 'Banheiro', tipo: 'banheiro', area: 4, perimetro: 8, tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: cargaFF, ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 }] }],
  cfgTri,
)
const { cargaPorFase } = balancearFases(circsFF, 3)
const soFF = circsFF.find((c) => c.ehFaseFase)
const correnteRealFF = soFF.potenciaVA / soFF.tensao
const contribuicaoModelo = Math.max(...cargaPorFase) // a fase mais carregada só tem o chuveiro
const correnteModelo = contribuicaoModelo / 127
checar(
  'G6.1',
  'cálculo de corrente por fase',
  'Contribuição de carga fase-fase por fase = S/√3 (e não S/2)',
  quase(correnteModelo, correnteRealFF, 0.5),
  `corrente real na fase = ${correnteRealFF.toFixed(2)} A; modelo implica ${correnteModelo.toFixed(2)} A — subestima ${(((correnteRealFF / correnteModelo) - 1) * 100).toFixed(1)}%, e é daí que sai o disjuntor geral`,
  'alto',
)

// A queda no alimentador trifásico é √3·L·I·(…)/Vff, não 2·L·I/Vfn.
const pgTri = dimensionarProtecaoGeral({
  ...correntesDeVA([6000, 6000, 6000], 127),
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 30,
})
const quedaReportada = pgTri.condutorFase.quedaPercentual ?? 0
const rAlim = 1 / (CONDUTIVIDADE_COBRE_70C * pgTri.condutorFase.secaoMm2)
const quedaTrifasicaCorreta = (Math.sqrt(3) * 30 * pgTri.correnteEntradaA * rAlim) / (127 * Math.sqrt(3)) * 100
checar(
  'G6.2',
  '§6.2.7 (sistema trifásico)',
  'Queda no alimentador trifásico usa a fórmula trifásica',
  quase(quedaReportada, quedaTrifasicaCorreta, 0.05),
  `reportada ${quedaReportada.toFixed(2)}%, correta ${quedaTrifasicaCorreta.toFixed(2)}% — fórmula monofásica (2·L·I) aplicada ao alimentador`,
  'medio',
)

// Tabela 58 — seção mínima do condutor de proteção.
for (const [fase, esperado] of [[2.5, 2.5], [16, 16], [25, 16], [35, 16], [50, 25], [70, 35]]) {
  const obtido = calcularSecaoTerra(fase)
  checar(
    `G6.3-${fase}`,
    'Tabela 58',
    `Condutor de proteção para fase de ${fase} mm²`,
    obtido === esperado,
    `esperado ${esperado} mm², obtido ${obtido} mm²`,
    'alto',
  )
}

// §6.4.3.1.1 — todo circuito precisa de condutor de proteção; hoje só o alimentador tem.
const temPeNoTerminal = dimensionados.every((c) => c.secaoTerraMm2 !== undefined)
checar(
  'G6.4',
  '§6.4.3.1 / Tabela 58',
  'Circuitos terminais recebem seção do condutor de proteção',
  temPeNoTerminal,
  temPeNoTerminal ? 'PE dimensionado' : 'PE calculado apenas para o alimentador — circuitos terminais não recebem seção de PE',
  'alto',
)

// §5.1.3.2.2 — DR de alta sensibilidade (≤ 30 mA).
const pgIdr = dimensionarProtecaoGeral({
  ...correntesDeVA([5000], 127),
  numeroFases: 1,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
})
checar(
  'G6.5',
  '§5.1.3.2.2',
  'DR de alta sensibilidade (≤ 30 mA) previsto',
  pgIdr.idr !== null && pgIdr.idr.sensibilidadeMA <= 30,
  `sensibilidade ${pgIdr.idr?.sensibilidadeMA} mA, In ${pgIdr.idr?.correnteA} A, ${pgIdr.idr?.polos} polos`,
  'alto',
)
checar(
  'G6.6',
  '§5.3.4.1 a)',
  'Corrente nominal do DR ≥ corrente do disjuntor geral',
  pgIdr.idr?.correnteA >= pgIdr.disjuntorGeralA,
  `DR ${pgIdr.idr?.correnteA} A vs disjuntor geral ${pgIdr.disjuntorGeralA} A`,
  'alto',
)

// §6.2.6.2.2/6.2.6.2.4 — monofásico e bifásico NUNCA reduzem o neutro, mesmo se o usuário
// declarar a redução (a Tabela 48 só vale para trifásico com neutro).
const pgMonoNeutro = dimensionarProtecaoGeral({
  ...correntesDeVA([15000], 127),
  numeroFases: 1,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
  neutroReduzidoDeclarado: true,
})
checar(
  'G6.7',
  '§6.2.6.2.2',
  'Alimentador monofásico nunca reduz o neutro, mesmo com a redução declarada',
  pgMonoNeutro.secaoNeutroMm2 === pgMonoNeutro.condutorFase.secaoMm2 && pgMonoNeutro.neutroReduzido === false,
  `fase=${pgMonoNeutro.condutorFase.secaoMm2} mm², neutro=${pgMonoNeutro.secaoNeutroMm2} mm²`,
  'critico',
)

// §6.2.6.2.6/Tabela 48 — trifásico, fase > 25 mm², com a redução declarada: reduz de verdade.
// A 2ª das 3 condições (3ª harmônica ≤ 15%) passou a ser declarada à parte de
// `neutroReduzidoDeclarado`, porque também governa o fator de 0,86 do §6.2.5.6.1 — sem ela
// declarada, a redução não ocorre (ver G16.5/G16.6).
const pgTriNeutroReduzido = dimensionarProtecaoGeral({
  ...correntesDeVA([15000, 15000, 15000], 127),
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
  neutroReduzidoDeclarado: true,
  terceiraHarmonica: 'ate-15',
})
const esperadoReduzido = obterSecaoNeutroReduzida(pgTriNeutroReduzido.condutorFase.secaoMm2)
checar(
  'G6.8',
  '§6.2.6.2.6 / Tabela 48',
  'Alimentador trifásico com fase > 25 mm² e redução declarada usa a Tabela 48',
  pgTriNeutroReduzido.condutorFase.secaoMm2 > 25
    ? pgTriNeutroReduzido.secaoNeutroMm2 === esperadoReduzido && pgTriNeutroReduzido.secaoNeutroMm2 < pgTriNeutroReduzido.condutorFase.secaoMm2
    : pgTriNeutroReduzido.secaoNeutroMm2 === pgTriNeutroReduzido.condutorFase.secaoMm2,
  `fase=${pgTriNeutroReduzido.condutorFase.secaoMm2} mm², neutro=${pgTriNeutroReduzido.secaoNeutroMm2} mm² (Tabela 48 esperava ${esperadoReduzido} mm²)`,
  'medio',
)

// Sem a declaração explícita do usuário, mesmo trifásico com fase grande NÃO reduz —
// "presumivelmente equilibrado" é uma afirmação que só o usuário pode fazer.
const pgTriSemDeclarar = dimensionarProtecaoGeral({
  ...correntesDeVA([15000, 15000, 15000], 127),
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
})
checar(
  'G6.9',
  '§6.2.6.2.6',
  'Sem declaração explícita do usuário, o neutro NÃO reduz automaticamente',
  pgTriSemDeclarar.secaoNeutroMm2 === pgTriSemDeclarar.condutorFase.secaoMm2 && pgTriSemDeclarar.neutroReduzido === false,
  `fase=${pgTriSemDeclarar.condutorFase.secaoMm2} mm², neutro=${pgTriSemDeclarar.secaoNeutroMm2} mm² (sem declarar, fica igual à fase)`,
  'alto',
)

// ---------------------------------------------------------------------------
// G7 — Dimensionamento de eletroduto (§6.2.11.1.6)
// ---------------------------------------------------------------------------
grupo('G7', 'Dimensionamento de eletroduto (§6.2.11.1.6)')

checar(
  'G7.1',
  '§6.2.11.1.6 a)',
  'Taxa de ocupação máxima do eletroduto por número de condutores (53%/31%/40%)',
  obterTaxaOcupacaoMaxima(1) === 0.53 &&
    obterTaxaOcupacaoMaxima(2) === 0.31 &&
    obterTaxaOcupacaoMaxima(3) === 0.4 &&
    obterTaxaOcupacaoMaxima(10) === 0.4,
  `1 condutor=${obterTaxaOcupacaoMaxima(1) * 100}%, 2=${obterTaxaOcupacaoMaxima(2) * 100}%, 3=${obterTaxaOcupacaoMaxima(3) * 100}%, 10=${obterTaxaOcupacaoMaxima(10) * 100}%`,
  'alto',
)

// Caso de fronteira: chuveiro monofásico de 10 mm² (fase+neutro+PE, todos 10 mm²) ocupa 40,15%
// de um eletroduto de 1/2" — acima do limite de 40% por uma margem mínima. Se a ferramenta
// aprovasse 1/2" aqui, o instalador não conseguiria enfiar os 3 condutores na prática.
const eletrodutoChuveiro = dimensionarEletroduto([10, 10, 10])
const ocupacaoMeiaPolegada = eletrodutoChuveiro.trilha.find((l) => l.referencia === '1/2"')?.ocupacaoPercentual
checar(
  'G7.2',
  '§6.2.11.1.6 a)',
  'Circuito de chuveiro 10 mm² (fase+neutro+PE) rejeita eletroduto de 1/2" por exceder 40% de ocupação',
  eletrodutoChuveiro.eletrodutoRecomendado?.referencia === '3/4"',
  `área dos condutores=${eletrodutoChuveiro.areaCondutoresMm2.toFixed(1)} mm² → ocupação em 1/2"=${ocupacaoMeiaPolegada?.toFixed(1)}% (limite 40%) → recomendado ${eletrodutoChuveiro.eletrodutoRecomendado?.nominalMm} mm (${eletrodutoChuveiro.eletrodutoRecomendado?.referencia})`,
  'medio',
)

// EPR/XLPE: cabo HEPR 0,6/1 kV (Corfio), Ø 5,35 mm em 2,5 mm² e 7,60 mm em 10 mm². À mão:
// 3 × π/4 × 5,35² = 67,4 mm² → 31,9% em 1/2" (≤ 40%); 3 × π/4 × 7,6² = 136,1 mm² → 1/2" dá 64,4%,
// 3/4" dá 38,2%.
const eletrodutoEpr25 = dimensionarEletroduto([2.5, 2.5, 2.5], { isolacao: 'epr' })
const eletrodutoEpr10 = dimensionarEletroduto([10, 10, 10], { isolacao: 'epr' })
const ocupacao = (e) => e.trilha.find((l) => l.referencia === e.eletrodutoRecomendado?.referencia)?.ocupacaoPercentual
checar(
  'G7.4',
  '§6.2.11.1.6 a)',
  'Eletroduto com cabo EPR/XLPE: 3 × 2,5 mm² → 1/2" (31,9%); 3 × 10 mm² → 3/4" (38,2%)',
  eletrodutoEpr25.eletrodutoRecomendado?.referencia === '1/2"' &&
    Math.abs(ocupacao(eletrodutoEpr25) - 31.9) < 0.05 &&
    eletrodutoEpr10.eletrodutoRecomendado?.referencia === '3/4"' &&
    Math.abs(ocupacao(eletrodutoEpr10) - 38.2) < 0.05,
  `2,5: ${eletrodutoEpr25.areaCondutoresMm2?.toFixed(1)} mm² → ${eletrodutoEpr25.eletrodutoRecomendado?.referencia} ${ocupacao(eletrodutoEpr25)?.toFixed(1)}%; 10: ${eletrodutoEpr10.areaCondutoresMm2?.toFixed(1)} mm² → ${eletrodutoEpr10.eletrodutoRecomendado?.referencia} ${ocupacao(eletrodutoEpr10)?.toFixed(1)}%`,
  'medio',
)

// O eletroduto é calculado dentro do orquestrador do projeto — tanto para cada circuito
// terminal quanto para o alimentador — reaproveitando o projeto já montado para G5.4.
checar(
  'G7.3',
  '§6.2.11.1.6',
  'Eletroduto calculado para cada circuito terminal e para o alimentador dentro de calcularProjetoCompleto',
  resultadoAcum.dimensionados.every((c) => c.secaoMm2 === null || c.eletroduto !== null) &&
    resultadoAcum.protecaoGeral.eletroduto !== null,
  `circuitos: ${resultadoAcum.dimensionados.map((c) => `${c.nome}=${c.eletroduto?.eletrodutoRecomendado?.referencia ?? '—'}`).join(', ')}; alimentador=${resultadoAcum.protecaoGeral.eletroduto?.eletrodutoRecomendado?.referencia ?? '—'}`,
  'medio',
)

// A taxa de ocupação conta TODOS os condutores físicos do trecho, não só os "carregados" — ao
// contrário da Tabela 36/ampacidade. Um PE ocupa espaço mesmo sem conduzir corrente em uso normal.
const semPE = dimensionarEletroduto([2.5, 2.5])
const comPE = dimensionarEletroduto([2.5, 2.5, 2.5])
checar(
  'G7.4',
  '§6.2.11.1.6 a)',
  'Condutor de proteção (PE) conta como condutor físico na taxa de ocupação, não só os carregados',
  semPE.taxaMaximaPercentual === 31 && comPE.taxaMaximaPercentual === 40,
  `2 condutores (sem PE) → taxa máxima ${semPE.taxaMaximaPercentual}%; 3 condutores (com PE) → taxa máxima ${comPE.taxaMaximaPercentual}%`,
  'baixo',
)

// ---------------------------------------------------------------------------
// G8 — Métodos de instalação B1/B2/C (Tabela 33/36/42)
// ---------------------------------------------------------------------------
grupo('G8', 'Métodos de instalação B1/B2/C (Tabela 33/36/42)')

checar(
  'G8.1',
  'Tabela 36',
  'Ampacidade B2 (cabo multipolar) é sempre menor que B1 (fios soltos) na mesma seção — a norma diferencia por tipo de condutor, não por embutido/aparente',
  TABELA_36_COBRE_PVC.every((l) => obterAmpacidade({ metodo: 'B2', condutoresCarregados: 2, secaoMm2: l[0] }) < obterAmpacidade({ metodo: 'B1', condutoresCarregados: 2, secaoMm2: l[0] })),
  'B2 < B1 em todas as seções da tabela',
  'alto',
)
checar(
  'G8.2',
  'Tabela 36',
  'Ampacidade C (cabo direto na parede, sem eletroduto) é sempre maior que B1 na mesma seção',
  TABELA_36_COBRE_PVC.every((l) => obterAmpacidade({ metodo: 'C', condutoresCarregados: 2, secaoMm2: l[0] }) > obterAmpacidade({ metodo: 'B1', condutoresCarregados: 2, secaoMm2: l[0] })),
  'C > B1 em todas as seções da tabela (melhor dissipação de calor sem conduto)',
  'alto',
)

// Prova de que a escolha do método muda o dimensionamento de verdade, não é um seletor
// decorativo: com In=70 A (Ib=65 A), B1 aprova 16 mm² (76 A ≥ 70 A) mas B2 não (69 A < 70 A) e
// precisa subir para 25 mm² (90 A) — mesma entrada, resultado diferente.
const circuitoMetodo = { id: 'm1', nome: 'Teste método', tipo: 'tug', potenciaVA: 65 * 127, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }
const dimMetodoB1 = dimensionarCircuito(circuitoMetodo, 0, { metodoInstalacao: 'B1' })
const dimMetodoB2 = dimensionarCircuito(circuitoMetodo, 0, { metodoInstalacao: 'B2' })
checar(
  'G8.3',
  '§6.2.6.1.2 a) (Iz por método)',
  'A seção final realmente muda ao trocar o método de instalação (não é decorativo)',
  dimMetodoB1.disjuntorA === 70 && dimMetodoB1.secaoMm2 === 16 && dimMetodoB2.secaoMm2 === 25,
  `In=${dimMetodoB1.disjuntorA} A → B1 escolhe ${dimMetodoB1.secaoMm2} mm² (Iz=${dimMetodoB1.ampacidadeTabelaA} A), B2 escolhe ${dimMetodoB2.secaoMm2} mm² (Iz=${dimMetodoB2.ampacidadeTabelaA} A)`,
  'critico',
)

checar(
  'G8.4',
  'Tabela 42, referências 1 e 2',
  'Método C usa a referência 2 da Tabela 42 (menos severa); B1 e B2 usam a mesma referência 1',
  obterFatorAgrupamento(3, 'C') > obterFatorAgrupamento(3, 'B1') && obterFatorAgrupamento(3, 'B2') === obterFatorAgrupamento(3, 'B1'),
  `3 circuitos agrupados: B1=${obterFatorAgrupamento(3, 'B1')}, B2=${obterFatorAgrupamento(3, 'B2')}, C=${obterFatorAgrupamento(3, 'C')}`,
  'alto',
)

// §6.2.11.1.6 só se aplica a linhas COM eletroduto — método C (cabo direto na parede) não tem
// o que dimensionar aqui, e a ferramenta precisa dizer isso, não calcular algo sem sentido.
const projetoMetodoC = { ...projetoAcumulado, metodosInstalacao: { 'tue-x1-ch-1': 'C' } }
const resultadoMetodoC = calcularProjetoCompleto(projetoMetodoC, resolverConfigInstalacao('monofasica', 127))
const circuitoEmC = resultadoMetodoC.dimensionados.find((c) => c.tipo === 'tue')
checar(
  'G8.5',
  '§6.2.11.1.6',
  'Circuito em método C não tem eletroduto calculado (cabo direto na parede, sem conduto)',
  circuitoEmC.metodoInstalacao === 'C' && circuitoEmC.eletroduto === null,
  circuitoEmC.eletroduto === null
    ? 'eletroduto=null, como esperado para método C'
    : `eletroduto calculado indevidamente em método C: ${JSON.stringify(circuitoEmC.eletroduto?.eletrodutoRecomendado)}`,
  'medio',
)

// ---------------------------------------------------------------------------
// G9 — Curto-circuito (§5.3.5) — verificação opcional quando a Icc é informada
// ---------------------------------------------------------------------------
grupo('G9', 'Curto-circuito (§5.3.5) — verificação opcional quando Icc é informada')

const ccSemIcc = verificarCurtoCircuito({ correnteDisjuntorA: 25, curvaDisjuntor: 'C', iccPresumidaA: null, secaoMm2: 2.5 })
checar(
  'G9.1',
  '§5.3.5.1',
  'Sem Icc informada, curto-circuito continua não verificado (não "conforme" por omissão)',
  ccSemIcc.verificado === false && ccSemIcc.conforme === null,
  ccSemIcc.motivo,
  'baixo',
)

// In=25 A, curva C (5×-10×) → disparo instantâneo GARANTIDO só a partir de 10×In = 250 A (na IEC
// 60898, 5×In é o ponto de NÃO atuação instantânea). Icc=80 A fica abaixo disso: a atuação cairia
// na faixa térmica do disjuntor, que só a curva do fabricante define. Até 28/09/2026 o limiar era
// o limite inferior (125 A) — permissivo; corrigido junto com o G9.5.
const ccAbaixoInstantaneo = verificarCurtoCircuito({ correnteDisjuntorA: 25, curvaDisjuntor: 'C', iccPresumidaA: 80, secaoMm2: 2.5 })
checar(
  'G9.2',
  '§5.3.5.5 (curva do disjuntor, IEC 60898)',
  'Icc abaixo do disparo instantâneo fica não verificável, em vez de aprovar sem embasamento',
  ccAbaixoInstantaneo.verificado === false && ccAbaixoInstantaneo.limiarInstantaneoA === 250,
  `In=25 A, curva C, limiar=${ccAbaixoInstantaneo.limiarInstantaneoA} A, Icc=80 A → ${ccAbaixoInstantaneo.motivo}`,
  'baixo',
)

// Icc=200 A = 8×In numa curva C: dentro da faixa 5-10×In, onde a atuação instantânea NÃO é
// garantida. Antes da correção isto era aprovado com t=10 ms.
const ccFaixaMagnetica = verificarCurtoCircuito({ correnteDisjuntorA: 25, curvaDisjuntor: 'C', iccPresumidaA: 200, secaoMm2: 2.5 })
checar(
  'G9.5',
  '§6.3.4.3.2 a) (curva do disjuntor, IEC 60898)',
  'Icc entre o limite inferior e o superior da faixa magnética fica não verificada, não aprovada com 10 ms',
  ccFaixaMagnetica.verificado === false,
  `In=25 A, curva C, Icc=200 A (8×In): verificado=${ccFaixaMagnetica.verificado}, conforme=${ccFaixaMagnetica.conforme}`,
  'alto',
)

// k=115 (cobre/PVC ≤300mm²), S=10mm² → k²S²=1 322 500 A²s. Em 10 ms, uma Icc de 15 000 A dá
// I²t=2 250 000 A²s — bem acima da capacidade do condutor. Tem que REPROVAR de propósito.
// Seção ≥10 mm² de propósito (não 2,5 mm² como antes de 30/09/2026): abaixo de 10 mm² o k não é
// normalizado (Tabela 30, NOTA 1, ver G34.3) e o critério fica "não verificado", não reprovado.
const ccReprova = verificarCurtoCircuito({ correnteDisjuntorA: 25, curvaDisjuntor: 'C', iccPresumidaA: 15000, secaoMm2: 10 })
checar(
  'G9.3',
  '§5.3.5.5.2 / Tabela 30',
  'Icc alta o bastante reprova um condutor que não aguentaria a energia de curto-circuito',
  ccReprova.verificado === true && ccReprova.conforme === false,
  `Icc=15000 A, 10 mm² (k=115): I²t=${ccReprova.energiaPassanteA2s.toExponential(2)} A²s vs k²S²=${ccReprova.energiaSuportadaA2s.toExponential(2)} A²s`,
  'critico',
)

// Mesma conta, condutor de 25 mm²: k²S²=8 265 625 A²s — folga confortável para Icc=3000A → aprova.
const ccAprova = verificarCurtoCircuito({ correnteDisjuntorA: 100, curvaDisjuntor: 'C', iccPresumidaA: 3000, secaoMm2: 25 })
checar(
  'G9.4',
  '§5.3.5.5.2 / Tabela 30',
  'Icc dentro da capacidade do condutor aprova de verdade — a verificação não é sempre "não verificado"',
  ccAprova.verificado === true && ccAprova.conforme === true,
  `Icc=3000 A, 25 mm² (k=115): I²t=${ccAprova.energiaPassanteA2s.toExponential(2)} A²s ≤ k²S²=${ccAprova.energiaSuportadaA2s.toExponential(2)} A²s`,
  'alto',
)

// ---------------------------------------------------------------------------
// G10 — Balanceamento de fases por busca exata (engenharia — não é cláusula da norma)
// ---------------------------------------------------------------------------
grupo('G10', 'Balanceamento de fases — busca exata (otimização de engenharia, não é cláusula da norma)')

// A norma não exige uma partição ótima entre fases — só as regras de agrupamento/separação já
// verificadas em G3. Este grupo confere a OTIMIZAÇÃO pedida à parte: a busca exata precisa achar
// o desequilíbrio mínimo verdadeiro, não só "melhor que o guloso". Verificado contra força bruta
// (enumera todas as 3^n atribuições) num caso pequeno o bastante para ser exaustivo em milissegundos.
function forcaBrutaImbalance(vasPorCircuito, numeroFases) {
  let melhor = Infinity
  const cargas = new Array(numeroFases).fill(0)
  const n = vasPorCircuito.length
  function rec(indice) {
    if (indice === n) {
      const imbalance = Math.max(...cargas) - Math.min(...cargas)
      if (imbalance < melhor) melhor = imbalance
      return
    }
    for (let fase = 0; fase < numeroFases; fase += 1) {
      cargas[fase] += vasPorCircuito[indice]
      rec(indice + 1)
      cargas[fase] -= vasPorCircuito[indice]
    }
  }
  rec(0)
  return melhor
}

const vasBalanco = [850, 730, 640, 500, 410, 300]
const circuitosBalanco = vasBalanco.map((va, indice) => ({
  id: `bal-${indice}`,
  nome: `Circuito ${indice}`,
  tipo: 'tug',
  potenciaVA: va,
  tensao: 127,
  ehFaseFase: false,
  cosPhi: 1,
  tipoCarga: 'resistiva',
  comodos: [],
}))
const { cargaPorFase: cargaBalanco, balanceamentoExato } = balancearFases(circuitosBalanco, 3)
const imbalanceObtido = Math.max(...cargaBalanco) - Math.min(...cargaBalanco)
const imbalanceOtimo = forcaBrutaImbalance(vasBalanco, 3)
checar(
  'G10.1',
  'engenharia (otimização pedida à parte da norma)',
  'Busca exata de balanceamento encontra o desequilíbrio mínimo verdadeiro entre fases',
  balanceamentoExato && Math.abs(imbalanceObtido - imbalanceOtimo) < 1e-6,
  `obtido ${imbalanceObtido.toFixed(1)} VA de desequilíbrio (busca exata=${balanceamentoExato}), ótimo por força bruta = ${imbalanceOtimo.toFixed(1)} VA`,
  'baixo',
)

// Acima do limite de circuitos (ou se o espaço de busca estourar), cai no guloso — precisa
// continuar produzindo um resultado válido (todas as fases com carga, sem exceção), não travar.
const muitosCircuitos = Array.from({ length: 30 }, (_, indice) => ({
  id: `many-${indice}`,
  nome: `Circuito ${indice}`,
  tipo: 'tug',
  potenciaVA: 300 + indice * 17,
  tensao: 127,
  ehFaseFase: false,
  cosPhi: 1,
  tipoCarga: 'resistiva',
  comodos: [],
}))
const resultadoMuitos = balancearFases(muitosCircuitos, 3)
checar(
  'G10.2',
  'engenharia (otimização pedida à parte da norma)',
  'Quando o espaço de estados realmente estoura (entradas heterogêneas, sem VAs repetidos), cai de volta no guloso em vez de travar ou estourar tempo',
  resultadoMuitos.balanceamentoExato === false && resultadoMuitos.cargaPorFase.every((c) => c > 0),
  `${muitosCircuitos.length} circuitos com VAs distintos → busca exata=${resultadoMuitos.balanceamentoExato}, cargas=${resultadoMuitos.cargaPorFase.map((c) => c.toFixed(0)).join('/')}`,
  'baixo',
)

// Não existe mais um teto por NÚMERO de circuitos (havia um de 24, removido — ver circuitos.js):
// o único gatilho de fallback agora é o espaço de estados. Prova: 40 circuitos (bem acima do
// antigo teto de 24) com VA IDÊNTICO entre eles — poucos estados possíveis (a soma só depende de
// QUANTOS circuitos vão pra cada fase, não de QUAIS) — a busca exata precisa continuar rodando.
const muitosCircuitosRepetidos = Array.from({ length: 40 }, (_, indice) => ({
  id: `rep-${indice}`,
  nome: `Circuito ${indice}`,
  tipo: 'tug',
  potenciaVA: 500,
  tensao: 127,
  ehFaseFase: false,
  cosPhi: 1,
  tipoCarga: 'resistiva',
  comodos: [],
}))
const resultadoRepetidos = balancearFases(muitosCircuitosRepetidos, 3)
checar(
  'G10.3',
  'engenharia (otimização pedida à parte da norma)',
  'Acima do antigo teto de 24 circuitos, a busca exata continua rodando quando o espaço de estados permanece pequeno (sem o teto por contagem, removido)',
  resultadoRepetidos.balanceamentoExato === true,
  `${muitosCircuitosRepetidos.length} circuitos de 500 VA cada (poucos estados possíveis, já que só a CONTAGEM por fase importa) → busca exata=${resultadoRepetidos.balanceamentoExato}, cargas=${resultadoRepetidos.cargaPorFase.map((c) => c.toFixed(0)).join('/')}`,
  'medio',
)

// ---------------------------------------------------------------------------
// G11 — Reatância por seção (fonte externa: catálogo Cordeiro, Tabela 8 — não é dado da NBR 5410)
// ---------------------------------------------------------------------------
grupo('G11', 'Reatância por seção (fonte externa — não é dado da NBR 5410)')

checar(
  'G11.1',
  'fonte externa (catálogo Cordeiro, Tabela 8 — condutos fechados)',
  'Reatância de 1,5 mm² bate com a fonte (0,16 Ω/km)',
  quase(obterReatanciaOhmMetro(1.5) * 1000, 0.16, 1e-6),
  `obtido ${(obterReatanciaOhmMetro(1.5) * 1000).toFixed(3)} Ω/km, esperado 0,16 Ω/km`,
  'medio',
)
checar(
  'G11.2',
  'fonte externa (catálogo Cordeiro, Tabela 8)',
  'Reatância de 120 mm² bate com a fonte (0,10 Ω/km)',
  quase(obterReatanciaOhmMetro(120) * 1000, 0.1, 1e-6),
  `obtido ${(obterReatanciaOhmMetro(120) * 1000).toFixed(3)} Ω/km, esperado 0,10 Ω/km`,
  'medio',
)
checar(
  'G11.3',
  'fonte externa (catálogo Cordeiro, Tabela 8)',
  'Reatância por seção nunca aumenta com a seção (tabela impressa é decrescente/estável)',
  TABELA_REATANCIA_OHM_KM_POR_MM2.every((l, i, a) => i === 0 || l.reatanciaOhmKm <= a[i - 1].reatanciaOhmKm),
  'monotonicidade não-crescente da tabela',
  'baixo',
)

// A reatância NÃO é dado da NBR 5410 (o texto completo do PDF não usa essa palavra em lugar
// nenhum) — precisava passar a depender da seção, não ser uma constante única. Prova numérica:
// recalcula a queda de tensão pela fórmula ANTIGA (constante fixa, 0,08 Ω/km) ao lado da NOVA
// (obterReatanciaOhmMetro, por seção) para a MESMA entrada — confirma que o código realmente usa
// um valor diferente por seção agora, não é só uma reformulação decorativa.
const REATANCIA_ANTIGA_OHM_METRO = 0.00008
function quedaComReatanciaFixa(comprimentoM, correnteA, secaoMm2, tensaoV, cosPhi, tipoCarga) {
  const resistenciaPorMetro = 1 / (CONDUTIVIDADE_COBRE_70C * secaoMm2)
  const senPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
  const sinalReativo = tipoCarga === 'capacitiva' ? -1 : 1
  const quedaPorMetro = resistenciaPorMetro * cosPhi + sinalReativo * REATANCIA_ANTIGA_OHM_METRO * senPhi
  return ((2 * comprimentoM * correnteA * quedaPorMetro) / tensaoV) * 100
}
const quedaComTabela = calcularQuedaPercentual({ comprimentoM: 15, correnteA: 10, secaoMm2: 1.5, tensaoV: 127, cosPhi: 0.85, tipoCarga: 'indutiva' })
const quedaComConstanteAntiga = quedaComReatanciaFixa(15, 10, 1.5, 127, 0.85, 'indutiva')
checar(
  'G11.4',
  'engenharia (reatância variável por seção, fonte externa)',
  'Queda de tensão com carga indutiva usa a reatância por seção, não mais uma constante única',
  Math.abs(quedaComTabela - quedaComConstanteAntiga) > 1e-6 && quedaComTabela > quedaComConstanteAntiga,
  `1,5 mm², cosφ=0,85 indutiva: com reatância por seção (0,16 Ω/km) = ${quedaComTabela.toFixed(4)}%; com a constante antiga (0,08 Ω/km) = ${quedaComConstanteAntiga.toFixed(4)}% — reatância real de seções pequenas é maior que a constante antiga assumia`,
  'baixo',
)

// ---------------------------------------------------------------------------
// G12 — IDs de circuito estáveis (derivados do conteúdo do grupo, não da posição)
// ---------------------------------------------------------------------------
grupo('G12', 'IDs de circuito estáveis (derivados do conteúdo do grupo, não da posição)')

function chaveComposicao(circuito) {
  return [...circuito.comodos].sort().join('|')
}

const comodosBaseG12 = [
  { id: 'g12-r1', nome: 'R1', tipo: 'social', area: 10, perimetro: 70, tue: [] }, // 1400 VA TUG
  { id: 'g12-r2', nome: 'R2', tipo: 'social', area: 10, perimetro: 5, tue: [] }, //  100 VA TUG
  { id: 'g12-r3', nome: 'R3', tipo: 'social', area: 10, perimetro: 30, tue: [] }, //  600 VA TUG
]
const cfgMonoG12 = resolverConfigInstalacao('monofasica', 127)
const circuitosBaseG12 = gerarCircuitos(comodosBaseG12, cfgMonoG12).filter((c) => c.tipo === 'tug')

// Adiciona um cômodo grande e independente (perto do teto de 2000 VA) — não deveria perturbar a
// composição (nem, portanto, o ID) de nenhum grupo cuja composição sobrevive à adição.
const comodosComExtraG12 = [
  ...comodosBaseG12,
  { id: 'g12-r4', nome: 'R4', tipo: 'social', area: 10, perimetro: 95, tue: [] }, // 1900 VA
]
const circuitosComExtraG12 = gerarCircuitos(comodosComExtraG12, cfgMonoG12).filter((c) => c.tipo === 'tug')

const gruposInalteradosG12 = circuitosBaseG12.filter((base) =>
  circuitosComExtraG12.some((novo) => chaveComposicao(novo) === chaveComposicao(base)),
)
const idsMantidosG12 = gruposInalteradosG12.every((base) => {
  const correspondente = circuitosComExtraG12.find((novo) => chaveComposicao(novo) === chaveComposicao(base))
  return correspondente.id === base.id
})
checar(
  'G12.1',
  'engenharia (estabilidade de ID — FUTURO.md)',
  'Adicionar um cômodo independente não muda o ID de um circuito cuja composição não mudou',
  gruposInalteradosG12.length > 0 && idsMantidosG12,
  gruposInalteradosG12.length === 0
    ? 'nenhum grupo permaneceu com a mesma composição — cenário de teste não serve, revisar'
    : gruposInalteradosG12
        .map((base) => {
          const novo = circuitosComExtraG12.find((n) => chaveComposicao(n) === chaveComposicao(base))
          return `[${chaveComposicao(base)}]: id antes="${base.id}", id depois="${novo.id}"`
        })
        .join('; '),
  'alto',
)

// Remove R3 — muda a composição do grupo que continha R3 (o resto se reorganiza). O ID antigo
// dessa composição precisa desaparecer, não ser reaproveitado por um grupo com cômodos
// diferentes — é exatamente o bug original (comprimento já digitado indo pro circuito errado).
const grupoR1R3Base = circuitosBaseG12.find((c) => c.comodos.includes('R1') && c.comodos.includes('R3'))
const comodosSemR3G12 = comodosBaseG12.filter((c) => c.id !== 'g12-r3')
const circuitosSemR3G12 = gerarCircuitos(comodosSemR3G12, cfgMonoG12).filter((c) => c.tipo === 'tug')
const idAntigoReaparece = circuitosSemR3G12.some((c) => c.id === grupoR1R3Base.id)
const novoGrupoR1 = circuitosSemR3G12.find((c) => c.comodos.includes('R1'))
checar(
  'G12.2',
  'engenharia (estabilidade de ID — FUTURO.md)',
  'Remover um cômodo muda a composição do grupo afetado, e o ID antigo dessa composição desaparece (não é reaproveitado por um grupo com cômodos diferentes)',
  !idAntigoReaparece && novoGrupoR1.id !== grupoR1R3Base.id,
  `antes: grupo "${grupoR1R3Base.id}" = [${grupoR1R3Base.comodos.join(',')}]; depois de remover R3: grupo de R1 agora é "${novoGrupoR1.id}" = [${novoGrupoR1.comodos.join(',')}]`,
  'critico',
)

// ---------------------------------------------------------------------------
// G13 — Divisão de circuitos: First-Fit Decreasing (engenharia — "otimização" pedida)
// ---------------------------------------------------------------------------
grupo('G13', 'Divisão de circuitos — First-Fit Decreasing (otimização de engenharia, não é cláusula da norma)')

// Referência: o algoritmo ANTERIOR (guloso simples, empacotava só respeitando a ORDEM DE
// CADASTRO, sem ordenar por tamanho) — reimplementado aqui só para comparação; não é mais o
// código de produção (ver `agruparEmCircuitos`, circuitos.js, que agora ordena por VA decrescente
// e varre TODOS os grupos abertos, não só o mais recente).
function empacotarPorOrdemDeCadastro(itensVA, capacidadeVA) {
  const grupos = []
  for (const va of itensVA) {
    const aberto = grupos.find((g) => g.va + va <= capacidadeVA)
    if (aberto) aberto.va += va
    else grupos.push({ va })
  }
  return grupos
}

// 7 cômodos (tipo social, perímetros escolhidos pra dar VA de TUG exatos: 1100/800/700/300/
// 1600/1900/1200, teto de 2000 VA/circuito) — caso encontrado por busca onde a ordem de cadastro
// empacota pior que ordenar por tamanho primeiro (ver histórico do plano de implementação).
const comodosG13 = [
  { id: 'g13-1', nome: 'S1', tipo: 'social', area: 10, perimetro: 55, tue: [] }, // 1100 VA
  { id: 'g13-2', nome: 'S2', tipo: 'social', area: 10, perimetro: 40, tue: [] }, //  800 VA
  { id: 'g13-3', nome: 'S3', tipo: 'social', area: 10, perimetro: 35, tue: [] }, //  700 VA
  { id: 'g13-4', nome: 'S4', tipo: 'social', area: 10, perimetro: 15, tue: [] }, //  300 VA
  { id: 'g13-5', nome: 'S5', tipo: 'social', area: 10, perimetro: 80, tue: [] }, // 1600 VA
  { id: 'g13-6', nome: 'S6', tipo: 'social', area: 10, perimetro: 95, tue: [] }, // 1900 VA
  { id: 'g13-7', nome: 'S7', tipo: 'social', area: 10, perimetro: 60, tue: [] }, // 1200 VA
]
const cfgMonoG13 = resolverConfigInstalacao('monofasica', 127)
const circuitosG13 = gerarCircuitos(comodosG13, cfgMonoG13).filter((c) => c.tipo === 'tug')
const vasG13 = [1100, 800, 700, 300, 1600, 1900, 1200]
const gruposOrdemCadastroG13 = empacotarPorOrdemDeCadastro(vasG13, POTENCIA_MAXIMA_CIRCUITO_TUG_VA)

checar(
  'G13.1',
  'engenharia (otimização pedida à parte da norma)',
  'Divisão de circuitos por First-Fit Decreasing usa menos circuitos que empacotar na ordem de cadastro, para os mesmos cômodos',
  circuitosG13.length < gruposOrdemCadastroG13.length,
  `mesmos 7 cômodos (${vasG13.join('/')} VA, teto ${POTENCIA_MAXIMA_CIRCUITO_TUG_VA} VA): ordem de cadastro precisaria de ${gruposOrdemCadastroG13.length} circuitos (${gruposOrdemCadastroG13.map((g) => g.va).join('/')} VA); FFD usa ${circuitosG13.length} (${circuitosG13.map((c) => c.potenciaVA).join('/')} VA)`,
  'baixo',
)
checar(
  'G13.2',
  'convenção de projeto (não normativa)',
  'FFD nunca excede o teto de VA por circuito',
  circuitosG13.every((c) => c.potenciaVA <= POTENCIA_MAXIMA_CIRCUITO_TUG_VA),
  `maior circuito: ${Math.max(...circuitosG13.map((c) => c.potenciaVA))} VA (teto ${POTENCIA_MAXIMA_CIRCUITO_TUG_VA} VA)`,
  'medio',
)

// ---------------------------------------------------------------------------
// G14 — Proteção geral: cálculo vetorial completo (corrente de fase E corrente real do neutro)
// ---------------------------------------------------------------------------
grupo('G14', 'Proteção geral — cálculo vetorial completo (§6.2.6.2)')

const V127 = 127
function circuitoSintetico(potenciaVA, cosPhi, tipoCarga, fases) {
  return { potenciaVA, cosPhi, tipoCarga, fases }
}

// Caso 1: 3 cargas resistivas iguais, uma por fase (balanceado) → corrente do neutro ≈ 0.
const balanceadoG14 = calcularCorrentesVetoriais(
  [circuitoSintetico(1000, 1, 'resistiva', [1]), circuitoSintetico(1000, 1, 'resistiva', [2]), circuitoSintetico(1000, 1, 'resistiva', [3])],
  3,
  V127,
)
checar(
  'G14.1',
  '§6.2.6.2 (soma vetorial, prova por KCL na fonte)',
  'Cargas resistivas iguais, uma por fase (circuito equilibrado): corrente do neutro ≈ 0',
  quase(balanceadoG14.correnteNeutroA, 0, 1e-6),
  `correntePorFaseA=[${balanceadoG14.correntePorFaseA.map((c) => c.toFixed(3)).join(', ')}] A, correnteNeutroA=${balanceadoG14.correnteNeutroA.toExponential(2)} A`,
  'alto',
)

// Caso 2: uma única carga fase-neutro sozinha na fase A → corrente do neutro = exatamente a
// corrente dessa fase (todo o retorno passa pelo neutro).
const faseUnicaG14 = calcularCorrentesVetoriais([circuitoSintetico(1000, 1, 'resistiva', [1])], 3, V127)
checar(
  'G14.2',
  '§6.2.6.2 (soma vetorial)',
  'Carga sozinha numa única fase: corrente do neutro = exatamente a corrente dessa fase',
  quase(faseUnicaG14.correnteNeutroA, faseUnicaG14.correntePorFaseA[0], 1e-6) && quase(faseUnicaG14.correntePorFaseA[0], 1000 / V127, 1e-6),
  `correntePorFaseA=[${faseUnicaG14.correntePorFaseA.map((c) => c.toFixed(3)).join(', ')}] A, correnteNeutroA=${faseUnicaG14.correnteNeutroA.toFixed(3)} A`,
  'alto',
)

// Caso 3: duas cargas resistivas IGUAIS em A e B, C vazia → corrente do neutro = a mesma
// magnitude de UMA fase isolada (não o dobro, nem ×√3) — trigonometria de fasores a 120°:
// |Ia+Ib|² = Ia²+Ib²+2·Ia·Ib·cos(120°) = Ia² (cos120°=-0,5, Ia=Ib) ⟹ |Ia+Ib|=Ia.
const duasFasesG14 = calcularCorrentesVetoriais(
  [circuitoSintetico(1000, 1, 'resistiva', [1]), circuitoSintetico(1000, 1, 'resistiva', [2])],
  3,
  V127,
)
checar(
  'G14.3',
  '§6.2.6.2 (soma vetorial — resultado não intuitivo, por isso é caso de teste explícito)',
  'Duas cargas iguais em fases diferentes (3ª vazia): corrente do neutro = a magnitude de UMA fase, não a soma aritmética',
  quase(duasFasesG14.correnteNeutroA, duasFasesG14.correntePorFaseA[0], 1e-6) &&
    !quase(duasFasesG14.correnteNeutroA, duasFasesG14.correntePorFaseA[0] * 2, 1e-3),
  `correntePorFaseA=[${duasFasesG14.correntePorFaseA.map((c) => c.toFixed(3)).join(', ')}] A, correnteNeutroA=${duasFasesG14.correnteNeutroA.toFixed(3)} A (não ${(duasFasesG14.correntePorFaseA[0] * 2).toFixed(3)} A)`,
  'medio',
)

// Caso 4: par fase-fase A-C (índices 0 e 2) combinado com uma carga fase-neutro INDUTIVA na
// própria fase A. Prova de que a tensão fase-fase do par A-C é calculada por subtração direta de
// componentes, não por um atalho de ângulo fixo "+30°" (que só vale pra pares adjacentes A-B/B-C
// e erra o sinal do ângulo em 60° pro par A-C — a busca de atribuição de fases usa os 3 pares
// normalmente, então A-C é uma saída comum, não um caso raro). Valores de referência calculados
// à parte (script Node dedicado, ver histórico do plano): com o ângulo CORRETO (-30° para A-C),
// a corrente total na fase A é 8,468 A; com o atalho errado (+30°, copiado do par A-B), daria
// 7,087 A — mais de 16% de erro, silencioso.
const parAC_e_faseNeutroA_G14 = calcularCorrentesVetoriais(
  [circuitoSintetico(1000, 1, 'resistiva', [1, 3]), circuitoSintetico(500, 0.8, 'indutiva', [1])],
  3,
  V127,
)
checar(
  'G14.4',
  '§6.2.6.2 (soma vetorial — par de fases A-C)',
  'Tensão fase-fase do par A-C (índices 0 e 2) é calculada por subtração direta de componentes, não por um atalho de ângulo fixo',
  quase(parAC_e_faseNeutroA_G14.correntePorFaseA[0], 8.468, 0.01),
  `fase-fase A-C (1000 VA resistiva) + fase-neutro A (500 VA, cosφ=0,8 indutiva) → correntePorFaseA[A]=${parAC_e_faseNeutroA_G14.correntePorFaseA[0].toFixed(3)} A (esperado 8,468 A com o ângulo correto de -30°; um atalho de +30° daria 7,087 A)`,
  'critico',
)

// Contraexemplo à hipótese "a corrente do neutro nunca excede a maior corrente de fase" — falsa
// em geral: fase A resistiva, fase B capacitiva (cosφ=0,7), fase C indutiva (cosφ=0,7), mesma
// potência nas 3 → a corrente do neutro fica ~54% ACIMA da maior corrente de fase. É por isso que
// a verificação do neutro roda SEMPRE (não só quando reduzido pela Tabela 48).
const contraExemploG14 = calcularCorrentesVetoriais(
  [
    circuitoSintetico(1000, 1, 'resistiva', [1]),
    circuitoSintetico(1000, 0.7, 'capacitiva', [2]),
    circuitoSintetico(1000, 0.7, 'indutiva', [3]),
  ],
  3,
  V127,
)
const maiorFaseContraExemplo = Math.max(...contraExemploG14.correntePorFaseA)
checar(
  'G14.5',
  '§6.2.6.2 (a corrente do neutro pode exceder a maior corrente de fase)',
  'Fatores de potência de sinal oposto em fases diferentes fazem a corrente do neutro superar a maior corrente de fase',
  contraExemploG14.correnteNeutroA > maiorFaseContraExemplo * 1.5,
  `correntePorFaseA=[${contraExemploG14.correntePorFaseA.map((c) => c.toFixed(3)).join(', ')}] A, correnteNeutroA=${contraExemploG14.correnteNeutroA.toFixed(3)} A — ${((contraExemploG14.correnteNeutroA / maiorFaseContraExemplo - 1) * 100).toFixed(1)}% acima da maior fase`,
  'critico',
)

// dimensionarProtecaoGeral usa correntePorFaseA (não mais a soma escalar de VA) e expõe
// verificacaoNeutro comparando a corrente real do neutro à ampacidade do condutor adotado — roda
// SEMPRE, não só com o neutro reduzido (Tabela 48). Base: fase de 15 000 VA/fase (127 V) gera
// alimentador de 35 mm², neutro reduzido pela Tabela 48 pra 25 mm² (ampacidade B1 = 101 A).
const baseNeutroG14 = correntesDeVA([15000, 15000, 15000], 127)
const pgNeutroExcede = dimensionarProtecaoGeral({
  correntePorFaseA: baseNeutroG14.correntePorFaseA,
  correnteNeutroA: 150, // acima dos 101 A de ampacidade do neutro reduzido (25 mm²)
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
  neutroReduzidoDeclarado: true,
})
checar(
  'G14.6',
  '§6.2.6.2 (verificação real, não só a declaração do usuário)',
  'Corrente do neutro acima da ampacidade do condutor reduzido é sinalizada como não conforme',
  pgNeutroExcede.verificacaoNeutro.ampacidadeA !== null && pgNeutroExcede.verificacaoNeutro.conforme === false,
  `neutro reduzido a ${pgNeutroExcede.secaoNeutroMm2} mm² (ampacidade ${pgNeutroExcede.verificacaoNeutro.ampacidadeA} A) vs corrente real declarada 150 A → conforme=${pgNeutroExcede.verificacaoNeutro.conforme}`,
  'critico',
)
const pgNeutroDentro = dimensionarProtecaoGeral({
  correntePorFaseA: baseNeutroG14.correntePorFaseA,
  correnteNeutroA: 50, // dentro dos 101 A de ampacidade do neutro reduzido
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 10,
  neutroReduzidoDeclarado: true,
})
checar(
  'G14.7',
  '§6.2.6.2 (verificação real, não só a declaração do usuário)',
  'Corrente do neutro dentro da ampacidade do condutor reduzido é conforme (não dispara alerta à toa)',
  pgNeutroDentro.verificacaoNeutro.ampacidadeA !== null && pgNeutroDentro.verificacaoNeutro.conforme === true,
  `neutro reduzido a ${pgNeutroDentro.secaoNeutroMm2} mm² (ampacidade ${pgNeutroDentro.verificacaoNeutro.ampacidadeA} A) vs corrente real declarada 50 A → conforme=${pgNeutroDentro.verificacaoNeutro.conforme}`,
  'medio',
)

// ---------------------------------------------------------------------------
// G15 — DPS: exigência condicional (§5.4.2.1.1) e Classe I por exposição a descarga direta
// ---------------------------------------------------------------------------
grupo('G15', 'DPS — exigência condicional (§5.4.2.1.1) e Classe I (§6.3.5.2.1 b)')

const dpsSemDeclaracao = recomendarDPS(127)
checar(
  'G15.1',
  '§5.4.2.1.1',
  'Sem nenhuma declaração, DPS continua recomendação de boa prática (não alega exigência normativa)',
  dpsSemDeclaracao.classe === 'II' && dpsSemDeclaracao.exigidaPelaNorma === false,
  `classe=${dpsSemDeclaracao.classe}, exigidaPelaNorma=${dpsSemDeclaracao.exigidaPelaNorma}`,
  'medio',
)

const dpsSoAerea = recomendarDPS(127, { alimentacaoAerea: true })
checar(
  'G15.2',
  '§5.4.2.1.1 a)',
  'Alimentação aérea sozinha (sem alto índice de descargas) não basta para tornar o DPS exigência normativa — as duas condições valem juntas',
  dpsSoAerea.exigidaPelaNorma === false,
  `alimentacaoAerea=true, regiaoAltoIndiceDescargas=false → exigidaPelaNorma=${dpsSoAerea.exigidaPelaNorma}`,
  'alto',
)

const dpsAereaEDescargas = recomendarDPS(127, { alimentacaoAerea: true, regiaoAltoIndiceDescargas: true })
checar(
  'G15.3',
  '§5.4.2.1.1 a)',
  'Alimentação aérea E região de alto índice de descargas juntas tornam o DPS exigência normativa',
  dpsAereaEDescargas.exigidaPelaNorma === true,
  `exigidaPelaNorma=${dpsAereaEDescargas.exigidaPelaNorma}, motivo="${dpsAereaEDescargas.motivoExigencia}"`,
  'alto',
)

const dpsExposicaoDireta = recomendarDPS(127, { exposicaoDescargaDireta: true })
checar(
  'G15.4',
  '§6.3.5.2.1 b)',
  'Exposição a descarga direta recomenda Classe I além da Classe II, independente da exigência geral do §5.4.2.1.1',
  dpsExposicaoDireta.classe === 'I+II' && dpsExposicaoDireta.exigidaPelaNorma === false,
  `exposicaoDescargaDireta=true (sem as outras 2 flags) → classe=${dpsExposicaoDireta.classe}, exigidaPelaNorma=${dpsExposicaoDireta.exigidaPelaNorma}`,
  'alto',
)

const dpsTudo = recomendarDPS(127, { alimentacaoAerea: true, regiaoAltoIndiceDescargas: true, exposicaoDescargaDireta: true })
checar(
  'G15.5',
  '§5.4.2.1.1/§6.3.5.2.1 b)',
  'As 3 declarações juntas dão exigência normativa E Classe I+II',
  dpsTudo.exigidaPelaNorma === true && dpsTudo.classe === 'I+II',
  `exigidaPelaNorma=${dpsTudo.exigidaPelaNorma}, classe=${dpsTudo.classe}`,
  'medio',
)

// ---------------------------------------------------------------------------
// G16 — Número de condutores carregados (§6.2.5.6 / Tabela 46)
// ---------------------------------------------------------------------------
grupo('G16', 'Número de condutores carregados (§6.2.5.6 / Tabela 46)')

// In = 70 A é a corrente que separa as duas colunas em B1: 16 mm² dá 76 A com 2 condutores
// carregados (aprova) e 68 A com 3 (reprova, tem de subir para 25 mm² / 89 A). Escolhida acima
// do piso prático de 10 mm², que senão mascararia a diferença.
const alimentadorEm = (numeroFases, extras = {}) =>
  dimensionarProtecaoGeral({
    correntePorFaseA: Array(numeroFases).fill(70),
    correnteNeutroA: 0,
    numeroFases,
    tensaoFaseNeutro: 127,
    comprimentoRamalM: 0,
    comprimentoInformado: false,
    metodoInstalacao: 'B1',
    ...extras,
  })

const alimBi = alimentadorEm(2)
checar(
  'G16.1',
  '§6.2.5.6 / Tabela 46',
  'Alimentador BIFÁSICO é "duas fases com neutro" → 3 condutores carregados',
  alimBi.condutorFase.condutoresCarregados === 3 && alimBi.condutorFase.secaoMm2 === 25 && alimBi.condutorFase.ampacidadeTabelaA === 89,
  `esquema=${alimBi.condutorFase.esquema}, ${alimBi.condutorFase.condutoresCarregados} carregados, seção=${alimBi.condutorFase.secaoMm2} mm², Iz tabela=${alimBi.condutorFase.ampacidadeTabelaA} A (com a coluna errada de 2 cond. daria 16 mm² / 76 A)`,
  'critico',
)

const alimTri = alimentadorEm(3)
checar(
  'G16.2',
  '§6.2.5.6 / Tabela 46',
  'Alimentador TRIFÁSICO com neutro → 3 condutores carregados',
  alimTri.condutorFase.condutoresCarregados === 3 && alimTri.condutorFase.secaoMm2 === 25 && alimTri.condutorFase.ampacidadeTabelaA === 89,
  `esquema=${alimTri.condutorFase.esquema}, ${alimTri.condutorFase.condutoresCarregados} carregados, seção=${alimTri.condutorFase.secaoMm2} mm², Iz tabela=${alimTri.condutorFase.ampacidadeTabelaA} A (com a coluna errada de 2 cond. daria 16 mm² / 76 A)`,
  'critico',
)

// Prova de que a correção é dirigida, e não um rebaixamento geral: o monofásico continua na
// coluna de 2 condutores, com a mesma seção de antes.
const alimMono = alimentadorEm(1)
checar(
  'G16.3',
  '§6.2.5.6 / Tabela 46',
  'Alimentador MONOFÁSICO continua em 2 condutores carregados (correção dirigida, não geral)',
  alimMono.condutorFase.condutoresCarregados === 2 && alimMono.condutorFase.secaoMm2 === 16 && alimMono.condutorFase.ampacidadeTabelaA === 76,
  `esquema=${alimMono.condutorFase.esquema}, ${alimMono.condutorFase.condutoresCarregados} carregados, seção=${alimMono.condutorFase.secaoMm2} mm², Iz tabela=${alimMono.condutorFase.ampacidadeTabelaA} A`,
  'alto',
)

// Circuitos terminais: fase-neutro é "monofásico a dois condutores" e fase-fase é "duas fases
// SEM neutro" — ambos 2 carregados. Guarda de regressão sobre G4/G8.
const termFN = dimensionarCircuito({ id: 't1', nome: 'FN', tipo: 'tug', potenciaVA: 1000, tensao: 127, ehFaseFase: false }, 0)
const termFF = dimensionarCircuito({ id: 't2', nome: 'FF', tipo: 'tue', potenciaVA: 4400, tensao: 220, ehFaseFase: true }, 0)
checar(
  'G16.4',
  'Tabela 46',
  'Circuitos terminais (F-N e F-F) permanecem em 2 condutores carregados',
  termFN.condutoresCarregados === 2 &&
    termFN.esquema === 'monofasico-2' &&
    termFF.condutoresCarregados === 2 &&
    termFF.esquema === 'duas-fases-sem-neutro',
  `F-N: ${termFN.esquema}/${termFN.condutoresCarregados}; F-F: ${termFF.esquema}/${termFF.condutoresCarregados}`,
  'alto',
)

// §6.2.5.6.1 — 3ª harmônica > 15% em trifásico com neutro: 4 condutores carregados, sem coluna
// própria na tabela → fator 0,86 sobre a coluna de 3 (89 × 0,86 = 76,54).
const alimHarmonica = alimentadorEm(3, { terceiraHarmonica: 'acima-15' })
checar(
  'G16.5',
  '§6.2.5.6.1',
  '3ª harmônica > 15% aplica o fator 0,86 sobre a coluna de 3 condutores carregados',
  quase(alimHarmonica.condutorFase.ampacidadeA, 89 * 0.86, 0.01) && alimHarmonica.condutorFase.neutroCarregado === true,
  `Iz tabela=${alimHarmonica.condutorFase.ampacidadeTabelaA} A → Iz corrigido=${alimHarmonica.condutorFase.ampacidadeA?.toFixed(2)} A (esperado ${(89 * 0.86).toFixed(2)} A)`,
  'alto',
)

// A taxa é tri-estado de propósito: o lado seguro do fator 0,86 e o da redução do neutro são
// opostos, então "não declarado" tem de desligar os DOIS.
const neutroGrande = (terceiraHarmonica) =>
  dimensionarProtecaoGeral({
    ...correntesDeVA([15000, 15000, 15000], 127),
    numeroFases: 3,
    tensaoFaseNeutro: 127,
    comprimentoRamalM: 10,
    neutroReduzidoDeclarado: true,
    terceiraHarmonica,
  })
const semDeclarar = neutroGrande('nao-declarado')
const declarado15 = neutroGrande('ate-15')
checar(
  'G16.6',
  '§6.2.5.6.1 / §6.2.6.2.6',
  'Sem declarar a 3ª harmônica, nem o neutro reduz nem o fator 0,86 é aplicado',
  semDeclarar.neutroReduzido === false &&
    semDeclarar.condutorFase.neutroCarregado === false &&
    declarado15.neutroReduzido === true,
  `não declarado → neutro=${semDeclarar.secaoNeutroMm2} mm² (fase=${semDeclarar.condutorFase.secaoMm2}), 0,86 não aplicado; declarado ≤15% → neutro=${declarado15.secaoNeutroMm2} mm²`,
  'alto',
)

// §6.2.5.6.2 — o PE nunca entra na conta de condutores carregados (só na ocupação do eletroduto).
checar(
  'G16.7',
  '§6.2.5.6.2',
  'Nenhum esquema da Tabela 46 conta o condutor de proteção (PE)',
  Object.values(TABELA_46_CONDUTORES_CARREGADOS).every((n) => n === 2 || n === 3) &&
    TABELA_46_CONDUTORES_CARREGADOS['trifasico-com-neutro'] === 3,
  `valores da Tabela 46: ${[...new Set(Object.values(TABELA_46_CONDUTORES_CARREGADOS))].join(', ')} — trifásico com neutro = 3 (o PE não é contado; o 4º condutor só aparece via 3ª harmônica)`,
  'medio',
)

// ---------------------------------------------------------------------------
// G17 — Isolação EPR/XLPE (Tabela 37)
// ---------------------------------------------------------------------------
grupo('G17', 'Isolação EPR/XLPE — Tabela 37')

checar(
  'G17.1',
  'Tabela 37',
  'Ampacidade EPR/XLPE de 1,5 mm², método B1, 2 condutores carregados',
  obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 2, secaoMm2: 1.5 }) === 23,
  `obtido ${obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 2, secaoMm2: 1.5 })} A, esperado 23 A`,
  'alto',
)
checar(
  'G17.2',
  'Tabela 37',
  'Ampacidade EPR/XLPE de 25 mm², método B1, 3 condutores carregados',
  obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 3, secaoMm2: 25 }) === 117,
  `obtido ${obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 3, secaoMm2: 25 })} A, esperado 117 A`,
  'alto',
)
checar(
  'G17.3',
  'Tabela 37',
  'Ampacidade EPR/XLPE de 120 mm², método D, 3 condutores carregados',
  obterAmpacidade({ isolacao: 'epr', metodo: 'D', condutoresCarregados: 3, secaoMm2: 120 }) === 240,
  `obtido ${obterAmpacidade({ isolacao: 'epr', metodo: 'D', condutoresCarregados: 3, secaoMm2: 120 })} A, esperado 240 A`,
  'alto',
)

// Detector de deslize mais forte: EPR (90°C) tem SEMPRE mais ampacidade que PVC (70°C) na mesma
// seção/método/nº de condutores carregados — 144 comparações (12 seções × 12 colunas). Um erro de
// fase de uma linha na transcrição jogaria essa razão para ~1,7 ou ~1,0 em algum ponto.
const paresPvcEpr = TABELA_36_COBRE_PVC.flatMap((linhaPvc) => {
  const linhaEpr = TABELA_37_COBRE_EPR.find((l) => l[0] === linhaPvc[0])
  return COLUNAS_AMPACIDADE.map((nomeColuna, j) => ({
    secao: linhaPvc[0],
    coluna: nomeColuna,
    pvc: linhaPvc[j + 1],
    epr: linhaEpr[j + 1],
  }))
})
const violamEprMaiorQuePvc = paresPvcEpr.filter((p) => p.epr <= p.pvc)
checar(
  'G17.4',
  'Tabela 37 vs Tabela 36',
  'EPR/XLPE (90°C) tem ampacidade maior que PVC (70°C) nas 144 células (12 seções × 12 colunas)',
  violamEprMaiorQuePvc.length === 0,
  violamEprMaiorQuePvc.length === 0
    ? '144/144 células conferem'
    : violamEprMaiorQuePvc.map((p) => `${p.secao}mm² ${p.coluna}: EPR=${p.epr} ≤ PVC=${p.pvc}`).join(', '),
  'alto',
)

checar(
  'G17.5',
  'Tabela 37',
  'Todas as 12 colunas da Tabela 37 estritamente crescentes com a seção',
  COLUNAS_AMPACIDADE.every((_, i) => TABELA_37_COBRE_EPR.every((l, j, a) => j === 0 || l[i + 1] > a[j - 1][i + 1])),
  'monotonicidade das 12 colunas',
  'baixo',
)

const violamCarregadosEpr = TABELA_37_COBRE_EPR.flatMap((linha) =>
  ['A1', 'A2', 'B1', 'B2', 'C', 'D']
    .filter(
      (metodo) =>
        linha[COLUNAS_AMPACIDADE.indexOf(`${metodo}_3`) + 1] >= linha[COLUNAS_AMPACIDADE.indexOf(`${metodo}_2`) + 1],
    )
    .map((metodo) => `${linha[0]} mm² ${metodo}`),
)
checar(
  'G17.6',
  '§6.2.5.6 / Tabela 37',
  '3 condutores carregados sempre dá ampacidade menor que 2, também na Tabela 37 (EPR/XLPE)',
  violamCarregadosEpr.length === 0,
  violamCarregadosEpr.length === 0 ? '72 pares (12 seções × 6 métodos) conferem' : violamCarregadosEpr.join(', '),
  'alto',
)

// ---------------------------------------------------------------------------
// G18 — Tabela 40 (fatores de correção de temperatura) nas 4 colunas
// ---------------------------------------------------------------------------
grupo('G18', 'Tabela 40 — fatores de correção de temperatura (4 colunas)')

// Toda a tabela (52 células numéricas — 15 linhas × 4 colunas, menos as 8 ausências reais de PVC
// acima de 60°C) é reproduzida pela forma fechada f=√((θmax−θ)/(θmax−θref)), θmax=70°C (PVC) ou
// 90°C (EPR/XLPE), θref=30°C (ar) ou 20°C (solo) — achado de uma verificação independente feita
// antes de transcrever a tabela: um erro de fase de uma linha quebraria TODAS as células de uma
// vez, é uma prova muito mais forte que qualquer âncora pontual.
function fctFormaFechada(temperaturaC, tempMax, tempRef) {
  return Math.sqrt((tempMax - temperaturaC) / (tempMax - tempRef))
}
const colunasFct = [
  ['arPvc', 70, 30],
  ['arEpr', 90, 30],
  ['soloPvc', 70, 20],
  ['soloEpr', 90, 20],
]
let celulasConferidasFct = 0
const divergentesFct = []
for (const linha of TABELA_40_FCT) {
  for (const [coluna, tempMax, tempRef] of colunasFct) {
    const valor = linha[coluna]
    if (valor === null) continue
    celulasConferidasFct++
    const esperado = fctFormaFechada(linha.temperaturaC, tempMax, tempRef)
    if (Math.abs(valor - esperado) > 0.005) {
      divergentesFct.push(`${linha.temperaturaC}°C ${coluna}: tabela=${valor}, forma fechada=${esperado.toFixed(4)}`)
    }
  }
}
checar(
  'G18.1',
  'Tabela 40',
  'Todas as células numéricas batem com a forma fechada f=√((θmax−θ)/(θmax−θref))',
  divergentesFct.length === 0 && celulasConferidasFct > 0,
  divergentesFct.length === 0 ? `${celulasConferidasFct} células numéricas conferem` : divergentesFct.join('; '),
  'alto',
)

checar(
  'G18.2',
  'Tabela 40',
  'Fora da faixa tabelada, devolve null — nunca extrapola (PVC não vai a 65°C, EPR vai)',
  obterFatorTemperatura(65, { isolacao: 'pvc', enterrado: false }) === null &&
    obterFatorTemperatura(65, { isolacao: 'epr', enterrado: false }) === 0.65,
  `PVC a 65°C → ${obterFatorTemperatura(65, { isolacao: 'pvc' })}; EPR a 65°C → ${obterFatorTemperatura(65, { isolacao: 'epr' })}`,
  'alto',
)

checar(
  'G18.3',
  'Tabela 40',
  'A 30°C, a coluna de SOLO (0,89) é diferente da de AR (1,00) — `enterrado` muda a coluna lida de verdade',
  obterFatorTemperatura(30, { isolacao: 'pvc', enterrado: false }) === 1 &&
    obterFatorTemperatura(30, { isolacao: 'pvc', enterrado: true }) === 0.89,
  `ar=${obterFatorTemperatura(30, { isolacao: 'pvc', enterrado: false })}, solo=${obterFatorTemperatura(30, { isolacao: 'pvc', enterrado: true })}`,
  'critico',
)

checar(
  'G18.4',
  'Tabela 40',
  'listarTemperaturasDisponiveis nunca oferece uma temperatura sem fator para a isolação/ambiente',
  listarTemperaturasDisponiveis({ isolacao: 'pvc', enterrado: false }).length === 11 &&
    listarTemperaturasDisponiveis({ isolacao: 'epr', enterrado: false }).length === 15 &&
    listarTemperaturasDisponiveis({ isolacao: 'pvc', enterrado: true }).length === 11 &&
    listarTemperaturasDisponiveis({ isolacao: 'epr', enterrado: true }).length === 15,
  'PVC: 11 opções (10-60°C); EPR: 15 opções (10-80°C), nos dois ambientes',
  'medio',
)

// ---------------------------------------------------------------------------
// G19 — Isolação propagada (Tabela 30/k, queda de tensão, dimensionamento)
// ---------------------------------------------------------------------------
grupo('G19', 'Isolação propagada — k (Tabela 30), queda de tensão, dimensionamento')

checar(
  'G19.1',
  'Tabela 30',
  'Fator k por isolação: PVC=115 (≤300mm²), EPR/XLPE=143',
  obterK({ isolacao: 'pvc', secaoMm2: 25 }) === 115 && obterK({ isolacao: 'epr', secaoMm2: 25 }) === 143,
  `PVC: ${obterK({ isolacao: 'pvc', secaoMm2: 25 })}; EPR: ${obterK({ isolacao: 'epr', secaoMm2: 25 })}`,
  'alto',
)

const quedaPvc90A = calcularQuedaPercentual({
  comprimentoM: 20,
  correnteA: 20,
  secaoMm2: 10,
  tensaoV: 127,
  cosPhi: 1,
  tipoCarga: 'resistiva',
  isolacao: 'pvc',
})
const quedaEpr90A = calcularQuedaPercentual({
  comprimentoM: 20,
  correnteA: 20,
  secaoMm2: 10,
  tensaoV: 127,
  cosPhi: 1,
  tipoCarga: 'resistiva',
  isolacao: 'epr',
})
checar(
  'G19.2',
  'ISOLACOES / condutividade a 90°C',
  'Queda de tensão com EPR/XLPE (90°C) é estritamente maior que com PVC (70°C), mesma seção/corrente',
  quedaEpr90A > quedaPvc90A,
  `PVC: ${quedaPvc90A.toFixed(4)}%, EPR: ${quedaEpr90A.toFixed(4)}% (condutor mais quente → mais resistência)`,
  'alto',
)

// Prova de que a isolação muda o dimensionamento de verdade, não é um seletor decorativo: com
// In=100 A (Ib=88 A), PVC precisa de 25 mm² (101 A ≥ 100 A) mas EPR já aprova 16 mm² (100 A ≥
// 100 A, exatamente no limite) — mesma corrente, resultado diferente.
const circuitoIsolacao = { id: 'iso1', nome: 'Teste isolação', tipo: 'tug', potenciaVA: 88 * 127, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }
const dimIsolacaoPvc = dimensionarCircuito(circuitoIsolacao, 0, { metodoInstalacao: 'B1', isolacao: 'pvc' })
const dimIsolacaoEpr = dimensionarCircuito(circuitoIsolacao, 0, { metodoInstalacao: 'B1', isolacao: 'epr' })
checar(
  'G19.3',
  '§6.2.5.6 (Iz por isolação)',
  'A seção final muda ao trocar a isolação, na mesma corrente (não é decorativo)',
  dimIsolacaoPvc.disjuntorA === 100 && dimIsolacaoPvc.secaoMm2 === 25 && dimIsolacaoEpr.secaoMm2 === 16,
  `In=${dimIsolacaoPvc.disjuntorA} A → PVC escolhe ${dimIsolacaoPvc.secaoMm2} mm² (Iz=${dimIsolacaoPvc.ampacidadeTabelaA} A), EPR escolhe ${dimIsolacaoEpr.secaoMm2} mm² (Iz=${dimIsolacaoEpr.ampacidadeTabelaA} A)`,
  'critico',
)

// ---------------------------------------------------------------------------
// G20 — Método D (enterrado): Tabela 45, temperatura do solo, eletroduto
// ---------------------------------------------------------------------------
grupo('G20', 'Método D (enterrado) — Tabela 45, temperatura do solo, eletroduto')

// Desde a correção de 30/09/2026 (sub-tabela de condutor unipolar da Tabela 45, não a de cabo
// multipolar), D e B1 coincidem até 5 circuitos (0,70/0,65/0,60 nas duas tabelas) — comparado em
// 6 circuitos, onde divergem de verdade: B1 continua descendo (0,57, Tabela 42 ref.1) enquanto D
// já bateu no piso tabelado (0,60, Tabela 45).
checar(
  'G20.1',
  'Tabela 45 vs Tabela 42',
  'Método D usa a Tabela 45 (agrupamento enterrado, sub-tabela de condutor unipolar), diferente da Tabela 42 usada por A1/A2/B1/B2',
  obterFatorAgrupamento(6, 'D') === 0.6 && obterFatorAgrupamento(6, 'D') !== obterFatorAgrupamento(6, 'B1'),
  `6 circuitos: D=${obterFatorAgrupamento(6, 'D')} (Tabela 45), B1=${obterFatorAgrupamento(6, 'B1')} (Tabela 42, ref. 1)`,
  'alto',
)

checar(
  'G20.2',
  'Tabela 45',
  'Acima de 6 circuitos a Tabela 45 não tem fator: o método D devolve null (não verificado), nunca repete o último valor (auditoria nov/2026)',
  obterFatorAgrupamento(6, 'D') === 0.6 && obterFatorAgrupamento(7, 'D') === null && obterFatorAgrupamento(50, 'D') === null,
  `6 circuitos: ${obterFatorAgrupamento(6, 'D')}; 7: ${obterFatorAgrupamento(7, 'D')}; 50: ${obterFatorAgrupamento(50, 'D')}`,
  'alto',
)

// Teste discriminante: as duas temperaturas são declaradas com valores DIFERENTES de propósito
// (10°C ar, 30°C solo) — se o método D lesse `temperaturaC` (ar) por engano, em vez de
// `temperaturaSoloC`, o fator sairia 1,22 (coluna ar a 10°C) em vez de 0,89 (coluna solo a 30°C).
const circuitoEnterrado = { id: 'd1', nome: 'Teste D', tipo: 'tug', potenciaVA: 70 * 127, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }
const dimMetodoDSolo = dimensionarCircuitos([circuitoEnterrado], {}, {
  metodosPorId: { d1: 'D' },
  temperaturaC: 10,
  temperaturaSoloC: 30,
})[0]
const dimMetodoB1Ar = dimensionarCircuitos([circuitoEnterrado], {}, { metodosPorId: { d1: 'B1' }, temperaturaC: 30 })[0]
checar(
  'G20.3',
  'Tabela 40 (coluna solo, método D)',
  'Método D lê `temperaturaSoloC` (coluna solo), não `temperaturaC` (coluna ar) — declaradas com valores diferentes de propósito',
  dimMetodoDSolo.fatorTemperatura === 0.89 && dimMetodoB1Ar.fatorTemperatura === 1,
  `D (temperaturaSoloC=30°C) → fator=${dimMetodoDSolo.fatorTemperatura} (esperado 0,89; se lesse temperaturaC=10°C daria 1,22); B1 (temperaturaC=30°C) → fator=${dimMetodoB1Ar.fatorTemperatura}`,
  'critico',
)

checar(
  'G20.4',
  '§6.2.5.4 / Tabela 41',
  'Resistividade térmica do solo declarada corrige a ampacidade do método D',
  obterFatorResistividadeSolo('') === 1 && obterFatorResistividadeSolo(1) === 1.18 && obterFatorResistividadeSolo(3) === 0.96,
  `sem declarar=${obterFatorResistividadeSolo('')}; 1 K·m/W=${obterFatorResistividadeSolo(1)}; 3 K·m/W=${obterFatorResistividadeSolo(3)}`,
  'medio',
)

// O método D TEM eletroduto (é a própria definição do método — cabo em eletroduto ENTERRADO,
// §6.2.5.1.2 nota 4) — diferente do método C, que não tem por não usar eletroduto nenhum.
const projetoMetodoD = { ...projetoAcumulado, metodosInstalacao: { 'tue-x1-ch-1': 'D' } }
const resultadoMetodoD = calcularProjetoCompleto(projetoMetodoD, resolverConfigInstalacao('monofasica', 127))
const circuitoEmD = resultadoMetodoD.dimensionados.find((c) => c.tipo === 'tue')
checar(
  'G20.5',
  '§6.2.11.1.6 / §6.2.5.1.2',
  'Circuito em método D tem eletroduto calculado (ao contrário do método C)',
  circuitoEmD.metodoInstalacao === 'D' && circuitoEmD.eletroduto?.eletrodutoRecomendado != null,
  circuitoEmD.eletroduto?.eletrodutoRecomendado
    ? `eletroduto=${circuitoEmD.eletroduto.eletrodutoRecomendado.nominalMm} mm (${circuitoEmD.eletroduto.eletrodutoRecomendado.referencia})`
    : 'eletroduto ausente — método D deveria ter eletroduto, é a própria definição do método',
  'alto',
)

// ---------------------------------------------------------------------------
// G21 — Métodos A1/A2 (parede termicamente isolante)
// ---------------------------------------------------------------------------
grupo('G21', 'Métodos A1/A2 (parede termicamente isolante)')

checar(
  'G21.1',
  'Tabela 36/37',
  'A1 e A2 têm ampacidade menor ou igual a B1/B2 na mesma seção (parede isolante dissipa pior)',
  TABELA_36_COBRE_PVC.every((l) => {
    const a1 = obterAmpacidade({ metodo: 'A1', condutoresCarregados: 2, secaoMm2: l[0] })
    const b1 = obterAmpacidade({ metodo: 'B1', condutoresCarregados: 2, secaoMm2: l[0] })
    const a2 = obterAmpacidade({ metodo: 'A2', condutoresCarregados: 2, secaoMm2: l[0] })
    const b2 = obterAmpacidade({ metodo: 'B2', condutoresCarregados: 2, secaoMm2: l[0] })
    return a1 <= b1 && a2 <= b2
  }),
  'A1≤B1 e A2≤B2 em todas as 12 seções',
  'alto',
)

checar(
  'G21.2',
  'Tabela 42, referência 1',
  'A1 e A2 usam a mesma referência 1 da Tabela 42 que B1/B2 (não a Tabela 45, do método D)',
  obterFatorAgrupamento(3, 'A1') === obterFatorAgrupamento(3, 'B1') &&
    obterFatorAgrupamento(3, 'A2') === obterFatorAgrupamento(3, 'B2'),
  `3 circuitos: A1=${obterFatorAgrupamento(3, 'A1')}, A2=${obterFatorAgrupamento(3, 'A2')}, B1=${obterFatorAgrupamento(3, 'B1')}, B2=${obterFatorAgrupamento(3, 'B2')}`,
  'medio',
)

// Prova de dimensionamento real: com In=63 A, A1 (61 A em 16 mm² — falha por pouco) precisa subir
// para 25 mm², enquanto B1 (76 A em 16 mm²) já aprova 16 mm² — mesma corrente, resultado diferente.
const circuitoA1 = { id: 'a1c', nome: 'Teste A1', tipo: 'tug', potenciaVA: 60 * 127, tensao: 127, cosPhi: 1, tipoCarga: 'resistiva' }
const dimMetodoA1 = dimensionarCircuito(circuitoA1, 0, { metodoInstalacao: 'A1' })
const dimMetodoB1v2 = dimensionarCircuito(circuitoA1, 0, { metodoInstalacao: 'B1' })
checar(
  'G21.3',
  '§6.2.6.1.2 a) (Iz por método)',
  'A seção final muda entre A1 e B1 na mesma corrente (não é decorativo)',
  dimMetodoA1.disjuntorA === 63 && dimMetodoB1v2.secaoMm2 === 16 && dimMetodoA1.secaoMm2 === 25,
  `In=${dimMetodoA1.disjuntorA} A → A1 escolhe ${dimMetodoA1.secaoMm2} mm² (Iz=${dimMetodoA1.ampacidadeTabelaA} A), B1 escolhe ${dimMetodoB1v2.secaoMm2} mm² (Iz=${dimMetodoB1v2.ampacidadeTabelaA} A)`,
  'alto',
)

grupo('G22', '§9.1 — Locais contendo banheira ou chuveiro')

checar(
  'G22.1',
  '§9.1.1',
  'Projeto sem cômodo tipo banheiro não gera exigência de locais especiais',
  avaliarRequisitosBanheiro([{ id: 's1', nome: 'Sala', tipo: 'social' }], null).possuiBanheiro === false,
  'possuiBanheiro === false',
  'baixo',
)

checar(
  'G22.2',
  '§9.1.3.1.2',
  'Projeto com banheiro exige equipotencialização suplementar',
  resultadoAcum.locaisEspeciais.possuiBanheiro === true &&
    resultadoAcum.locaisEspeciais.equipotencializacaoSuplementarExigida === true &&
    resultadoAcum.locaisEspeciais.comodosBanheiro.includes('Banheiro'),
  `possuiBanheiro=${resultadoAcum.locaisEspeciais.possuiBanheiro}, equipotencializacaoSuplementarExigida=${resultadoAcum.locaisEspeciais.equipotencializacaoSuplementarExigida}, cômodos=${resultadoAcum.locaisEspeciais.comodosBanheiro?.join(', ')}`,
  'alto',
)

// Regressão travada: o IDR geral (único, à montante de tudo) precisa continuar em ≤30 mA
// qualquer que seja a corrente do disjuntor geral — é essa simplificação conservadora que
// satisfaz §5.1.3.2.2 a) para os circuitos do banheiro sem precisar de um DR por circuito.
const idr20A = dimensionarIDR(20, 1)
const idr63A = dimensionarIDR(63, 3)
checar(
  'G22.3',
  '§5.1.3.2.2 a)',
  'IDR geral sempre com sensibilidade ≤30 mA — satisfaz a exigência de DR dos circuitos de banheiro',
  idr20A.sensibilidadeMA <= 30 &&
    idr63A.sensibilidadeMA <= 30 &&
    avaliarRequisitosBanheiro([{ id: 'b', nome: 'Banheiro', tipo: 'banheiro' }], idr20A).drAtendePorIdrGeral === true,
  `IDR(20A monofásico)=${idr20A.sensibilidadeMA} mA, IDR(63A trifásico)=${idr63A.sensibilidadeMA} mA`,
  'critico',
)

checar(
  'G22.4',
  '§9.1.4.1',
  'Volumes 0-3 com grau de proteção mínimo correto',
  VOLUMES_BANHEIRO.length === 4 &&
    VOLUMES_BANHEIRO.find((v) => v.volume === 0).ipMinimo === 'IPX7' &&
    VOLUMES_BANHEIRO.find((v) => v.volume === 1).ipMinimo === 'IPX4' &&
    VOLUMES_BANHEIRO.find((v) => v.volume === 2).ipMinimo === 'IPX3–IPX5' &&
    VOLUMES_BANHEIRO.find((v) => v.volume === 3).ipMinimo === 'IPX1–IPX5',
  VOLUMES_BANHEIRO.map((v) => `vol.${v.volume}=${v.ipMinimo}`).join(' · '),
  'medio',
)

grupo('G23', 'Curto-circuito por circuito terminal (§6.2.6.1.2 c / §5.3.5.1)')

checar(
  'G23.1',
  '§5.3.5.1',
  'Sem Icc declarada no alimentador, todo circuito terminal continua não verificado',
  resultadoAcum.dimensionados.every((c) => c.curtoCircuito.verificado === false),
  resultadoAcum.dimensionados.map((c) => `${c.nome}=${c.curtoCircuito.verificado}`).join(', '),
  'alto',
)

const projetoFF = {
  tipoInstalacao: 'trifasica',
  tensaoFaseNeutro: 127,
  comodos: [
    {
      id: 'bff',
      nome: 'Banheiro',
      tipo: 'banheiro',
      area: 4,
      perimetro: 8,
      tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 7000, ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 }],
    },
  ],
  comprimentos: { 'tue-bff-ch-1': 10 },
  comprimentoRamalEntrada: 10,
  iccPresumidaA: 1000,
  curvaDisjuntorGeral: 'C',
}
const resultadoFF = calcularProjetoCompleto(projetoFF, cfgTri)
const circuitoFF = resultadoFF.dimensionados.find((c) => c.ehFaseFase)
// Fase-fase: I²t com a maior Icc no quadro (entre fases ou fase-neutro), Ikmin com o curto entre
// fases na ponta, que é menor que a do quadro.
checar(
  'G23.2',
  '§5.3.5.1 / §6.3.4.3.2',
  'Circuito fase-fase verificado pelo laço entre duas fases: I²t com a maior Icc no quadro, Ikmin na ponta',
  circuitoFF.curtoCircuito.verificado === true &&
    circuitoFF.iccQuadroA >= resultadoFF.protecaoGeral.iccQuadroA &&
    circuitoFF.iccPontaA < circuitoFF.iccQuadroA,
  `verificado=${circuitoFF.curtoCircuito.verificado}; quadro ${circuitoFF.iccQuadroA?.toFixed(0)} A (fn ${resultadoFF.protecaoGeral.iccQuadroA?.toFixed(0)} A); ponta ${circuitoFF.iccPontaA?.toFixed(0)} A`,
  'alto',
)

// Âncora à mão: 127 V, Icc 1000 A. Na origem, Icc·√3/2 = 866,0 A. Com 10 m de 10 mm² PVC:
// R = 2·10/(46,8·10) = 0,04274 Ω; X = 2·127/1000 + 2·10·0,00013 = 0,2566 Ω; |Z| = 0,26013 Ω;
// √3·127/0,26013 = 845,6 A.
const ffOrigem = propagarIccFaseFase({ tensaoFaseNeutroV: 127, iccFonteA: 1000, trechos: [] })
const ff10m = propagarIccFaseFase({ tensaoFaseNeutroV: 127, iccFonteA: 1000, trechos: [{ comprimentoM: 10, secaoMm2: 10, isolacao: 'pvc' }] })
// Icc fase-neutro informada (casa-modelo, trifásica 5 kA): os laços fase-neutro e fase-PE partem
// dela, o curto entre fases continua da trifásica, e o geral usa a maior. À mão, com fase-neutro
// 3 kA e 20 m de 16 mm² PVC: R = 2·20/(46,8·16) = 0,05342 Ω; X = 127/3000 + 2·20·0,00012 =
// 0,04713 Ω → 127/0,07124 = 1782,7 A no quadro.
const casaG23 = casaModelo()
const cfgCasaG23 = resolverConfigInstalacao(casaG23.tipoInstalacao, casaG23.tensaoFaseNeutro)
const casaFn = (fn) => calcularProjetoCompleto({ ...casaG23, iccFaseNeutroA: fn }, cfgCasaG23)
const fnSem = casaFn('')
const fn3k = casaFn('3000')
const fn6k = casaFn('6000')
const ffDe = (c) => c.dimensionados.find((d) => d.ehFaseFase).iccQuadroA
checar(
  'G23.8',
  '§5.3.5.1 / §5.3.5.5.1',
  'Icc fase-neutro informada vale nos laços fase-neutro (quadro 1782,7 A com 3 kA); entre fases não muda; o geral usa a maior (6 kA)',
  Math.abs(fn3k.protecaoGeral.iccQuadroA - 1782.7) < 0.05 &&
    Math.abs(ffDe(fn3k) - ffDe(fnSem)) < 1e-9 &&
    fn3k.complementares.capacidadeInterrupcao.geralKA === 5 &&
    fn6k.complementares.capacidadeInterrupcao.geralKA === 6,
  `quadro fn ${fn3k.protecaoGeral.iccQuadroA.toFixed(1)} A; ff ${ffDe(fn3k).toFixed(1)} A (sem fn ${ffDe(fnSem).toFixed(1)} A); geral ${fn3k.complementares.capacidadeInterrupcao.geralKA} / ${fn6k.complementares.capacidadeInterrupcao.geralKA} kA`,
  'alto',
)

checar(
  'G23.7',
  '§5.3.5.1',
  'Icc fase-fase: 866,0 A na origem (1000 A × √3/2) e 845,6 A após 10 m de 10 mm² PVC (conta à mão)',
  Math.abs(ffOrigem - 866.03) < 0.05 && Math.abs(ff10m - 845.6) < 0.05,
  `origem ${ffOrigem.toFixed(2)} A; 10 m ${ff10m.toFixed(2)} A`,
  'alto',
)

// Monotonicidade: mais comprimento a jusante → mais impedância → menos Icc disponível no ponto.
const iccCurto = propagarIccTerminal({
  tensaoFaseNeutroV: 127,
  iccFonteA: 1000,
  alimentador: { comprimentoM: 10, secaoMm2: 10, isolacao: 'pvc' },
  terminal: { comprimentoM: 20, secaoMm2: 2.5, isolacao: 'pvc', tensaoV: 127 },
})
const iccLongo = propagarIccTerminal({
  tensaoFaseNeutroV: 127,
  iccFonteA: 1000,
  alimentador: { comprimentoM: 10, secaoMm2: 10, isolacao: 'pvc' },
  terminal: { comprimentoM: 40, secaoMm2: 2.5, isolacao: 'pvc', tensaoV: 127 },
})
checar(
  'G23.3',
  '§5.3.5.1',
  'Icc propagada cai quando o circuito terminal é mais comprido (mais impedância a jusante)',
  iccLongo < iccCurto,
  `20 m → ${iccCurto.toFixed(1)} A, 40 m → ${iccLongo.toFixed(1)} A`,
  'alto',
)

// Âncora numérica calculada à mão e pré-verificada contra o motor (verificar-fase4.mjs,
// scratchpad) antes de fixar aqui: Xfonte=127/1000=0,127 Ω; alimentador 10 m/10 mm² PVC →
// r=0,042735 Ω, x=0,0026 Ω; terminal 20 m/2,5 mm² PVC → r=0,341880 Ω, x=0,006 Ω;
// Z=√(0,384615²+0,1356²)=0,407794 Ω → Icc=127/0,407794≈311,41 A.
checar(
  'G23.4',
  '§5.3.5.1',
  'Icc propagada bate com Zfonte reativa + R/X somados separadamente ao longo do alimentador e do circuito terminal',
  quase(iccCurto, 311.41, 0.1),
  `Icc calculada=${iccCurto.toFixed(2)} A vs esperada≈311,41 A`,
  'critico',
)

// §6.3.4.3.2 b): a energia é verificada com a Icc MÁXIMA no ponto de instalação do disjuntor (o
// quadro), não com a da ponta do circuito. Caso que passava antes da correção de 28/09/2026: 127 V,
// Icc 6 kA na origem, ramal 5 m, TUE (chuveiro) de 25 m dimensionado a 25 mm² → no quadro ≈4,9 kA,
// na ponta ≈2,0 kA. Usa um TUE de carga alta (não o TUG da cozinha) de propósito: TUG dimensiona a
// 2,5 mm², onde k não é normalizado (Tabela 30, NOTA 1, ver G34.3) e o curto-circuito fica "não
// verificado" — este teste precisa de um circuito que chegue a "verificado" para testar
// quadro-vs-ponta.
const projetoIk = {
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 127,
  comodos: [
    {
      id: 'coz',
      nome: 'Cozinha',
      tipo: 'servico',
      area: 10,
      perimetro: 13,
      tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 6800, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 }],
    },
  ],
  comprimentos: {},
  comprimentoRamalEntrada: 5,
  iccPresumidaA: 6000,
  curvaDisjuntorGeral: 'C',
}
const circuitosIk = calcularProjetoCompleto(projetoIk, cfgMono).dimensionados
projetoIk.comprimentos = Object.fromEntries(circuitosIk.map((c) => [c.id, 25]))
const resultadoIk = calcularProjetoCompleto(projetoIk, cfgMono)
const tueIk = resultadoIk.dimensionados.find((c) => c.tipo === 'tue')
checar(
  'G23.5',
  '§6.3.4.3.2 b)',
  'I²t do circuito terminal usa a Icc no quadro (máxima), não a da ponta do circuito',
  quase(tueIk.iccQuadroA, resultadoIk.protecaoGeral.iccQuadroA, 1e-9) &&
    tueIk.iccQuadroA > tueIk.iccPontaA &&
    tueIk.secaoMm2 >= 10 &&
    tueIk.curtoCircuito.verificado === true &&
    quase(tueIk.curtoCircuito.energiaPassanteA2s, tueIk.iccQuadroA ** 2 * 0.01, 1),
  `quadro=${tueIk.iccQuadroA?.toFixed(0)} A, ponta=${tueIk.iccPontaA?.toFixed(0)} A, ${tueIk.secaoMm2} mm² → verificado=${tueIk.curtoCircuito.verificado}, conforme=${tueIk.curtoCircuito.conforme}`,
  'critico',
)

// §6.3.4.3.2 a): sem o comprimento do circuito não há Ikmin — não verificado, nunca aprovado.
const projetoSemComp = { ...projetoIk, comprimentos: {} }
const tugSemComp = calcularProjetoCompleto(projetoSemComp, cfgMono).dimensionados.find((c) => c.tipo === 'tug')
checar(
  'G23.6',
  '§6.3.4.3.2 a)',
  'Sem comprimento do circuito, Ia ≤ Ikmin fica não verificado (Icc no ponto mais distante desconhecida)',
  tugSemComp.iccPontaA === null && tugSemComp.curtoCircuito.verificado === false,
  `iccPontaA=${tugSemComp.iccPontaA}, verificado=${tugSemComp.curtoCircuito.verificado}: ${tugSemComp.curtoCircuito.motivo}`,
  'alto',
)

// ---------------------------------------------------------------------------
// G24 — Verificações complementares (Sprint 3): §5.3.4.1 b, §5.3.5.5.1, §6.3.5.2, §6.4, §6.5, §9.5.2.2.1 b
// Valores esperados conferidos à mão e pré-verificados no motor (sprint3.mjs, scratchpad).
// ---------------------------------------------------------------------------
grupo('G24', 'Verificações complementares (aterramento, equipotencialização, DPS, quadro, bancada, motor)')

const reservas = [[6, 2], [7, 3], [12, 3], [13, 4], [30, 4], [31, 5]]
checar(
  'G24.1',
  '§6.5.4.7 / Tabela 59',
  'Espaço de reserva do quadro nas fronteiras da tabela (0,15·N arredondado para cima)',
  reservas.every(([n, esperado]) => calcularReservaQuadro(n) === esperado),
  reservas.map(([n]) => `${n}→${calcularReservaQuadro(n)}`).join(', '),
  'medio',
)

const equip = [[2.5, 6], [16, 10], [70, 25]]
checar(
  'G24.2',
  '§6.4.4.1.1',
  'Equipotencialização principal ≥ ½ do maior PE, mínimo 6 mm², limitada a 25 mm²',
  equip.every(([pe, esperado]) => calcularEquipotencializacaoPrincipal(pe) === esperado),
  equip.map(([pe]) => `PE ${pe}→${calcularEquipotencializacaoPrincipal(pe)} mm²`).join(', '),
  'alto',
)

const dps127 = especificarDPS({ tensaoFaseNeutro: 127, numeroFases: 1, exposicaoDescargaDireta: false })
const dps220 = especificarDPS({ tensaoFaseNeutro: 220, numeroFases: 3, exposicaoDescargaDireta: true })
checar(
  'G24.3',
  '§6.3.5.2.4 a/b/d, Tabelas 31 e 49, §6.3.5.2.9',
  'DPS: Up da categoria II, Uc ≥ 1,1·Uo, In ≥ 5 kA, Iimp ≥ 12,5 kA e condutor DPS-PE 4/16 mm²',
  dps127.upMaximoKV === 1.5 && quase(dps127.ucMinimoFaseV, 139.7) && dps127.inMinimoKA === 5 &&
    dps127.iimpMinimoKA === null && dps127.secaoCondutorPeMm2 === 4 &&
    dps220.upMaximoKV === 2.5 && quase(dps220.ucMinimoFaseV, 242) && dps220.iimpMinimoKA === 12.5 &&
    dps220.secaoCondutorPeMm2 === 16 && dps220.inMinimoNeutroPeKA === 20,
  `127 V: Up≤${dps127.upMaximoKV} kV, Uc≥${dps127.ucMinimoFaseV.toFixed(1)} V · 220/380 V c/ descarga direta: Up≤${dps220.upMaximoKV} kV, Iimp≥${dps220.iimpMinimoKA} kA, DPS-PE ${dps220.secaoCondutorPeMm2} mm²`,
  'alto',
)

const projetoG24 = {
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 127,
  comodos: [
    { id: 's', nome: 'Sala', tipo: 'social', area: 20, perimetro: 18, tue: [] },
    {
      id: 'c', nome: 'Cozinha', tipo: 'servico', area: 10, perimetro: 13, tomadasBancada: 1,
      tue: [{ id: 'ar', nome: 'Ar', quantidade: 1, potenciaW: 4000, ligacao: 'fase-neutro', tipoCarga: 'indutiva', cosPhi: 0.85 }],
    },
    {
      id: 'b', nome: 'Banheiro', tipo: 'banheiro', area: 4, perimetro: 8,
      tue: [{ id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 5500, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 }],
    },
  ],
  comprimentos: {},
  comprimentoRamalEntrada: 10,
  iccPresumidaA: 5000,
  curvaDisjuntorGeral: 'C',
  esquemaAterramento: 'TN-C-S',
  condicaoAterramento: 'protegido-corrosao',
}
const resultadoG24 = calcularProjetoCompleto(projetoG24, cfgMono)
const comp = resultadoG24.complementares

checar(
  'G24.4',
  '§6.4.3.4.1',
  'TN-C-S: o PEN (alimentador até o quadro) é conferido contra 10 mm²; sem esquema declarado, nada é afirmado',
  comp.pen?.secaoMinimaMm2 === 10 && comp.pen.conforme === (comp.pen.secaoMm2 >= 10) &&
    calcularProjetoCompleto({ ...projetoG24, esquemaAterramento: '' }, cfgMono).complementares.pen === null,
  `PEN ${comp.pen?.secaoMm2} mm² ≥ 10 → ${comp.pen?.conforme}; esquema vazio → pen=null`,
  'alto',
)

const condicoes = { 'protegido-total': 2.5, 'protegido-corrosao': 16, 'sem-protecao-corrosao': 50 }
const secoesAterramento = Object.fromEntries(
  Object.keys(condicoes).map((c) => [
    c,
    calcularProjetoCompleto({ ...projetoG24, condicaoAterramento: c }, cfgMono).complementares.condutorAterramento.secaoMm2,
  ]),
)
const peAlim = resultadoG24.protecaoGeral.secaoTerraMm2
checar(
  'G24.5',
  '§6.4.1.2.1 / Tabela 52',
  'Condutor de aterramento enterrado = maior entre o PE do alimentador e o mínimo da Tabela 52',
  Object.entries(condicoes).every(([c, minimo]) => secoesAterramento[c] === Math.max(peAlim, minimo)),
  `PE alimentador ${peAlim} mm² → ${Object.entries(secoesAterramento).map(([c, s]) => `${c}=${s}`).join(', ')}`,
  'alto',
)

checar(
  'G24.6',
  '§6.5.1.2.1 NOTA',
  'Equipamento indutivo acima de 3,7 kW gera aviso de consulta à distribuidora; carga resistiva não',
  comp.motores.length === 1 && comp.motores[0].nome === 'Ar',
  `avisos: ${comp.motores.map((m) => `${m.nome} ${m.potenciaW} W`).join(', ') || 'nenhum'} (chuveiro 5500 W resistivo fica de fora)`,
  'medio',
)

const bancadaCom = (valor) =>
  calcularProjetoCompleto(
    { ...projetoG24, comodos: projetoG24.comodos.map((c) => (c.id === 'c' ? { ...c, tomadasBancada: valor } : c)) },
    cfgMono,
  ).complementares.bancadas[0].conforme
checar(
  'G24.7',
  '§9.5.2.2.1 b)',
  'Tomadas acima da bancada da pia: 1 não conforme, 2 conforme, sem informar não verificado',
  bancadaCom(1) === false && bancadaCom(2) === true && bancadaCom('') === null,
  `1→${bancadaCom(1)}, 2→${bancadaCom(2)}, vazio→${bancadaCom('')}`,
  'medio',
)

checar(
  'G24.8',
  '§5.3.4.1 b)',
  'I2 = 1,45·In (IEC 60898) ≤ 1,45·Iz em todo circuito e no alimentador',
  resultadoG24.dimensionados.every((c) => c.sobrecarga?.conforme === true && quase(c.sobrecarga.i2A, 1.45 * c.disjuntorA)) &&
    resultadoG24.protecaoGeral.sobrecarga?.conforme === true,
  resultadoG24.dimensionados.map((c) => `${c.nome}: ${c.sobrecarga.i2A.toFixed(1)}≤${c.sobrecarga.limiteA.toFixed(1)}`).join(' · '),
  'alto',
)

checar(
  'G24.9',
  '§5.3.5.5.1',
  'Capacidade de interrupção mínima: Icc da origem no geral, Icc do quadro (menor) nos terminais',
  comp.capacidadeInterrupcao.geralKA === 5 &&
    quase(comp.capacidadeInterrupcao.terminaisKA, resultadoG24.protecaoGeral.iccQuadroA / 1000, 1e-9) &&
    comp.capacidadeInterrupcao.terminaisKA < 5 &&
    calcularProjetoCompleto({ ...projetoG24, iccPresumidaA: '' }, cfgMono).complementares.capacidadeInterrupcao === null,
  `geral ≥ ${comp.capacidadeInterrupcao.geralKA} kA, terminais ≥ ${comp.capacidadeInterrupcao.terminaisKA.toFixed(2)} kA; sem Icc → null`,
  'alto',
)

// ---------------------------------------------------------------------------
// G25 — Seccionamento automático (§5.1.2.2.4) e DR por grupo (§6.3.3.2.6, §6.3.6.3.2) — Sprint 4
// Âncora calculada à mão e pré-verificada no motor (sprint4.mjs, scratchpad).
// ---------------------------------------------------------------------------
grupo('G25', 'Seccionamento automático TN/TT e DR por grupo de circuitos')

const projetoTN = {
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 127,
  comodos: [{ id: 's', nome: 'Sala', tipo: 'social', area: 20, perimetro: 18, tue: [] }],
  comprimentos: {},
  comprimentoRamalEntrada: 10,
  iccPresumidaA: 5000,
  curvaDisjuntorGeral: 'C',
  esquemaAterramento: 'TN-C-S',
}
projetoTN.comprimentos = Object.fromEntries(calcularProjetoCompleto(projetoTN, cfgMono).dimensionados.map((c) => [c.id, 30]))
const resultadoTN = calcularProjetoCompleto(projetoTN, cfgMono)
const tugTN = resultadoTN.dimensionados.find((c) => c.tipo === 'tug')

// Alimentador 10 m, fase 10 + PEN 10 mm² PVC (σ=46,8): R=10·2/468=0,042735 Ω, X=10·2·0,00013=0,0026 Ω.
// TUG 30 m, fase 2,5 + PE 2,5: R=30·2/117=0,512821 Ω, X=30·2·0,00015=0,009 Ω. Fonte X=127/5000=0,0254.
// Zs=√(0,555556²+0,037²)=0,556786 Ω → If=228,1 A ≥ 10×10 A → atende pelo disjuntor (e pelo DR).
checar(
  'G25.1',
  '§5.1.2.2.4.2 d)',
  'TN-C-S: Zs do ponto mais distante (fonte + fase + PEN até o quadro + PE do circuito) bate com a conta à mão',
  quase(tugTN.seccionamento.zsOhm, 0.556786, 1e-5) && tugTN.seccionamento.conforme === true && tugTN.seccionamento.porDisjuntor === true,
  `Zs=${tugTN.seccionamento.zsOhm.toFixed(6)} Ω (esperado 0,556786), If=${tugTN.seccionamento.correnteFaltaA.toFixed(1)} A, Ia=${tugTN.seccionamento.iaDisjuntorA} A`,
  'critico',
)

// Alimentador de 35 mm² com PE de 16 mm² (projetoG24): no TN-S a volta é o PE (16), no TN-C-S o
// PEN (35) — a volta mais fina tem de dar Zs maior.
const zsAlim = (esquema) =>
  calcularProjetoCompleto({ ...projetoG24, esquemaAterramento: esquema }, cfgMono).seccionamento.alimentador.zsOhm
checar(
  'G25.2',
  '§5.1.2.2.4.2 d) / §4.2.2.2',
  'Volta da falta pelo PE (TN-S) ou pelo PEN (TN-C-S): PE mais fino dá Zs maior',
  zsAlim('TN-S') > zsAlim('TN-C-S'),
  `alimentador: TN-S ${zsAlim('TN-S').toFixed(4)} Ω > TN-C-S ${zsAlim('TN-C-S').toFixed(4)} Ω`,
  'alto',
)

const tugSemIccTN = calcularProjetoCompleto({ ...projetoTN, iccPresumidaA: '' }, cfgMono).dimensionados.find((c) => c.tipo === 'tug')
checar(
  'G25.3',
  '§5.1.2.2.4.2 d)',
  'TN sem Icc declarada: seccionamento não verificado (a impedância da fonte é desconhecida)',
  tugSemIccTN.seccionamento.verificado === false && tugSemIccTN.seccionamentoAutomaticoVerificado === false,
  tugSemIccTN.seccionamento.motivo,
  'alto',
)

// Icc baixa na origem: a falta fase-PE no quadro fica abaixo de 10×In do geral e o alimentador
// não tem DR → não verificado (depende da curva; distribuição admite até 5 s), nunca conforme.
const alimFraco = calcularProjetoCompleto({ ...projetoG24, esquemaAterramento: 'TN-S', iccPresumidaA: 300 }, cfgMono).seccionamento.alimentador
checar(
  'G25.4',
  '§5.1.2.2.4.1 c) / §5.1.2.2.4.2 d)',
  'Alimentador sem disparo instantâneo garantido e sem DR fica não verificado, não aprovado',
  alimFraco.verificado === false && alimFraco.porDR === false && alimFraco.porDisjuntor === false,
  `If=${alimFraco.correnteFaltaA.toFixed(0)} A < Ia=${alimFraco.iaDisjuntorA} A → ${alimFraco.motivo}`,
  'alto',
)

const tt = (comodos, ra) =>
  calcularProjetoCompleto({ ...projetoTN, comodos, esquemaAterramento: 'TT', resistenciaAterramentoOhm: ra }, cfgMono).seccionamento.tt
const comBanheiro = [...projetoTN.comodos, { id: 'b', nome: 'Banheiro', tipo: 'banheiro', area: 4, perimetro: 8, tue: [] }]
checar(
  'G25.5',
  '§5.1.2.2.4.3 b) / Anexo C',
  'TT: RA·IΔn ≤ UL, com UL 25 V quando há banheiro (situação 2) e 50 V sem; sem RA medida, só o limite',
  tt(projetoTN.comodos, 900).conforme === true && tt(comBanheiro, 900).conforme === false &&
    quase(tt(comBanheiro, '').raMaximaOhm, 833.33, 0.01) && tt(comBanheiro, '').verificado === false,
  `RA 900 Ω: sem banheiro ${tt(projetoTN.comodos, 900).conforme} (UL 50), com banheiro ${tt(comBanheiro, 900).conforme} (UL 25); RA máx c/ banheiro ${tt(comBanheiro, '').raMaximaOhm.toFixed(0)} Ω`,
  'critico',
)

const idsTN = resultadoTN.dimensionados.map((c) => c.id)
const gruposTN = calcularProjetoCompleto(
  { ...projetoTN, modoDR: 'grupos', grupoDR: { [idsTN[0]]: 1, [idsTN[1]]: 2 }, drMontante: '300-S' },
  cfgMono,
)
const drsTN = gruposTN.protecaoGeral.drs
checar(
  'G25.6',
  '§6.3.6.3.2 / §6.3.6.2.2',
  'DR por grupo: 30 mA, In ≥ min(ΣIn do grupo, In geral), polos = fases + neutro; montante 300 mA tipo S seletivo',
  drsTN.grupos.length === 2 && drsTN.grupos.every((g) => g.sensibilidadeMA === 30 && g.correnteA >= Math.min(g.somaInA, gruposTN.protecaoGeral.disjuntorGeralA) && g.polos === 2) &&
    drsTN.montante.seletivo === true && gruposTN.protecaoGeral.idr.sensibilidadeMA === 300,
  drsTN.grupos.map((g) => `DR${g.numero}: ${g.correnteA} A ${g.polos}P (ΣIn ${g.somaInA} A)`).join(' · ') + ` · montante ${drsTN.montante.label}`,
  'alto',
)

checar(
  'G25.7',
  '§6.3.3.2.6',
  'DR único para vários circuitos gera aviso de disparo intempestivo (fuga não calculável)',
  resultadoTN.protecaoGeral.drs.avisoIntempestivo === true && drsTN.avisoIntempestivo === false,
  `geral: aviso=${resultadoTN.protecaoGeral.drs.avisoIntempestivo}; por grupos: aviso=${drsTN.avisoIntempestivo}`,
  'medio',
)

const semEsquema = calcularProjetoCompleto({ ...projetoTN, esquemaAterramento: '' }, cfgMono)
checar(
  'G25.8',
  '§6.2.6.1.2 d)',
  'Sem esquema de aterramento declarado, o seccionamento continua não verificado em todo circuito',
  semEsquema.dimensionados.every((c) => c.seccionamento === null && c.seccionamentoAutomaticoVerificado === false),
  semEsquema.dimensionados.map((c) => `${c.nome}=${c.seccionamentoAutomaticoVerificado}`).join(', '),
  'alto',
)

// ---------------------------------------------------------------------------
// G26 — Veredito e listas de verificação (Sprint 5). Não é cálculo da norma: confere que o
// veredito não esconde problema nem pendência, e que as listas só trazem o que se aplica.
// ---------------------------------------------------------------------------
grupo('G26', 'Veredito geral e listas de verificação (§1.3 do PLANO)')

const projetoSemDados = { ...projetoTN, esquemaAterramento: '', iccPresumidaA: '' }
const vereditoSemDados = calcularVeredito(projetoSemDados, calcularProjetoCompleto(projetoSemDados, cfgMono))
checar(
  'G26.1',
  '§6.2.6.1.2 c/d',
  'Sem esquema nem Icc, o veredito fica "falta dado" (âmbar) e lista as duas pendências — nunca "conforme"',
  vereditoSemDados.estado === 'atencao' &&
    vereditoSemDados.pendencias.some((p) => /Esquema de aterramento/.test(p.texto)) &&
    vereditoSemDados.pendencias.some((p) => /Icc/.test(p.texto)),
  `estado=${vereditoSemDados.estado}; pendências: ${vereditoSemDados.pendencias.map((p) => p.texto).join(' | ')}`,
  'alto',
)

const vereditoBancada = calcularVeredito(projetoG24, resultadoG24)
checar(
  'G26.2',
  '§9.5.2.2.1 b)',
  'Uma não conformidade (bancada com 1 tomada) deixa o veredito vermelho e aponta a etapa que resolve',
  vereditoBancada.estado === 'alerta' && vereditoBancada.problemas.some((p) => p.etapa === 'comodos' && /bancada/.test(p.texto)),
  `estado=${vereditoBancada.estado}; problemas: ${vereditoBancada.problemas.map((p) => `${p.texto} → ${p.etapa}`).join(' | ')}`,
  'alto',
)

const textoListas = (projeto) =>
  montarChecklists(projeto, calcularProjetoCompleto(projeto, cfgMono))
    .flatMap((g) => g.itens.map((i) => `${g.titulo}: ${i.texto}`))
    .join('\n')
const listaTT = textoListas({ ...projetoTN, esquemaAterramento: 'TT', comodos: comBanheiro })
const listaTNCS = textoListas(projetoTN)
checar(
  'G26.3',
  '§7.3.5.1-2, §6.1.5.3.3, §9.1.4.3',
  'Listas condicionais: TT pede medir RA (com o limite), TN-C-S traz a cor do PEN, banheiro só com banheiro, TN com Zs calculado dispensa a medição',
  /Medir a resistência de aterramento das massas \(RA ≤ 833 Ω\)/.test(listaTT) && /^Banheiro:/m.test(listaTT) && !/PEN em azul-claro/.test(listaTT) &&
    /PEN em azul-claro/.test(listaTNCS) && !/^Banheiro:/m.test(listaTNCS) && /medição de Zs pode ser dispensada/.test(listaTNCS),
  `TT: RA ${/RA ≤ 833/.test(listaTT)}, banheiro ${/^Banheiro:/m.test(listaTT)} · TN-C-S: PEN ${/PEN em azul-claro/.test(listaTNCS)}, Zs dispensável ${/dispensada/.test(listaTNCS)}`,
  'medio',
)

checar(
  'G26.4',
  '§6.5.4.10',
  'Advertência do quadro transcrita da norma (2 itens, termina em "RISCO DE VIDA PARA OS USUÁRIOS DA INSTALAÇÃO.")',
  ADVERTENCIA_QUADRO.length === 2 && ADVERTENCIA_QUADRO[0].startsWith('1. Quando um disjuntor ou fusível atua') &&
    ADVERTENCIA_QUADRO[1].endsWith('RISCO DE VIDA PARA OS USUÁRIOS DA INSTALAÇÃO.'),
  ADVERTENCIA_QUADRO.map((p) => p.slice(0, 40)).join(' … '),
  'medio',
)

// ---------------------------------------------------------------------------
// G27 — Projetos: arquivo, link e casa-modelo (Sprint 6). Não é cálculo da norma: confere que
// salvar e reabrir um projeto não muda nenhum número, e que a demonstração não mostra problema.
// ---------------------------------------------------------------------------
grupo('G27', 'Projetos: arquivo, link e casa-modelo (§2 F2-F4 do PLANO)')

const exemplo = casaModelo()
const cfgExemplo = resolverConfigInstalacao(exemplo.tipoInstalacao, exemplo.tensaoFaseNeutro)
const calculoExemplo = calcularProjetoCompleto(exemplo, cfgExemplo)
const assinatura = (p) => JSON.stringify(calcularProjetoCompleto(p, resolverConfigInstalacao(p.tipoInstalacao, p.tensaoFaseNeutro)))
const doArquivo = lerArquivo(gerarArquivo('Casa', exemplo)).dados
const doLink = (await decodificarLink(await codificarLink('Casa', exemplo))).dados
checar(
  'G27.1',
  '—',
  'Exportar e reimportar (arquivo JSON e link) devolve o mesmo projeto e o mesmo cálculo',
  assinatura(doArquivo) === assinatura(exemplo) && assinatura(doLink) === assinatura(exemplo),
  `arquivo ${assinatura(doArquivo) === assinatura(exemplo)} · link ${assinatura(doLink) === assinatura(exemplo)}`,
  'alto',
)

let recusas = 0
for (const texto of ['nao é json', '{"formato":"outro"}', '{"formato":"fio-certo/projeto","versao":99,"projeto":{}}']) {
  try {
    lerArquivo(texto)
  } catch {
    recusas++
  }
}
const sujo = normalizarProjeto({ comodos: [{ nome: 'X', tue: 'lixo' }, 42], tensaoFaseNeutro: 'abc', modoDR: {}, chaveEstranha: 1 })
checar(
  'G27.2',
  '—',
  'Arquivo inválido é recusado; campos de tipo errado voltam ao padrão em vez de entrar no cálculo',
  recusas === 3 && sujo.comodos.length === 1 && Array.isArray(sujo.comodos[0].tue) && sujo.tensaoFaseNeutro === 127 &&
    sujo.modoDR === 'geral' && !('chaveEstranha' in sujo),
  `recusados ${recusas}/3; cômodos ${sujo.comodos.length}, tensão ${sujo.tensaoFaseNeutro}, modoDR ${sujo.modoDR}`,
  'medio',
)

// Arquivo hostil: opções inexistentes (inclusive nomes do protótipo, como "toString") e mapas com
// valores do tipo errado. Tem de abrir e calcular sem lançar erro, com os padrões no lugar.
const hostil = normalizarProjeto({
  tipoInstalacao: 'toString', tensaoFaseNeutro: 999, isolacaoCondutor: 'amianto', curvaDisjuntorGeral: 'Z', modoDR: 'constructor',
  metodosInstalacao: { a: 'toString', b: 'C' }, percursos: { a: 'x', b: [{ comprimentoM: '10' }, 5] }, grupoDR: { a: -1, b: 2 },
  consumo: { dias: {}, horas: 'x' }, existentes: { a: 3 },
  comodos: [{ id: 'h', tipo: '__proto__', area: '10', perimetro: '13', tue: [{ potenciaW: '1000', tipoCarga: 'hasOwnProperty', ligacao: 'x' }] }],
})
let erroHostil = null
try {
  calcularProjetoCompleto(hostil, resolverConfigInstalacao(hostil.tipoInstalacao, hostil.tensaoFaseNeutro))
} catch (erro) {
  erroHostil = erro.message
}
checar(
  'G27.4',
  '—',
  'Arquivo com opções inexistentes (até nomes do protótipo) e mapas de tipo errado abre e calcula, com os padrões no lugar',
  erroHostil === null && hostil.tipoInstalacao === 'monofasica' && hostil.tensaoFaseNeutro === 127 && hostil.curvaDisjuntorGeral === 'C' &&
    JSON.stringify(hostil.metodosInstalacao) === '{"b":"C"}' && !('a' in hostil.percursos) && hostil.percursos.b.length === 1 &&
    hostil.comodos[0].tipo === 'social' && hostil.comodos[0].tue[0].tipoCarga === 'resistiva',
  erroHostil ?? `instalação ${hostil.tipoInstalacao}, métodos ${JSON.stringify(hostil.metodosInstalacao)}, cômodo ${hostil.comodos[0].tipo}`,
  'alto',
)

const vereditoExemplo = calcularVeredito(exemplo, { configInstalacao: cfgExemplo, ...calculoExemplo })
checar(
  'G27.3',
  '—',
  'A casa-modelo tem todos os comprimentos preenchidos e sai sem problema nem pendência (é a demonstração)',
  vereditoExemplo.estado === 'ok' && calculoExemplo.dimensionados.every((c) => Number(exemplo.comprimentos[c.id]) > 0),
  `estado=${vereditoExemplo.estado}; ${vereditoExemplo.problemas.length} problemas, ${vereditoExemplo.pendencias.length} pendências; ${calculoExemplo.dimensionados.length} circuitos`,
  'medio',
)

// ---------------------------------------------------------------------------
// G28 — Materiais, quadro e instalação existente (Sprint 7). Derivados do dimensionamento: a
// lista não pode inventar metro nem dispositivo, e a conferência do existente usa os mesmos
// critérios do dimensionamento. Valores da casa-modelo conferidos à mão (casos-de-teste §16e).
// ---------------------------------------------------------------------------
grupo('G28', 'Materiais, quadro e instalação existente (§2 F5-F8 do PLANO)')

const calculoExemploCompleto = { configInstalacao: cfgExemplo, ...calculoExemplo }
const materiais = listarMateriais(exemplo, calculoExemploCompleto, { folgaPercentual: '' })
const metros = Object.fromEntries(materiais.cabos.map((c) => [`${c.funcao} ${c.secaoMm2}`, c.metros]))
const esperadoCabos = { 'fase 2.5': 39, 'fase 4': 54, 'fase 10': 24, 'fase 16': 40, 'neutro 2.5': 15, 'neutro 4': 54, 'pen 16': 20, 'pe 2.5': 27, 'pe 4': 54, 'pe 10': 12 }
checar(
  'G28.1',
  '§6.1.5.3, §6.4.3.4',
  'Cabos da casa-modelo por função e seção batem com a conta à mão (TN-C-S: PEN no alimentador, sem PE separado; fase-fase sem neutro)',
  JSON.stringify(metros) === JSON.stringify(esperadoCabos),
  Object.entries(metros).map(([k, v]) => `${k}: ${v} m`).join(', '),
  'medio',
)

const comFolga = listarMateriais(exemplo, calculoExemploCompleto, { folgaPercentual: '10' })
checar(
  'G28.2',
  '—',
  'Folga é só a informada, arredondada para cima (39 m + 10% = 43 m); sem folga, nenhuma',
  comFolga.cabos[0].metros === 43 && materiais.folgaPercentual === 0,
  `fase 2,5 com 10%: ${comFolga.cabos[0].metros} m; folga padrão ${materiais.folgaPercentual}%`,
  'medio',
)

const quadro = montarQuadro(calculoExemploCompleto)
const numerosQuadro = quadro.posicoes.filter((p) => p.tipo === 'disjuntor').map((p) => p.numero)
checar(
  'G28.3',
  '§6.3.5.2.3 a), §6.5.4.7 / Tabela 59, §6.1.5.4',
  'Quadro: DPS em conexão 2 (fases + neutro–PE), reserva da Tabela 59 e circuitos numerados na ordem do trilho',
  materiais.dps.reduce((s, d) => s + d.quantidade, 0) === cfgExemplo.numeroFases + 1 &&
    quadro.reserva === calculoExemplo.complementares.reservaQuadro.reservaMinima &&
    JSON.stringify(numerosQuadro) === JSON.stringify(numerosQuadro.map((_, i) => i + 1)) &&
    numerosQuadro.length === calculoExemplo.dimensionados.length,
  `DPS ${materiais.dps.map((d) => d.quantidade).join('+')}, reserva ${quadro.reserva}, circuitos ${numerosQuadro.join(',')}, ${quadro.modulos} módulos`,
  'medio',
)

const tugExemplo = calculoExemplo.dimensionados.find((c) => c.tipo === 'tug')
const existenteRuim = verificarExistente(tugExemplo, { secaoMm2: 2.5, disjuntorA: 20 }, { curvaDisjuntor: 'C' })
const existenteIgual = verificarExistente(
  tugExemplo,
  { secaoMm2: tugExemplo.secaoMm2, disjuntorA: tugExemplo.disjuntorA, peMm2: tugExemplo.secaoTerraMm2 },
  { curvaDisjuntor: 'C' },
)
const curtoDeExistenteIgual = existenteIgual.itens.find((i) => i.criterio === 'Curto-circuito')
checar(
  'G28.4',
  '§5.3.4.1',
  'Existente: 2,5 mm² com 20 A num circuito de Iz 13,7 A não atende (In > Iz); a própria seção e disjuntor dimensionados não falham em nenhum item verificável — o único item em aberto é o curto-circuito, "não verificado" abaixo de 10 mm² (Tabela 30 NOTA 1, ver G34.3), não uma falha nova',
  existenteRuim.conforme === false &&
    existenteRuim.falhas.includes('In ≤ Iz') &&
    existenteIgual.conforme === null &&
    existenteIgual.falhas.length === 0 &&
    curtoDeExistenteIgual.ok === null,
  `2,5/20 A: ${existenteRuim.falhas.join(', ')}; ${tugExemplo.secaoMm2}/${tugExemplo.disjuntorA} A: conforme=${existenteIgual.conforme}, falhas=${existenteIgual.falhas.join(', ') || 'nenhuma'}, curto-circuito=${curtoDeExistenteIgual.ok}`,
  'alto',
)

const exemploExistente = { ...exemplo, existentes: { [tugExemplo.id]: { secaoMm2: '2.5', disjuntorA: '20' } } }
const vereditoExistente = calcularVeredito(exemploExistente, { configInstalacao: cfgExemplo, ...calcularProjetoCompleto(exemploExistente, cfgExemplo) })
checar(
  'G28.5',
  '§5.3.4.1',
  'Instalação existente que não atende deixa o veredito vermelho, apontando o Dimensionamento',
  vereditoExistente.estado === 'alerta' && vereditoExistente.problemas.some((p) => p.etapa === 'dimensionamento' && /existente/.test(p.texto)),
  vereditoExistente.problemas.map((p) => p.texto).join(' | '),
  'alto',
)

// PE e seccionamento do existente, no projeto completo (TN-C-S da casa-modelo). Com o PE igual ao
// dimensionado, o Zs recalculado é o mesmo do projeto; com PE abaixo da Tabela 58, reprova e o Zs sobe.
const existenteDoProjeto = (existente) => {
  const q = { ...exemplo, existentes: { [tugExemplo.id]: existente } }
  return calcularProjetoCompleto(q, cfgExemplo).dimensionados.find((c) => c.id === tugExemplo.id)
}
const comPe4 = existenteDoProjeto({ secaoMm2: '4', disjuntorA: '16', peMm2: '4' })
const comPe25 = existenteDoProjeto({ secaoMm2: '4', disjuntorA: '16', peMm2: '2.5' })
const semPe = existenteDoProjeto({ secaoMm2: '4', disjuntorA: '16' })
const itemDe = (c, criterio) => c.existente.itens.find((i) => i.criterio === criterio)
checar(
  'G28.6',
  'Tabela 58 / §5.1.2.2.4',
  'Existente: PE conferido pela Tabela 58 e seccionamento refeito com o PE instalado (PE 2,5 mm² em fase de 4 mm² reprova; sem PE, fica em aberto). PE 4 mm² não falha em nada verificável — só fica "não verificado" no curto-circuito, abaixo de 10 mm² (Tabela 30 NOTA 1, ver G34.3)',
  comPe4.existente.conforme === null &&
    comPe4.existente.falhas.length === 0 &&
    itemDe(comPe4, 'Curto-circuito').ok === null &&
    Math.abs(comPe4.seccionamento.zsOhm - 0.2482) < 0.0001 &&
    /Zs 0\.25/.test(itemDe(comPe4, 'Seccionamento automático').detalhe) &&
    comPe25.existente.falhas.includes('Condutor de proteção (PE)') &&
    /Zs 0\.31/.test(itemDe(comPe25, 'Seccionamento automático').detalhe) &&
    semPe.existente.conforme === null,
  `PE 4: conforme=${comPe4.existente.conforme}, falhas=${comPe4.existente.falhas.join(', ') || 'nenhuma'} (${itemDe(comPe4, 'Seccionamento automático').detalhe}); PE 2,5: ${comPe25.existente.falhas.join(', ')} (${itemDe(comPe25, 'Seccionamento automático').detalhe}); sem PE: ${semPe.existente.conforme}`,
  'alto',
)

// ---------------------------------------------------------------------------
// G29 — Piscina, sauna, consumo e especificação (Sprint 8).
// ---------------------------------------------------------------------------
grupo('G29', 'Piscina (§9.2), sauna (§9.4), consumo e especificação de compra')

const comodoSauna = {
  id: 's1', nome: 'Sauna', tipo: 'sauna', area: '4', perimetro: '', iluminacaoQuantidade: '', iluminacaoPotenciaUnitariaW: '', tugPontos: '',
  tue: [{ id: 'aq', nome: 'Aquecedor', quantidade: 1, potenciaW: '4500', ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 }],
}
const comSauna = (sauna) => {
  const p = { ...exemplo, comodos: [...exemplo.comodos, sauna] }
  const c = { configInstalacao: cfgExemplo, ...calcularProjetoCompleto(p, cfgExemplo) }
  return { p, c }
}
const saunaOk = comSauna(comodoSauna)
const saunaTomada = comSauna({ ...comodoSauna, tugPontos: '1' })
const vereditoSaunaTomada = calcularVeredito(saunaTomada.p, saunaTomada.c)
checar(
  'G29.1',
  '§9.4.4.3.2',
  'Sauna: mínimo de tomadas é 0 (a proibição prevalece sobre §9.5.2.2.1); tomada informada vira não conformidade',
  calcularQuantidadeTugMinima(comodoSauna) === 0 && saunaOk.c.locaisEspeciais.sauna.comTomada.length === 0 &&
    vereditoSaunaTomada.problemas.some((p) => /sauna/i.test(p.texto) && p.etapa === 'comodos'),
  `mínimo ${calcularQuantidadeTugMinima(comodoSauna)}; com 1 tomada: ${vereditoSaunaTomada.problemas.map((p) => p.texto).join(' | ')}`,
  'alto',
)

const listaSauna = montarChecklists(saunaOk.p, saunaOk.c).find((g) => g.titulo === 'Sauna')
checar(
  'G29.2',
  '§9.4.4.1.4, §9.4.4.3.3',
  'Sauna com aquecedor: exige cabo para 170 °C no volume 3 (a ferramenta não dimensiona) e desligamento a 140 °C na lista',
  saunaOk.c.locaisEspeciais.sauna.aquecedores.length === 1 && Boolean(listaSauna?.itens.some((i) => /170 °C/.test(i.texto))) &&
    Boolean(listaSauna?.itens.some((i) => /140 °C/.test(i.texto) && i.clausula === '§9.4.4.3.3')),
  `aquecedores: ${saunaOk.c.locaisEspeciais.sauna.aquecedores.join(', ')}; itens: ${listaSauna?.itens.length}`,
  'medio',
)

const pPiscina = { ...exemplo, comodos: exemplo.comodos.map((c) => (c.id === 'ex-varanda' ? { ...c, piscina: true } : c)) }
const cPiscina = { configInstalacao: cfgExemplo, ...calcularProjetoCompleto(pPiscina, cfgExemplo) }
const ipsPiscina = cPiscina.locaisEspeciais.piscina?.volumes.map((v) => v.ipMinimo.split(' ')[0]) ?? []
checar(
  'G29.3',
  '§9.2.4.1, §9.2.3.1.4',
  'Piscina: IPX8 / IPX5 / IPX2 (mínimos por volume), equipotencialização suplementar e lista própria; sem piscina, nada',
  JSON.stringify(ipsPiscina) === '["IPX8","IPX5","IPX2"]' && cPiscina.locaisEspeciais.piscina.equipotencializacaoSuplementarExigida &&
    montarChecklists(pPiscina, cPiscina).some((g) => g.titulo === 'Piscina') && calculoExemplo.locaisEspeciais.piscina === null,
  `IP ${ipsPiscina.join('/')}; sem piscina: ${calculoExemplo.locaisEspeciais.piscina}`,
  'medio',
)

const consumo = simularConsumo(exemplo.comodos, { dias: '30', tarifa: '0.8', horas: { 'tue:ex-banheiro:ex-chuveiro': '0.5' } })
const semDias = simularConsumo(exemplo.comodos, { dias: '', horas: { 'tue:ex-banheiro:ex-chuveiro': '0.5' } })
checar(
  'G29.4',
  '—',
  'Consumo: 5500 W × 0,5 h × 30 dias = 82,5 kWh; × R$ 0,80 = R$ 66,00; carga sem horas fica fora; sem dias, nenhum total',
  Math.abs(consumo.totalKWh - 82.5) < 1e-9 && Math.abs(consumo.custo - 66) < 1e-9 && consumo.semHoras === 1 && semDias.totalKWh === null,
  `${consumo.totalKWh} kWh, R$ ${consumo.custo}, ${consumo.semHoras} sem horas; sem dias: ${semDias.totalKWh}`,
  'medio',
)

const icns = materiais.disjuntores.map((d) => `${d.icnMinimoKA}→${d.icnPadronizadaKA}`)
checar(
  'G29.5',
  '§5.3.5.5.1',
  'Especificação: Icn mínima sobe para a próxima padronizada (NBR NM 60898), nunca desce (5 → 6 kA; 2,9 → 3 kA, a do curto entre fases no quadro)',
  materiais.disjuntores.every((d) => d.icnPadronizadaKA >= d.icnMinimoKA) && icns[0] === '5→6' && icns[1] === '2.9→3',
  icns.join(', '),
  'medio',
)

// ---------------------------------------------------------------------------
// G30 — Percurso do eletroduto (N17, Sprint 9).
// ---------------------------------------------------------------------------
grupo('G30', 'Percurso do eletroduto (§6.2.11.1.6 b, §6.2.11.1.7)')

const t15 = verificarTrecho({ comprimentoM: 15, curvas: 0 })
const t13 = verificarTrecho({ comprimentoM: 13, curvas: 1 })
const tExt = verificarTrecho({ comprimentoM: 27, curvas: 1, externo: true })
checar(
  'G30.1',
  '§6.2.11.1.6 b)',
  'Limite do trecho: 15 m interno / 30 m externo, menos 3 m por curva de 90° (15 m reto passa; 13 m com 1 curva passa do limite de 12 m; 27 m externo com 1 curva passa)',
  t15.conforme && t13.limiteM === 12 && !t13.conforme && tExt.limiteM === 27 && tExt.conforme,
  `15/0: ${t15.conforme}; 13/1: limite ${t13.limiteM}, ${t13.conforme}; ext 27/1: limite ${tExt.limiteM}, ${tExt.conforme}`,
  'medio',
)

const t4curvas = verificarTrecho({ comprimentoM: 2, curvas: 4 })
checar(
  'G30.2',
  '§6.2.11.1.7',
  'Mais de 3 curvas de 90° num trecho é não conforme, mesmo curto',
  !t4curvas.conforme && !t4curvas.curvasConforme,
  `2 m com 4 curvas: ${t4curvas.conforme}`,
  'medio',
)

const tNota = verificarTrecho({ comprimentoM: 24, curvas: 0 })
checar(
  'G30.3',
  '§6.2.11.1.6 b) NOTA',
  'Alternativa da NOTA: +1 tamanho de eletroduto por 6 m ou fração de excesso (exemplo da norma: 9 m → 2 degraus)',
  tNota.excessoM === 9 && tNota.degrausAlternativa === 2 && verificarTrecho({ comprimentoM: 16, curvas: 0 }).degrausAlternativa === 1,
  `24 m reto: excesso ${tNota.excessoM} m, ${tNota.degrausAlternativa} degraus; 16 m: ${verificarTrecho({ comprimentoM: 16, curvas: 0 }).degrausAlternativa}`,
  'medio',
)

const circuitoPercurso = calculoExemplo.dimensionados.find((c) => c.eletroduto)
const exemploPercurso = { ...exemplo, percursos: { [circuitoPercurso.id]: [{ id: 't1', comprimentoM: '14', curvas: '2', externo: false }] } }
const vereditoPercurso = calcularVeredito(exemploPercurso, { configInstalacao: cfgExemplo, ...calcularProjetoCompleto(exemploPercurso, cfgExemplo) })
checar(
  'G30.4',
  '§6.2.11.1.6 b)',
  'Trecho fora do limite (14 m com 2 curvas > 9 m) deixa o veredito vermelho, apontando o Dimensionamento',
  vereditoPercurso.estado === 'alerta' && vereditoPercurso.problemas.some((p) => /Percurso/.test(p.texto) && p.etapa === 'dimensionamento'),
  vereditoPercurso.problemas.map((p) => p.texto).join(' | '),
  'medio',
)

// Alimentador: 32 m externo com 1 curva (limite 27 m) passa do limite; 20 m interno reto passa.
const calcAlim = (trechos) => {
  const p = { ...exemplo, percursos: { alimentador: trechos } }
  const c = { configInstalacao: cfgExemplo, ...calcularProjetoCompleto(p, cfgExemplo) }
  return { percurso: c.protecaoGeral.percurso, veredito: calcularVeredito(p, c) }
}
const alimFora = calcAlim([{ id: 'a1', comprimentoM: '32', curvas: '1', externo: true }])
const alimOk = calcAlim([{ id: 'a1', comprimentoM: '14', curvas: '0', externo: false }])
checar(
  'G30.5',
  '§6.2.11.1.6 b)',
  'Percurso do alimentador (medidor → quadro) é verificado e entra no veredito',
  alimFora.percurso?.conforme === false &&
    alimFora.percurso.trechos[0].limiteM === 27 &&
    alimFora.veredito.problemas.some((p) => /Percurso.*alimentador/.test(p.texto)) &&
    alimOk.percurso?.conforme === true &&
    !alimOk.veredito.problemas.some((p) => /Percurso/.test(p.texto)),
  `32 m ext/1 curva: ${alimFora.percurso?.conforme} (limite ${alimFora.percurso?.trechos[0].limiteM}); 14 m int: ${alimOk.percurso?.conforme}`,
  'medio',
)

// ---------------------------------------------------------------------------
// G31 — Planta: medida pela escala e detecção automática (F9/F15, Sprint 9). Não é cálculo da
// norma: confere que um retângulo vira a área e o perímetro certos e que a detecção
// experimental separa dois cômodos ligados por uma porta numa planta sintética.
// ---------------------------------------------------------------------------
grupo('G31', 'Planta: escala e detecção de cômodos (§2 F9/F15 do PLANO)')

const medida = medirRetangulo({ w: 80, h: 60 }, 0.05)
checar(
  'G31.1',
  '—',
  'Retângulo de 80 × 60 px a 0,05 m/px = 4 × 3 m → 12 m² e 14 m de perímetro',
  Math.abs(medida.areaM2 - 12) < 1e-9 && Math.abs(medida.perimetroM - 14) < 1e-9,
  `${medida.areaM2} m², ${medida.perimetroM} m`,
  'medio',
)

const plantaSintetica = (() => {
  const width = 200
  const height = 120
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  const pinta = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3)
  }
  pinta(10, 10, 190, 11)
  pinta(10, 109, 190, 110)
  pinta(10, 10, 11, 110)
  pinta(189, 10, 190, 110)
  pinta(100, 10, 101, 49) // parede interna, com porta de 12 px (y 50-61)
  pinta(100, 62, 101, 110)
  return { width, height, data }
})()
const detectados = detectarComodos(plantaSintetica, { raioFechamentoPx: 7 })
const semFechar = detectarComodos(plantaSintetica, { raioFechamentoPx: 0 })
checar(
  'G31.2',
  '—',
  'Detecção: dois cômodos separados por parede com porta viram 2 retângulos exatos (face interna das paredes); sem fechar o vão da porta, não viram',
  detectados.length === 2 &&
    JSON.stringify(detectados.map(({ x, y, w, h }) => [x, y, w, h])) === JSON.stringify([[12, 12, 88, 97], [102, 12, 87, 97]]) &&
    semFechar.length !== 2,
  `com fechamento: ${JSON.stringify(detectados.map(({ x, y, w, h }) => [x, y, w, h]))}; sem: ${semFechar.length} região(ões)`,
  'medio',
)

// ---------------------------------------------------------------------------
// G32 — Fator de demanda por distribuidora, iluminação/tomadas (N18, fase de lacunas 29/09/2026).
// Informativo: nunca substitui o dimensionamento por NBR 5410 (soma total), só compara.
// ---------------------------------------------------------------------------
grupo('G32', 'Fator de demanda por distribuidora (N18, informativo — fonte externa à NBR 5410)')

// `aplicarAlternativa600VA: true` de propósito, fixado aqui: a casa-modelo tem mais de 6 pontos
// nos ambientes de 600 VA, e este grupo testa as TABELAS DE FATOR DE DEMANDA por distribuidora
// (não a alternativa do §9.5.2.2.2 a), já coberta em G34.10/G1.7) — declarar explicitamente
// preserva os 5,46 kW conferidos à mão que ancoram as oito sub-verificações abaixo, em vez de
// herdar o default (`false`, leitura base) e precisar reconferir cada tabela de FD para 6,46 kW.
const casaDist = { ...casaModelo(), aplicarAlternativa600VA: true }
const cfgDist = resolverConfigInstalacao(casaDist.tipoInstalacao, casaDist.tensaoFaseNeutro)
const comDistribuidora = (id) => calcularProjetoCompleto({ ...casaDist, distribuidoraId: id }, cfgDist)
const semDistribuidora = calcularProjetoCompleto(casaDist, cfgDist)

// Carga de iluminação+TUG da casa-modelo: 5.460 VA = 5,46 kW (conferido em previsaoDeCarga.js,
// G1, e reconferido aqui à mão contra o motor antes de fixar as tabelas abaixo).
checar(
  'G32.1',
  '—',
  'Sem distribuidora escolhida, demandaConcessionaria é null (nada muda no projeto por padrão)',
  semDistribuidora.demandaConcessionaria === null,
  `${semDistribuidora.demandaConcessionaria}`,
  'medio',
)

const cpfl = comDistribuidora('cpfl')
checar(
  'G32.2',
  '—',
  'CPFL: 5,46 kW de iluminação/tomadas cai na faixa "acima de 10 kW"? Não — cai em nenhuma faixa ≤10 (é >5, ≤6) → FD 0,45 → demanda 2,457 kW',
  cpfl.demandaConcessionaria.aplicavel &&
    Math.abs(cpfl.demandaConcessionaria.cargaInstaladaKw - 5.46) < 1e-9 &&
    cpfl.demandaConcessionaria.fatorDemanda === 0.45 &&
    Math.abs(cpfl.demandaConcessionaria.demandaKw - 2.457) < 1e-9,
  `carga ${cpfl.demandaConcessionaria.cargaInstaladaKw} kW × FD ${cpfl.demandaConcessionaria.fatorDemanda} = ${cpfl.demandaConcessionaria.demandaKw.toFixed(3)} kW`,
  'medio',
)

const edpSpD = comDistribuidora('edpSp')
const neoenergiaD = comDistribuidora('neoenergia')
checar(
  'G32.3',
  '—',
  'EDP SP e Neoenergia dão o mesmo resultado que a CPFL para a mesma carga (tabela idêntica, conferida contra 3 PDFs oficiais)',
  Math.abs(edpSpD.demandaConcessionaria.demandaKw - cpfl.demandaConcessionaria.demandaKw) < 1e-9 &&
    Math.abs(neoenergiaD.demandaConcessionaria.demandaKw - cpfl.demandaConcessionaria.demandaKw) < 1e-9,
  `EDP SP ${edpSpD.demandaConcessionaria.demandaKw.toFixed(3)}; Neoenergia ${neoenergiaD.demandaConcessionaria.demandaKw.toFixed(3)}; CPFL ${cpfl.demandaConcessionaria.demandaKw.toFixed(3)}`,
  'medio',
)

const cemigD = comDistribuidora('cemig')
checar(
  'G32.4',
  '—',
  'Cemig: mesma carga, tabela própria e diferente → FD 0,64 → demanda 3,4944 kW (não é a mesma da CPFL)',
  cemigD.demandaConcessionaria.fatorDemanda === 0.64 &&
    Math.abs(cemigD.demandaConcessionaria.demandaKw - 3.4944) < 1e-9,
  `FD ${cemigD.demandaConcessionaria.fatorDemanda}, demanda ${cemigD.demandaConcessionaria.demandaKw.toFixed(3)} kW`,
  'medio',
)

const celescD = comDistribuidora('celesc')
const edpEsD = comDistribuidora('edpEs')
checar(
  'G32.5',
  '—',
  'Celesc e EDP ES não reduzem carga residencial: FD=1, demanda = carga instalada cheia (5,46 kW)',
  celescD.demandaConcessionaria.semReducao &&
    celescD.demandaConcessionaria.fatorDemanda === 1 &&
    Math.abs(celescD.demandaConcessionaria.demandaKw - 5.46) < 1e-9 &&
    edpEsD.demandaConcessionaria.semReducao,
  `Celesc: ${JSON.stringify(celescD.demandaConcessionaria)}; EDP ES semReducao=${edpEsD.demandaConcessionaria.semReducao}`,
  'medio',
)

const enelD = comDistribuidora('enel')
checar(
  'G32.6',
  '—',
  'Enel não publica tabela própria: aplicavel=false, com o motivo explicado, não um valor chutado',
  enelD.demandaConcessionaria.aplicavel === false && /não publica tabela própria/.test(enelD.demandaConcessionaria.motivo),
  `${JSON.stringify(enelD.demandaConcessionaria)}`,
  'medio',
)

// Fora da faixa conferida (Light para de cobrir acima de 9 kW) — não pode inventar um valor.
const casaGrande = {
  ...casaDist,
  comodos: [...casaDist.comodos, { id: 'salao-extra', nome: 'Salão', tipo: 'social', area: 400, perimetro: 80 }],
  distribuidoraId: 'light',
}
const lightFora = calcularProjetoCompleto(casaGrande, cfgDist)
checar(
  'G32.7',
  '—',
  'Light: carga acima da faixa conferida da tabela (>9 kW) fica não aplicável, em vez de extrapolar um fator',
  lightFora.demandaConcessionaria.aplicavel === false && /faixa conferida/.test(lightFora.demandaConcessionaria.motivo),
  `${JSON.stringify(lightFora.demandaConcessionaria)}`,
  'baixo',
)

// Piso de Icn da Cemig no disjuntor geral: vale mesmo sem Icc nenhuma declarada (é exigência da
// distribuidora, não depende da Icc real do ponto) — nunca reduz o que já seria maior por outra via.
const semIcc = { ...casaDist, iccPresumidaA: '', distribuidoraId: 'cemig' }
const calcSemIcc = calcularProjetoCompleto(semIcc, cfgDist)
const matSemIcc = listarMateriais(semIcc, { configInstalacao: cfgDist, ...calcSemIcc }, {})
const matSemIccSemDist = listarMateriais(
  { ...casaDist, iccPresumidaA: '' },
  { configInstalacao: cfgDist, ...calcularProjetoCompleto({ ...casaDist, iccPresumidaA: '' }, cfgDist) },
  {},
)
checar(
  'G32.8',
  '§5.3.5.5.1 / N18',
  'Piso de Icn da Cemig no disjuntor geral (63 A → mínimo 5 kA) vale mesmo sem Icc declarada; sem distribuidora, continua null',
  matSemIcc.disjuntores[0].icnMinimoKA === 5 &&
    matSemIcc.disjuntores[0].icnPadronizadaKA === 6 &&
    matSemIccSemDist.disjuntores[0].icnMinimoKA === null,
  `com Cemig: ${JSON.stringify(matSemIcc.disjuntores[0])}; sem distribuidora: ${JSON.stringify(matSemIccSemDist.disjuntores[0])}`,
  'medio',
)

grupo('G33', '§9.1.2.1 — Volumes do banheiro pela planta (N19)')

// Régua de classificação com box DECLARADO (§9.1.2.1 b) — a partir da correção de 30/09/2026
// (ver G34.6/G34.7/G34.8): volume 1 é a própria projeção do box (não mais 0,6m além dela — essa
// folga só vale sem box, ver G33.3); volume 0 só no fundo do box (h=baseM, aqui 0); volume 2 é o
// anel de 0,6m além da borda do box, teto único de 3m; volume 3 é o anel seguinte (até 3,0m da
// borda), teto de 2,25m. A "tampa" entre o teto do volume 1 e 3m (diretamente acima do box) cai
// em vol.2 — simplificação conservadora documentada em locaisEspeciais.js.
const boxTeste = { wM: 0.9, hM: 0.9 }
checar(
  'G33.1',
  '§9.1.2.1',
  'Régua de distância/altura dos volumes 0-3, com box declarado (caixa 0,9×0,9 m)',
  classificarVolume({ xM: 0.4, yM: 0.4, alturaM: 0 }, boxTeste) === 0 &&
    classificarVolume({ xM: 0.4, yM: 0.4, alturaM: 1.2 }, boxTeste) === 1 &&
    classificarVolume({ xM: -0.3, yM: 0.4, alturaM: 1.2 }, boxTeste) === 2 &&
    classificarVolume({ xM: -2.0, yM: 0.4, alturaM: 2.0 }, boxTeste) === 3 &&
    classificarVolume({ xM: -4.0, yM: 0.4, alturaM: 1.0 }, boxTeste) === null,
  'd=0,h=0 (fundo do box)→vol.0 | d=0,h=1,2m (coluna acima do box)→vol.1 | d=0,3m,h=1,2m (fora do box, com box declarado)→vol.2 | d=2m,h=2m→vol.3 | d=4m→fora',
  'critico',
)

checar(
  'G33.2',
  '§9.1.2.1, nota 1 (Figura 18)',
  'A "tampa" do volume 2 (0 a 0,6m de distância, entre 2,25 e 3m de altura) é classificada como vol.2, não como fora dos volumes — leitura conservadora, nunca a mais permissiva',
  classificarVolume({ xM: -0.3, yM: 0.4, alturaM: 2.5 }, boxTeste) === 2 &&
    classificarVolume({ xM: -0.3, yM: 0.4, alturaM: 3.1 }, boxTeste) === null,
  `d=0,3m: h=2,5m→vol.${classificarVolume({ xM: -0.3, yM: 0.4, alturaM: 2.5 }, boxTeste)}, h=3,1m→${classificarVolume({ xM: -0.3, yM: 0.4, alturaM: 3.1 }, boxTeste)}`,
  'alto',
)

checar(
  'G33.3',
  '§9.1.2.1, Figura 18',
  'Caixa 0×0 (chuveiro sem piso-boxe): mesma fórmula de distância vira um círculo de raio 0,6m ao redor do chuveiro',
  classificarVolume({ xM: 0.6, yM: 0, alturaM: 1.0 }, { wM: 0, hM: 0 }) === 1 &&
    classificarVolume({ xM: 0.42, yM: 0.42, alturaM: 1.0 }, { wM: 0, hM: 0 }) === 1 &&
    classificarVolume({ xM: 0.7, yM: 0, alturaM: 1.0 }, { wM: 0, hM: 0 }) === 2,
  'd=0,6m (no eixo) e d=0,594m (na diagonal) → vol.1; d=0,7m → vol.2',
  'alto',
)

// §9.1.4.3.1 (proibição nos volumes 0-2) / §9.1.4.3.2 (tomada no vol.3) — a mesma régua de
// distância acima, agora com a regra por tipo de ponto. t1 fica em d=0 (coluna acima do box
// declarado) para cair genuinamente em vol.1, não no anel externo (vol.2) — ambos reprovam a
// tomada pela mesma cláusula, mas o teste deve testar o volume que declara testar.
const pontosTipos = verificarPontosBanheiro({
  boxLarguraM: 0.9,
  boxProfundidadeM: 0.9,
  pontos: [
    { id: 't1', tipo: 'tomada', nome: 'Tomada vol.1', xM: 0.4, yM: 0.4, alturaM: 1.2 },
    { id: 't2', tipo: 'tomada', nome: 'Tomada vol.3', xM: -2.0, yM: 0.4, alturaM: 2.0 },
  ],
})
checar(
  'G33.4',
  '§9.1.4.3.1 · §9.1.4.3.2',
  'Tomada no volume 1 é não conforme; a mesma tomada no volume 3 é conforme (DR ≤30mA já garantido)',
  pontosTipos.find((p) => p.id === 't1').conforme === false &&
    pontosTipos.find((p) => p.id === 't1').clausula === '§9.1.4.3.1' &&
    pontosTipos.find((p) => p.id === 't2').conforme === true &&
    pontosTipos.find((p) => p.id === 't2').clausula === '§9.1.4.3.2',
  pontosTipos.map((p) => `${p.nome}: vol.${p.volume}, ${p.conforme ? 'conforme' : 'não conforme'} (${p.clausula})`).join(' · '),
  'critico',
)

// §9.1.4.4 — só o aquecedor (não a tomada/interruptor/outro) é permitido nos volumes 1 e 2; nenhum
// equipamento desta lista é permitido no volume 0. a0/a1/l1 em d=0 (coluna acima do box, na altura
// que distingue vol.0 de vol.1); l2 no anel externo (vol.2), com box declarado.
const pontosAquecedor = verificarPontosBanheiro({
  boxLarguraM: 0.9,
  boxProfundidadeM: 0.9,
  pontos: [
    { id: 'a0', tipo: 'aquecedor', nome: 'Aquecedor vol.0', xM: 0.4, yM: 0.4, alturaM: 0 },
    { id: 'a1', tipo: 'aquecedor', nome: 'Aquecedor vol.1', xM: 0.4, yM: 0.4, alturaM: 1.2 },
    { id: 'l1', tipo: 'luminaria', nome: 'Luminária vol.1', xM: 0.4, yM: 0.4, alturaM: 1.2 },
    { id: 'l2', tipo: 'luminaria', nome: 'Luminária vol.2', xM: -0.3, yM: 0.4, alturaM: 2.8 },
  ],
})
checar(
  'G33.5',
  '§9.1.4.4',
  'Aquecedor: proibido no volume 0, permitido no volume 1 (classe I/II). Luminária: proibida no volume 1, só a partir do volume 2 (classe II)',
  pontosAquecedor.find((p) => p.id === 'a0').conforme === false &&
    pontosAquecedor.find((p) => p.id === 'a1').conforme === true &&
    pontosAquecedor.find((p) => p.id === 'l1').conforme === false &&
    pontosAquecedor.find((p) => p.id === 'l2').conforme === true,
  pontosAquecedor.map((p) => `${p.nome}: ${p.conforme ? 'conforme' : 'não conforme'}`).join(' · '),
  'alto',
)

checar(
  'G33.6',
  '—',
  'Ponto sem altura declarada (ainda não preenchida) não entra na lista verificada — não vira falso "conforme" nem "não conforme"',
  verificarPontosBanheiro({ boxLarguraM: 0.9, boxProfundidadeM: 0.9, pontos: [{ id: 'x', tipo: 'tomada', nome: 'Sem altura', xM: 0, yM: 0, alturaM: '' }] }).length === 0,
  'lista vazia com altura = ""',
  'medio',
)

// Integração ponta a ponta: casa-modelo com geometria marcada no banheiro — um ponto proibido
// (tomada no volume 1) e um permitido (interruptor no volume 3) — precisa aparecer em
// locaisEspeciais e no veredito, sem alterar nenhum outro número do projeto.
const casaComGeometria = casaModelo()
casaComGeometria.comodos = casaComGeometria.comodos.map((comodo) =>
  comodo.id === 'ex-banheiro'
    ? {
        ...comodo,
        geometriaBanheiro: {
          boxLarguraM: 0.9,
          boxProfundidadeM: 0.9,
          pontos: [
            { id: 'pg1', tipo: 'tomada', nome: 'Tomada da pia', xM: -0.3, yM: 0.4, alturaM: 1.2 },
            { id: 'pg2', tipo: 'interruptor', nome: 'Interruptor da porta', xM: -2.0, yM: 0.4, alturaM: 1.2 },
          ],
        },
      }
    : comodo,
)
const cfgComGeometria = resolverConfigInstalacao(casaComGeometria.tipoInstalacao, casaComGeometria.tensaoFaseNeutro)
const calcComGeometria = calcularProjetoCompleto(casaComGeometria, cfgComGeometria)
const veredictoComGeometria = calcularVeredito(casaComGeometria, calcComGeometria)
checar(
  'G33.7',
  '§9.1.2.1 / §9.1.4.3.1',
  'locaisEspeciais.pontosPorComodo e pontosNaoConformes refletem a geometria marcada; o veredito aponta o ponto não conforme',
  calcComGeometria.locaisEspeciais.pontosPorComodo.length === 1 &&
    calcComGeometria.locaisEspeciais.pontosPorComodo[0].pontos.length === 2 &&
    calcComGeometria.locaisEspeciais.pontosNaoConformes.length === 1 &&
    calcComGeometria.locaisEspeciais.pontosNaoConformes[0].id === 'pg1' &&
    veredictoComGeometria.problemas.some((p) => /ponto\(s\) elétrico\(s\).*banheiro/.test(p.texto)),
  `pontosNaoConformes=${JSON.stringify(calcComGeometria.locaisEspeciais.pontosNaoConformes.map((p) => p.id))}, problemas=${JSON.stringify(veredictoComGeometria.problemas.map((p) => p.texto))}`,
  'alto',
)

// Regressão: a mesma casa-modelo SEM geometria marcada (o caso comum hoje) continua sem nenhum
// ponto na lista — o recurso é aditivo, nunca muda o resultado de quem não usa.
const calcSemGeometria = calcularProjetoCompleto(casaModelo(), resolverConfigInstalacao('bifasica', 127))
checar(
  'G33.8',
  '—',
  'Sem geometriaBanheiro marcada, pontosPorComodo continua vazio (regressão do caso comum)',
  calcSemGeometria.locaisEspeciais.pontosPorComodo.length === 0 && calcSemGeometria.locaisEspeciais.pontosNaoConformes.length === 0,
  `pontosPorComodo=${calcSemGeometria.locaisEspeciais.pontosPorComodo.length}`,
  'medio',
)

// normalizarProjeto precisa sanitizar geometriaBanheiro vinda de fora (arquivo, link,
// armazenamento) com o mesmo rigor de `tue`: tipo desconhecido vira 'outro', ponto sem id ganha
// um, e um `pontos` que não é array vira lista vazia em vez de quebrar o cálculo.
const projetoBruto = {
  comodos: [
    {
      id: 'b1',
      tipo: 'banheiro',
      geometriaBanheiro: {
        boxLarguraM: '0.9',
        boxProfundidadeM: 0.9,
        pontos: [{ tipo: 'tipo-inexistente', xM: 0.1, yM: 0.2, alturaM: 1.2 }],
      },
    },
    { id: 'b2', tipo: 'banheiro', geometriaBanheiro: { pontos: 'não é uma lista' } },
  ],
}
const normalizado = normalizarProjeto(projetoBruto)
checar(
  'G33.9',
  '—',
  'normalizarProjeto sanitiza geometriaBanheiro vinda de fora: tipo inválido vira "outro", ponto ganha id, "pontos" não-array vira []',
  normalizado.comodos[0].geometriaBanheiro.pontos[0].tipo === 'outro' &&
    typeof normalizado.comodos[0].geometriaBanheiro.pontos[0].id === 'string' &&
    normalizado.comodos[0].geometriaBanheiro.pontos[0].id.length > 0 &&
    Array.isArray(normalizado.comodos[1].geometriaBanheiro.pontos) &&
    normalizado.comodos[1].geometriaBanheiro.pontos.length === 0,
  `b1.pontos[0]=${JSON.stringify(normalizado.comodos[0].geometriaBanheiro.pontos[0])}, b2.pontos=${JSON.stringify(normalizado.comodos[1].geometriaBanheiro.pontos)}`,
  'alto',
)

// ---------------------------------------------------------------------------
// G34 — Achados da auditoria adversarial de 30/09/2026
// Cada critério aqui nasceu FALHANDO de propósito: é uma divergência encontrada
// relendo a norma contra o código, não uma regressão. Ver
// QA/relatorios/2026-09-30-auditoria-adversarial.md.
// ---------------------------------------------------------------------------
grupo('G34', 'Auditoria adversarial 30/09 — detalhe fino da norma')

// A Tabela 48 impressa começa em 35 mm²; o §6.2.6.2.6 só autoriza neutro reduzido quando a fase
// é SUPERIOR a 25 mm². Uma linha de 25 mm² não existe na norma.
checar(
  'G34.1',
  '§6.2.6.2.6 / Tabela 48',
  'Tabela 48 transcrita sem linhas que a norma não tem (começa em 35 mm²)',
  TABELA_48_NEUTRO_REDUZIDO[0].secaoFase === 35,
  `primeira linha = ${JSON.stringify(TABELA_48_NEUTRO_REDUZIDO[0])}; a Tabela 48 impressa começa em 35 mm² → 25 mm². ` +
    'A linha de 25 é inerte (o early-return de obterSecaoNeutroReduzida a intercepta), mas é dado fabricado numa tabela declarada como transcrição',
  'baixo',
)

// §6.2.6.2.5 — acima de 33% de 3a harmônica o neutro pode precisar ser MAIOR que a fase. Corrigido
// em 30/09/2026: estado "acima-33" dedicado, e `dimensionarProtecaoGeral` propaga
// `avisoNeutroSuperior` até a UI (SecaoProtecaoGeral.jsx) em vez de ficar calado.
const pgHarmonicaAlta = dimensionarProtecaoGeral({
  ...correntesDeVA([6000, 6000, 6000], 127),
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 20,
  terceiraHarmonica: 'acima-33',
})
const pgHarmonicaMedia = dimensionarProtecaoGeral({
  ...correntesDeVA([6000, 6000, 6000], 127),
  numeroFases: 3,
  tensaoFaseNeutro: 127,
  comprimentoRamalM: 20,
  terceiraHarmonica: 'acima-15',
})
checar(
  'G34.2',
  '§6.2.6.2.5',
  'Taxa de 3a harmônica acima de 33% (neutro possivelmente MAIOR que a fase) é distinguível e avisada',
  Object.keys(TAXAS_TERCEIRA_HARMONICA).some((chave) => chave.includes('33')) &&
    pgHarmonicaAlta.avisoNeutroSuperior === true &&
    pgHarmonicaMedia.avisoNeutroSuperior === false &&
    pgHarmonicaAlta.condutorFase.neutroCarregado === true,
  `estados disponíveis: ${Object.keys(TAXAS_TERCEIRA_HARMONICA).join(', ')} — acima-33: avisoNeutroSuperior=${pgHarmonicaAlta.avisoNeutroSuperior}; acima-15: avisoNeutroSuperior=${pgHarmonicaMedia.avisoNeutroSuperior}`,
  'medio',
)

// Tabela 30, NOTA 1: "Outros valores de k ... ainda não estão normalizados: condutores de pequena
// seção (principalmente para seções inferiores a 10 mm²)". Todo circuito terminal residencial
// cai nessa faixa. Corrigido em 30/09/2026: `obterK` devolve `null` abaixo de 10 mm², e
// `verificarCurtoCircuito` propaga isso como "não verificado" — nunca conforme/não-conforme por
// acidente de `null * secaoMm2 === 0`.
const secoesForaDaFaixaK = [1.5, 2.5, 4, 6].filter((s) => obterK({ isolacao: 'pvc', secaoMm2: s }) !== null)
const ccSecaoPequena = verificarCurtoCircuito({ correnteDisjuntorA: 25, curvaDisjuntor: 'C', iccPresumidaA: 15000, secaoMm2: 2.5 })
checar(
  'G34.3',
  'Tabela 30, NOTA 1',
  'k abaixo de 10 mm² sinalizado como não normalizado, e o curto-circuito fica não verificado nessa faixa',
  secoesForaDaFaixaK.length === 0 && ccSecaoPequena.verificado === false && ccSecaoPequena.conforme === null,
  secoesForaDaFaixaK.length === 0
    ? `obterK devolve null para 1,5/2,5/4/6 mm²; verificarCurtoCircuito(2,5 mm², Icc=15000 A) → verificado=${ccSecaoPequena.verificado}`
    : `k ainda numérico para ${secoesForaDaFaixaK.join(', ')} mm² — a NOTA 1 da Tabela 30 diz que k não está normalizado abaixo de 10 mm²`,
  'medio',
)

// A Tabela 45 tem DUAS sub-tabelas: cabos multipolares (um cabo por eletroduto) e condutores
// isolados/unipolares (um circuito por eletroduto). Corrigido em 30/09/2026 para usar a segunda,
// que é a que combina com o condutor unipolar modelado no resto do pipeline do método D.
const FCA_D_CONDUTORES_ISOLADOS = { 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.6 }
const menosSeveros = Object.entries(FCA_D_CONDUTORES_ISOLADOS).filter(
  ([n, fator]) => obterFatorAgrupamento(Number(n), 'D') > fator,
)
checar(
  'G34.4',
  'Tabela 45',
  'Sub-tabela de condutores isolados/unipolares em eletroduto enterrado disponível',
  menosSeveros.length === 0,
  `${menosSeveros.length} faixas usam o fator de cabo multipolar onde condutores isolados pediriam um mais severo ` +
    `(ex.: 3 circuitos → ${obterFatorAgrupamento(3, 'D')} vs 0,70). O rótulo do método D diz "cabo multipolar", mas o resto da ` +
    'ferramenta (DIAMETRO_EXTERNO_CONDUTOR_MM, taxa de ocupação) modela condutor unipolar',
  'medio',
)

// Anexo C, Tabela C.2: UL = 50 V (situação 1), 25 V (situação 2) e 12 V (situação 3). A NOTA 2 da
// Tabela C.1 põe o volume 0 de banheiros e piscinas na situação 3.
checar(
  'G34.5',
  'Anexo C, Tabela C.2 / Tabela C.1 NOTA 2',
  'Tensão de contato limite cobre as três situações da norma',
  Object.values(TENSAO_CONTATO_LIMITE_V).includes(12),
  `transcrito: ${JSON.stringify(TENSAO_CONTATO_LIMITE_V)} — falta situação 3 (12 V), que a NOTA 2 da Tabela C.1 atribui ao ` +
    'volume 0 de banheiro/piscina. Pela própria regra citada em tensaoContatoLimite (menor UL entre massas no mesmo eletrodo), ' +
    'uma casa com banheiro deveria chegar a 12 V, não parar em 25 V — e a RA máxima admitida dobra com esse erro',
  'medio',
)

// §9.1.2.1 a) — volume 0 é o interior INUNDÁVEL da banheira/piso-boxe. Não é uma coluna infinita.
const boxRef = { wM: 0.9, hM: 0.9 }
const volumeAlto = classificarVolume({ xM: 0.45, yM: 0.45, alturaM: 2.9 }, boxRef)
checar(
  'G34.6',
  '§9.1.2.1 a)',
  'Volume 0 limitado em altura (não se estende indefinidamente acima do box)',
  volumeAlto !== 0,
  `ponto sobre o piso-boxe a 2,9 m de altura → volume ${volumeAlto}; volume 0 é o interior inundável, e acima de 2,25 m a norma ` +
    'já está no volume 2. Efeito: luminária alta sobre o box é reprovada como se exigisse SELV 12 V',
  'medio',
)

// §9.1.2.1 b) — os 0,6 m valem "na falta de uma clara delimitação do boxe". Com box declarado, o
// volume 1 é a superfície vertical que circunscreve o box.
const volumeJuntoAoBox = classificarVolume({ xM: 0.45, yM: 1.2, alturaM: 1.0 }, boxRef)
checar(
  'G34.7',
  '§9.1.2.1 b)',
  'Com box declarado, volume 1 não é estendido 0,6 m além da borda',
  volumeJuntoAoBox !== 1,
  `ponto a 0,3 m da borda de um piso-boxe 0,9x0,9 declarado → volume ${volumeJuntoAoBox}; os 0,6 m do §9.1.2.1 b) são a ` +
    'alternativa para chuveiro SEM delimitação. Como o volume 1 já sai 0,6 m maior, os volumes 2 e 3 saem junto: a borda ' +
    'externa do volume 3 fica a 3,6 m em vez dos 0,6+2,40 = 3,0 m da norma',
  'medio',
)

// §9.1.2.1 — o plano de 2,25 m do volume 1 é medido a partir do FUNDO da banheira/piso do boxe;
// os planos dos volumes 2 (3 m) e 3 (2,25 m) são medidos a partir do PISO do banheiro. Corrigido
// em 30/09/2026 com `box.baseM` (UI: "Altura da base acima do piso" em VolumesBanheiro.jsx) — só
// desloca o teto do volume 1, nunca os dos volumes 2/3.
const boxElevado = { wM: 0.9, hM: 0.9, baseM: 0.5 }
checar(
  'G34.8',
  '§9.1.2.1 b), c), d)',
  'Altura do volume 1 referida ao fundo do box (baseM), não ao piso do banheiro como nos volumes 2 e 3',
  classificarVolume({ xM: 0.45, yM: 0.45, alturaM: 0.5 }, boxElevado) === 0 &&
    classificarVolume({ xM: 0.45, yM: 0.45, alturaM: 2.7 }, boxElevado) === 1 &&
    classificarVolume({ xM: 0.45, yM: 0.45, alturaM: 2.8 }, boxElevado) === 2 &&
    classificarVolume({ xM: 0.45, yM: 1.2, alturaM: 2.8 }, boxElevado) === 2,
  'banheira elevada 0,5 m: fundo (h=0,5)→vol.0 | h=2,7 (=0,5+2,2, ainda no teto 0,5+2,25=2,75)→vol.1 | ' +
    'h=2,8 (acima do teto do volume 1, mas ≤3 do piso)→vol.2 | mesmo h=2,8 no anel externo (d=0,3, teto de vol.2 é 3 do piso, não afetado por baseM)→vol.2',
  'medio',
)

// §9.5.2.2.1 c) — "em varandas, deve ser previsto pelo menos um ponto de tomada". Ponto. A regra
// de 1 ponto por 5 m é a alínea e), dos "demais cômodos" — tipos diferentes desde 30/09/2026
// (`varanda` vs `outro`), antes fundidos num único "Varanda / Outro" que aplicava a regra de
// `outro` à varanda.
const varandaGrande = calcularQuantidadeTugMinima({ tipo: 'varanda', area: 12, perimetro: 16 })
const outroGrande = calcularQuantidadeTugMinima({ tipo: 'outro', area: 12, perimetro: 16 })
checar(
  'G34.9',
  '§9.5.2.2.1 c) vs e)',
  'Varanda tem regra própria (1 ponto), separada da regra dos "demais cômodos" (1 por 5 m)',
  varandaGrande === 1 && outroGrande === 4,
  `varanda de 12 m² com 16 m de perímetro → ${varandaGrande} ponto(s) (tipo "varanda", alínea c); ` +
    `o mesmo cômodo como "outro" (alínea e) → ${outroGrande} pontos — tipos agora distintos`,
  'baixo',
)

// §9.5.2.2.2 a) — a regra dos 2 pontos acima de 6 tomadas é introduzida por "admite-se": é uma
// alternativa permissiva, não a regra base. Corrigido em 30/09/2026: opt-in explícito
// (`projeto.aplicarAlternativa600VA`, default `false`) — sem declarar, a leitura é sempre a base
// (3 pontos), mesmo com mais de 6 tomadas nos ambientes de 600 VA; só com a declaração explícita
// a alternativa entra em ação.
const casaSeisMais = [
  { id: 'a', nome: 'Cozinha', tipo: 'servico', area: 12, perimetro: 14, tue: [] },
  { id: 'b', nome: 'Area de servico', tipo: 'servico', area: 6, perimetro: 10, tue: [] },
  { id: 'c', nome: 'Banheiro', tipo: 'banheiro', area: 4, perimetro: 8, tue: [] },
]
const tugSemDeclarar = calcularPrevisaoDeCarga(casaSeisMais).totais.tugVA
const tugComDeclarar = calcularPrevisaoDeCarga(casaSeisMais, true).totais.tugVA
const tugEstrito = casaSeisMais.reduce((total, comodo) => total + calcularTugMinima(comodo, 3).totalVA, 0)
const tugPermissivo = casaSeisMais.reduce((total, comodo) => total + calcularTugMinima(comodo, 2).totalVA, 0)
checar(
  'G34.10',
  '§9.5.2.2.2 a)',
  'Alternativa permissiva dos 2 pontos só entra em ação com `aplicarAlternativa600VA` declarado — nunca por padrão',
  tugSemDeclarar === tugEstrito && tugComDeclarar === tugPermissivo && tugComDeclarar < tugSemDeclarar,
  `sem declarar: ${tugSemDeclarar} VA (leitura base, ${tugEstrito} VA esperado); com aplicarAlternativa600VA=true: ${tugComDeclarar} VA ` +
    `(leitura permissiva, ${tugPermissivo} VA esperado) — ${tugEstrito - tugPermissivo} VA de diferença, só quando declarado`,
  'medio',
)

// A dupla digitação independente (TABELA_36_REFERENCIA/TABELA_37_REFERENCIA) é a defesa contra
// erro de transcrição. Corrigido em 30/09/2026: estendida de B1/B2/C para as 6 colunas de método
// (A1/A2/B1/B2/C/D) × 2 tabelas (36 PVC, 37 EPR/XLPE) = 288 células, todas reconferidas contra uma
// extração independente do PDF (ver ANCORAS_COLUNA, G2.1/G2.7).
const semGuarda = Object.keys(METODOS_INSTALACAO).filter(
  (m) => !ANCORAS_COLUNA.some(([metodo]) => metodo === m),
)
checar(
  'G34.11',
  '— (cobertura do próprio harness)',
  'Todo método selecionável tem dupla digitação independente, nas duas tabelas de ampacidade',
  semGuarda.length === 0 &&
    ANCORAS_COLUNA.length === 12 &&
    Object.keys(TABELA_36_REFERENCIA).length === 12 &&
    Object.keys(TABELA_37_REFERENCIA).length === 12,
  semGuarda.length === 0
    ? `${ANCORAS_COLUNA.length} colunas × 12 seções × 2 tabelas = 288 células com dupla digitação (métodos: ${Object.keys(METODOS_INSTALACAO).join(', ')})`
    : `${semGuarda.join(', ')} ainda sem dupla digitação`,
  'medio',
)

// ---------------------------------------------------------------------------
// G35 — Auditoria independente (nov/2026): queda fasorial do alimentador e Icc com neutro reduzido
// ---------------------------------------------------------------------------
grupo('G35', 'Auditoria independente — queda fasorial do alimentador e Icc com neutro reduzido')

// Referência INDEPENDENTE (não importa nenhuma função de queda/Icc do motor; só os dados de
// condutividade e reatância por seção). Aritmética complexa própria, resolvendo a malha
// fase-neutro de cada fase por KVL: V_carga = V_fonte − Zf·I_i − Zn·ΣI.
const cx = (re, im = 0) => ({ re, im })
const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const cadd = (a, b) => cx(a.re + b.re, a.im + b.im)
const csub = (a, b) => cx(a.re - b.re, a.im - b.im)
const cabs = (a) => Math.hypot(a.re, a.im)
const reatOhmKm = (secao) => TABELA_REATANCIA_OHM_KM_POR_MM2.find((l) => l.secao === secao).reatanciaOhmKm
const zPorMetro = (secao, sigma = 46.8) => cx(1 / (sigma * secao), reatOhmKm(secao) / 1000)
function refQuedaPiorFase({ correntes, V, L, sFase, sNeutro }) {
  const zf = cmul(zPorMetro(sFase), cx(L))
  const zn = cmul(zPorMetro(sNeutro), cx(L))
  const soma = correntes.reduce(cadd, cx(0))
  return Math.max(
    ...correntes.map((i, k) => {
      const ang = ([0, -120, 120][k] * Math.PI) / 180
      const vc = csub(csub(cx(V * Math.cos(ang), V * Math.sin(ang)), cmul(zf, i)), cmul(zn, soma))
      return ((V - cabs(vc)) / V) * 100
    }),
  )
}
const polar = (mod, graus) => cx(mod * Math.cos((graus * Math.PI) / 180), mod * Math.sin((graus * Math.PI) / 180))
const faseA = [{ potenciaVA: 7620, cosPhi: 0.8, tipoCarga: 'indutiva', fases: [1] }]
const vetA = calcularCorrentesVetoriais(faseA, 3, 127)

// Problema A — resolução manual: Z = 0,042735 + j0,006 Ω por condutor (L=50 m, 25 mm²); I_A = 48 − j36 A;
// ΔV = (Zf+Zn)·I = 4,5346 − j2,5009 V; |V_carga| = 122,4906 V → 3,55%.
const quedaA1 = calcularQuedaAlimentadorFasorial({ fasores: vetA.fasoresFaseA, tensaoFaseNeutroV: 127, comprimentoM: 50, secaoFaseMm2: 25, secaoNeutroMm2: 25 })
const quedaA1Velha = calcularQuedaPercentual({ comprimentoM: 50, correnteA: 60, secaoMm2: 25, tensaoV: 127, cosPhi: 1, tipoCarga: 'resistiva', circuitoTrifasico: true })
checar(
  'G35.1',
  '§6.2.7.1 c) / Problema A',
  'Queda do alimentador trifásico com toda a carga numa fase (cosφ 0,8) bate com o cálculo manual (3,55%), não com a fórmula equilibrada (2,02%)',
  quase(quedaA1, 3.5507, 0.02) &&
    quase(quedaA1, refQuedaPiorFase({ correntes: [polar(60, -36.8699), cx(0), cx(0)], V: 127, L: 50, sFase: 25, sNeutro: 25 }), 0.001) &&
    quedaA1Velha < 2.1,
  `fasorial ${quedaA1.toFixed(4)}% (manual 3,5507%); fórmula antiga (cosφ=1, equilibrado) ${quedaA1Velha.toFixed(4)}% → subestimava ${((1 - quedaA1Velha / quedaA1) * 100).toFixed(0)}%`,
  'critico',
)

// Carga equilibrada: o neutro não pesa e o resultado coincide com Z·I por fase (manual: 1,782%).
const vetEq = calcularCorrentesVetoriais([1, 2, 3].map((f) => ({ potenciaVA: 7620, cosPhi: 0.8, tipoCarga: 'indutiva', fases: [f] })), 3, 127)
const quedaEq = calcularQuedaAlimentadorFasorial({ fasores: vetEq.fasoresFaseA, tensaoFaseNeutroV: 127, comprimentoM: 50, secaoFaseMm2: 25, secaoNeutroMm2: 16 })
checar(
  'G35.2',
  '§6.2.7.1 c)',
  'Carga equilibrada: o neutro (mesmo reduzido) não altera a queda — 1,78% manual; a aproximação R·cosφ+X·senφ (1,786%) fica dentro de 0,02',
  quase(quedaEq, 1.782, 0.01) &&
    quase(quedaEq, calcularQuedaPercentual({ comprimentoM: 50, correnteA: 60, secaoMm2: 25, tensaoV: 127, cosPhi: 0.8, tipoCarga: 'indutiva', circuitoTrifasico: true }), 0.02),
  `fasorial ${quedaEq.toFixed(4)}%`,
  'alto',
)

// Distribuição diferente entre as fases + neutro reduzido: comparação com a referência independente.
const cargasDesig = [
  { potenciaVA: 9000, cosPhi: 0.9, tipoCarga: 'indutiva', fases: [1] },
  { potenciaVA: 3000, cosPhi: 1, tipoCarga: 'resistiva', fases: [2] },
  { potenciaVA: 1000, cosPhi: 0.7, tipoCarga: 'capacitiva', fases: [3] },
]
const vetDesig = calcularCorrentesVetoriais(cargasDesig, 3, 127)
const correntesDesig = vetDesig.fasoresFaseA.map((f) => cx(f.re, f.im))
const quedaDesig = calcularQuedaAlimentadorFasorial({ fasores: vetDesig.fasoresFaseA, tensaoFaseNeutroV: 127, comprimentoM: 35, secaoFaseMm2: 35, secaoNeutroMm2: 16 })
const quedaDesigRef = refQuedaPiorFase({ correntes: correntesDesig, V: 127, L: 35, sFase: 35, sNeutro: 16 })
const quedaDesigNeutroIgual = calcularQuedaAlimentadorFasorial({ fasores: vetDesig.fasoresFaseA, tensaoFaseNeutroV: 127, comprimentoM: 35, secaoFaseMm2: 35, secaoNeutroMm2: 35 })
checar(
  'G35.3',
  '§6.2.7.1 c)',
  'Carga desequilibrada (A 9 kVA cosφ 0,9 ind., B 3 kVA, C 1 kVA cosφ 0,7 cap.), neutro 16 mm²: coincide com a referência independente; neutro mais fino piora a queda',
  quase(quedaDesig, quedaDesigRef, 1e-9) && quedaDesig > quedaDesigNeutroIgual,
  `motor ${quedaDesig.toFixed(5)}% · referência ${quedaDesigRef.toFixed(5)}% · com neutro 35 mm²: ${quedaDesigNeutroIgual.toFixed(5)}%`,
  'alto',
)

// Entrada inválida/ausente: sem seção, tensão ou fasores, nunca devolve 0 (que aprovaria tudo).
checar(
  'G35.4',
  '— (robustez de entrada)',
  'Queda fasorial sem seção, sem tensão ou sem fasores retorna null (não verificado), nunca 0',
  calcularQuedaAlimentadorFasorial({ fasores: vetA.fasoresFaseA, tensaoFaseNeutroV: 127, comprimentoM: 50, secaoFaseMm2: null, secaoNeutroMm2: 25 }) === null &&
    calcularQuedaAlimentadorFasorial({ fasores: [], tensaoFaseNeutroV: 127, comprimentoM: 50, secaoFaseMm2: 25, secaoNeutroMm2: 25 }) === null &&
    calcularQuedaAlimentadorFasorial({ fasores: vetA.fasoresFaseA, tensaoFaseNeutroV: 0, comprimentoM: 50, secaoFaseMm2: 25, secaoNeutroMm2: 25 }) === null,
  'três entradas incompletas → null',
  'alto',
)

// Integração: a seção do alimentador é escolhida com a queda fasorial; o resultado reportado bate
// com a referência na seção adotada, e a seção imediatamente menor reprova (por queda ou ampacidade).
const pgDesig = dimensionarProtecaoGeral({ ...vetDesig, numeroFases: 3, tensaoFaseNeutro: 127, comprimentoRamalM: 60 })
const sAdotada = pgDesig.condutorFase.secaoMm2
const linhasTrilha = pgDesig.condutorFase.trilha
const anterior = linhasTrilha[linhasTrilha.findIndex((l) => l.secao === sAdotada) - 1]
const refAdotada = refQuedaPiorFase({ correntes: correntesDesig, V: 127, L: 60, sFase: sAdotada, sNeutro: sAdotada })
const refAnterior = anterior ? refQuedaPiorFase({ correntes: correntesDesig, V: 127, L: 60, sFase: anterior.secao, sNeutro: anterior.secao }) : null
checar(
  'G35.5',
  '§6.2.7.1 c) / §6.2.5',
  'dimensionarProtecaoGeral escolhe a menor seção que cumpre ampacidade E queda fasorial (≤5%), e reporta a queda fasorial',
  pgDesig.condutorFase.quedaFasorial === true &&
    quase(pgDesig.condutorFase.quedaPercentual, refAdotada, 1e-9) &&
    refAdotada <= 5 &&
    (!anterior || !anterior.atendeAmpacidade || refAnterior > 5),
  `adotada ${sAdotada} mm² (${refAdotada.toFixed(3)}%); anterior ${anterior?.secao ?? '—'} mm²: ampacidade ${anterior?.atendeAmpacidade}, queda ${refAnterior?.toFixed(3) ?? '—'}%`,
  'critico',
)

// Problema B — Icc fase-neutro com neutro reduzido. Manual (V=127, Icc fonte 3000 A, 50/25 mm², L=30 m):
//   fonte X = 127/3000 = 0,042333 Ω; R = 30/46,8·(1/50+1/25) = 0,038462 Ω; X = 30·(0,11+0,12)/1000 = 0,0069 Ω
//   Z = √(0,038462² + 0,049233²) = 0,062474 Ω → Icc = 2032,8 A (retorno na seção da fase, 50 mm²: 2298,9 A, +13%).
const w15 = calcularCorrentesVetoriais([1, 2, 3].map((f) => ({ potenciaVA: 15000, cosPhi: 1, tipoCarga: 'resistiva', fases: [f] })), 3, 127)
const pgB = (L) =>
  dimensionarProtecaoGeral({ ...w15, numeroFases: 3, tensaoFaseNeutro: 127, comprimentoRamalM: L, neutroReduzidoDeclarado: true, terceiraHarmonica: 'ate-15', iccPresumidaA: 3000, iccFaseNeutroA: 3000 })
const b30 = pgB(30)
checar(
  'G35.6',
  '§5.3.5.1 / Problema B',
  'Icc mínima fase-neutro do alimentador usa a seção REAL do neutro reduzido (50/25 mm², 30 m): 2032,8 A, não 2298,9 A',
  b30.condutorFase.secaoMm2 === 50 && b30.secaoNeutroMm2 === 25 && quase(b30.iccQuadroMinA, 2032.8, 0.5) && quase(b30.iccQuadroA, 2298.9, 0.5),
  `fase ${b30.condutorFase.secaoMm2} mm², neutro ${b30.secaoNeutroMm2} mm²; Icc mín (retorno real) ${b30.iccQuadroMinA?.toFixed(1)} A; Icc máx (retorno na fase, p/ I²t) ${b30.iccQuadroA?.toFixed(1)} A`,
  'critico',
)

// Fronteira de atuação: disjuntor geral 125 A curva C → instantâneo ≥ 10·In = 1250 A. Em 90 m a Icc com
// retorno na fase seria 1284 A (> 1250, aprovaria); com o neutro real é 966 A (< 1250) → NÃO VERIFICADO.
const b90 = pgB(90)
checar(
  'G35.7',
  '§6.3.4.3.2 a)',
  'Alimentador 50/25 mm² a 90 m: Icc mínima real (966 A) < disparo instantâneo (1250 A) — não pode aparecer como verificado/conforme',
  quase(b90.iccQuadroMinA, 966, 1) && quase(b90.iccQuadroA, 1284, 1) && b90.curtoCircuito.verificado === false && b90.curtoCircuito.conforme !== true,
  `Icc mín ${b90.iccQuadroMinA?.toFixed(0)} A vs limiar ${b90.curtoCircuito.limiarInstantaneoA} A → verificado=${b90.curtoCircuito.verificado}, conforme=${b90.curtoCircuito.conforme} (antes da correção: Icc ${b90.iccQuadroA?.toFixed(0)} A, aprovado)`,
  'critico',
)

// Neutro NÃO reduzido: as duas Icc coincidem (a correção não altera o caso comum).
const bSem = dimensionarProtecaoGeral({ ...w15, numeroFases: 3, tensaoFaseNeutro: 127, comprimentoRamalM: 30, iccPresumidaA: 3000, iccFaseNeutroA: 3000 })
checar(
  'G35.8',
  '§5.3.5.1',
  'Sem neutro reduzido, a Icc mínima e a de referência para I²t são iguais (regressão: caso comum inalterado)',
  bSem.neutroReduzido === false && quase(bSem.iccQuadroMinA, bSem.iccQuadroA, 1e-9),
  `${bSem.iccQuadroMinA?.toFixed(1)} A = ${bSem.iccQuadroA?.toFixed(1)} A`,
  'medio',
)

// Curto fase-fase continua nos condutores de FASE (não passa pelo neutro): referência independente.
const zLacoRef = (L, s) => cx((2 * L) / (46.8 * s), (2 * L * reatOhmKm(s)) / 1000)
const zFF = Math.hypot(zLacoRef(30, 50).re, zLacoRef(30, 50).im + 127 / (3000 / 2))
const iccFFRef = (127 * Math.sqrt(3)) / zFF
const iccFF = propagarIccFaseFase({ tensaoFaseNeutroV: 127, iccFonteA: 3000, trechos: [{ comprimentoM: 30, secaoMm2: 50, isolacao: 'pvc' }] })
checar(
  'G35.9',
  '§5.3.5.1',
  'Icc fase-fase do alimentador 50 mm² / 30 m coincide com a referência independente (laço pelas 2 fases, sem neutro)',
  quase(iccFF, iccFFRef, 0.01),
  `motor ${iccFF?.toFixed(2)} A · referência ${iccFFRef.toFixed(2)} A`,
  'alto',
)

// Integração ponta a ponta: projeto trifásico com neutro reduzido (70/35 mm²). A Icc na ponta de um
// circuito terminal fase-neutro deve usar o neutro do alimentador (35) no trecho do ramal.
{
  const tueForno = (id) => ({ id, nome: `Forno ${id}`, quantidade: 1, potenciaW: 9000, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 })
  const comodosG35 = [{ id: 'g', nome: 'Galpão', tipo: 'outro', area: 20, perimetro: 18, tue: ['a', 'b', 'c', 'd', 'e', 'f'].map(tueForno) }]
  const projG35 = {
    tipoInstalacao: 'trifasica',
    tensaoFaseNeutro: 127,
    comodos: comodosG35,
    comprimentoRamalEntrada: 40,
    iccPresumidaA: 3000,
    curvaDisjuntorGeral: 'C',
    neutroReduzidoDeclarado: true,
    terceiraHarmonica: 'ate-15',
  }
  projG35.comprimentos = Object.fromEntries(gerarCircuitos(comodosG35, cfgTri).map((c) => [c.id, 10]))
  const rG35 = calcularProjetoCompleto(projG35, cfgTri)
  const pg35 = rG35.protecaoGeral
  const ilum = rG35.dimensionados.find((c) => c.id === 'iluminacao-g')
  const sF = pg35.condutorFase.secaoMm2
  const sN = pg35.secaoNeutroMm2
  const zRamal = cx((40 / 46.8) * (1 / sF + 1 / sN), (40 * (reatOhmKm(sF) + reatOhmKm(sN))) / 1000)
  const zTerm = zLacoRef(10, ilum.secaoMm2)
  const iccPontaRef = 127 / Math.hypot(zRamal.re + zTerm.re, zRamal.im + zTerm.im + 127 / 3000)
  checar(
    'G35.10',
    '§5.3.5.1 / Problema B',
    'Projeto completo, neutro 70/35 mm²: Icc na ponta do circuito terminal fase-neutro bate com a referência independente (neutro real do ramal)',
    sF === 70 && sN === 35 && quase(ilum.iccPontaA, iccPontaRef, 0.01),
    `fase ${sF}/neutro ${sN} mm²; ponta ${ilum.iccPontaA?.toFixed(2)} A · referência ${iccPontaRef.toFixed(2)} A`,
    'critico',
  )
}

// ===========================================================================
// G36–G45 — AUDITORIA INDEPENDENTE (nov/2026)
//
// Regra destes grupos: o valor esperado NUNCA sai do motor. Vem de (a) cálculo manual mostrado no
// comentário, (b) a transcrição das tabelas feita por extração de coordenadas do PDF
// (QA/referencias/pdf-tabelas-36-37.json, gerada à parte), ou (c) uma implementação própria,
// escrita aqui, que não importa nenhuma função de cálculo do motor.
// ===========================================================================
import { readFileSync as lerArquivoG36 } from 'node:fs'
import {
  calcularPotenciaAparenteVA as potenciaAparenteG36,
  calcularIluminacaoMinimaVA as iluminacaoG36,
  calcularQuantidadeTugMinima as tugQuantidadeG36,
  calcularPrevisaoDeCarga as previsaoG36,
} from '../../frontend/src/calculations/previsaoDeCarga.js'
import { avaliarEntradas as avaliarEntradasG36 } from '../../frontend/src/calculations/veredito.js'
import { dimensionarCondutorNeutroGeral as neutroGeralG36 } from '../../frontend/src/calculations/protecaoGeral.js'
import { verificarSeccionamentoTN, verificarSeccionamentoTT } from '../../frontend/src/calculations/seccionamento.js'
import { ESTADO_INICIAL as ESTADO_G36 } from '../../frontend/src/projetos/estado.js'

const NBR_PDF = JSON.parse(lerArquivoG36(new URL('../referencias/pdf-tabelas-36-37.json', import.meta.url), 'utf8'))
const chavePdf = (secao) => String(secao).replace('.', ',')
const SECOES_G36 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]
const COLUNA_G36 = { A1: 0, A2: 2, B1: 4, B2: 6, C: 8, D: 10 }
// Ampacidade bruta direto da transcrição do PDF: método, nº de condutores carregados (2|3), isolação.
const ampacidadePdf = (isolacao, metodo, carregados, secao) =>
  NBR_PDF[isolacao === 'epr' ? 'tabela37' : 'tabela36'].cobre[chavePdf(secao)][COLUNA_G36[metodo] + (carregados === 3 ? 1 : 0)]

// ---------------------------------------------------------------------------
// G36 — Tabelas 36 e 37 contra a extração por coordenadas do PDF
// ---------------------------------------------------------------------------
grupo('G36', 'Tabelas 36/37 conferidas contra a extração do PDF por coordenadas (3ª fonte independente)')

{
  let celulas = 0
  const divergencias = []
  for (const [nome, tabela] of [['tabela36', TABELA_36_COBRE_PVC], ['tabela37', TABELA_37_COBRE_EPR]]) {
    for (const linha of tabela) {
      const pdf = NBR_PDF[nome].cobre[chavePdf(linha[0])]
      linha.slice(1).forEach((valor, i) => {
        celulas += 1
        if (valor !== pdf[i]) divergencias.push(`${nome} ${linha[0]} mm² col ${i + 1}: código ${valor} × PDF ${pdf[i]}`)
      })
    }
  }
  checar(
    'G36.1',
    'Tabelas 36 e 37',
    'As 288 células de cobre (12 seções × 12 colunas × 2 tabelas) são idênticas às lidas do PDF por posição (x,y) das palavras',
    celulas === 288 && divergencias.length === 0,
    `${celulas} células comparadas; ${divergencias.length ? divergencias.slice(0, 3).join('; ') : 'nenhuma divergência'} (páginas ${NBR_PDF.tabela36.pagina} e ${NBR_PDF.tabela37.pagina} do PDF)`,
    'critico',
  )

  // Tabelas 40, 42, 45, 46, 47, 48, 58 e 30 transcritas à mão do PDF (leitura por coordenadas, 11/2026).
  const fct = { 10: [1.22, 1.15, 1.1, 1.07], 15: [1.17, 1.12, 1.05, 1.04], 20: [1.12, 1.08, 1, 1], 25: [1.06, 1.04, 0.95, 0.96], 30: [1, 1, 0.89, 0.93], 35: [0.94, 0.96, 0.84, 0.89], 40: [0.87, 0.91, 0.77, 0.85], 45: [0.79, 0.87, 0.71, 0.8], 50: [0.71, 0.82, 0.63, 0.76], 55: [0.61, 0.76, 0.55, 0.71], 60: [0.5, 0.71, 0.45, 0.65], 65: [null, 0.65, null, 0.6], 70: [null, 0.58, null, 0.53], 75: [null, 0.5, null, 0.46], 80: [null, 0.41, null, 0.38] }
  const errosFct = []
  for (const [t, [arPvc, arEpr, soloPvc, soloEpr]] of Object.entries(fct)) {
    const esperado = { 'pvc/ar': arPvc, 'epr/ar': arEpr, 'pvc/solo': soloPvc, 'epr/solo': soloEpr }
    for (const [chave, v] of Object.entries(esperado)) {
      const [iso, amb] = chave.split('/')
      const obtido = obterFatorTemperatura(Number(t), { isolacao: iso, enterrado: amb === 'solo' })
      if (obtido !== v) errosFct.push(`${t}°C ${chave}: ${obtido} × ${v}`)
    }
  }
  checar(
    'G36.2',
    'Tabela 40',
    'Fatores de temperatura (15 temperaturas × PVC/EPR × ar/solo = 60 valores) idênticos à tabela do PDF, inclusive as faixas sem valor (PVC acima de 60 °C → null)',
    errosFct.length === 0,
    errosFct.length ? errosFct.slice(0, 4).join('; ') : '60 valores conferidos',
    'critico',
  )

  const fca1 = [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.57], [7, 0.54], [8, 0.52], [9, 0.5], [11, 0.5], [12, 0.45], [15, 0.45], [16, 0.41], [19, 0.41], [20, 0.38], [60, 0.38]]
  const fca2 = [[1, 1], [2, 0.85], [3, 0.79], [4, 0.75], [5, 0.73], [6, 0.72], [7, 0.72], [8, 0.71], [9, 0.7], [11, 0.7]]
  const fca45 = [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.6]]
  const errosFca = [
    ...fca1.filter(([n, f]) => obterFatorAgrupamento(n, 'B1') !== f).map(([n, f]) => `Tab.42 ref.1 n=${n}: ${obterFatorAgrupamento(n, 'B1')} × ${f}`),
    ...fca2.filter(([n, f]) => obterFatorAgrupamento(n, 'C') !== f).map(([n, f]) => `Tab.42 ref.2 n=${n}: ${obterFatorAgrupamento(n, 'C')} × ${f}`),
    ...fca45.filter(([n, f]) => obterFatorAgrupamento(n, 'D') !== f).map(([n, f]) => `Tab.45 n=${n}: ${obterFatorAgrupamento(n, 'D')} × ${f}`),
  ]
  checar(
    'G36.3',
    'Tabelas 42 (ref. 1 e 2) e 45',
    'Fatores de agrupamento idênticos ao PDF; onde a tabela não tem valor (ref. 2 acima de 11 circuitos; Tabela 45 acima de 6) o motor devolve null',
    errosFca.length === 0 && obterFatorAgrupamento(12, 'C') === null && obterFatorAgrupamento(7, 'D') === null,
    errosFca.length ? errosFca.slice(0, 4).join('; ') : `${fca1.length + fca2.length + fca45.length} pontos conferidos; C(12)=${obterFatorAgrupamento(12, 'C')}, D(7)=${obterFatorAgrupamento(7, 'D')}`,
    'alto',
  )

  const t48 = [[35, 25], [50, 25], [70, 35], [95, 50], [120, 70]]
  const pe58 = [[1.5, 1.5], [2.5, 2.5], [4, 4], [6, 6], [10, 10], [16, 16], [25, 16], [35, 16], [50, 25], [70, 35], [95, 50]]
  const errosNeutroPe = [
    ...t48.filter(([f, n]) => obterSecaoNeutroReduzida(f) !== n).map(([f, n]) => `Tab.48 ${f}: ${obterSecaoNeutroReduzida(f)} × ${n}`),
    ...[1.5, 6, 16, 25].filter((f) => obterSecaoNeutroReduzida(f) !== f).map((f) => `Tab.48 S≤25 (${f}) deveria manter ${f}`),
    ...pe58.filter(([f, p]) => calcularSecaoTerra(f) !== p).map(([f, p]) => `Tab.58 ${f}: ${calcularSecaoTerra(f)} × ${p}`),
  ]
  // 120 mm² → S/2 = 60 mm², que não é seção padronizada: a norma manda a "mais próxima" (50 e 70 equidistam). O motor escolhe a maior (70), lado seguro.
  checar(
    'G36.4',
    'Tabelas 48 e 58',
    'Seção do neutro reduzido (Tab. 48) e do condutor de proteção (Tab. 58) idênticas ao PDF; 120 mm² → S/2=60, adota 70 (maior das duas equidistantes)',
    errosNeutroPe.length === 0 && calcularSecaoTerra(120) === 70,
    errosNeutroPe.length ? errosNeutroPe.join('; ') : `${t48.length + pe58.length + 4} valores conferidos; PE de 120 mm² = ${calcularSecaoTerra(120)}`,
    'critico',
  )

  // Tabela 30: k=115 (PVC ≤300 mm²), 143 (EPR/XLPE); Tabela 47: 1,5 (iluminação) e 2,5 (força) em cobre.
  checar(
    'G36.5',
    'Tabelas 30 e 47; §6.2.11.1.6 a)',
    'k = 115 (PVC) e 143 (EPR); seções mínimas 1,5 (iluminação) e 2,5 mm² (força); taxas de ocupação 53/31/40%',
    obterK({ isolacao: 'pvc', secaoMm2: 10 }) === 115 &&
      obterK({ isolacao: 'epr', secaoMm2: 10 }) === 143 &&
      SECAO_MINIMA_MM2.iluminacao === 1.5 &&
      SECAO_MINIMA_MM2.tug === 2.5 &&
      obterTaxaOcupacaoMaxima(1) === 0.53 &&
      obterTaxaOcupacaoMaxima(2) === 0.31 &&
      obterTaxaOcupacaoMaxima(3) === 0.4 &&
      obterTaxaOcupacaoMaxima(9) === 0.4,
    `k PVC ${obterK({ isolacao: 'pvc', secaoMm2: 10 })}, EPR ${obterK({ isolacao: 'epr', secaoMm2: 10 })}; mín. ilum. ${SECAO_MINIMA_MM2.iluminacao}, força ${SECAO_MINIMA_MM2.tug}; taxas ${obterTaxaOcupacaoMaxima(1)}/${obterTaxaOcupacaoMaxima(2)}/${obterTaxaOcupacaoMaxima(3)}`,
    'alto',
  )
}

// ---------------------------------------------------------------------------
// G37 — Previsão de cargas (§9.5.2), valores-limite e potências
// ---------------------------------------------------------------------------
grupo('G37', 'Previsão de cargas — valores imediatamente antes/depois dos limites (§9.5.2)')

{
  // §9.5.2.1.2: 100 VA até 6 m²; acima, +60 VA por 4 m² INTEIROS. f(A) = 100 + 60·⌊(A−6)/4⌋.
  const casosIluminacao = [[0.5, 100], [5.99, 100], [6, 100], [6.01, 100], [9.99, 100], [10, 160], [13.99, 160], [14, 220], [20, 280], [30, 460], [100, 100 + 60 * 23]]
  const errosIlum = casosIluminacao.filter(([a, v]) => iluminacaoG36(a) !== v).map(([a, v]) => `${a} m²: ${iluminacaoG36(a)} × ${v}`)
  checar('G37.1', '§9.5.2.1.2', 'Iluminação mínima nas fronteiras de área (5,99/6/9,99/10/13,99/14 m²…), valores calculados à mão', errosIlum.length === 0, errosIlum.length ? errosIlum.join('; ') : `${casosIluminacao.length} áreas conferidas`, 'critico')

  // §9.5.2.2.1 — contagem mínima de pontos de tomada ("ou fração" = teto).
  const C = (tipo, area, perimetro) => ({ tipo, area, perimetro })
  const casosTug = [
    [C('social', 10, 10), 2], [C('social', 10, 10.01), 3], [C('social', 10, 5), 1], [C('social', 10, 5.01), 2],
    [C('servico', 10, 7), 2], [C('servico', 10, 7.01), 3], [C('servico', 10, 3.5), 1], [C('servico', 10, 3.51), 2],
    [C('banheiro', 4, 8), 1], [C('varanda', 3, 7), 1], [C('sauna', 4, 8), 0],
    [C('outro', 2.25, 6), 1], [C('outro', 2.26, 6), 1], [C('outro', 6, 10), 1], [C('outro', 6.01, 10), 2], [C('outro', 6.01, 10.01), 3],
  ]
  const errosTug = casosTug.filter(([c, q]) => tugQuantidadeG36(c) !== q).map(([c, q]) => `${c.tipo} A=${c.area} P=${c.perimetro}: ${tugQuantidadeG36(c)} × ${q}`)
  checar('G37.2', '§9.5.2.2.1', 'Quantidade mínima de tomadas por tipo de cômodo, nas fronteiras de perímetro (5/10 m salas; 3,5/7 m cozinhas) e área (2,25/6 m² demais)', errosTug.length === 0, errosTug.length ? errosTug.join('; ') : `${casosTug.length} casos conferidos`, 'critico')

  // §9.5.2.2.2 — 600 VA nos 3 primeiros pontos + 100 VA nos demais (ambientes molhados); 100 VA nos demais cômodos.
  const cargaDe = (c, ...resto) => previsaoG36([{ id: 'x', nome: 'x', iluminacaoQuantidade: '', iluminacaoPotenciaUnitariaW: '', tugPontos: '', tue: [], ...c }], ...resto).porComodo[0]
  const cozinha4 = cargaDe({ tipo: 'servico', area: 10, perimetro: 14 }) // ceil(14/3,5) = 4 pontos → 3·600 + 100
  const banheiro = cargaDe({ tipo: 'banheiro', area: 4, perimetro: 8 }) // 1 ponto → 600
  const sala3 = cargaDe({ tipo: 'social', area: 10, perimetro: 15 }) // ceil(15/5) = 3 pontos → 300
  checar('G37.3', '§9.5.2.2.2', 'Potência dos pontos de tomada: cozinha de 4 pontos = 3×600+100 = 1900 VA; banheiro = 600 VA; sala de 3 pontos = 300 VA', cozinha4.tugVA === 1900 && banheiro.tugVA === 600 && sala3.tugVA === 300, `cozinha ${cozinha4.tugVA} VA · banheiro ${banheiro.tugVA} VA · sala ${sala3.tugVA} VA`, 'critico')

  // Alternativa permissiva (2 pontos de 600 VA quando o conjunto passa de 6 pontos): só com opt-in.
  const duasCozinhas = ['a', 'b'].map((id) => ({ id, nome: id, tipo: 'servico', area: 10, perimetro: 14, iluminacaoQuantidade: '', iluminacaoPotenciaUnitariaW: '', tugPontos: '', tue: [] }))
  const semOptIn = previsaoG36(duasCozinhas).totais.tugVA // 8 pontos (>6): sem opt-in, 2 × 1900
  const comOptIn = previsaoG36(duasCozinhas, true).totais.tugVA // 2 × (2·600 + 2·100) = 2 × 1400
  checar('G37.4', '§9.5.2.2.2 a)', 'Duas cozinhas de 4 pontos (8 > 6): leitura base 2×1900 = 3800 VA; alternativa "admite-se" (opt-in) 2×1400 = 2800 VA', semOptIn === 3800 && comOptIn === 2800, `base ${semOptIn} VA · opt-in ${comOptIn} VA`, 'alto')

  // TUE: potência aparente = W / (η·cosφ).
  const ar = potenciaAparenteG36({ potenciaW: 1000, cosPhi: 0.85 }) // 1176,47 VA
  const motor = potenciaAparenteG36({ potenciaW: 736, cosPhi: 0.85, rendimento: 0.8 }) // 736/0,8 = 920 W → /0,85 = 1082,35 VA
  const cosInvalido = potenciaAparenteG36({ potenciaW: 1000, cosPhi: 1.5 }) // >1 não pode reduzir os VA
  const etaInvalido = potenciaAparenteG36({ potenciaW: 1000, cosPhi: 1, rendimento: 1.2 })
  const negativa = potenciaAparenteG36({ potenciaW: -500, cosPhi: 1 })
  checar(
    'G37.5',
    '§4.2.1.2 / §6.2.5',
    'Potência aparente do equipamento: 1000 W/0,85 = 1176,47 VA; motor 736 W, η 0,8, cosφ 0,85 = 1082,35 VA; cosφ>1, η>1 e potência negativa nunca reduzem a carga',
    quase(ar, 1176.4706, 0.001) && quase(motor, 1082.3529, 0.001) && cosInvalido === 1000 && etaInvalido === 1000 && negativa === 0,
    `ar ${ar.toFixed(4)} · motor ${motor.toFixed(4)} · cosφ=1,5 → ${cosInvalido} · η=1,2 → ${etaInvalido} · −500 W → ${negativa}`,
    'critico',
  )

  // Valores informados à mão abaixo do mínimo da norma ficam sinalizados e entram no veredito como problema.
  const abaixo = cargaDe({ tipo: 'servico', area: 20, perimetro: 14, iluminacaoQuantidade: '1', iluminacaoPotenciaUnitariaW: '60', tugPontos: '1' })
  checar('G37.6', '§9.5.2.1.2 / §9.5.2.2.1', 'Iluminação (1×60 W em 20 m², mínimo 280 VA) e tomadas (1 em perímetro 14 m, mínimo 4) abaixo da norma são sinalizadas', abaixo.iluminacaoAbaixoDoMinimo === true && abaixo.tugAbaixoDoMinimo === true && abaixo.iluminacaoMinimaVA === 280 && abaixo.tugQuantidadeMinima === 4, `iluminação mínima ${abaixo.iluminacaoMinimaVA} VA; tomadas mínimas ${abaixo.tugQuantidadeMinima}`, 'alto')

  const projAbaixo = { ...ESTADO_G36, comodos: [{ id: 'x', nome: 'Sala', tipo: 'social', area: '20', perimetro: '18', iluminacaoQuantidade: '1', iluminacaoPotenciaUnitariaW: '60', tugPontos: '1', tue: [] }], comprimentoRamalEntrada: '10', iccPresumidaA: '3000' }
  const cfgG37 = resolverConfigInstalacao('monofasica', 127)
  const vereditoAbaixo = calcularVeredito(projAbaixo, { configInstalacao: cfgG37, ...calcularProjetoCompleto(projAbaixo, cfgG37) })
  checar('G37.7', '§9.5.2', 'O veredito do projeto fica vermelho (não conforme) quando iluminação ou tomadas informadas estão abaixo do mínimo — antes dizia "conforme"', vereditoAbaixo.estado === 'alerta' && vereditoAbaixo.problemas.some((p) => /Iluminação abaixo/.test(p.texto)) && vereditoAbaixo.problemas.some((p) => /Menos tomadas/.test(p.texto)), vereditoAbaixo.problemas.map((p) => p.texto).join(' | '), 'critico')
}

// ---------------------------------------------------------------------------
// G38 — Correntes (mono/bi/trifásico, cosφ, rendimento, fase-fase) e neutro
// ---------------------------------------------------------------------------
grupo('G38', 'Correntes de projeto e de fase/neutro — referência manual')

{
  const corrente = (circuito) => circuito.potenciaVA / circuito.tensao
  // Monofásico 127 V: 2540 VA → 20 A exatos. Fase-fase 220 V: 5500 W/220 = 25 A. 220/380: 5500/380 = 14,474 A.
  const gerado = gerarCircuitos([{ id: 'c', nome: 'Cozinha', tipo: 'social', area: 6, perimetro: 4, tue: [
    { id: 'ch', nome: 'Chuveiro', quantidade: 1, potenciaW: 5500, ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 },
    { id: 'fn', nome: 'Forno', quantidade: 1, potenciaW: 2540, ligacao: 'fase-neutro', tipoCarga: 'resistiva', cosPhi: 1 },
  ] }], resolverConfigInstalacao('trifasica', 127))
  const ch127 = gerado.find((c) => c.id.includes('-ch-'))
  const fn127 = gerado.find((c) => c.id.includes('-fn-'))
  const gerado220 = gerarCircuitos([{ id: 'c', nome: 'C', tipo: 'social', area: 6, perimetro: 4, tue: [{ id: 'ch', nome: 'Ch', quantidade: 1, potenciaW: 5500, ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1 }] }], resolverConfigInstalacao('trifasica', 220))
  const ch220 = gerado220.find((c) => c.id.includes('-ch-'))
  checar('G38.1', 'Tensão de fase × linha', 'Chuveiro fase-fase em 127/220 V = 220 V (25 A); em 220/380 V = 380 V (14,47 A); forno fase-neutro 2540 VA em 127 V = 20 A — nunca mistura fase com linha', ch127.tensao === 220 && quase(corrente(ch127), 25, 1e-9) && ch220.tensao === 380 && quase(corrente(ch220), 14.4737, 0.0001) && fn127.tensao === 127 && quase(corrente(fn127), 20, 1e-9), `127/220: ${ch127.tensao} V, ${corrente(ch127).toFixed(3)} A · 220/380: ${ch220.tensao} V, ${corrente(ch220).toFixed(4)} A · fase-neutro: ${fn127.tensao} V, ${corrente(fn127).toFixed(3)} A`, 'critico')

  // Fase-fase isolado em A–B: a mesma corrente (25 A) circula nas duas fases e o neutro não vê nada.
  const ff = calcularCorrentesVetoriais([{ potenciaVA: 5500, cosPhi: 1, tipoCarga: 'resistiva', fases: [1, 2] }], 3, 127)
  // Duas cargas resistivas iguais (10 A) em A e B: |10∠0° + 10∠−120°| = 10 A no neutro.
  const doisIguais = calcularCorrentesVetoriais([{ potenciaVA: 1270, cosPhi: 1, tipoCarga: 'resistiva', fases: [1] }, { potenciaVA: 1270, cosPhi: 1, tipoCarga: 'resistiva', fases: [2] }], 3, 127)
  // Três iguais: neutro nulo. Uma só fase de 10 A: neutro de 10 A.
  const tresIguais = calcularCorrentesVetoriais([1, 2, 3].map((f) => ({ potenciaVA: 1270, cosPhi: 1, tipoCarga: 'resistiva', fases: [f] })), 3, 127)
  checar('G38.2', '§6.2.5.6 / §6.2.6.2', 'Corrente de neutro por soma fasorial: fase-fase isolado → 25 A nas duas fases (25,003 A: o fasor usa 127·√3 = 219,97 V, não os 220 V nominais — 0,014%, a favor da segurança) e neutro 0; duas cargas iguais de 10 A → neutro 10 A; três iguais → 0', quase(ff.correntePorFaseA[0], 25, 0.01) && quase(ff.correntePorFaseA[1], 25, 0.01) && quase(ff.correntePorFaseA[2], 0, 1e-9) && quase(ff.correnteNeutroA, 0, 1e-9) && quase(doisIguais.correnteNeutroA, 10, 1e-9) && quase(tresIguais.correnteNeutroA, 0, 1e-9), `ff ${ff.correntePorFaseA.map((x) => x.toFixed(2))} N=${ff.correnteNeutroA.toFixed(3)} · A+B ${doisIguais.correnteNeutroA.toFixed(3)} · A+B+C ${tresIguais.correnteNeutroA.toFixed(6)}`, 'alto')

  // Carga indutiva e capacitiva em fases diferentes: 10 A a cosφ 0,8 indutivo na fase A (8 − j6) e 10 A a cosφ 0,8 capacitivo na fase B ∠−120°.
  // I_B = 10∠(−120°+36,87°) = 10∠−83,13° = 1,2 − j9,928. Soma = (8+1,2) + j(−6−9,928) = 9,2 − j15,928 → |N| = 18,39 A (maior que as correntes de fase: 10 A).
  const mista = calcularCorrentesVetoriais([{ potenciaVA: 1270, cosPhi: 0.8, tipoCarga: 'indutiva', fases: [1] }, { potenciaVA: 1270, cosPhi: 0.8, tipoCarga: 'capacitiva', fases: [2] }], 3, 127)
  checar('G38.3', '§6.2.6.2', 'Indutiva em A e capacitiva em B (10 A cada, cosφ 0,8): neutro = |9,2 − j15,93| = 18,39 A, maior que qualquer fase (10 A) — a hipótese "neutro ≤ maior fase" é falsa', quase(mista.correnteNeutroA, 18.39, 0.01) && mista.correnteNeutroA > Math.max(...mista.correntePorFaseA), `neutro ${mista.correnteNeutroA.toFixed(3)} A; fases ${mista.correntePorFaseA.map((x) => x.toFixed(3))}`, 'alto')

  // Queda de tensão de circuito terminal fase-fase (220 V, 6 mm², 20 m, 5500 VA cosφ 0,8 indutivo → I = 25 A).
  // R = 20/(46,8·6) = 0,07123 Ω; X = 20·0,13/1000 = 0,0026 Ω; ΔV = 2·I·(R·0,8 + X·0,6) = 2,9272 V → 1,3306%.
  const queda = calcularQuedaPercentual({ comprimentoM: 20, correnteA: 25, secaoMm2: 6, tensaoV: 220, cosPhi: 0.8, tipoCarga: 'indutiva', circuitoTrifasico: false })
  const quedaCap = calcularQuedaPercentual({ comprimentoM: 20, correnteA: 25, secaoMm2: 6, tensaoV: 220, cosPhi: 0.8, tipoCarga: 'capacitiva', circuitoTrifasico: false })
  checar('G38.4', '§6.2.7', 'Queda de tensão com R e X, carga indutiva: 1,3305%; capacitiva (X com sinal oposto): 2·25·(0,071225·0,8 − 0,0026·0,6)/220 = 1,2596%', quase(queda, 1.3305, 0.0005) && quase(quedaCap, 1.2596, 0.0005), `indutiva ${queda.toFixed(4)}% · capacitiva ${quedaCap.toFixed(4)}%`, 'alto')
}

// ---------------------------------------------------------------------------
// G39 — Seleção de condutor: cada método, isolação, temperatura, agrupamento, queda (valores à mão)
// ---------------------------------------------------------------------------
grupo('G39', 'Dimensionamento do condutor — cada método de instalação, fatores e queda (referência: PDF + conta manual)')

{
  const circuito = (VA, tensao = 127, tipo = 'tug') => ({ id: 't', nome: 't', tipo, potenciaVA: VA, tensao, ehFaseFase: false, cosPhi: 1, tipoCarga: 'resistiva' })
  const sec = (VA, L, opcoes) => dimensionarCircuito(circuito(VA), L, opcoes)

  // Ib = 2540/127 = 20 A → In = 20 A. Seção = menor com Iz ≥ 20 A (queda desprezível em 5 m).
  //   PVC: A1 2,5=19,5 ✗ → 4 (26) · A2 2,5=18,5 ✗ → 4 (25) · B1 24 → 2,5 · B2 23 → 2,5 · C 27 → 2,5 · D 29 → 2,5
  //   EPR: A1 26 · A2 25 · B1 31 · B2 30 · C 33 · D 34 → todos 2,5
  const esperadoPvc = { A1: 4, A2: 4, B1: 2.5, B2: 2.5, C: 2.5, D: 2.5 }
  const errosMetodo = []
  for (const metodo of Object.keys(esperadoPvc)) {
    const pvc = sec(2540, 5, { metodoInstalacao: metodo, isolacao: 'pvc' })
    const epr = sec(2540, 5, { metodoInstalacao: metodo, isolacao: 'epr' })
    if (pvc.secaoMm2 !== esperadoPvc[metodo]) errosMetodo.push(`PVC ${metodo}: ${pvc.secaoMm2} × ${esperadoPvc[metodo]}`)
    if (epr.secaoMm2 !== 2.5) errosMetodo.push(`EPR ${metodo}: ${epr.secaoMm2} × 2,5`)
    const izEsperado = ampacidadePdf('pvc', metodo, 2, pvc.secaoMm2)
    if (pvc.ampacidadeA !== izEsperado) errosMetodo.push(`PVC ${metodo} Iz ${pvc.ampacidadeA} × ${izEsperado}`)
  }
  checar('G39.1', 'Tabelas 36/37 · §5.3.4.1', 'Ib = 20 A em cada um dos 6 métodos (A1/A2/B1/B2/C/D) × PVC/EPR: seção e Iz iguais ao esperado pela tabela do PDF', errosMetodo.length === 0, errosMetodo.length ? errosMetodo.join('; ') : '12 combinações conferidas', 'critico')

  // Fatores de correção (B1, PVC, 2,5 mm²: 24 A): FCT 40 °C 0,87 → 20,88 ≥ 20 ✓ (2,5); 45 °C 0,79 → 18,96 ✗ → 4 mm² (32·0,79 = 25,28);
  // FCA 2 circuitos 0,80 → 19,2 ✗ → 4 mm² (25,6); 3 circuitos 0,70 → 16,8 ✗ → 4 (22,4); 4 circuitos 0,65 → 15,6 ✗ → 4 (20,8 ✓).
  const fct = (t) => obterFatorTemperatura(t, { isolacao: 'pvc' })
  const casosFator = [
    [{ fatorTemperatura: fct(40) }, 2.5, 20.88], [{ fatorTemperatura: fct(45) }, 4, 25.28],
    [{ fatorAgrupamento: obterFatorAgrupamento(2, 'B1') }, 4, 25.6], [{ fatorAgrupamento: obterFatorAgrupamento(3, 'B1') }, 4, 22.4], [{ fatorAgrupamento: obterFatorAgrupamento(4, 'B1') }, 4, 20.8],
    [{ fatorTemperatura: fct(35), fatorAgrupamento: obterFatorAgrupamento(2, 'B1') }, 4, 32 * 0.94 * 0.8], // 24,064
  ]
  const errosFator = casosFator.flatMap(([opcoes, secaoEsperada, izEsperado]) => {
    const r = sec(2540, 5, { metodoInstalacao: 'B1', isolacao: 'pvc', ...opcoes })
    return r.secaoMm2 === secaoEsperada && quase(r.ampacidadeA, izEsperado, 0.001) ? [] : [`${JSON.stringify(opcoes)}: ${r.secaoMm2} mm², Iz ${r.ampacidadeA?.toFixed(3)} × ${secaoEsperada} mm², ${izEsperado.toFixed(3)} A`]
  })
  checar('G39.2', '§6.2.5.3 / §6.2.5.5 / Tabelas 40 e 42', 'Mudança de temperatura (40/45 °C) e de agrupamento (2/3/4 circuitos) muda a seção como calculado à mão; Iz = tabela × FCT × FCA', errosFator.length === 0, errosFator.length ? errosFator.join('; ') : `${casosFator.length} combinações conferidas`, 'critico')

  // Queda de tensão: 2540 VA a 127 V (20 A), cosφ 1. ΔV% = 2·L·I/(σ·S·V)·100 com σ = 46,8.
  //   S=4 mm²: L=23 → 3,870% ✓ · L=24 → 4,038% ✗ → sobe para 6 mm² (L=24: 2,692%).
  //   S=2,5 mm² a 23 m: 6,19% ✗.
  const q23 = sec(2540, 23)
  const q24 = sec(2540, 24)
  checar('G39.3', '§6.2.7.2', 'Limite de 4% no circuito terminal: 4 mm² serve a 23 m (3,870%) e deixa de servir a 24 m (4,038%) → 6 mm² (2,692%)', q23.secaoMm2 === 4 && quase(q23.quedaPercentual, 3.8705, 0.001) && q24.secaoMm2 === 6 && quase(q24.quedaPercentual, 2.6923, 0.001), `23 m: ${q23.secaoMm2} mm², ${q23.quedaPercentual?.toFixed(4)}% · 24 m: ${q24.secaoMm2} mm², ${q24.quedaPercentual?.toFixed(4)}%`, 'critico')

  // Seção mínima: iluminação 1,5 mm² (Ib 14 A, In 16 A: B1/2 de 1,5 mm² = 17,5 ≥ 16 ✓); com FCA 0,8 → 14 ✗ → 2,5 mm² (19,2 ✓).
  const ilum = dimensionarCircuito(circuito(1778, 127, 'iluminacao'), 5, { metodoInstalacao: 'B1' }) // 1778/127 = 14 A
  const ilumFca = dimensionarCircuito(circuito(1778, 127, 'iluminacao'), 5, { metodoInstalacao: 'B1', fatorAgrupamento: 0.8 })
  const tugMin = dimensionarCircuito(circuito(127, 127, 'tug'), 5, {}) // 1 A → ainda 2,5 mm² (mínimo de força)
  checar('G39.4', 'Tabela 47 · §5.3.4.1', 'Seção mínima: iluminação 14 A (In 16) = 1,5 mm² (Iz 17,5); com FCA 0,8 → 2,5 mm²; tomada de 1 A nunca abaixo de 2,5 mm²', ilum.secaoMm2 === 1.5 && ilum.disjuntorA === 16 && ilumFca.secaoMm2 === 2.5 && tugMin.secaoMm2 === 2.5, `ilum ${ilum.secaoMm2}/${ilum.disjuntorA} A · com FCA 0,8 ${ilumFca.secaoMm2} · tug 1 A ${tugMin.secaoMm2}`, 'alto')

  // Varredura independente: para Ib de 0,5 a 200 A, método × isolação, o motor deve escolher o menor
  // (disjuntor ≥ Ib; seção com Iz do PDF ≥ In), e In ≤ Iz sempre (Ib ≤ In ≤ Iz; I2 = 1,45·In ≤ 1,45·Iz).
  const DISJ = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 175, 200, 225, 250]
  const SECOES_TUG = SECOES_G36.filter((s) => s >= 2.5)
  const errosVarredura = []
  let n = 0
  for (const isolacao of ['pvc', 'epr']) {
    for (const metodo of Object.keys(COLUNA_G36)) {
      for (let ib = 0.5; ib <= 200; ib += 0.5) {
        n += 1
        const r = dimensionarCircuito(circuito(ib * 127), 1, { metodoInstalacao: metodo, isolacao })
        const inEsperado = DISJ.find((d) => d >= ib - 1e-9)
        const secaoEsperada = SECOES_TUG.find((s) => ampacidadePdf(isolacao, metodo, 2, s) >= inEsperado)
        const izPdf = secaoEsperada ? ampacidadePdf(isolacao, metodo, 2, secaoEsperada) : null
        const ok = r.disjuntorA === inEsperado && r.secaoMm2 === (secaoEsperada ?? null) && (r.secaoMm2 === null || (r.disjuntorA >= ib && r.disjuntorA <= r.ampacidadeA && r.ampacidadeA === izPdf))
        if (!ok && errosVarredura.length < 5) errosVarredura.push(`${isolacao} ${metodo} Ib=${ib}: In ${r.disjuntorA} sec ${r.secaoMm2} × In ${inEsperado} sec ${secaoEsperada}`)
      }
    }
  }
  checar('G39.5', '§5.3.4.1 a) e b)', `Varredura Ib 0,5…200 A × 6 métodos × PVC/EPR (${n} casos): disjuntor e seção mínimos, e Ib ≤ In ≤ Iz (Iz da tabela do PDF) em todos`, errosVarredura.length === 0, errosVarredura.length ? errosVarredura.join('; ') : `${n} casos sem divergência`, 'critico')

  // Fora do alcance: temperatura sem valor na tabela e agrupamento acima da tabela → não verificado, sem seção.
  const quente = sec(2540, 5, { fatorTemperatura: obterFatorTemperatura(65, { isolacao: 'pvc' }) })
  const muitosC = sec(2540, 5, { metodoInstalacao: 'C', fatorAgrupamento: obterFatorAgrupamento(12, 'C') })
  checar('G39.6', '§6.2.5.3 / §6.2.5.5', 'PVC a 65 °C (sem fator na Tabela 40) e método C com 12 circuitos (sem fator na Tabela 42, ref. 2): erro explícito e nenhuma seção — nunca aprovação por extrapolação', quente.secaoMm2 === null && /Tabela 40/.test(quente.erro) && muitosC.secaoMm2 === null && /agrupad/.test(muitosC.erro), `65 °C: ${quente.erro?.slice(0, 50)}… · C(12): ${muitosC.erro?.slice(0, 55)}…`, 'alto')
}

// ---------------------------------------------------------------------------
// G40 — Neutro, harmônicas e PE no alimentador
// ---------------------------------------------------------------------------
grupo('G40', 'Neutro (§6.2.6.2), 3ª harmônica (§6.2.5.6.1) e PE (Tabela 58) no alimentador')

{
  const tri = (L, opcoes = {}) => dimensionarProtecaoGeral({ ...calcularCorrentesVetoriais([1, 2, 3].map((f) => ({ potenciaVA: 15000, cosPhi: 1, tipoCarga: 'resistiva', fases: [f] })), 3, 127), numeroFases: 3, tensaoFaseNeutro: 127, comprimentoRamalM: L, ...opcoes })
  // Cada fase: 15000/127 = 118,1 A → disjuntor 125 A. B1/3 condutores PVC: 50 mm² = 134 A ≥ 125 ✓ (35 mm² = 110 ✗) → fase 50 mm².
  const base = tri(20)
  const reduzido = tri(20, { neutroReduzidoDeclarado: true, terceiraHarmonica: 'ate-15' })
  const semDeclarar = tri(20, { neutroReduzidoDeclarado: true }) // harmônica não declarada → não reduz
  const harm20 = tri(20, { neutroReduzidoDeclarado: true, terceiraHarmonica: 'acima-15' }) // 15-33%: neutro = fase e 4 condutores carregados (×0,86)
  const harm40 = tri(20, { terceiraHarmonica: 'acima-33' })
  checar('G40.1', '§6.2.6.2.3 / .5 / .6 · Tabela 48', 'Neutro do alimentador trifásico (fase 50 mm²): igual à fase por padrão e sem declaração de harmônica; 25 mm² só com as condições declaradas e harmônica ≤15%; igual à fase com 15–33%; "acima de 33%" gera aviso de neutro possivelmente maior', base.condutorFase.secaoMm2 === 50 && base.secaoNeutroMm2 === 50 && reduzido.secaoNeutroMm2 === 25 && semDeclarar.secaoNeutroMm2 === 50 && harm20.secaoNeutroMm2 === harm20.condutorFase.secaoMm2 && harm40.avisoNeutroSuperior === true, `fase ${base.condutorFase.secaoMm2}; neutro: padrão ${base.secaoNeutroMm2}, reduzido ${reduzido.secaoNeutroMm2}, sem declarar harmônica ${semDeclarar.secaoNeutroMm2}, 15–33% ${harm20.secaoNeutroMm2}; aviso >33%: ${harm40.avisoNeutroSuperior}`, 'critico')

  // 4 condutores carregados (harmônica > 15%): Iz = Tabela 36 B1/3 × 0,86. Para 50 mm²: 134 × 0,86 = 115,24 A (< 125 A → sobe para 70 mm²: 171 × 0,86 = 147,06).
  const linha50 = harm20.condutorFase.trilha.find((l) => l.secao === 50)
  checar('G40.2', '§6.2.5.6.1', 'Harmônica >15%: Iz do alimentador = Tabela 36 (3 condutores) × 0,86 — 50 mm² cai de 134 para 115,24 A e deixa de servir ao disjuntor de 125 A; adota 70 mm² (147,06 A)', quase(linha50.ampacidadeCorrigida, 115.24, 0.001) && harm20.condutorFase.secaoMm2 === 70 && quase(harm20.condutorFase.ampacidadeA, 147.06, 0.001), `50 mm² corrigido ${linha50.ampacidadeCorrigida.toFixed(2)} A; adotada ${harm20.condutorFase.secaoMm2} mm² (${harm20.condutorFase.ampacidadeA.toFixed(2)} A)`, 'critico')

  // Monofásico e bifásico: neutro SEMPRE igual à fase, mesmo com redução declarada (§6.2.6.2.2 e .4); fase ≤ 25 mm² também.
  const mono = neutroGeralG36(50, { neutroReduzidoDeclarado: true, numeroFases: 1, terceiraHarmonica: 'ate-15' })
  const bi = neutroGeralG36(50, { neutroReduzidoDeclarado: true, numeroFases: 2, terceiraHarmonica: 'ate-15' })
  const tri25 = neutroGeralG36(25, { neutroReduzidoDeclarado: true, numeroFases: 3, terceiraHarmonica: 'ate-15' })
  const tri35 = neutroGeralG36(35, { neutroReduzidoDeclarado: true, numeroFases: 3, terceiraHarmonica: 'ate-15' })
  checar('G40.3', '§6.2.6.2.2 / .4 / .6', 'Neutro igual à fase em monofásico (50→50), bifásico (50→50) e trifásico com fase ≤25 mm² (25→25); reduz só acima de 25 mm² (35→25)', mono === 50 && bi === 50 && tri25 === 25 && tri35 === 25, `mono ${mono} · bi ${bi} · tri 25→${tri25} · tri 35→${tri35}`, 'critico')

  // Neutro NÃO pode ser aprovado só pela Tabela 48: a corrente real do neutro tem de caber na seção adotada.
  const desequilibrado = dimensionarProtecaoGeral({ ...calcularCorrentesVetoriais([{ potenciaVA: 15000, cosPhi: 1, tipoCarga: 'resistiva', fases: [1] }], 3, 127), numeroFases: 3, tensaoFaseNeutro: 127, comprimentoRamalM: 20, neutroReduzidoDeclarado: true, terceiraHarmonica: 'ate-15' })
  // Uma fase só de 118,1 A → neutro de 118,1 A. Fase = 50 mm² → Tab. 48 daria 25 mm² (≈ 89 A com B1/3) — a verificação vetorial deve reprovar.
  checar('G40.4', '§6.2.6.2.6 a) · §6.2.5', 'Carga toda numa fase (118,1 A no neutro) com neutro reduzido pela Tabela 48 (25 mm²): a verificação da corrente real do neutro reprova (conforme=false), em vez de aceitar a redução', desequilibrado.secaoNeutroMm2 < desequilibrado.condutorFase.secaoMm2 && desequilibrado.verificacaoNeutro.conforme === false && quase(desequilibrado.verificacaoNeutro.correnteA, 118.11, 0.01), `neutro ${desequilibrado.secaoNeutroMm2} mm², corrente ${desequilibrado.verificacaoNeutro.correnteA.toFixed(2)} A, ampacidade ${desequilibrado.verificacaoNeutro.ampacidadeA?.toFixed(1)} A → conforme=${desequilibrado.verificacaoNeutro.conforme}`, 'critico')
}

// ---------------------------------------------------------------------------
// G41 — Curto-circuito, curvas B/C/D e energia passante (valores nos limites)
// ---------------------------------------------------------------------------
grupo('G41', 'Curto-circuito: I²t ≤ k²S² e Ikmin nos limites exatos (§5.3.5.5.2, §6.3.4.3.2)')

{
  const vcc = (p) => verificarCurtoCircuito({ curvaDisjuntor: 'C', correnteDisjuntorA: 63, iccMinimaA: 1000, secaoMm2: 10, isolacao: 'pvc', ...p })
  // PVC 10 mm²: (115·10)² = 1.322.500 A²s; I²·0,01 = 1.322.500 → Icc = 11.500 A (igualdade passa; 11.501 reprova).
  // EPR/XLPE 10 mm²: (143·10)² = 2.044.900 → Icc = 14.300 A.
  const limitePvc = vcc({ iccPresumidaA: 11500 })
  const acimaPvc = vcc({ iccPresumidaA: 11501 })
  const limiteEpr = vcc({ iccPresumidaA: 14300, isolacao: 'epr' })
  const acimaEpr = vcc({ iccPresumidaA: 14301, isolacao: 'epr' })
  checar('G41.1', '§5.3.5.5.2 / Tabela 30', 'I²t ≤ k²S² exato: PVC 10 mm² aceita 11.500 A e reprova 11.501 A; EPR 10 mm² aceita 14.300 A e reprova 14.301 A', limitePvc.conforme === true && acimaPvc.conforme === false && limiteEpr.conforme === true && acimaEpr.conforme === false, `PVC 11500 → ${limitePvc.conforme}, 11501 → ${acimaPvc.conforme}; EPR 14300 → ${limiteEpr.conforme}, 14301 → ${acimaEpr.conforme}`, 'critico')

  // Ikmin: limite superior da faixa magnética = multiplicador máximo × In (B 5·In, C 10·In, D 20·In). In = 32 A → 160/320/640 A.
  const ik = (curva, icc) => vcc({ curvaDisjuntor: curva, correnteDisjuntorA: 32, iccPresumidaA: 5000, iccMinimaA: icc })
  const errosIk = [['B', 160], ['C', 320], ['D', 640]].flatMap(([curva, limiar]) => (ik(curva, limiar).verificado === true && ik(curva, limiar - 0.01).verificado === false ? [] : [`${curva}: ${limiar} A`]))
  checar('G41.2', '§6.3.4.3.2 a) · IEC 60898', 'Ikmin só garante o disparo no limite superior da faixa magnética: In 32 A → B 160 A, C 320 A, D 640 A (no limite verifica; 0,01 A abaixo fica não verificado)', errosIk.length === 0, errosIk.length ? `falhou em ${errosIk.join(', ')}` : 'B/C/D conferidas nos dois lados do limite', 'critico')

  // Seção < 10 mm²: k não normalizado (Tabela 30, NOTA 1) → não verificado, mesmo com Icc baixa.
  const pequena = vcc({ iccPresumidaA: 2000, secaoMm2: 6 })
  const semIcc = vcc({ iccPresumidaA: 0 })
  const semMinima = verificarCurtoCircuito({ curvaDisjuntor: 'C', correnteDisjuntorA: 63, iccPresumidaA: 3000, iccMinimaA: null, secaoMm2: 10 })
  checar('G41.3', 'Tabela 30 NOTA 1 · §5.3.5.1', 'Seção de 6 mm², Icc ausente (0) e Icc mínima ausente: sempre "não verificado" (verificado=false, conforme=null), nunca conforme', pequena.verificado === false && pequena.conforme === null && semIcc.verificado === false && semIcc.conforme === null && semMinima.verificado === false && semMinima.conforme === null, `6 mm²: ${pequena.verificado}/${pequena.conforme} · Icc 0: ${semIcc.verificado}/${semIcc.conforme} · sem Ikmin: ${semMinima.verificado}/${semMinima.conforme}`, 'critico')

  // Seccionamento TN (§5.1.2.2.4.2 d): Zs·Ia ≤ Uo. Ia = 10·In (curva C). In = 20 A → Ia = 200 A → Zs máx = 127/200 = 0,635 Ω.
  const tn = (zs) => verificarSeccionamentoTN({ zsOhm: zs, tensaoFaseNeutroV: 127, correnteDisjuntorA: 20, curvaDisjuntor: 'C', sensibilidadeDrMA: null })
  checar('G41.4', '§5.1.2.2.4.2 d)', 'Seccionamento TN: Zs ≤ 0,635 Ω atende (In 20 A, curva C, Uo 127 V); Zs = 0,636 Ω deixa de atender pelo disjuntor (sem DR → não verificado)', tn(0.635).conforme === true && tn(0.636).verificado === false, `Zs 0,635 → ${tn(0.635).conforme}; 0,636 → verificado=${tn(0.636).verificado}`, 'critico')

  // TT: RA·IΔn ≤ UL — IΔn 30 mA, UL 50 V → RA ≤ 1666,7 Ω; com banheiro UL 25 V → 833,3 Ω.
  const tt50 = verificarSeccionamentoTT({ resistenciaOhm: 1666, sensibilidadeDrMA: 30, ulV: 50 })
  const tt50f = verificarSeccionamentoTT({ resistenciaOhm: 1667, sensibilidadeDrMA: 30, ulV: 50 })
  const tt25 = verificarSeccionamentoTT({ resistenciaOhm: 833, sensibilidadeDrMA: 30, ulV: 25 })
  const tt25f = verificarSeccionamentoTT({ resistenciaOhm: 834, sensibilidadeDrMA: 30, ulV: 25 })
  checar('G41.5', '§5.1.2.2.4.3 b) · Anexo C', 'TT: RA ≤ 1666,7 Ω (UL 50 V) e ≤ 833,3 Ω com banheiro (UL 25 V), nos dois lados do limite', tt50.conforme === true && tt50f.conforme === false && tt25.conforme === true && tt25f.conforme === false, `1666→${tt50.conforme} 1667→${tt50f.conforme} · 833→${tt25.conforme} 834→${tt25f.conforme}`, 'critico')
}

// ---------------------------------------------------------------------------
// G42 — Eletroduto (diâmetro externo real), DR, DPS, reserva e equipotencialização
// ---------------------------------------------------------------------------
grupo('G42', 'Eletroduto por diâmetro externo, DR, DPS, reserva do quadro (Tabela 59) e equipotencialização')

{
  // 3 condutores de 2,5 mm² (PVC, Ø 3,60 mm, Creder Tab. 3.23): 3·π/4·3,6² = 30,71 mm². Taxa máx. 40%.
  //   1/2" (Ø int. 16,4 → 211,2 mm²): 14,54% ✓ → recomendado 1/2" (o menor eletroduto da lista é o de 20 mm).
  // 3 condutores de 25 mm² (Ø 8,6): 3·58,09 = 174,26 mm². 3/4" (21,3 → 356,3 mm²): 48,9% ✗ ; 1" (27,5 → 594,0 mm²): 29,3% ✓ → 1".
  // 2 condutores (31%): 2·π/4·8,6² = 116,2 mm². 3/4": 32,6% ✗ → 1" (19,6%).
  const e3 = dimensionarEletroduto([2.5, 2.5, 2.5])
  const e25 = dimensionarEletroduto([25, 25, 25])
  const e2 = dimensionarEletroduto([25, 25])
  checar('G42.1', '§6.2.11.1.6 a)', 'Eletroduto por área externa real (não mm² nominal): 3×2,5 mm² (Ø 3,60) → 1/2" (30,71 mm² em 211,2 = 14,54%); 3×25 mm² → 1" (3/4" daria 48,9% > 40%); 2×25 mm² → 1" (3/4" daria 32,6% > 31%)', e3.eletrodutoRecomendado.referencia === '1/2"' && quase(e3.areaCondutoresMm2, 30.71, 0.01) && e25.eletrodutoRecomendado.referencia === '1"' && quase(e25.trilha.find((t) => t.referencia === '3/4"').ocupacaoPercentual, 48.91, 0.05) && e2.eletrodutoRecomendado.referencia === '1"' && quase(e2.trilha.find((t) => t.referencia === '3/4"').ocupacaoPercentual, 32.6, 0.05), `3×2,5: ${e3.eletrodutoRecomendado.referencia} (${e3.areaCondutoresMm2.toFixed(2)} mm²) · 3×25: ${e25.eletrodutoRecomendado.referencia} · 2×25: ${e2.eletrodutoRecomendado.referencia}`, 'alto')

  // DR geral: In ≥ disjuntor geral, entre 25/40/63/80/100 A; acima de 100 A não há DR no catálogo → null.
  const dr = (i) => dimensionarIDR(i, 3)
  checar('G42.2', '§5.1.3.2.2 / §6.3.3.2', 'DR geral: 40 A → 40; 41 A → 63; 100 A → 100; 101 A → sem DR padronizado (null); 4 polos em trifásico; sensibilidade 30 mA', dr(40).correnteA === 40 && dr(41).correnteA === 63 && dr(100).correnteA === 100 && dr(101).correnteA === null && dr(40).polos === 4 && dr(40).sensibilidadeMA === 30, `40→${dr(40).correnteA} · 41→${dr(41).correnteA} · 100→${dr(100).correnteA} · 101→${dr(101).correnteA}; polos ${dr(40).polos}`, 'alto')

  // DPS (§6.3.5.2.4 e Tab. 31/49): Up ≤ 1,5 kV (127/220) ou 2,5 kV (220/380); Uc ≥ 1,1·Uo; In ≥ 5 kA, 20/10 kA N-PE; Iimp ≥ 12,5 kA só com descarga direta.
  const d127 = especificarDPS({ tensaoFaseNeutro: 127, numeroFases: 1, exposicaoDescargaDireta: false })
  const d220 = especificarDPS({ tensaoFaseNeutro: 220, numeroFases: 3, exposicaoDescargaDireta: true })
  checar('G42.3', '§6.3.5.2.4 a), b), d) · Tabelas 31 e 49', 'DPS: 127 V → Up 1,5 kV, Uc 139,7 V, In 5 kA, N-PE 10 kA (mono), PE 4 mm²; 220 V trifásico com descarga direta → Up 2,5 kV, Uc 242 V, N-PE 20 kA, Iimp 12,5 kA, PE 16 mm²', d127.upMaximoKV === 1.5 && quase(d127.ucMinimoFaseV, 139.7, 1e-9) && d127.inMinimoKA === 5 && d127.inMinimoNeutroPeKA === 10 && d127.iimpMinimoKA === null && d127.secaoCondutorPeMm2 === 4 && d220.upMaximoKV === 2.5 && quase(d220.ucMinimoFaseV, 242, 1e-9) && d220.inMinimoNeutroPeKA === 20 && d220.iimpMinimoKA === 12.5 && d220.secaoCondutorPeMm2 === 16, `127: Up ${d127.upMaximoKV}, Uc ${d127.ucMinimoFaseV}, N-PE ${d127.inMinimoNeutroPeKA} · 220: Up ${d220.upMaximoKV}, Uc ${d220.ucMinimoFaseV}, N-PE ${d220.inMinimoNeutroPeKA}, Iimp ${d220.iimpMinimoKA}`, 'alto')

  // §5.4.2.1.1: DPS é exigência normativa só com alimentação aérea E região de alto índice de descargas; senão, recomendação.
  const r1 = recomendarDPS(127, { alimentacaoAerea: true, regiaoAltoIndiceDescargas: true })
  const r2 = recomendarDPS(127, { alimentacaoAerea: true, regiaoAltoIndiceDescargas: false })
  const r3 = recomendarDPS(127, {})
  checar('G42.4', '§5.4.2.1.1 a)', 'DPS é "exigido pela norma" somente com alimentação aérea + região de alto índice de descargas; nos demais casos é recomendação — e a ferramenta não alega exigência', r1.exigidaPelaNorma === true && r2.exigidaPelaNorma === false && r3.exigidaPelaNorma === false, `aérea+alto ${r1.exigidaPelaNorma} · só aérea ${r2.exigidaPelaNorma} · nada ${r3.exigidaPelaNorma}`, 'alto')

  // Tabela 59: N≤6 → 2; 7–12 → 3; 13–30 → 4; N>30 → ⌈0,15·N⌉.
  const t59 = [[1, 2], [6, 2], [7, 3], [12, 3], [13, 4], [30, 4], [31, 5], [40, 6], [100, 15], [101, 16]]
  const errosT59 = t59.filter(([n, r]) => calcularReservaQuadro(n) !== r).map(([n, r]) => `N=${n}: ${calcularReservaQuadro(n)} × ${r}`)
  checar('G42.5', 'Tabela 59', 'Reserva do quadro nas fronteiras 6/7, 12/13, 30/31, e 0,15·N arredondado para cima (31→5, 40→6, 101→16)', errosT59.length === 0, errosT59.length ? errosT59.join('; ') : `${t59.length} valores conferidos`, 'alto')

  // §6.4.4.1.1: ≥ metade do maior PE, mínimo 6 mm², máximo exigido 25 mm². PE 4 → 6; 10 → 6 (5 → 6); 16 → 10 (8 → padrão 10); 35 → 25 (17,5→25); 70 → 25 (limite).
  const eq = [[4, 6], [10, 6], [16, 10], [25, 16], [35, 25], [70, 25]]
  const errosEq = eq.filter(([pe, r]) => calcularEquipotencializacaoPrincipal(pe) !== r).map(([pe, r]) => `PE ${pe}: ${calcularEquipotencializacaoPrincipal(pe)} × ${r}`)
  checar('G42.6', '§6.4.4.1.1', 'Equipotencialização principal: metade do maior PE (padronizada), mín. 6, limitada a 25 mm²', errosEq.length === 0, errosEq.length ? errosEq.join('; ') : `${eq.length} valores conferidos`, 'medio')

  // Reserva no alimentador: com N=2 circuitos → 2 reservas; 1000 VA cada → +2000/127 = 15,748 A na fase.
  const ent = { ...ESTADO_G36, comodos: [{ id: 'a', nome: 'Sala', tipo: 'social', area: '10', perimetro: '12', tue: [] }], comprimentoRamalEntrada: '10', iccPresumidaA: '3000' }
  const cfgR = resolverConfigInstalacao('monofasica', 127)
  const semRes = calcularProjetoCompleto(ent, cfgR)
  const comRes = calcularProjetoCompleto({ ...ent, potenciaReservaPorCircuitoVA: '1000' }, cfgR)
  const dif = comRes.protecaoGeral.correntePorFaseA[0] - semRes.protecaoGeral.correntePorFaseA[0]
  const vSem = calcularVeredito(ent, { configInstalacao: cfgR, ...semRes })
  const vCom = calcularVeredito({ ...ent, potenciaReservaPorCircuitoVA: '1000' }, { configInstalacao: cfgR, ...comRes })
  checar('G42.7', 'Tabela 59 NOTA', 'Reserva declarada entra no alimentador (2 circuitos × 1000 VA / 127 V = +15,748 A); não declarada, vira pendência do veredito', quase(dif, 2000 / 127, 1e-9) && comRes.reservaAlimentador.considerada === true && !vCom.pendencias.some((p) => /Reserva/.test(p.texto)) && vSem.pendencias.some((p) => /Reserva/.test(p.texto)), `+${dif.toFixed(4)} A (esperado ${(2000 / 127).toFixed(4)}); sem declarar: ${vSem.pendencias.some((p) => /Reserva/.test(p.texto)) ? 'pendência' : 'sem pendência'}`, 'alto')
}

// ---------------------------------------------------------------------------
// G43 — Banheiro: fronteiras exatas dos volumes (§9.1.2.1) e regras por volume (§9.1.4)
// ---------------------------------------------------------------------------
grupo('G43', 'Volumes do banheiro — fronteiras exatas (§9.1.2.1) e regras de componentes (§9.1.4)')

{
  // Box 1,0×1,0 m, fundo ao nível do piso. Ponto a distância horizontal d da borda e altura h.
  const box = { wM: 1, hM: 1, baseM: 0 }
  const vol = (d, h, boxUsado = box) => classificarVolume({ xM: 1 + d, yM: 0.5, alturaM: h }, boxUsado)
  const esperados = [
    ['volume 1 acima do box, até 2,25 m', vol(0, 2.25), 1],
    ['logo acima de 2,25 m, ainda sob 3 m → volume 2', vol(0, 2.2501), 2],
    ['acima de 3 m sobre o box → fora', vol(0, 3.0001), null],
    ['0,6 m da borda a 3 m → volume 2', vol(0.6, 3), 2],
    ['0,6001 m da borda a 2,25 m → volume 3', vol(0.6001, 2.25), 3],
    ['0,6001 m da borda a 2,2501 m → fora (volume 3 só até 2,25)', vol(0.6001, 2.2501), null],
    ['3,0 m da borda a 2,25 m → volume 3 (0,6 + 2,4)', vol(3, 2.25), 3],
    ['3,0001 m da borda → fora', vol(3.0001, 1), null],
  ]
  const errosVol = esperados.filter(([, obtido, esp]) => obtido !== esp).map(([nome, obtido, esp]) => `${nome}: ${obtido} × ${esp}`)
  checar('G43.1', '§9.1.2.1 b), c), d)', 'Fronteiras com box delimitado: volume 1 até 2,25 m; volume 2 até 0,6 m e 3 m de altura; volume 3 até 0,6+2,40 = 3,0 m e 2,25 m de altura', errosVol.length === 0, errosVol.length ? errosVol.join('; ') : `${esperados.length} fronteiras conferidas`, 'critico')

  // Banheira elevada (fundo a 0,5 m): teto do volume 1 = 0,5 + 2,25 = 2,75 m; tetos dos volumes 2 e 3 continuam medidos do piso.
  const elevada = { wM: 1, hM: 1, baseM: 0.5 }
  checar('G43.2', '§9.1.2.1 b) × c)', 'Banheira com fundo a 0,5 m: volume 1 vai até 2,75 m (2,25 acima do fundo); acima disso e até 3 m (do piso) é volume 2', vol(0, 2.75, elevada) === 1 && vol(0, 2.7501, elevada) === 2 && vol(0, 3.0001, elevada) === null, `2,75 → ${vol(0, 2.75, elevada)} · 2,7501 → ${vol(0, 2.7501, elevada)} · 3,0001 → ${vol(0, 3.0001, elevada)}`, 'alto')

  // Regras de componentes por volume (§9.1.4.3.1/.2 e §9.1.4.4): tomada e interruptor proibidos em 0/1/2; tomada no 3 com DR 30 mA; luminária só a partir do 2; aquecedor não no 0.
  const geom = (tipo, d, h) => ({ boxLarguraM: 1, boxProfundidadeM: 1, boxAlturaBaseM: 0, pontos: [{ id: 'p', tipo, xM: 1 + d, yM: 0.5, alturaM: h }] })
  const res = (tipo, d, h) => verificarPontosBanheiro(geom(tipo, d, h))[0]
  checar('G43.3', '§9.1.4.3 / §9.1.4.4', 'Tomada no volume 2 (0,3 m, 1 m de altura) → não conforme; tomada no volume 3 (1 m) → conforme (DR 30 mA); interruptor no volume 1 → não conforme; luminária no volume 1 → não conforme, no volume 2 → conforme (classe II); aquecedor no volume 1 → conforme (classe I/II)', res('tomada', 0.3, 1).conforme === false && res('tomada', 1, 1).conforme === true && res('interruptor', 0, 1).conforme === false && res('luminaria', 0, 1).conforme === false && res('luminaria', 0.3, 1).conforme === true && res('aquecedor', 0, 1).conforme === true, `tomada V2 ${res('tomada', 0.3, 1).conforme} · tomada V3 ${res('tomada', 1, 1).conforme} · interruptor V1 ${res('interruptor', 0, 1).conforme} · luminária V1 ${res('luminaria', 0, 1).conforme} · luminária V2 ${res('luminaria', 0.3, 1).conforme} · aquecedor V1 ${res('aquecedor', 0, 1).conforme}`, 'critico')
}

// ---------------------------------------------------------------------------
// G44 — Entradas inválidas, ausentes e incompatíveis (nenhum cálculo "conserta" dado a favor do projeto)
// ---------------------------------------------------------------------------
grupo('G44', 'Entradas inválidas, ausentes e incompatíveis')

{
  const cfg1 = resolverConfigInstalacao('monofasica', 127)
  const rodar = (comodos, extra = {}) => {
    const p = { ...ESTADO_G36, comodos, comprimentoRamalEntrada: '10', iccPresumidaA: '3000', iccFaseNeutroA: '3000', esquemaAterramento: 'TN-S', potenciaReservaPorCircuitoVA: '500', ...extra }
    let calculo
    try {
      calculo = calcularProjetoCompleto(p, cfg1)
    } catch (erro) {
      return { erro: erro.message }
    }
    return { veredito: calcularVeredito(p, { configInstalacao: cfg1, ...calculo }), calculo }
  }
  const sala = { id: 'a', nome: 'Sala', tipo: 'social', area: '10', perimetro: '12', tue: [] }
  const tue = (campos) => ({ ...sala, tue: [{ id: 'x', nome: 'Ar', quantidade: 1, potenciaW: '1000', ligacao: 'fase-neutro', tipoCarga: 'indutiva', cosPhi: 0.85, ...campos }] })

  const vazio = rodar([])
  checar('G44.1', 'Entrada ausente', 'Projeto sem nenhum cômodo NÃO é "conforme": o veredito traz a pendência "nenhum cômodo cadastrado" (antes dizia ok)', vazio.veredito?.estado !== 'ok' && vazio.veredito?.pendencias.some((p) => /Nenhum cômodo/.test(p.texto)), `estado ${vazio.veredito?.estado}; ${vazio.veredito?.pendencias.map((p) => p.texto).join(' | ')}`, 'critico')

  const invalidos = [
    ['área negativa', [{ ...sala, area: '-10' }], /área inválida/],
    ['área em texto', [{ ...sala, area: 'abc' }], /área inválida/],
    ['tipo de cômodo desconhecido', [{ ...sala, tipo: 'xyz' }], /tipo de cômodo desconhecido/],
    ['potência negativa', [tue({ potenciaW: '-1000' })], /potência inválida/],
    ['cosφ 1,5', [tue({ cosPhi: 1.5 })], /fator de potência/],
    ['rendimento 1,2', [tue({ rendimento: 1.2 })], /rendimento/],
    ['quantidade negativa', [tue({ quantidade: -2 })], /quantidade inválida/],
  ]
  const falhas = invalidos.flatMap(([nome, comodos, padrao]) => {
    const r = rodar(comodos)
    if (r.erro) return [`${nome}: EXCEÇÃO ${r.erro}`]
    return r.veredito.estado === 'alerta' && r.veredito.problemas.some((p) => padrao.test(p.texto)) ? [] : [`${nome}: estado ${r.veredito.estado}`]
  })
  checar('G44.2', 'Entrada inválida', 'Área negativa/texto, tipo desconhecido, potência negativa, cosφ>1, η>1 e quantidade negativa: sem exceção e com problema apontado (veredito vermelho)', falhas.length === 0, falhas.length ? falhas.join('; ') : `${invalidos.length} entradas inválidas sinalizadas`, 'critico')

  const ausentes = [
    ['área em branco', [{ ...sala, area: '' }], /área não informada/],
    ['perímetro em branco', [{ ...sala, perimetro: '' }], /perímetro não informado/],
    ['potência do equipamento em branco', [tue({ potenciaW: '' })], /potência não informada/],
  ]
  const falhasAus = ausentes.flatMap(([nome, comodos, padrao]) => {
    const r = rodar(comodos)
    return r.veredito && r.veredito.estado !== 'ok' && r.veredito.pendencias.some((p) => padrao.test(p.texto)) ? [] : [`${nome}: ${r.erro ?? r.veredito.estado}`]
  })
  checar('G44.3', 'Entrada ausente', 'Área, perímetro ou potência em branco: pendência explícita (não verificado), nunca "ok" — e o equipamento sem potência é avisado como fora do cálculo', falhasAus.length === 0, falhasAus.length ? falhasAus.join('; ') : `${ausentes.length} omissões sinalizadas`, 'alto')

  // Dados incompatíveis não podem reduzir carga: cosφ>1 e potência negativa mantêm (ou aumentam) a corrente.
  const base = rodar([tue({ cosPhi: 1 })]).calculo
  const cos15 = rodar([tue({ cosPhi: 1.5 })]).calculo
  const neg = rodar([sala, tue({ potenciaW: '-5000' })].slice(0, 1)).calculo // só a sala: o equipamento negativo não pode abater a carga
  const comNeg = rodar([tue({ potenciaW: '-5000' })]).calculo
  const semNeg = rodar([sala]).calculo
  checar('G44.4', 'Dados incompatíveis', 'cosφ 1,5 não pode diminuir a corrente (≥ a de cosφ 1); potência negativa não abate a carga das demais', cos15.protecaoGeral.correnteEntradaA >= base.protecaoGeral.correnteEntradaA - 1e-9 && quase(comNeg.protecaoGeral.correnteEntradaA, semNeg.protecaoGeral.correnteEntradaA, 1e-9) && neg !== undefined, `cosφ 1: ${base.protecaoGeral.correnteEntradaA.toFixed(3)} A · cosφ 1,5: ${cos15.protecaoGeral.correnteEntradaA.toFixed(3)} A · potência −5000 W: ${comNeg.protecaoGeral.correnteEntradaA.toFixed(3)} A vs sem equipamento ${semNeg.protecaoGeral.correnteEntradaA.toFixed(3)} A`, 'critico')

  // Comprimento ausente: queda 0 não pode virar "conforme".
  const semComp = rodar([sala])
  const dimens = semComp.calculo.dimensionados
  checar('G44.5', '§6.2.6.1.2 e)', 'Circuitos sem comprimento informado: "não verificado" (naoVerificado=true, conforme=false) e pendência no veredito — queda 0% não aprova nada', dimens.every((c) => c.naoVerificado === true && c.conforme === false) && semComp.veredito.pendencias.some((p) => /sem comprimento/.test(p.texto)), `${dimens.length} circuito(s) sem comprimento: naoVerificado=${dimens.every((c) => c.naoVerificado)}`, 'alto')

  // Esquema TN-C-S e PEN: PEN abaixo de 10 mm² reprova.
  const entrada = rodar([sala], { esquemaAterramento: 'TN-C-S' })
  checar('G44.6', '§6.4.3.4.1', 'PEN do TN-C-S: seção mínima 10 mm² (Cu); o neutro do alimentador adotado (≥10 mm² pelo piso prático) atende', entrada.calculo.complementares.pen?.secaoMinimaMm2 === 10 && entrada.calculo.complementares.pen.conforme === true, `PEN ${entrada.calculo.complementares.pen?.secaoMm2} mm² (mín. 10) → ${entrada.calculo.complementares.pen?.conforme}`, 'medio')
}



// ---------------------------------------------------------------------------
// G45 — Conferência com Hélio Creder, Instalações Elétricas, 16ª ed. (docs/ — não versionado)
// ---------------------------------------------------------------------------
grupo('G45', 'Conferência bibliográfica: Creder, Instalações Elétricas, 16ª ed.')
import { DIAMETRO_EXTERNO_CONDUTOR_MM, ELETRODUTOS_PVC_RIGIDO } from '../../frontend/src/calculations/constantes.js'

{
  // Tabela 3.7 do livro (cobre, EPR/XLPE) traz dois valores que não batem com a NBR 5410 (Tabela 37, p. 110 do
  // PDF): 4 mm², B1 com 3 condutores (livro 57 A × NBR 37 A) e 95 mm², D com 2 condutores (livro 525 A × NBR 252 A).
  // São erros de impressão do livro: 57 A seria maior que os 42 A de dois condutores na mesma seção, e 525 A
  // seria quase o dobro do valor da seção de 120 mm² (287 A). O código segue a NBR.
  const b13 = obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 3, secaoMm2: 4 })
  const b12 = obterAmpacidade({ isolacao: 'epr', metodo: 'B1', condutoresCarregados: 2, secaoMm2: 4 })
  const d95 = obterAmpacidade({ isolacao: 'epr', metodo: 'D', condutoresCarregados: 2, secaoMm2: 95 })
  const d70 = obterAmpacidade({ isolacao: 'epr', metodo: 'D', condutoresCarregados: 2, secaoMm2: 70 })
  checar('G45.1', 'Creder Tab. 3.7 × NBR Tab. 37', 'Duas células da Tabela 3.7 do livro divergem da NBR (4 mm² B1/3 = 57 × 37 A; 95 mm² D/2 = 525 × 252 A) e são erros de impressão: o código usa a NBR (37 A e 252 A), coerente com a coluna de 2 condutores e com a seção vizinha', b13 === 37 && b13 < b12 && d95 === 252 && d95 > d70, `EPR 4 mm² B1: 2c=${b12} A, 3c=${b13} A (livro: 57) · EPR D/2: 70 mm²=${d70} A, 95 mm²=${d95} A (livro: 525)`, 'medio')

  // Tabelas 3.6 e 3.7 do livro: as demais 286 células de cobre são iguais às da NBR (comparação feita na auditoria; ver docs/AUDITORIA_NORMATIVA.md).

  // Tabela 3.18 do livro (V = 127 V, 1% de queda): Σ(P·ℓ) por seção, calculada com ρ = 1/58 Ω·mm²/m (20 °C), cosφ = 1, sem reatância.
  // O motor usa a resistência a 70 °C (σ = 46,8): para a mesma potência e distância a queda sai 58/46,8 = 1,239 vez maior (mais segura).
  const creder318 = { 1.5: 7016, 2.5: 11694, 4: 18710, 6: 28064, 10: 46774, 16: 74839, 25: 116935, 35: 163709, 50: 233871 }
  const razoes = Object.entries(creder318).map(([secao, pl]) => {
    const L = 10
    const P = pl / L
    return calcularQuedaPercentual({ comprimentoM: L, correnteA: P / 127, secaoMm2: Number(secao), tensaoV: 127, cosPhi: 1, tipoCarga: 'resistiva', circuitoTrifasico: false })
  })
  checar('G45.2', 'Creder Tab. 3.18', 'Para cada Σ(P·ℓ) que o livro dá como 1% de queda (9 seções, 127 V), o motor calcula 1,239% (= 58/46,8): mesma fórmula, resistência a 70 °C em vez de 20 °C — nunca menos que o livro', razoes.every((q) => quase(q, 58 / 46.8, 0.01)), `quedas: ${razoes.map((q) => q.toFixed(3)).join(' · ')}% (esperado ${(58 / 46.8).toFixed(3)})`, 'alto')

  // Creder Tabelas 3.22/3.23 (coluna "Total"): área do condutor com isolação (mm²) → Ø = √(4A/π). O motor adota o maior entre catálogo e livro.
  const totalLivro = { 1.5: 6.6, 2.5: 10.2, 4: 13.2, 6: 16.6, 10: 28.3, 16: 38.5, 25: 58.1, 35: 78.5, 50: 116.9, 70: 147.4, 95: 201.1, 120: 254.5 }
  const abaixo = Object.entries(totalLivro).filter(([secao, area]) => {
    const d = DIAMETRO_EXTERNO_CONDUTOR_MM.pvc[secao]
    return (Math.PI / 4) * d * d < area * 0.999
  })
  checar('G45.3', 'Creder Tab. 3.22/3.23', 'Em nenhuma das 12 seções o diâmetro externo do cabo PVC usado no eletroduto fica abaixo do que resulta da área "Total" do livro (antes: 50 mm² −6,5% e 120 mm² −8,7% de área)', abaixo.length === 0, abaixo.length ? `abaixo do livro: ${abaixo.map(([s]) => s).join(', ')} mm²` : '12 seções ≥ livro', 'alto')

  // Creder Tab. 10.4 (Tigre, rosqueável): diâmetros internos de 20 a 85 mm.
  const di = [[20, 16.4], [25, 21.3], [32, 27.5], [40, 36.1], [50, 41.4], [60, 52.8], [75, 67.1], [85, 79.6]]
  const errosDi = di.filter(([dn, d]) => ELETRODUTOS_PVC_RIGIDO.find((e) => e.nominalMm === dn)?.diametroInternoMm !== d)
  checar('G45.4', 'Creder Tab. 10.4', 'Diâmetros internos dos eletrodutos de 20 a 85 mm iguais aos do livro; o de 16 mm (Di 12,8), sem fonte, saiu da lista — o menor passa a ser o de 20 mm (1/2")', errosDi.length === 0 && !ELETRODUTOS_PVC_RIGIDO.some((e) => e.nominalMm === 16), errosDi.length ? `divergem: ${errosDi.map(([dn]) => dn).join(', ')}` : `8 diâmetros conferem; menor eletroduto ${ELETRODUTOS_PVC_RIGIDO[0].nominalMm} mm`, 'medio')

  // Creder §4.5.3, exemplo (a): Iko = 8,44 kA a montante, cosφ_ko 0,5, ℓ = 30 m, 2×95 = 190 mm² → Ik = 7,43 kA (fórmula simplificada do livro).
  // Mesma situação pelo método do motor (fonte reativa + R e X do cabo, uma fase): Zfonte = 127/8440; Zcabo = 30/(46,8·190) + j·30·0,10/1000.
  const rC = 30 / (46.8 * 190)
  const xC = (30 * 0.1) / 1000 / 2 // dois cabos de 95 mm² em paralelo: a reatância cai à metade (a resistência já está em 190 mm²)
  const ikMotor = 127 / Math.hypot(rC, 127 / 8440 + xC)
  checar('G45.5', 'Creder §4.5.3', 'Icc a jusante pelo método do motor (7,52 kA) fica a 1,2% do exemplo do livro (7,43 kA, fórmula simplificada com cosφ_ko = 0,5): mesma ordem de grandeza e mesmo sentido', Math.abs(ikMotor - 7430) / 7430 < 0.02, `motor ${(ikMotor / 1000).toFixed(3)} kA × livro 7,43 kA (${(((ikMotor - 7430) / 7430) * 100).toFixed(2)}%)`, 'medio')
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

const ORDEM_SEV = { critico: 0, alto: 1, medio: 2, baixo: 3 }
const ROTULO_SEV = { critico: 'CRÍTICO', alto: 'ALTO', medio: 'MÉDIO', baixo: 'BAIXO' }

const falhas = resultados.filter((r) => !r.ok)
const passes = resultados.filter((r) => r.ok)

const gruposVistos = []
for (const r of resultados) {
  if (!gruposVistos.some((g) => g.id === r.grupo.id)) gruposVistos.push(r.grupo)
}

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║  Verificação de conformidade — ABNT NBR 5410:2004                        ║')
console.log('╚══════════════════════════════════════════════════════════════════════════╝')

for (const g of gruposVistos) {
  const doGrupo = resultados.filter((r) => r.grupo.id === g.id)
  const f = doGrupo.filter((r) => !r.ok)
  console.log(`\n── ${g.id} · ${g.titulo}  (${doGrupo.length - f.length}/${doGrupo.length})`)
  for (const r of doGrupo) {
    if (r.ok && !VERBOSO) continue
    const marca = r.ok ? 'PASS' : 'FAIL'
    const sev = r.ok ? '' : ` [${ROTULO_SEV[r.severidade]}]`
    console.log(`   ${marca}${sev}  ${r.id} · ${r.clausula}`)
    console.log(`         ${r.descricao}`)
    console.log(`         → ${r.evidencia}`)
  }
  if (!VERBOSO && f.length === 0) console.log('   (tudo conforme)')
}

console.log('\n──────────────────────────────────────────────────────────────────────────')
console.log(`  ${passes.length} conformes · ${falhas.length} divergências`)

if (falhas.length) {
  const porSev = {}
  for (const f of falhas) porSev[f.severidade] = (porSev[f.severidade] ?? 0) + 1
  const resumo = Object.keys(ORDEM_SEV)
    .filter((s) => porSev[s])
    .map((s) => `${porSev[s]} ${ROTULO_SEV[s].toLowerCase()}`)
    .join(' · ')
  console.log(`  Severidade: ${resumo}`)
  console.log('\n  Prioridade de correção:')
  for (const f of [...falhas].sort((a, b) => ORDEM_SEV[a.severidade] - ORDEM_SEV[b.severidade]).slice(0, 8)) {
    console.log(`    [${ROTULO_SEV[f.severidade]}] ${f.id} — ${f.descricao} (${f.clausula})`)
  }
}
console.log('──────────────────────────────────────────────────────────────────────────\n')

process.exit(falhas.length ? 1 : 0)

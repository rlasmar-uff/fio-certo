import { SECOES_NOMINAIS_MM2, calcularSecaoTerra } from './constantes.js'

const proximaSecaoPadronizada = (secaoMm2) => SECOES_NOMINAIS_MM2.find((secao) => secao >= secaoMm2) ?? null

// Fator k para o PE (semana 7 §4.1): Tabela 55 — veia de cabo multipolar ou PE enfeixado com outros condutores
// (cobre/PVC 115; cobre/EPR-XLPE 143); Tabela 53 — PE isolado fora do cabo e não enfeixado (cobre/PVC 143). O
// documento não traz o valor da Tabela 53 para EPR/XLPE: nesse caso o cálculo fica sem k (pendente).
const K_PE = { tabela55: { pvc: 115, epr: 143 }, tabela53: { pvc: 143, epr: null } }

// NBR 5410 §6.4.3.1 — condutor de proteção (PE). Dois métodos aceitos pela norma: Tabela 58 (seção da fase
// → PE) e o cálculo S ≥ √(I²·t)/k, com a corrente de falta presumida I e o tempo de atuação t ≤ 5 s do
// dispositivo (a seção sobe para a padronizada imediatamente superior). Com I e t informados, adota-se o MAIOR
// dos dois resultados (recomendação do Creder, que atende aos dois critérios). Piso de 6.4.3.1.4 para PE
// FORA do cabo e do conduto das fases: 2,5 mm² com proteção mecânica, 4 mm² sem (cobre).
export function dimensionarPE({ secaoFaseMm2, isolacao = 'pvc', iFaltaA = null, tempoS = null, foraDoCabo = false, protecaoMecanica = true }) {
  if (!secaoFaseMm2) return { secaoMm2: null, tabela58Mm2: null, calculoMm2: null, minimoMm2: null, kUsado: null, metodo: null, pendencia: null }
  const tabela58Mm2 = calcularSecaoTerra(secaoFaseMm2)
  const k = (foraDoCabo ? K_PE.tabela53 : K_PE.tabela55)[isolacao] ?? null
  const temDadosDeFalta = Number(iFaltaA) > 0 && Number(tempoS) > 0
  const calculoExato = temDadosDeFalta && k ? Math.sqrt(Number(iFaltaA) ** 2 * Number(tempoS)) / k : null
  const calculoMm2 = calculoExato === null ? null : proximaSecaoPadronizada(calculoExato)
  const minimoMm2 = foraDoCabo ? (protecaoMecanica ? 2.5 : 4) : null
  const base = Math.max(tabela58Mm2, calculoMm2 ?? 0)
  const secaoMm2 = proximaSecaoPadronizada(Math.max(base, minimoMm2 ?? 0))
  return {
    secaoMm2,
    tabela58Mm2,
    calculoMm2,
    calculoExatoMm2: calculoExato,
    minimoMm2,
    kUsado: k,
    metodo: calculoMm2 !== null && calculoMm2 > tabela58Mm2 ? 'cálculo (integral de Joule)' : 'Tabela 58',
    pendencia: temDadosDeFalta && !k ? 'k da Tabela 53 para EPR/XLPE não consta do documento: cálculo do PE pendente' : null,
  }
}

// Anexo F (informativo), Tabela F.1 — fator f_h entre a corrente de neutro e a de fase quando a taxa de 3ª
// harmônica e múltiplos passa de 33% (neutro com seção possivelmente MAIOR que a das fases). Faixas em
// percentuais inteiros: valores fracionários são arredondados para cima antes da consulta. Sem estimativa
// confiável de h₃: f = 1,73 (trifásico com neutro) e 1,41 (duas fases e neutro).
const TABELA_F1 = [
  [35, 1.15, 1.15], [40, 1.19, 1.19], [45, 1.24, 1.23], [50, 1.35, 1.27],
  [55, 1.45, 1.3], [60, 1.55, 1.34], [65, 1.64, 1.38], [Infinity, 1.73, 1.41],
]
export function correnteNeutroHarmonica({ correnteFaseA, h3Percentual = null, esquema = '3F+N' }) {
  const coluna = esquema === '2F+N' ? 2 : 1
  const informado = h3Percentual !== null && h3Percentual !== '' && Number.isFinite(Number(h3Percentual))
  const h = informado ? Math.ceil(Number(h3Percentual)) : null
  if (informado && h <= 33) return { aplicavel: false, motivo: 'h₃ ≤ 33%: o neutro não passa da seção da fase por harmônicas (6.2.6.2.3 e .4).' }
  const linha = informado ? TABELA_F1.find(([ate]) => h <= ate) : TABELA_F1[TABELA_F1.length - 1]
  const fh = linha[coluna]
  return {
    aplicavel: true,
    fh,
    correnteNeutroA: fh * correnteFaseA,
    estimativaDeH3: informado,
    verificacaoComplementar: true,
    nota: informado
      ? 'Neutro: verificação complementar pelo anexo F; a ferramenta calcula I_N e não dimensiona o neutro automaticamente. Se a seção das fases for igualada à do neutro com h₃ > 45%, o fator 0,86 de quatro condutores carregados é dispensável.'
      : 'Sem estimativa de h₃: f_h máximo da tabela F.1. Verificação complementar pelo anexo F; a ferramenta não dimensiona o neutro automaticamente.',
  }
}
